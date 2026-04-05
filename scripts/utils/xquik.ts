/**
 * Xquik API client for extracting X (Twitter) article content.
 * X Articles (x.com/i/article/XXXXXXX) are long-form posts that require
 * authenticated access — standard scrapers and Jina can't fetch them.
 *
 * IMPORTANT: Xquik's article_extractor takes the TWEET ID that contains
 * the article link, not the article ID itself. When called from tweet
 * auto-chain, we have the tweet ID. When called with a bare article URL,
 * the article ID IS the tweet ID in most cases.
 *
 * Requires XQUIK_API_KEY in .env. Get one at https://xquik.com
 * Cost: ~$0.00075 per article (5 credits).
 */

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
 * Fetch an X article's full text via Xquik.
 * @param tweetId - The tweet ID that contains/links to the article.
 *                  For x.com/i/article/ URLs, the article ID often works as tweet ID too.
 */
export async function fetchXArticle(tweetId: string): Promise<XArticleResult> {
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
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const statusRes = await fetch(`${XQUIK_BASE}/extractions/${id}`, { headers });
    if (!statusRes.ok) continue;
    const statusData = (await statusRes.json()) as {
      job: { status: string; totalResults: number };
    };
    if (statusData.job.status === "completed") {
      totalResults = statusData.job.totalResults;
      break;
    }
    if (statusData.job.status === "failed") throw new Error(`Xquik extraction ${id} failed`);
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
