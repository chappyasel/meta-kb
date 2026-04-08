/**
 * X Article extraction — Xquik primary, Apify browser fallback.
 *
 * X Articles (x.com/i/article/XXXXXXX) are long-form posts that require
 * authenticated access — standard scrapers and Jina can't fetch them.
 *
 * Primary: Xquik article_extractor API (fast, cheap).
 * Fallback: Apify website-content-crawler with Playwright (slower, but
 *           renders JS and extracts article text from the tweet page).
 *
 * Requires XQUIK_API_KEY in .env. Get one at https://xquik.com
 * Cost: ~$0.00075 per article (5 credits) via Xquik.
 */

import { runApifyActor } from "./apify.js";

const XQUIK_BASE = "https://xquik.com/api/v1";
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30;

function getXquikKey(): string {
  const key = process.env.XQUIK_API_KEY;
  if (!key) throw new Error("XQUIK_API_KEY is required for X article extraction. Set it in .env");
  return key;
}

export function isXArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    return (
      (host === "x.com" || host === "twitter.com") &&
      parsed.pathname.startsWith("/i/article/")
    );
  } catch {
    return false;
  }
}

export function extractArticleId(url: string): string {
  const match = url.match(/\/i\/article\/(\d+)/);
  if (!match) throw new Error(`Cannot extract article ID from ${url}`);
  return match[1]!;
}

export interface XArticleResult {
  title: string;
  previewText: string;
  bodyText: string;
  author: string;
  authorHandle: string;
  followers: number;
}

/**
 * Fetch an X article's full text. Tries Xquik first, falls back to
 * Apify website-content-crawler (Playwright) if Xquik returns no results.
 *
 * @param tweetId - The article's tweet ID (from /i/article/XXXXX URL).
 * @param tweetUrl - Optional tweet URL for the Apify browser fallback.
 */
export async function fetchXArticle(
  tweetId: string,
  tweetUrl?: string,
): Promise<XArticleResult> {
  // Try Xquik first (fast + cheap)
  try {
    return await fetchXArticleViaXquik(tweetId);
  } catch (err) {
    console.warn(`    xquik failed: ${(err as Error).message}`);
  }

  // Fallback: Apify website-content-crawler with Playwright
  if (tweetUrl) {
    console.log(`    falling back to Apify browser crawl...`);
    return await fetchXArticleViaBrowser(tweetUrl);
  }

  throw new Error(`Xquik extraction failed and no tweet URL available for browser fallback (tweet ${tweetId})`);
}

async function fetchXArticleViaXquik(tweetId: string): Promise<XArticleResult> {
  const headers: Record<string, string> = {
    "x-api-key": getXquikKey(),
    "Content-Type": "application/json",
  };

  // 1. Create extraction
  console.log(`    xquik: creating extraction for tweet ${tweetId}...`);
  const createRes = await fetch(`${XQUIK_BASE}/extractions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      toolType: "article_extractor",
      targetTweetId: tweetId,
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Xquik create failed (${createRes.status}): ${body.slice(0, 200)}`);
  }
  const { id } = (await createRes.json()) as { id: string };

  // 2. Poll until complete
  console.log(`    xquik: polling extraction ${id}...`);
  let totalResults = 0;
  let completed = false;
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const statusRes = await fetch(`${XQUIK_BASE}/extractions/${id}`, { headers });
    if (!statusRes.ok) continue;
    const statusData = (await statusRes.json()) as {
      job: { status: string; totalResults: number };
    };
    if (statusData.job.status === "completed") {
      totalResults = statusData.job.totalResults;
      completed = true;
      break;
    }
    if (statusData.job.status === "failed") throw new Error(`Xquik extraction ${id} failed`);
  }

  if (!completed) {
    throw new Error(`Xquik extraction ${id} timed out after ${MAX_POLLS * POLL_INTERVAL_MS / 1000}s for tweet ${tweetId}`);
  }
  if (totalResults === 0) {
    throw new Error(`Xquik extraction completed but found no article content for tweet ${tweetId}`);
  }

  // 3. Export results as JSON
  const exportRes = await fetch(`${XQUIK_BASE}/extractions/${id}/export?format=json`, {
    headers,
  });
  if (!exportRes.ok) {
    const errBody = await exportRes.text().catch(() => "");
    throw new Error(`Xquik export failed (${exportRes.status}): ${errBody.slice(0, 500)}`);
  }
  const data = (await exportRes.json()) as Record<string, unknown>[];
  const first = data[0];
  if (!first) throw new Error("Xquik returned empty results array");

  return {
    title: (first.articleTitle ?? "Untitled X Article") as string,
    previewText: (first.articlePreviewText ?? "") as string,
    bodyText: (first.articleBodyText ?? "") as string,
    author: (first.xDisplayName ?? "unknown") as string,
    authorHandle: (first.xUsername ?? "unknown") as string,
    followers: (first.xFollowersCount ?? 0) as number,
  };
}

async function fetchXArticleViaBrowser(tweetUrl: string): Promise<XArticleResult> {
  const items = await runApifyActor(
    "apify/website-content-crawler",
    {
      startUrls: [{ url: tweetUrl }],
      maxCrawlPages: 1,
      crawlerType: "playwright:firefox",
    },
    { maxItems: 1, waitSecs: 60 },
  );

  const page = items[0];
  if (!page) throw new Error("Apify browser crawl returned no results");

  const text = (page.text ?? page.markdown ?? "") as string;
  if (text.length < 100) throw new Error("Apify browser crawl returned too little content");

  // Parse title from first line (format: "author on X: "Title"")
  const titleMatch = text.match(/on X:\s*"([^"]+)"/);
  const title = titleMatch?.[1] ?? "Untitled X Article";

  // Extract author from the page metadata or first line
  const authorMatch = text.match(/^(\S+)\s+on X:/);
  const author = authorMatch?.[1] ?? "unknown";

  return {
    title,
    previewText: "",
    bodyText: text,
    author,
    authorHandle: author.replace("@", ""),
    followers: 0,
  };
}
