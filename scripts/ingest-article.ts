#!/usr/bin/env bun
/**
 * Article ingestion script.
 * Fetches web articles, extracts clean content via Defuddle, generates key_insight/tags.
 * Falls back to Jina Reader for JS-rendered pages.
 *
 * Usage:
 *   bun run scripts/ingest-article.ts [url1] [url2] ...
 *   bun run scripts/ingest-article.ts              # reads config/sources.json
 */

import { Defuddle } from "defuddle/node";
import { generateInsightAndTags } from "./utils/llm.js";
import { writeRawSource } from "./utils/markdown-writer.js";
import { slugify } from "./utils/slugify.js";
import { extractGithubUrls } from "./utils/url-extract.js";
import { loadSeen, saveSeen, markSeen, normalizeUrl } from "./utils/dedup.js";
import { loadSourceUrls } from "./utils/config.js";
import { parseDate } from "./utils/date.js";
import { ingestGithubRepo } from "./ingest-github.js";
import { isXArticleUrl, extractArticleId, fetchXArticle } from "./utils/xquik.js";
import type { RawSourceFrontmatter } from "./types.js";

// ─── Article fetching ─────────────────────────────────────────────────

interface ArticleMetadata {
  title: string;
  author: string;
  date: string; // YYYY-MM-DD
  siteName: string;
  content: string; // markdown
  wordCount: number;
}

const USER_AGENT = "meta-kb/0.1 (article ingester)";

async function fetchArticle(url: string): Promise<ArticleMetadata> {
  console.log(`  fetching ${url}...`);
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  const html = await response.text();

  // Try Defuddle first (async function, not a class)
  const result = await Defuddle(html, url, { markdown: true });

  const content = result.content ?? "";
  const title = result.title ?? extractMetaTag(html, "og:title") ?? new URL(url).hostname;
  const author =
    result.author ??
    extractMetaTag(html, "author") ??
    extractMetaTag(html, "og:site_name") ??
    new URL(url).hostname;
  const date = parseDate(
    result.published ??
      extractMetaTag(html, "article:published_time") ??
      extractMetaTag(html, "date") ??
      "",
  );
  const siteName =
    result.site ??
    extractMetaTag(html, "og:site_name") ??
    new URL(url).hostname;
  const wordCount = result.wordCount ?? content.split(/\s+/).length;

  // If Defuddle returned very little content, try Jina fallback
  if (content.length < 100) {
    console.log(`  defuddle returned minimal content (${content.length} chars), trying Jina fallback...`);
    return fetchViaJina(url);
  }

  return { title, author, date, siteName, content, wordCount };
}

async function fetchViaJina(url: string): Promise<ArticleMetadata> {
  console.log(`  fetching via Jina Reader...`);
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: "text/markdown", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Jina returned ${response.status} for ${url}`);
  }

  const markdown = await response.text();

  // Parse title from first heading
  const titleMatch = markdown.match(/^#\s+(.+)/m);
  const title = titleMatch?.[1]?.trim() ?? new URL(url).hostname;

  const hostname = new URL(url).hostname.replace("www.", "");
  return {
    title,
    author: hostname,
    date: new Date().toISOString().split("T")[0]!,
    siteName: hostname,
    content: markdown,
    wordCount: markdown.split(/\s+/).length,
  };
}

function extractMetaTag(html: string, name: string): string | null {
  // Match <meta name="X" content="Y"> or <meta property="X" content="Y">
  const re = new RegExp(
    `<meta\\s+(?:name|property)=["']${name}["']\\s+content=["']([^"']+)["']`,
    "i",
  );
  const match = html.match(re);
  if (match) return match[1]!.trim();

  // Also try reversed attribute order: content before name
  const re2 = new RegExp(
    `<meta\\s+content=["']([^"']+)["']\\s+(?:name|property)=["']${name}["']`,
    "i",
  );
  const match2 = html.match(re2);
  return match2?.[1]?.trim() ?? null;
}

// ─── Main ingestion logic ─────────────────────────────────────────────

interface IngestOptions {
  seen?: Set<string>;
  force?: boolean;
}

export async function ingestArticles(
  urls: string[],
  opts: IngestOptions = {},
): Promise<string[]> {
  const { force = false } = opts;
  const seen = opts.seen ?? (await loadSeen());
  const written: string[] = [];

  for (const url of urls) {
    try {
      if (!force && seen.has(normalizeUrl(url))) {
        console.log(`  skip (already seen): ${url}`);
        continue;
      }

      console.log(`\n[article] processing ${url}`);

      // X Articles require Xquik API (authenticated content)
      if (isXArticleUrl(url)) {
        console.log(`  detected X article, using Xquik extraction...`);
        try {
          const articleId = extractArticleId(url);
          const tweetUrl = (opts as any).tweetUrl as string | undefined;
          const article = await fetchXArticle(articleId, tweetUrl);
          markSeen(seen, url, force);
          const { key_insight, tags } = await generateInsightAndTags(article.bodyText, "article");
          const frontmatter: RawSourceFrontmatter = {
            url,
            type: "article",
            author: `@${article.authorHandle}`,
            date: new Date().toISOString().split("T")[0]!,
            tags,
            key_insight,
          };
          const slug = slugify(`x-${article.authorHandle}-${article.title.slice(0, 50)}`);
          const body = `## ${article.title}\n\n**Author:** ${article.author} (@${article.authorHandle})\n\n${article.bodyText}`;
          const filePath = await writeRawSource("articles", slug, frontmatter, body, force);
          written.push(filePath);
        } catch (err) {
          console.warn(`  ⚠ X article extraction failed: ${err}`);
        }
        continue;
      }

      const meta = await fetchArticle(url);

      markSeen(seen, url, force);

      const { key_insight, tags } = await generateInsightAndTags(
        meta.content,
        "article",
      );

      const frontmatter: RawSourceFrontmatter = {
        url,
        type: "article",
        author: meta.author,
        date: meta.date,
        tags,
        key_insight,
      };

      const body = buildArticleBody(meta);
      const slug = slugify(`${meta.siteName}-${meta.title.slice(0, 50)}`);
      const filePath = await writeRawSource("articles", slug, frontmatter, body, force);
      written.push(filePath);

      // Auto-chain: extract GitHub URLs and ingest repos
      const githubUrls = extractGithubUrls(meta.content);
      for (const ghUrl of githubUrls) {
        try {
          console.log(`  auto-chaining to GitHub: ${ghUrl}`);
          const repoWritten = await ingestGithubRepo(ghUrl, {
            depth: 0, // Don't recurse awesome-lists from articles
            seen,
            parentSource: url,
          });
          written.push(...repoWritten);
        } catch (err) {
          console.warn(`  error auto-chaining to ${ghUrl}: ${err}`);
        }
      }
    } catch (err) {
      console.warn(`  error processing ${url}: ${err}`);
    }
  }

  await saveSeen(seen);
  return written;
}

function buildArticleBody(meta: ArticleMetadata): string {
  const lines: string[] = [];
  lines.push(`## ${meta.title}`);
  lines.push("");
  lines.push(
    `> Published on ${meta.siteName} by ${meta.author} on ${meta.date}`,
  );
  lines.push("");
  lines.push(meta.content);
  lines.push("");
  return lines.join("\n");
}

// ─── CLI entry point ──────────────────────────────────────────────────

async function main() {
  let urls = process.argv.slice(2);

  if (urls.length === 0) {
    urls = await loadSourceUrls("article_urls");
    console.log(`loaded ${urls.length} article URLs from config/sources.json`);
  }

  console.log(`\n=== Article Ingestion: ${urls.length} articles ===\n`);

  const seen = await loadSeen();
  const written = await ingestArticles(urls, { seen });
  await saveSeen(seen);

  console.log(`\n=== Done: ${written.length} files written ===`);
}

if (import.meta.main) {
  main().catch(console.error);
}
