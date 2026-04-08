#!/usr/bin/env bun
/**
 * Twitter/X ingestion script.
 * Fetches tweets via Apify, extracts content + engagement, generates key_insight/tags.
 * Recursively follows high-engagement replies and quote tweets.
 * Auto-chains to GitHub scraper for discovered repo URLs.
 *
 * Usage:
 *   bun run scripts/ingest-twitter.ts [url1] [url2] ...
 *   bun run scripts/ingest-twitter.ts              # reads config/sources.json
 */

import { runApifyActor } from "./utils/apify.js";
import { generateInsightAndTags } from "./utils/llm.js";
import { writeRawSource, appendDiscoveredUrl } from "./utils/markdown-writer.js";
import { slugify } from "./utils/slugify.js";
import { getTweetText, getTweetId, getAuthorHandle, getTweetUrl } from "./utils/tweet.js";
import { extractGithubUrls, extractUrls } from "./utils/url-extract.js";
import { loadSeen, saveSeen, markSeen, normalizeUrl } from "./utils/dedup.js";
import { loadSourceUrls } from "./utils/config.js";
import { parseDate } from "./utils/date.js";
import { ingestGithubRepo } from "./ingest-github.js";
import { ingestArticles } from "./ingest-article.js";
import { isXArticleUrl, extractArticleId, fetchXArticle } from "./utils/xquik.js";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { RawSourceFrontmatter, Engagement } from "./types.js";

// ─── Tweet field extraction ────────────────────────────────────────────

function getCreatedAt(tweet: Record<string, unknown>): string {
  const raw = (tweet.createdAt as string) ?? (tweet.created_at as string) ?? "";
  return parseDate(raw);
}

function getEngagement(tweet: Record<string, unknown>): Engagement {
  // Try multiple field paths (Apify response shapes vary)
  const legacy = tweet.legacy as Record<string, unknown> | undefined;
  return {
    likes:
      (tweet.likeCount as number) ??
      (legacy?.favorite_count as number) ??
      (tweet.favorite_count as number) ??
      0,
    retweets:
      (tweet.retweetCount as number) ??
      (legacy?.retweet_count as number) ??
      (tweet.retweet_count as number) ??
      0,
    views:
      (tweet.viewCount as number) ??
      (tweet.views_count as number) ??
      0,
  };
}

function isHighEngagement(engagement: Engagement): boolean {
  return engagement.likes > 100 || engagement.retweets > 50;
}

// ─── URL extraction from Apify entities (expanded, not t.co) ────────────

const SOCIAL_DOMAINS = new Set([
  "twitter.com", "x.com", "pic.twitter.com", "t.co",
  "linkedin.com", "lnkd.in", "youtube.com", "youtu.be",
  "instagram.com", "facebook.com", "tiktok.com",
]);

/** Extract expanded URLs from Apify tweet entities (not regex on text). */
function extractExpandedUrls(tweet: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  // entities.urls contains expanded URLs (t.co → real URL)
  const entities = tweet.entities as Record<string, unknown> | undefined;
  const entityUrls = entities?.urls as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(entityUrls)) {
    for (const u of entityUrls) {
      const expanded = (u.expanded_url ?? u.url) as string | undefined;
      if (!expanded || seen.has(expanded)) continue;
      try {
        const parsed = new URL(expanded);
        const host = parsed.hostname.replace("www.", "");
        // Allow x.com/i/article/ URLs through — these are long-form posts with real content
        const isXArticle = (host === "x.com" || host === "twitter.com") && parsed.pathname.startsWith("/i/article/");
        if (SOCIAL_DOMAINS.has(host) && !isXArticle) continue;
      } catch { continue; }
      seen.add(expanded);
      urls.push(expanded);
    }
  }

  // Also check quoted tweet entities
  const quote = tweet.quote as Record<string, unknown> | undefined;
  if (quote) {
    const quoteEntities = quote.entities as Record<string, unknown> | undefined;
    const quoteUrls = quoteEntities?.urls as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(quoteUrls)) {
      for (const u of quoteUrls) {
        const expanded = (u.expanded_url ?? u.url) as string | undefined;
        if (!expanded || seen.has(expanded)) continue;
        try {
          const parsed = new URL(expanded);
          const host = parsed.hostname.replace("www.", "");
          const isXArticle = (host === "x.com" || host === "twitter.com") && parsed.pathname.startsWith("/i/article/");
          if (SOCIAL_DOMAINS.has(host) && !isXArticle) continue;
        } catch { continue; }
        seen.add(expanded);
        urls.push(expanded);
      }
    }
  }

  return urls;
}

// ─── Image extraction + download ────────────────────────────────────────

interface TweetImage {
  url: string;        // Original media URL (media_url_https)
  localPath: string;  // Relative path from repo root: raw/images/{slug}/{filename}
  altText?: string;
}

function extractMediaUrls(tweet: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  // Check both entities.media and extendedEntities.media (Apify returns either)
  const collections = [
    (tweet.extendedEntities as Record<string, unknown> | undefined)?.media,
    (tweet.entities as Record<string, unknown> | undefined)?.media,
  ];

  for (const collection of collections) {
    if (!Array.isArray(collection)) continue;
    for (const media of collection as Array<Record<string, unknown>>) {
      const url =
        (media.media_url_https as string) ??
        (media.media_url as string);
      if (!url || seen.has(url)) continue;
      // Only images, not videos
      if (media.type === "video" || media.type === "animated_gif") continue;
      seen.add(url);
      urls.push(url);
    }
  }

  // Also check top-level media array (some Apify response shapes)
  const topMedia = tweet.media as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(topMedia)) {
    for (const media of topMedia) {
      const url =
        (media.media_url_https as string) ??
        (media.media_url as string) ??
        (media.url as string);
      if (!url || seen.has(url)) continue;
      if (media.type === "video" || media.type === "animated_gif") continue;
      // Filter to image URLs only
      if (!/\.(jpg|jpeg|png|gif|webp)/i.test(url) && !url.includes("pbs.twimg.com")) continue;
      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}

async function downloadImages(
  mediaUrls: string[],
  tweetSlug: string,
): Promise<TweetImage[]> {
  if (mediaUrls.length === 0) return [];

  const imageDir = join("raw", "images", tweetSlug);
  await mkdir(imageDir, { recursive: true });

  const images: TweetImage[] = [];

  for (let i = 0; i < mediaUrls.length; i++) {
    const url = mediaUrls[i]!;
    // Get highest quality version
    const highQualityUrl = url.includes("?") ? url : `${url}?name=large`;

    try {
      const res = await fetch(highQualityUrl, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        console.warn(`    failed to download image: ${res.status} ${url}`);
        continue;
      }

      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      const ext = contentType.includes("png") ? "png" : contentType.includes("gif") ? "gif" : "jpg";
      const filename = mediaUrls.length === 1 ? `image.${ext}` : `image-${i + 1}.${ext}`;
      const filePath = join(imageDir, filename);

      await Bun.write(filePath, await res.arrayBuffer());

      const relativePath = join("images", tweetSlug, filename);
      images.push({ url, localPath: relativePath });
      console.log(`    downloaded ${relativePath}`);
    } catch (err) {
      console.warn(`    failed to download image: ${err}`);
    }
  }

  return images;
}

// ─── Thread detection + merging ─────────────────────────────────────────

/** Extract reply-to ID from various Apify response shapes. */
function getReplyToId(tweet: Record<string, unknown>): string | null {
  const id =
    (tweet.inReplyToId as string) ??
    (tweet.in_reply_to_status_id_str as string) ??
    (tweet.in_reply_to_status_id as string) ??
    ((tweet.legacy as Record<string, unknown>)?.in_reply_to_status_id_str as string) ??
    null;
  return id || null;
}

/** Extract conversation ID from various Apify response shapes. */
function getConversationId(tweet: Record<string, unknown>): string | null {
  const id =
    (tweet.conversationId as string) ??
    (tweet.conversation_id_str as string) ??
    ((tweet.legacy as Record<string, unknown>)?.conversation_id_str as string) ??
    null;
  return id || null;
}

/**
 * Detect self-reply threads and merge them into the root tweet.
 * A "thread" is a chain of tweets by the same author replying to themselves.
 * Returns the items with thread tweets merged into their root parents.
 */
function mergeThreads(
  items: Record<string, unknown>[],
  requestedUrls: string[],
): Record<string, unknown>[] {
  // Index all tweets by ID for parent lookup
  const byId = new Map<string, Record<string, unknown>>();
  for (const tweet of items) {
    byId.set(getTweetId(tweet), tweet);
  }

  // Find thread children: same author replying to themselves
  const threadChildren = new Set<string>(); // IDs to skip in main loop
  // Map from root tweet ID → ordered list of thread continuation texts
  const threadTexts = new Map<string, string[]>();
  // Map from root tweet ID → aggregated engagement from thread
  const threadEngagement = new Map<string, Engagement>();
  // Map from root tweet ID → all expanded URLs from thread tweets
  const threadUrls = new Map<string, string[]>();
  // Map from root tweet ID → all media URLs from thread tweets
  const threadMedia = new Map<string, string[]>();

  for (const tweet of items) {
    const replyToId = getReplyToId(tweet);
    if (!replyToId) continue;

    const author = getAuthorHandle(tweet);
    const tweetId = getTweetId(tweet);

    // Walk up the reply chain to find the root of a self-reply thread
    let parentId = replyToId;
    let parent = byId.get(parentId);
    // Only merge if replying to the same author (self-thread)
    if (!parent || getAuthorHandle(parent) !== author) continue;

    // Walk to the root of the thread
    let rootId = parentId;
    let root = parent;
    while (root) {
      const rootReplyTo = getReplyToId(root);
      if (!rootReplyTo) break;
      const rootParent = byId.get(rootReplyTo);
      if (!rootParent || getAuthorHandle(rootParent) !== author) break;
      rootId = getTweetId(root);
      root = rootParent;
      rootId = getTweetId(root);
    }

    // Mark this tweet as a thread child (will be merged, not processed independently)
    threadChildren.add(tweetId);

    // Accumulate text
    const texts = threadTexts.get(rootId) ?? [];
    texts.push(getTweetText(tweet));
    threadTexts.set(rootId, texts);

    // Accumulate engagement
    const childEng = getEngagement(tweet);
    const existing = threadEngagement.get(rootId) ?? { likes: 0, retweets: 0, views: 0 };
    threadEngagement.set(rootId, {
      likes: existing.likes + childEng.likes,
      retweets: existing.retweets + childEng.retweets,
      views: existing.views + childEng.views,
    });

    // Accumulate URLs and media from thread tweets
    const urls = threadUrls.get(rootId) ?? [];
    urls.push(...extractExpandedUrls(tweet));
    threadUrls.set(rootId, urls);

    const media = threadMedia.get(rootId) ?? [];
    media.push(...extractMediaUrls(tweet));
    threadMedia.set(rootId, media);
  }

  // Now augment root tweets with merged thread data
  const merged: Record<string, unknown>[] = [];
  for (const tweet of items) {
    const tweetId = getTweetId(tweet);
    if (threadChildren.has(tweetId)) continue; // skip — already merged into root

    // If this tweet is a thread root, augment it
    const extraTexts = threadTexts.get(tweetId);
    if (extraTexts && extraTexts.length > 0) {
      const threadCount = extraTexts.length + 1;
      console.log(`  detected thread: ${threadCount} tweets by @${getAuthorHandle(tweet)}, merging`);
      // Merge thread text into the tweet (store as _threadText for downstream use)
      tweet._threadText = extraTexts;
      tweet._threadCount = threadCount;
      // Merge engagement (add thread engagement to root)
      const extraEng = threadEngagement.get(tweetId);
      if (extraEng) {
        const rootEng = getEngagement(tweet);
        tweet._mergedEngagement = {
          likes: rootEng.likes + extraEng.likes,
          retweets: rootEng.retweets + extraEng.retweets,
          views: rootEng.views + extraEng.views,
        };
      }
      // Merge URLs and media
      tweet._threadUrls = threadUrls.get(tweetId) ?? [];
      tweet._threadMedia = threadMedia.get(tweetId) ?? [];
    }

    merged.push(tweet);
  }

  return merged;
}

// ─── Main ingestion logic ───────────────────────────────────────────────

interface IngestOptions {
  depth?: number;
  seen?: Set<string>;
  force?: boolean;
}

export async function ingestTweets(
  urls: string[],
  opts: IngestOptions = {},
): Promise<string[]> {
  const { depth = 1, force = false } = opts;
  const seen = opts.seen ?? (await loadSeen());
  const written: string[] = [];

  // Build startUrls for Apify (check only, don't mark as seen yet)
  const startUrls = urls
    .filter((u) => !seen.has(normalizeUrl(u)))
    .map((url) => ({ url }));

  if (startUrls.length === 0) {
    console.log("  all URLs already seen, skipping");
    return written;
  }

  console.log(`\n[twitter] fetching ${startUrls.length} tweets via Apify...`);

  const items = await runApifyActor("apidojo/twitter-scraper-lite", {
    startUrls,
    maxItems: startUrls.length * 10, // Extra for replies/quotes
  });

  // Merge self-reply threads into their root tweets
  const mergedItems = mergeThreads(items, urls);

  for (const tweet of mergedItems) {
    const tweetUrl = getTweetUrl(tweet);
    const text = getTweetText(tweet);
    if (!text) continue;

    // Check if this is one of the original requested tweets or a reply/quote
    const isOriginal = urls.some((u) => tweetUrl.includes(getTweetId(tweet)));
    const engagement = (tweet._mergedEngagement as Engagement) ?? getEngagement(tweet);

    // For non-original tweets, only ingest if high engagement or has URLs
    if (!isOriginal) {
      const githubUrls = extractGithubUrls(text);
      if (!isHighEngagement(engagement) && githubUrls.length === 0) continue;
    }

    if (markSeen(seen, tweetUrl, force)) continue;

    const handle = getAuthorHandle(tweet);
    console.log(`  processing tweet by @${handle} (${engagement.likes} likes)`);

    // Check for X article links — if tweet is mostly just a link, fetch the article
    // content and merge it into the tweet body
    const expandedUrlsForArticle = extractExpandedUrls(tweet);
    let articleContent = "";
    let articleTitle = "";
    const xArticleUrls = expandedUrlsForArticle.filter(isXArticleUrl);
    if (xArticleUrls.length > 0) {
      // Use the article ID from the URL (not the linking tweet's ID).
      // The article ID is the tweet ID of the article-tweet itself.
      const articleId = extractArticleId(xArticleUrls[0]!);
      try {
        console.log(`  detected X article link (article: ${articleId})...`);
        const article = await fetchXArticle(articleId, tweetUrl);
        articleContent = article.bodyText;
        articleTitle = article.title;
        console.log(`  fetched article: "${articleTitle}" (${articleContent.length} chars)`);
        // Mark article URLs as seen so they don't get re-ingested in auto-chain
        for (const u of xArticleUrls) markSeen(seen, u);
      } catch (err) {
        console.warn(`  ⚠ X article extraction failed: ${err}`);
      }
    }

    // Combine tweet text (including merged thread) with article content for LLM classification
    const threadTexts = (tweet._threadText as string[]) ?? [];
    const threadBody = threadTexts.length > 0 ? "\n\n" + threadTexts.join("\n\n") : "";
    const fullText = articleContent
      ? `${text}${threadBody}\n\n## ${articleTitle}\n\n${articleContent}`
      : `${text}${threadBody}`;

    // Skip tweets with < 50 words of actual content (after article enrichment)
    const wordCount = fullText.replace(/https?:\/\/\S+/g, "").split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      console.log(`  skip (only ${wordCount} words of content after enrichment)`);
      continue;
    }

    // Include quoted tweet text for better LLM classification
    const quote = tweet.quote as Record<string, unknown> | undefined;
    const quoteText = quote ? getTweetText(quote) : "";
    const llmInput = quoteText ? `${fullText}\n\n[Quoted tweet]: ${quoteText}` : fullText;
    const { key_insight, tags } = await generateInsightAndTags(llmInput, "tweet");

    // For RTs, credit the original author in frontmatter
    const isRT = tweet.isRetweet === true;
    const rtMatch = isRT ? text.match(/^RT @(\w+):/) : null;
    const effectiveAuthor = rtMatch ? `@${rtMatch[1]}` : `@${handle}`;

    const slug = articleTitle
      ? slugify(`${handle}-${articleTitle.slice(0, 50)}`)
      : slugify(`${handle}-${text.slice(0, 50)}`);

    // Download images (including from thread tweets)
    const mediaUrls = [
      ...extractMediaUrls(tweet),
      ...((tweet._threadMedia as string[]) ?? []),
    ];
    const images = await downloadImages(mediaUrls, slug);

    const threadCount = (tweet._threadCount as number) ?? 1;
    const frontmatter: RawSourceFrontmatter = {
      url: tweetUrl,
      type: "tweet",
      author: effectiveAuthor,
      date: getCreatedAt(tweet),
      tags,
      key_insight,
      likes: engagement.likes,
      retweets: engagement.retweets,
      views: engagement.views,
      ...(threadCount > 1 && { thread_count: threadCount }),
      ...(images.length > 0 && {
        images: images.map((img) => img.localPath),
      }),
    } as RawSourceFrontmatter;

    const body = articleContent
      ? buildTweetBody(tweet, text, engagement, images, threadTexts) + `\n\n---\n\n## ${articleTitle}\n\n${articleContent}`
      : buildTweetBody(tweet, text, engagement, images, threadTexts);
    const filePath = await writeRawSource("tweets", slug, frontmatter, body, force);
    written.push(filePath);

    // Auto-chain: extract expanded URLs from Apify entities and ingest linked content
    // (X article URLs already handled above, skip them here)
    // Include URLs discovered in thread tweets
    const expandedUrls = [
      ...extractExpandedUrls(tweet),
      ...((tweet._threadUrls as string[]) ?? []),
    ];
    const githubChain: string[] = [];
    const articleChain: string[] = [];

    for (const url of expandedUrls) {
      if (isXArticleUrl(url)) continue; // already fetched and merged into tweet body
      try {
        const host = new URL(url).hostname.replace("www.", "");
        if (host === "github.com") githubChain.push(url);
        else articleChain.push(url);
      } catch {}
    }

    // GitHub repos
    for (const ghUrl of githubChain) {
      try {
        console.log(`  auto-chaining to GitHub: ${ghUrl}`);
        const repoWritten = await ingestGithubRepo(ghUrl, {
          depth: Math.min(depth, 1),
          seen,
          parentSource: tweetUrl,
        });
        written.push(...repoWritten);
      } catch (err) {
        console.warn(`  error auto-chaining to ${ghUrl}: ${err}`);
      }
    }

    // Articles (pass tweetId for X article extraction via Xquik)
    if (articleChain.length > 0) {
      try {
        const tweetIdForChain = getTweetId(tweet);
        console.log(`  auto-chaining to ${articleChain.length} article(s): ${articleChain.join(", ")}`);
        const articleWritten = await ingestArticles(articleChain, { seen, tweetId: tweetIdForChain } as any);
        written.push(...articleWritten);
      } catch (err) {
        console.warn(`  error auto-chaining to articles: ${err}`);
      }
    }
  }

  await saveSeen(seen);
  return written;
}

function buildTweetBody(
  tweet: Record<string, unknown>,
  text: string,
  engagement: Engagement,
  images: TweetImage[] = [],
  threadTexts: string[] = [],
): string {
  const handle = getAuthorHandle(tweet);
  const isRT = tweet.isRetweet === true;
  const isQT = tweet.isQuote === true;
  const quote = tweet.quote as Record<string, unknown> | undefined;
  const threadCount = (tweet._threadCount as number) ?? 1;

  const lines: string[] = [];
  lines.push(threadCount > 1 ? `## Thread by @${handle} (${threadCount} tweets)` : `## Tweet by @${handle}`);
  lines.push("");

  if (isRT) {
    // For RTs, note the original author
    const rtMatch = text.match(/^RT @(\w+):/);
    if (rtMatch) {
      lines.push(`> **Retweet of @${rtMatch[1]}**`);
      lines.push("");
    }
  }

  lines.push(text);
  lines.push("");

  // Append thread continuation tweets
  if (threadTexts.length > 0) {
    for (let i = 0; i < threadTexts.length; i++) {
      lines.push(threadTexts[i]!);
      lines.push("");
    }
  }

  // Include quoted tweet content if available
  if (isQT && quote) {
    const quoteHandle = (quote.author as Record<string, unknown>)?.userName as string ?? "unknown";
    const quoteText = getTweetText(quote);
    if (quoteText) {
      lines.push("### Quoted Tweet");
      lines.push("");
      lines.push(`> **@${quoteHandle}:**`);
      for (const line of quoteText.split("\n")) {
        lines.push(`> ${line}`);
      }
      lines.push("");
    }
  }

  lines.push("### Engagement");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Likes | ${engagement.likes.toLocaleString()} |`);
  lines.push(`| Retweets | ${engagement.retweets.toLocaleString()} |`);
  if (engagement.views > 0) lines.push(`| Views | ${engagement.views.toLocaleString()} |`);
  lines.push("");

  // Images
  if (images.length > 0) {
    lines.push("### Images");
    lines.push("");
    for (const img of images) {
      lines.push(`![](../${img.localPath})`);
      lines.push("");
    }
  }

  // Extract and list any URLs in the tweet (and quoted tweet)
  const allText = quote ? text + " " + getTweetText(quote) : text;
  const githubUrls = extractGithubUrls(allText);
  if (githubUrls.length > 0) {
    lines.push("### Referenced Repos");
    lines.push("");
    for (const url of githubUrls) {
      lines.push(`- ${url}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── CLI entry point ────────────────────────────────────────────────────

async function main() {
  let urls = process.argv.slice(2);

  if (urls.length === 0) {
    urls = await loadSourceUrls("tweet_urls");
    console.log(`loaded ${urls.length} tweet URLs from config/sources.json`);
  }

  console.log(`\n=== Twitter Ingestion: ${urls.length} tweets ===\n`);

  const seen = await loadSeen();
  const written = await ingestTweets(urls, { seen });
  await saveSeen(seen);

  console.log(`\n=== Done: ${written.length} files written ===`);
}

if (import.meta.main) {
  main().catch(console.error);
}
