/** Shared tweet field extraction helpers for Apify response shapes. */

export function getTweetText(tweet: Record<string, unknown>): string {
  // Prefer `text` (full content) over `fullText` (truncated with t.co links)
  return (
    (tweet.text as string) ??
    (tweet.fullText as string) ??
    (tweet.full_text as string) ??
    ""
  );
}

export function getTweetId(tweet: Record<string, unknown>): string {
  return (
    (tweet.id_str as string) ??
    (tweet.id as string) ??
    String(tweet.id ?? "")
  );
}

export function getAuthorHandle(tweet: Record<string, unknown>): string {
  const user = tweet.user as Record<string, unknown> | undefined;
  return (
    (user?.screen_name as string) ??
    (tweet.author as Record<string, unknown>)?.userName as string ??
    (tweet.username as string) ??
    "unknown"
  );
}

export function getTweetUrl(tweet: Record<string, unknown>): string {
  if (tweet.url) return tweet.url as string;
  const handle = getAuthorHandle(tweet);
  const id = getTweetId(tweet);
  return `https://x.com/${handle}/status/${id}`;
}
