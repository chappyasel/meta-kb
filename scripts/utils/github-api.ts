export interface RepoMetadata {
  stars: number;
  forks: number;
  language: string | null;
  description: string | null;
  topics: string[];
  updatedAt: string;
  license: string | null;
  owner: string;
  name: string;
  fullName: string;
}

const DELAY_MS = 100;
let lastRequest = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequest;
  if (elapsed < DELAY_MS) {
    await new Promise((r) => setTimeout(r, DELAY_MS - elapsed));
  }
  lastRequest = Date.now();

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "meta-kb-ingestion",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });

  // Rate limit handling: retry once after waiting
  if (res.status === 403 || res.status === 429) {
    const resetHeader = res.headers.get("x-ratelimit-reset");
    if (resetHeader) {
      const waitMs = Math.max(0, parseInt(resetHeader) * 1000 - Date.now()) + 1000;
      console.warn(`  rate limited, waiting ${Math.round(waitMs / 1000)}s...`);
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 60000)));
      return fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    }
  }

  return res;
}

export async function fetchRepoMetadata(ownerRepo: string): Promise<RepoMetadata | null> {
  const res = await rateLimitedFetch(`https://api.github.com/repos/${ownerRepo}`);
  if (!res.ok) {
    console.warn(`  GitHub API ${res.status} for ${ownerRepo}`);
    return null;
  }
  const data = (await res.json()) as Record<string, unknown>;
  return {
    stars: (data.stargazers_count as number) ?? 0,
    forks: (data.forks_count as number) ?? 0,
    language: (data.language as string) ?? null,
    description: (data.description as string) ?? null,
    topics: (data.topics as string[]) ?? [],
    updatedAt: (data.updated_at as string) ?? "",
    license: (data.license as { spdx_id: string } | null)?.spdx_id ?? null,
    owner: ownerRepo.split("/")[0]!,
    name: ownerRepo.split("/")[1]!,
    fullName: ownerRepo,
  };
}

export async function fetchReadme(ownerRepo: string): Promise<string | null> {
  // Try main, then master
  for (const branch of ["main", "master"]) {
    const url = `https://raw.githubusercontent.com/${ownerRepo}/${branch}/README.md`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) return res.text();
  }
  console.warn(`  no README found for ${ownerRepo}`);
  return null;
}

/** Parse markdown links from a curated list README. Tracks sections. */
export interface ParsedLink {
  name: string;
  url: string;
  description: string;
  section: string;
}

export function parseMarkdownLinks(markdown: string): ParsedLink[] {
  const results: ParsedLink[] = [];
  const lines = markdown.split("\n");
  let currentSection = "";

  for (const line of lines) {
    // Track section headers
    const headerMatch = line.match(/^#{2,3}\s+(.+)/);
    if (headerMatch) {
      currentSection = headerMatch[1]!.trim();
      continue;
    }

    // Pattern with description: [name](url) - description
    const withDescMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)\s*[-–—:]\s*(.+)/);
    if (withDescMatch) {
      const [, name, url, description] = withDescMatch;
      if (url && isContentLink(url)) {
        results.push({
          name: name!.trim(),
          url: url.trim(),
          description: description!.trim(),
          section: currentSection,
        });
      }
      continue;
    }

    // Simpler pattern: [name](url)
    const simpleLinkMatches = line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    for (const match of simpleLinkMatches) {
      const [, name, url] = match;
      if (url && isContentLink(url)) {
        results.push({
          name: name!.trim(),
          url: url.trim(),
          description: "",
          section: currentSection,
        });
      }
    }
  }

  return results;
}

function isContentLink(url: string): boolean {
  if (url.startsWith("#") || url.startsWith("mailto:")) return false;
  if (/\.(png|jpg|jpeg|gif|svg|ico|badge)/.test(url)) return false;
  if (url.includes("shields.io") || url.includes("badge")) return false;
  return true;
}
