const SKIP_DOMAINS = new Set([
  "twitter.com",
  "x.com",
  "pic.twitter.com",
  "t.co",
  "linkedin.com",
  "lnkd.in",
  "youtube.com",
  "youtu.be",
  "instagram.com",
  "facebook.com",
  "tiktok.com",
]);

export interface UrlClassification {
  type: "github" | "linkedin" | "twitter" | "arxiv" | "unknown";
  id?: string; // owner/repo for github, arxiv id for arxiv
}

export function classifyUrl(url: string): UrlClassification {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (host === "github.com") {
      const match = parsed.pathname.match(/^\/([^/]+\/[^/]+)/);
      return { type: "github", id: match?.[1]?.replace(/\.git$/, "") };
    }

    if (host === "x.com" || host === "twitter.com") {
      return { type: "twitter" };
    }

    if (host === "linkedin.com" || host === "lnkd.in") {
      return { type: "linkedin" };
    }

    if (host === "arxiv.org") {
      const match = parsed.pathname.match(/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/);
      return { type: "arxiv", id: match?.[1] };
    }

    return { type: "unknown" };
  } catch {
    return { type: "unknown" };
  }
}

/** Extract GitHub repo URLs from arbitrary text (including self-referential tweet/linkedin domains). */
export function extractGithubUrls(text: string): string[] {
  const allMatches = text.match(/https?:\/\/[^\s\)>\]"']+/g) || [];
  return allMatches.filter((url) => {
    try {
      const host = new URL(url).hostname.replace("www.", "");
      return host === "github.com";
    } catch {
      return false;
    }
  });
}

export function extractOwnerRepo(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(/^\/([^/]+\/[^/]+)/);
    return match?.[1]?.replace(/\.git$/, "") ?? null;
  } catch {
    return null;
  }
}
