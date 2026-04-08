#!/usr/bin/env bun
/**
 * Twitter/X feed curation — discover high-signal content from your timeline.
 *
 * Fetches your home feed via bird CLI, resolves t.co links, extracts X articles
 * and quoted tweets, runs a Haiku smoke test, then fully ingests passing content
 * via the existing pipeline (Sonnet scoring + writeRawSource + auto-chain).
 *
 * Usage:
 *   bun run curate:twitter                    # home feed (100 tweets)
 *   bun run curate:twitter --threshold 6.0    # custom smoke test threshold
 *   bun run curate:twitter --count 200        # more tweets per run
 */

import {
  ensureAuth,
  fetchHomeFeed,
  wordCount,
  type BirdTweet,
} from "./utils/bird.js";
import { smokeTest, generateInsightAndTags } from "./utils/llm.js";
import { writeRawSource } from "./utils/markdown-writer.js";
import { slugify } from "./utils/slugify.js";
import { parseDate } from "./utils/date.js";
import { extractGithubUrls } from "./utils/url-extract.js";
import { isXArticleUrl, extractArticleId, fetchXArticle } from "./utils/xquik.js";
import { ingestGithubRepo } from "./ingest-github.js";
import { ingestArticles } from "./ingest-article.js";
import {
  markSeen,
  isSeen,
  isEvaluated,
  saveEvaluatedItem,
  startRun,
  completeRun,
  closeDb,
  type EvaluatedItem,
} from "./utils/db.js";
import { loadSeen, saveSeen, markSeen as markSeenLegacy, normalizeUrl } from "./utils/dedup.js";
import { domain } from "../config/domain.js";
import type { RawSourceFrontmatter } from "./types.js";

// ─── Config ───────────────────────────────────────────────────────────

const DEFAULT_SMOKE_THRESHOLD = 5.0;
const DEFAULT_FEED_COUNT = 100;
const MIN_WORD_COUNT = 200;

// ─── URL resolution ───────────────────────────────────────────────────

const SOCIAL_DOMAINS = new Set([
  "twitter.com", "x.com", "pic.twitter.com", "t.co",
  "linkedin.com", "lnkd.in", "youtube.com", "youtu.be",
  "instagram.com", "facebook.com", "tiktok.com",
]);

/**
 * Resolve t.co short URLs to their real destinations.
 * Bird CLI doesn't return expanded entities, so we follow redirects.
 */
async function resolveTcoUrls(text: string): Promise<string[]> {
  const tcoMatches = text.match(/https?:\/\/t\.co\/\w+/g) ?? [];
  const resolved: string[] = [];

  for (const tco of tcoMatches) {
    try {
      const res = await fetch(tco, {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });
      const location = res.headers.get("location");
      if (!location) continue;

      // Filter out social domains (same logic as ingest-twitter.ts)
      const host = new URL(location).hostname.replace("www.", "");
      // Allow X articles through
      const isArticle = (host === "x.com" || host === "twitter.com") &&
        new URL(location).pathname.startsWith("/i/article/");
      if (SOCIAL_DOMAINS.has(host) && !isArticle) continue;

      resolved.push(location);
    } catch {}
  }

  return resolved;
}

// ─── Tweet processing ─────────────────────────────────────────────────

interface ProcessedTweet {
  tweet: BirdTweet;
  tweetUrl: string;
  tweetId: string;
  author: string;
  text: string;          // original tweet text
  enrichedText: string;  // tweet text + article content (if any)
  words: number;         // word count of enrichedText
  hasLinks: boolean;
  linkUrls: string[];    // resolved expanded URLs (non-social)
  articleTitle?: string;
  articleContent?: string;
  engagement: { likes: number; retweets: number; views: number };
}

async function processTweet(tweet: BirdTweet): Promise<ProcessedTweet | null> {
  const tweetId = tweet.id;
  const author = tweet.author?.username ?? "unknown";
  const text = tweet.text ?? "";
  const tweetUrl = `https://x.com/${author}/status/${tweetId}`;

  if (!text || !tweetId) return null;

  // 1. Extract article content — bird gives preview, Xquik gives full text
  let articleTitle: string | undefined;
  let articleContent: string | undefined;
  if (tweet.article) {
    articleTitle = tweet.article.title;
    // Bird only gives previewText (~1-2 paragraphs). Try Xquik for full body.
    try {
      const fullArticle = await fetchXArticle(tweetId, tweetUrl);
      articleContent = fullArticle.bodyText;
    } catch {
      // Xquik failed — use bird's preview as fallback
      articleContent = tweet.article.previewText;
    }
  }

  // 2. Extract quoted tweet text
  const quotedTweet = tweet.quotedTweet ?? tweet.quote;
  const quotedText = quotedTweet?.text ?? "";
  const quotedAuthor = quotedTweet?.author?.username;

  // 3. Resolve t.co URLs to real destinations (for link detection + auto-chaining)
  const resolvedUrls = await resolveTcoUrls(text);
  // Also resolve from quoted tweet text
  if (quotedText) {
    const quotedResolved = await resolveTcoUrls(quotedText);
    resolvedUrls.push(...quotedResolved);
  }
  // Also extract GitHub URLs that might be in full form in text
  const ghFromText = extractGithubUrls(text + " " + quotedText);
  const allLinks = [...new Set([...resolvedUrls, ...ghFromText])];

  // 4. Check for X article URLs in resolved links — fetch full content via Xquik
  //    (only if bird didn't already provide article content)
  if (!articleContent) {
    const xArticleUrls = allLinks.filter(isXArticleUrl);
    if (xArticleUrls.length > 0) {
      const artId = extractArticleId(xArticleUrls[0]!);
      try {
        const article = await fetchXArticle(artId, tweetUrl);
        articleTitle = article.title;
        articleContent = article.bodyText;
      } catch {
        // Article fetch failed — still process tweet without it
      }
    }
  }

  // 5. Build enriched text combining all content sources
  const parts = [text];
  if (articleContent) parts.push(`## ${articleTitle}\n\n${articleContent}`);
  if (quotedText) parts.push(`[Quoted @${quotedAuthor}]: ${quotedText}`);
  const enrichedText = parts.join("\n\n");

  return {
    tweet,
    tweetUrl,
    tweetId,
    author,
    text,
    enrichedText,
    words: wordCount(enrichedText),
    hasLinks: allLinks.length > 0,
    linkUrls: allLinks,
    articleTitle,
    articleContent,
    engagement: {
      likes: tweet.likeCount ?? 0,
      retweets: tweet.retweetCount ?? 0,
      views: 0, // bird doesn't return view counts
    },
  };
}

// ─── Results table ────────────────────────────────────────────────────

interface CurateResult {
  author: string;
  words: number;
  links: number;
  smoke: number;
  verdict: string;
  source: string;
  file?: string;
}

function printResultsTable(results: CurateResult[], label: string): void {
  if (results.length === 0) return;

  console.log(`\n┌─── ${label} ───`);
  console.log(
    `│ ${"Author".padEnd(18)} ${"Source".padEnd(22)} ${"Words".padStart(5)} ${"Links".padStart(5)} ${"Smoke".padStart(6)} ${"Verdict".padStart(10)}  File`,
  );
  console.log(`│ ${"─".repeat(18)} ${"─".repeat(22)} ${"─".repeat(5)} ${"─".repeat(5)} ${"─".repeat(6)} ${"─".repeat(10)}  ────`);

  for (const r of results) {
    const smokeStr = r.smoke > 0 ? r.smoke.toFixed(1) : "  - ";
    console.log(
      `│ ${("@" + r.author).padEnd(18).slice(0, 18)} ${r.source.padEnd(22).slice(0, 22)} ${String(r.words).padStart(5)} ${String(r.links).padStart(5)} ${smokeStr.padStart(6)} ${r.verdict.padStart(10)}  ${r.file ?? ""}`,
    );
  }
  console.log(`└${"─".repeat(80)}`);
}

// ─── Main curation logic ──────────────────────────────────────────────

interface CurateOptions {
  threshold?: number;
  count?: number;
}

async function curate(opts: CurateOptions = {}): Promise<void> {
  const {
    threshold = DEFAULT_SMOKE_THRESHOLD,
    count = DEFAULT_FEED_COUNT,
  } = opts;

  console.log(`\n=== Twitter Curation ===`);
  console.log(`  smoke threshold: ${threshold}`);
  console.log(`  min words: ${MIN_WORD_COUNT} (or has article/quote)`);

  // Auth
  const authed = await ensureAuth();
  if (!authed) {
    console.error("Failed to authenticate with Twitter. Make sure Chrome is logged into X.");
    process.exit(1);
  }
  console.log(`  auth: ok`);

  // Load legacy seen set for auto-chaining compatibility
  const legacySeen = await loadSeen();

  // Fetch home feed
  console.log(`\n[home] fetching ${count} tweets from home feed...`);
  const allTweets = await fetchHomeFeed(count);
  console.log(`[home] got ${allTweets.length} tweets`);

  // Dedup
  const uniqueTweets = new Map<string, BirdTweet>();
  for (const tweet of allTweets) {
    if (tweet.id && !uniqueTweets.has(tweet.id)) {
      uniqueTweets.set(tweet.id, tweet);
    }
  }

  console.log(`[curate] ${uniqueTweets.size} unique tweets`);

  const results: CurateResult[] = [];
  let evaluated = 0;
  let ingested = 0;
  const runId = startRun("twitter", "home");

  for (const [, tweet] of uniqueTweets) {
    const tweetId = tweet.id;
    const author = tweet.author?.username ?? "unknown";
    const tweetText = tweet.text ?? "";
    const tweetUrl = `https://x.com/${author}/status/${tweetId}`;

    if (!tweetText || !tweetId) continue;

    // Skip if already seen (SQLite or legacy) or previously evaluated — BEFORE any network calls
    if (isSeen(tweetUrl) || isEvaluated(tweetId) || legacySeen.has(normalizeUrl(tweetUrl))) {
      continue;
    }

    // Quick word count check on raw text (before URL resolution)
    const rawWords = wordCount(tweetText);
    const hasTcoLinks = /https?:\/\/t\.co\/\w+/.test(tweetText);
    const hasArticle = !!tweet.article;
    const hasQuote = !!(tweet.quotedTweet ?? tweet.quote);

    // If too short AND no links/article/quote, skip without network calls
    if (rawWords < MIN_WORD_COUNT && !hasTcoLinks && !hasArticle && !hasQuote) {
      saveEvaluatedItem({
        id: tweetId,
        type: "tweet",
        url: tweetUrl,
        word_count: rawWords,
        has_links: false,
        author,
        verdict: "too_short",
        engagement_likes: tweet.likeCount ?? 0,
      });
      continue;
    }

    // Now do the expensive work: resolve URLs and fetch articles
    const processed = await processTweet(tweet);
    if (!processed) continue;

    const { text, enrichedText, words, hasLinks, linkUrls, engagement, articleTitle, articleContent } = processed;

    // Second content gate after enrichment
    // Articles and quoted tweets always pass — their presence signals substantive content
    const hasArticleContent = !!articleContent;
    if (words < MIN_WORD_COUNT && !hasLinks && !hasArticleContent) {
      saveEvaluatedItem({
        id: tweetId,
        type: "tweet",
        url: tweetUrl,
        word_count: words,
        has_links: false,
        author,
        verdict: "too_short",
        engagement_likes: engagement.likes,
      });
      continue;
    }

    // Smoke test (Haiku — cheap) — uses enriched text (includes article content if available)
    evaluated++;
    const smoke = await smokeTest(enrichedText, "tweet");

    if (!smoke) {
      // LLM call failed — skip but don't permanently reject
      results.push({ author, words, links: linkUrls.length, smoke: 0, verdict: "error", source: "home" });
      continue;
    }

    // Record evaluation
    const passed = smoke.composite >= threshold;
    saveEvaluatedItem({
      id: tweetId,
      type: "tweet",
      url: tweetUrl,
      content_preview: text.slice(0, 500),
      word_count: words,
      has_links: hasLinks,
      author,
      smoke_topic_relevance: smoke.topic_relevance,
      smoke_practitioner_value: smoke.practitioner_value,
      smoke_novelty: smoke.novelty,
      smoke_signal_quality: smoke.signal_quality,
      smoke_composite: smoke.composite,
      smoke_reason: smoke.reason,
      verdict: passed ? "ingested" : "below_threshold",
      engagement_likes: engagement.likes,
      engagement_retweets: engagement.retweets,
      engagement_views: engagement.views,
    });

    if (!passed) {
      results.push({
        author,
        words,
        links: linkUrls.length,
        smoke: smoke.composite,
        verdict: "skipped",
        source: "home",
      });
      continue;
    }

    // Passed smoke test — full ingestion pipeline
    console.log(
      `\n  [ingest] @${author} (${words}w, smoke=${smoke.composite}) — ${smoke.reason}`,
    );

    // Mark as seen in legacy set (for auto-chain dedup within this run)
    markSeenLegacy(legacySeen, tweetUrl);

    // Generate insight + tags (Haiku) — uses enriched text for better classification
    const { key_insight, tags } = await generateInsightAndTags(enrichedText, "tweet");

    const slug = articleTitle
      ? slugify(`${author}-${articleTitle.slice(0, 50)}`)
      : slugify(`${author}-${text.slice(0, 50)}`);
    const discoveredVia = "home";
    const frontmatter: RawSourceFrontmatter = {
      url: tweetUrl,
      type: "tweet",
      author: `@${author}`,
      date: parseDate(tweet.createdAt),
      tags,
      key_insight,
      likes: engagement.likes,
      retweets: engagement.retweets,
      ...(engagement.views > 0 && { views: engagement.views }),
      discovered_via: `curate:twitter/${discoveredVia}`,
    };

    const baseBody = buildTweetBody(processed);
    const body = articleContent
      ? `${baseBody}\n\n---\n\n## ${articleTitle}\n\n${articleContent}`
      : baseBody;
    // writeRawSource internally calls scoreRelevance (Sonnet) — this is the full score
    const filePath = await writeRawSource("tweets", slug, frontmatter, body, { lowRelevance: "auto-reject" });
    markSeen(tweetUrl, "curate:twitter");
    ingested++;

    results.push({
      author,
      words,
      links: linkUrls.length,
      smoke: smoke.composite,
      verdict: "ingested",
      source: discoveredVia,
      file: filePath,
    });

    // Auto-chain linked content (skip X article URLs — already fetched and merged)
    const githubUrls = linkUrls.filter((u) => u.includes("github.com"));
    const articleUrls = linkUrls.filter((u) => !u.includes("github.com") && !isXArticleUrl(u));

    for (const ghUrl of githubUrls) {
      try {
        console.log(`    auto-chain → GitHub: ${ghUrl}`);
        await ingestGithubRepo(ghUrl, {
          depth: 1,
          seen: legacySeen,
          parentSource: tweetUrl,
          minStars: 20,
          minRelevance: 5.0,
        });
      } catch (err) {
        console.warn(`    error chaining to ${ghUrl}: ${err}`);
      }
    }

    if (articleUrls.length > 0) {
      try {
        console.log(`    auto-chain → ${articleUrls.length} article(s)`);
        await ingestArticles(articleUrls, { seen: legacySeen, writeOptions: { lowRelevance: "auto-reject" } });
      } catch (err) {
        console.warn(`    error chaining to articles: ${err}`);
      }
    }
  }

  // Save legacy seen set
  await saveSeen(legacySeen);

  // Complete run
  completeRun(runId, {
    items_fetched: uniqueTweets.size,
    items_evaluated: evaluated,
    items_ingested: ingested,
  });

  // Print results
  const passed = results.filter((r) => r.verdict === "ingested");
  const skipped = results.filter((r) => r.verdict === "skipped");

  if (passed.length > 0) printResultsTable(passed, "Ingested");
  if (skipped.length > 0) printResultsTable(skipped.slice(0, 10), "Skipped (top 10)");

  console.log(`\n=== Twitter Curation Complete ===`);
  console.log(`  fetched: ${uniqueTweets.size} unique tweets`);
  console.log(`  evaluated: ${evaluated} (passed content gate)`);
  console.log(`  ingested: ${ingested}`);
  console.log(`  skipped: ${evaluated - ingested} (below threshold ${threshold})`);

  closeDb();
}

// ─── Body builder ─────────────────────────────────────────────────────

function buildTweetBody(p: ProcessedTweet): string {
  const lines: string[] = [];
  lines.push(`## Tweet by @${p.author}`);
  lines.push("");
  lines.push(p.text);
  lines.push("");

  // Quoted tweet (bird uses quotedTweet or quote)
  const quotedTweet = p.tweet.quotedTweet ?? p.tweet.quote;
  if (quotedTweet) {
    const quoteAuthor = quotedTweet.author?.username ?? "unknown";
    lines.push("### Quoted Tweet");
    lines.push("");
    lines.push(`> **@${quoteAuthor}:**`);
    for (const line of (quotedTweet.text ?? "").split("\n")) {
      lines.push(`> ${line}`);
    }
    lines.push("");
  }

  lines.push("### Engagement");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Likes | ${p.engagement.likes.toLocaleString()} |`);
  lines.push(`| Retweets | ${p.engagement.retweets.toLocaleString()} |`);
  lines.push("");

  if (p.linkUrls.length > 0) {
    const ghLinks = p.linkUrls.filter((u) => u.includes("github.com"));
    const otherLinks = p.linkUrls.filter((u) => !u.includes("github.com"));
    if (ghLinks.length > 0) {
      lines.push("### Referenced Repos");
      lines.push("");
      for (const url of ghLinks) lines.push(`- ${url}`);
      lines.push("");
    }
    if (otherLinks.length > 0) {
      lines.push("### Links");
      lines.push("");
      for (const url of otherLinks) lines.push(`- ${url}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ─── CLI ──────────────────────────────────────────────────────────────

function parseArgs(args: string[]): CurateOptions {
  const opts: CurateOptions = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--threshold":
        opts.threshold = parseFloat(args[++i]!);
        break;
      case "--count":
        opts.count = parseInt(args[++i]!, 10);
        break;
    }
  }
  return opts;
}

if (import.meta.main) {
  const opts = parseArgs(process.argv.slice(2));
  curate(opts).catch((err) => {
    console.error(err);
    closeDb();
    process.exit(1);
  });
}
