#!/usr/bin/env bun
/**
 * Unified ingestion CLI.
 * Auto-detects platform from URL and routes to the correct scraper.
 *
 * Usage:
 *   bun run ingest https://x.com/karpathy/status/123...
 *   bun run ingest https://github.com/mem0ai/mem0
 *   bun run ingest https://arxiv.org/abs/2405.12345
 *   bun run ingest https://example.com/blog/post     # generic article
 *   bun run ingest url1 url2 url3    # mixed platforms OK
 */

import { classifyUrl } from "./utils/url-extract.js";
import { loadSeen, saveSeen } from "./utils/dedup.js";
import { ingestTweets } from "./ingest-twitter.js";
import { ingestGithubRepo } from "./ingest-github.js";
import { ingestArxivPapers } from "./ingest-arxiv.js";
import { ingestArticles } from "./ingest-article.js";

async function main() {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.log("Usage: bun run ingest <url1> [url2] ...");
    console.log("");
    console.log("Supported platforms:");
    console.log("  x.com / twitter.com  → Twitter scraper");
    console.log("  github.com           → GitHub scraper (with awesome-list detection)");
    console.log("  arxiv.org            → arXiv paper scraper");
    console.log("  (any other URL)      → Article scraper (Defuddle + Jina fallback)");
    console.log("");
    console.log("Or use platform-specific scripts:");
    console.log("  bun run ingest:twitter   # reads config/sources.json tweet_urls");
    console.log("  bun run ingest:github    # reads config/sources.json github_repos");
    console.log("  bun run ingest:arxiv     # reads config/sources.json arxiv_papers");
    console.log("  bun run ingest:article   # reads config/sources.json article_urls");
    process.exit(1);
  }

  // Group URLs by platform
  const twitter: string[] = [];
  const github: string[] = [];
  const arxiv: string[] = [];
  const article: string[] = [];
  const skipped: string[] = [];

  for (const url of urls) {
    const classification = classifyUrl(url);
    switch (classification.type) {
      case "twitter":
        twitter.push(url);
        break;
      case "github":
        github.push(url);
        break;
      case "arxiv":
        arxiv.push(url);
        break;
      case "linkedin":
        skipped.push(url);
        break; // LinkedIn scraping not yet supported
      default:
        article.push(url);
        break;
    }
  }

  if (skipped.length > 0) {
    console.warn(`\nSkipping ${skipped.length} LinkedIn URLs (not yet supported):`);
    for (const u of skipped) console.warn(`  ${u}`);
  }

  console.log(
    `\n=== Ingestion: ${twitter.length} tweets, ${github.length} repos, ${arxiv.length} papers, ${article.length} articles ===\n`,
  );

  const seen = await loadSeen();
  const allWritten: string[] = [];

  // Process GitHub first (no Apify dependency, fastest)
  if (github.length > 0) {
    for (const url of github) {
      try {
        const written = await ingestGithubRepo(url, { seen });
        allWritten.push(...written);
      } catch (err) {
        console.error(`error processing ${url}: ${err}`);
      }
    }
  }

  // Twitter (auto-chains to GitHub for discovered repo URLs)
  if (twitter.length > 0) {
    try {
      const written = await ingestTweets(twitter, { seen });
      allWritten.push(...written);
    } catch (err) {
      console.error(`error processing tweets: ${err}`);
    }
  }

  // arXiv papers
  if (arxiv.length > 0) {
    try {
      const written = await ingestArxivPapers(arxiv, { seen });
      allWritten.push(...written);
    } catch (err) {
      console.error(`error processing arXiv papers: ${err}`);
    }
  }

  // Articles (generic URLs — Defuddle + Jina fallback)
  if (article.length > 0) {
    try {
      const written = await ingestArticles(article, { seen });
      allWritten.push(...written);
    } catch (err) {
      console.error(`error processing articles: ${err}`);
    }
  }

  await saveSeen(seen);
  console.log(`\n=== Done: ${allWritten.length} total files written ===`);
}

main().catch(console.error);
