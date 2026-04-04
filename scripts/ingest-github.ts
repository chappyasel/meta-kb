#!/usr/bin/env bun
/**
 * GitHub repo ingestion script.
 * Fetches repo metadata + README, scores relevance via LLM, generates key_insight/tags.
 * Detects awesome-list repos and recursively ingests linked repos.
 *
 * Usage:
 *   bun run scripts/ingest-github.ts [url1] [url2] ...
 *   bun run scripts/ingest-github.ts --min-stars 50 [url1] ...
 *   bun run scripts/ingest-github.ts --min-relevance 4.0 [url1] ...
 *   bun run scripts/ingest-github.ts              # reads config/sources.json
 */

import {
  fetchReadme,
  fetchRepoMetadata,
  parseMarkdownLinks,
} from "./utils/github-api.js";
import { extractOwnerRepo } from "./utils/url-extract.js";
import { generateInsightAndTags, scoreRelevance, type RelevanceScore } from "./utils/llm.js";
import { writeRawSource, appendDiscoveredUrl } from "./utils/markdown-writer.js";
import { slugify } from "./utils/slugify.js";
import { loadSeen, saveSeen, markSeen } from "./utils/dedup.js";
import { loadSourceUrls } from "./utils/config.js";
import type { RawSourceFrontmatter } from "./types.js";

// ─── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_MIN_STARS = 20;
const DEFAULT_MIN_RELEVANCE = 4.0; // composite score threshold

// ─── Types ──────────────────────────────────────────────────────────────

export interface IngestOptions {
  depth?: number;
  seen?: Set<string>;
  parentSource?: string;
  /** Minimum GitHub stars to ingest (default 20). Set 0 to disable. */
  minStars?: number;
  /** Minimum composite relevance score to keep (default 4.0). Set 0 to disable. */
  minRelevance?: number;
  /** Skip relevance scoring (for explicitly requested repos). */
  skipRelevanceCheck?: boolean;
}

// ─── Main ingestion ─────────────────────────────────────────────────────

export async function ingestGithubRepo(
  repoUrl: string,
  opts: IngestOptions = {},
): Promise<string[]> {
  const {
    depth = 1,
    parentSource,
    minStars = DEFAULT_MIN_STARS,
    minRelevance = DEFAULT_MIN_RELEVANCE,
    skipRelevanceCheck = false,
  } = opts;
  const seen = opts.seen ?? (await loadSeen());
  const written: string[] = [];

  const ownerRepo = extractOwnerRepo(repoUrl);
  if (!ownerRepo) {
    console.warn(`  could not parse owner/repo from: ${repoUrl}`);
    return written;
  }

  if (markSeen(seen, repoUrl)) {
    console.log(`  skip (already seen): ${ownerRepo}`);
    return written;
  }

  console.log(`\n[github] ingesting ${ownerRepo}...`);

  // Fetch metadata + README
  const [metadata, readme] = await Promise.all([
    fetchRepoMetadata(ownerRepo),
    fetchReadme(ownerRepo),
  ]);

  if (!metadata) {
    console.warn(`  failed to fetch metadata for ${ownerRepo}`);
    return written;
  }

  // Star threshold (for recursive discovery, not explicitly requested repos)
  if (minStars > 0 && metadata.stars < minStars && parentSource) {
    console.log(`  skip (${metadata.stars} stars < ${minStars} min): ${ownerRepo}`);
    return written;
  }

  // Relevance scoring (for recursive discovery)
  let relevance: RelevanceScore | null = null;
  if (!skipRelevanceCheck && parentSource) {
    const contentForScoring = [
      metadata.description ?? "",
      readme?.slice(0, 3000) ?? "",
    ].join("\n\n");

    relevance = await scoreRelevance(contentForScoring, "repo");
    if (relevance) {
      console.log(
        `  relevance: ${relevance.composite}/10 (topic=${relevance.topic_relevance} practitioner=${relevance.practitioner_value} novelty=${relevance.novelty} signal=${relevance.signal_quality})`,
      );
      if (minRelevance > 0 && relevance.composite < minRelevance) {
        console.log(`  skip (relevance ${relevance.composite} < ${minRelevance} min): ${relevance.reason}`);
        return written;
      }
    }
  }

  // Generate insight + tags
  const contentForLlm = [
    metadata.description ?? "",
    readme?.slice(0, 6000) ?? "",
  ].join("\n\n");

  const { key_insight, tags } = await generateInsightAndTags(contentForLlm, "repo");

  // Check for broken output (LLM fallback produced garbage)
  if (key_insight === "No insight generated." && tags.length === 0) {
    console.log(`  skip (broken: no insight and no tags): ${ownerRepo}`);
    return written;
  }

  const frontmatter: RawSourceFrontmatter = {
    url: `https://github.com/${ownerRepo}`,
    type: "repo",
    author: metadata.owner,
    date: metadata.updatedAt.split("T")[0] ?? new Date().toISOString().split("T")[0]!,
    tags,
    key_insight,
    stars: metadata.stars,
    forks: metadata.forks,
  };

  const body = buildRepoBody(metadata, readme, relevance);
  const slug = slugify(`${metadata.owner}-${metadata.name}`);
  const filePath = await writeRawSource("repos", slug, frontmatter, body);
  written.push(filePath);

  // Awesome-list detection + recursive ingestion
  if (depth > 0 && readme) {
    const isAwesome = detectAwesomeList(ownerRepo, metadata.name, readme);
    if (isAwesome) {
      console.log(`  detected awesome-list, parsing links...`);
      const links = parseMarkdownLinks(readme);
      const githubLinks = links.filter((l) => l.url.includes("github.com"));
      console.log(`  found ${githubLinks.length} GitHub links in ${links.length} total links`);

      for (const link of githubLinks) {
        try {
          const subWritten = await ingestGithubRepo(link.url, {
            depth: depth - 1,
            seen,
            parentSource: repoUrl,
            minStars,
            minRelevance,
          });
          written.push(...subWritten);
        } catch (err) {
          console.warn(`  error ingesting linked repo ${link.url}: ${err}`);
        }
      }

      // Log non-GitHub URLs for manual review
      const nonGithub = links.filter((l) => !l.url.includes("github.com"));
      for (const link of nonGithub) {
        await appendDiscoveredUrl(link.url, repoUrl);
      }
    }
  }

  await saveSeen(seen);
  return written;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function detectAwesomeList(ownerRepo: string, repoName: string, readme: string): boolean {
  const nameLower = repoName.toLowerCase();
  if (nameLower.includes("awesome") || nameLower.includes("curated")) return true;

  const titleMatch = readme.match(/^#\s+(.+)/m);
  if (titleMatch?.[1]?.toLowerCase().includes("awesome")) return true;

  const linkCount = (readme.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;
  if (linkCount > 50) return true;

  return false;
}

function buildRepoBody(
  metadata: NonNullable<Awaited<ReturnType<typeof fetchRepoMetadata>>>,
  readme: string | null,
  relevance: RelevanceScore | null,
): string {
  const lines: string[] = [];
  lines.push(`## ${metadata.name}`);
  lines.push("");
  if (metadata.description) {
    lines.push(`> ${metadata.description}`);
    lines.push("");
  }
  lines.push("### Stats");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Stars | ${metadata.stars.toLocaleString()} |`);
  lines.push(`| Forks | ${metadata.forks.toLocaleString()} |`);
  if (metadata.language) lines.push(`| Language | ${metadata.language} |`);
  if (metadata.license) lines.push(`| License | ${metadata.license} |`);
  lines.push(`| Last Updated | ${metadata.updatedAt.split("T")[0]} |`);
  lines.push("");

  if (metadata.topics.length > 0) {
    lines.push(`**Topics:** ${metadata.topics.join(", ")}`);
    lines.push("");
  }

  if (relevance) {
    lines.push("### Relevance Score");
    lines.push("");
    lines.push(`| Dimension | Score |`);
    lines.push(`|-----------|-------|`);
    lines.push(`| Topic Relevance | ${relevance.topic_relevance}/10 |`);
    lines.push(`| Practitioner Value | ${relevance.practitioner_value}/10 |`);
    lines.push(`| Novelty | ${relevance.novelty}/10 |`);
    lines.push(`| Signal Quality | ${relevance.signal_quality}/10 |`);
    lines.push(`| **Composite** | **${relevance.composite}/10** |`);
    lines.push("");
    if (relevance.reason) {
      lines.push(`> ${relevance.reason}`);
      lines.push("");
    }
  }

  if (readme) {
    lines.push("### README");
    lines.push("");
    // Full README — no truncation. LLM calls truncate separately.
    lines.push(readme);
  }

  return lines.join("\n");
}

// ─── CLI entry point ────────────────────────────────────────────────────

function parseArgs(args: string[]): { urls: string[]; minStars: number; minRelevance: number } {
  let minStars = DEFAULT_MIN_STARS;
  let minRelevance = DEFAULT_MIN_RELEVANCE;
  const urls: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--min-stars" && args[i + 1]) {
      minStars = parseInt(args[++i]!, 10);
    } else if (args[i] === "--min-relevance" && args[i + 1]) {
      minRelevance = parseFloat(args[++i]!);
    } else if (args[i]!.startsWith("http")) {
      urls.push(args[i]!);
    }
  }

  return { urls, minStars, minRelevance };
}

async function main() {
  let { urls, minStars, minRelevance } = parseArgs(process.argv.slice(2));

  if (urls.length === 0) {
    urls = await loadSourceUrls("github_repos");
    console.log(`loaded ${urls.length} repos from config/sources.json`);
  }

  console.log(`\n=== GitHub Ingestion: ${urls.length} repos (min-stars=${minStars}, min-relevance=${minRelevance}) ===\n`);

  const seen = await loadSeen();
  const allWritten: string[] = [];

  for (const url of urls) {
    try {
      // Explicitly requested repos skip relevance check and star threshold
      const written = await ingestGithubRepo(url, {
        seen,
        minStars,
        minRelevance,
        skipRelevanceCheck: true,
      });
      allWritten.push(...written);
    } catch (err) {
      console.error(`error processing ${url}: ${err}`);
    }
  }

  await saveSeen(seen);
  console.log(`\n=== Done: ${allWritten.length} files written ===`);
}

if (import.meta.main) {
  main().catch(console.error);
}
