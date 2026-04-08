#!/usr/bin/env bun
/**
 * GitHub discovery curation — find relevant repos via search API.
 *
 * Three-tier time window strategy (adapted from CAIK):
 *   - This week: created last 7 days, stars > 10 (brand new, going viral)
 *   - This month: created last 30 days, stars > 30 (recent breakouts)
 *   - Established: older repos, stars > 100, pushed in last 7 days (active ecosystem staples)
 *
 * Runs Haiku smoke test on description + README excerpt, then fully ingests
 * passing repos via the existing ingest-github pipeline.
 *
 * Usage:
 *   bun run curate:github                     # all tiers + all queries
 *   bun run curate:github --threshold 5.5     # custom smoke threshold
 *   bun run curate:github --tier new          # only "this week" tier
 *   bun run curate:github --tier recent       # only "this month" tier
 *   bun run curate:github --tier established  # only established repos
 */

import { fetchRepoMetadata, fetchReadme } from "./utils/github-api.js";
import { extractOwnerRepo } from "./utils/url-extract.js";
import { smokeTest } from "./utils/llm.js";
import { ingestGithubRepo } from "./ingest-github.js";
import { loadSeen, saveSeen, markSeen as markSeenLegacy, normalizeUrl } from "./utils/dedup.js";
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
import { domain } from "../config/domain.js";

// ─── Config ───────────────────────────────────────────────────────────

const DEFAULT_SMOKE_THRESHOLD = 5.0;

/** Domain-derived search queries for GitHub */
const GITHUB_QUERIES = [
  // Topic-based
  "topic:mcp-server",
  "topic:ai-agents",
  "topic:agent-memory",
  "topic:context-engineering",
  "topic:llm-agent",
  // File-based (signals agent-native repos)
  "CLAUDE.md in:path",
  "AGENTS.md in:path",
  "SKILL.md in:path",
  // Text search (description/name)
  "(agent memory OR context engineering OR knowledge graph) in:name,description",
  "(multi-agent OR agent coordination OR agent orchestration) in:name,description",
  "(self-improving OR autoresearch OR reflexion) in:name,description",
  "(RAG pipeline OR vector store OR knowledge base) agent in:name,description",
];

/** Three-tier time window config */
interface SearchTier {
  name: string;
  label: string;
  minStars: number;
  dateFilter: (now: Date) => string; // GitHub date qualifier
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

const TIERS: SearchTier[] = [
  {
    name: "new",
    label: "This Week (new + viral)",
    minStars: 10,
    dateFilter: (now) => {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return `created:>${formatDate(d)}`;
    },
  },
  {
    name: "recent",
    label: "This Month (breakouts)",
    minStars: 30,
    dateFilter: (now) => {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      return `created:${formatDate(d30)}..${formatDate(d7)}`;
    },
  },
  {
    name: "established",
    label: "Established (active staples)",
    minStars: 100,
    dateFilter: (now) => {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      return `created:<${formatDate(d30)} pushed:>${formatDate(d7)}`;
    },
  },
];

// ─── GitHub Search API ────────────────────────────────────────────────

interface SearchResult {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  pushed_at: string;
  created_at: string;
}

async function searchGithub(
  query: string,
  sort = "stars",
  perPage = 30,
): Promise<SearchResult[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "meta-kb-curate",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const params = new URLSearchParams({
    q: query,
    sort,
    order: "desc",
    per_page: String(perPage),
  });

  const res = await fetch(`https://api.github.com/search/repositories?${params}`, {
    headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      console.warn(`  rate limited (${res.status}), skipping query`);
      return [];
    }
    console.warn(`  GitHub search ${res.status}: ${await res.text().catch(() => "")}`);
    return [];
  }

  const data = (await res.json()) as { items: SearchResult[] };
  return data.items ?? [];
}

// ─── Results table ────────────────────────────────────────────────────

interface CurateResult {
  repo: string;
  stars: number;
  smoke: number;
  verdict: string;
  file?: string;
}

function printResultsTable(results: CurateResult[], label: string): void {
  if (results.length === 0) return;

  console.log(`\n┌─── ${label} ───`);
  console.log(
    `│ ${"Repo".padEnd(40)} ${"Stars".padStart(6)} ${"Smoke".padStart(6)} ${"Verdict".padStart(10)}  File`,
  );
  console.log(`│ ${"─".repeat(40)} ${"─".repeat(6)} ${"─".repeat(6)} ${"─".repeat(10)}  ────`);

  for (const r of results) {
    const smokeStr = r.smoke > 0 ? r.smoke.toFixed(1) : "  - ";
    console.log(
      `│ ${r.repo.padEnd(40).slice(0, 40)} ${String(r.stars).padStart(6)} ${smokeStr.padStart(6)} ${r.verdict.padStart(10)}  ${r.file ?? ""}`,
    );
  }
  console.log(`└${"─".repeat(75)}`);
}

// ─── Main curation logic ──────────────────────────────────────────────

interface CurateOptions {
  threshold?: number;
  tier?: string; // "new" | "recent" | "established"
}

async function curate(opts: CurateOptions = {}): Promise<void> {
  const {
    threshold = DEFAULT_SMOKE_THRESHOLD,
    tier: tierFilter,
  } = opts;

  const activeTiers = tierFilter
    ? TIERS.filter((t) => t.name === tierFilter)
    : TIERS;

  if (activeTiers.length === 0) {
    console.error(`Unknown tier: ${tierFilter}. Use: new, recent, established`);
    process.exit(1);
  }

  console.log(`\n=== GitHub Curation ===`);
  console.log(`  smoke threshold: ${threshold}`);
  console.log(`  tiers: ${activeTiers.map((t) => t.name).join(", ")}`);
  console.log(`  queries: ${GITHUB_QUERIES.length}`);

  const now = new Date();
  const legacySeen = await loadSeen();
  const allResults: CurateResult[] = [];
  let totalFetched = 0;
  let totalEvaluated = 0;
  let totalIngested = 0;

  for (const tier of activeTiers) {
    console.log(`\n─── Tier: ${tier.label} (stars > ${tier.minStars}) ───`);
    const runId = startRun(`github:${tier.name}`, GITHUB_QUERIES.join("; "));
    let tierFetched = 0;
    let tierEvaluated = 0;
    let tierIngested = 0;

    // Collect all repos from all queries for this tier, deduped
    const repoMap = new Map<string, SearchResult>();

    for (const query of GITHUB_QUERIES) {
      const fullQuery = `${query} ${tier.dateFilter(now)} stars:>${tier.minStars}`;
      console.log(`  [search] ${query.slice(0, 60)}...`);
      const results = await searchGithub(fullQuery);
      for (const repo of results) {
        if (!repoMap.has(repo.full_name)) {
          repoMap.set(repo.full_name, repo);
        }
      }
      // Rate limit: 30 requests/minute for search API
      await new Promise((r) => setTimeout(r, 3000));
    }

    console.log(`  found ${repoMap.size} unique repos`);
    tierFetched = repoMap.size;

    for (const [fullName, repo] of repoMap) {
      const repoUrl = `https://github.com/${fullName}`;

      // Skip if already seen (SQLite or legacy) or previously evaluated
      if (isSeen(repoUrl) || isEvaluated(fullName) || legacySeen.has(normalizeUrl(repoUrl))) {
        continue;
      }

      // Smoke test on description + truncated README
      const descText = [
        repo.description ?? "",
        repo.topics.length > 0 ? `Topics: ${repo.topics.join(", ")}` : "",
        repo.language ? `Language: ${repo.language}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      // Fetch a README excerpt for smoke testing (lightweight)
      let readmeExcerpt = "";
      try {
        const readme = await fetchReadme(fullName);
        if (readme) readmeExcerpt = readme.slice(0, 2000);
      } catch {}

      const smokeContent = `${descText}\n\n${readmeExcerpt}`;
      tierEvaluated++;

      const smoke = await smokeTest(smokeContent, "repo");

      if (!smoke) {
        allResults.push({ repo: fullName, stars: repo.stargazers_count, smoke: 0, verdict: "error" });
        continue;
      }

      const passed = smoke.composite >= threshold;
      saveEvaluatedItem({
        id: fullName,
        type: "repo",
        url: repoUrl,
        content_preview: (repo.description ?? "").slice(0, 500),
        word_count: smokeContent.split(/\s+/).length,
        author: fullName.split("/")[0],
        smoke_topic_relevance: smoke.topic_relevance,
        smoke_practitioner_value: smoke.practitioner_value,
        smoke_novelty: smoke.novelty,
        smoke_signal_quality: smoke.signal_quality,
        smoke_composite: smoke.composite,
        smoke_reason: smoke.reason,
        verdict: passed ? "ingested" : "below_threshold",
        engagement_stars: repo.stargazers_count,
      });

      if (!passed) {
        allResults.push({
          repo: fullName,
          stars: repo.stargazers_count,
          smoke: smoke.composite,
          verdict: "skipped",
        });
        continue;
      }

      // Passed — full ingestion
      console.log(
        `\n  [ingest] ${fullName} (${repo.stargazers_count} stars, smoke=${smoke.composite})`,
      );

      try {
        // Don't mark as seen before calling ingestGithubRepo — let it handle dedup
        const written = await ingestGithubRepo(repoUrl, {
          seen: legacySeen,
          skipRelevanceCheck: false,
          minStars: 0,
          minRelevance: 6.0,
        });
        // Mark in SQLite after successful ingestion
        markSeen(repoUrl, `curate:github:${tier.name}`);
        tierIngested++;

        allResults.push({
          repo: fullName,
          stars: repo.stargazers_count,
          smoke: smoke.composite,
          verdict: "ingested",
          file: written[0],
        });
      } catch (err) {
        console.warn(`  error ingesting ${fullName}: ${err}`);
        allResults.push({
          repo: fullName,
          stars: repo.stargazers_count,
          smoke: smoke.composite,
          verdict: "error",
        });
      }
    }

    completeRun(runId, {
      items_fetched: tierFetched,
      items_evaluated: tierEvaluated,
      items_ingested: tierIngested,
    });

    totalFetched += tierFetched;
    totalEvaluated += tierEvaluated;
    totalIngested += tierIngested;
  }

  await saveSeen(legacySeen);

  // Print results
  const passed = allResults.filter((r) => r.verdict === "ingested");
  const skipped = allResults.filter((r) => r.verdict === "skipped");

  if (passed.length > 0) printResultsTable(passed, "Ingested");
  if (skipped.length > 0) printResultsTable(skipped.slice(0, 15), "Skipped (top 15)");

  console.log(`\n=== GitHub Curation Complete ===`);
  console.log(`  fetched: ${totalFetched} unique repos`);
  console.log(`  evaluated: ${totalEvaluated} (smoke tested)`);
  console.log(`  ingested: ${totalIngested}`);
  console.log(`  skipped: ${totalEvaluated - totalIngested} (below threshold ${threshold})`);

  closeDb();
}

// ─── CLI ──────────────────────────────────────────────────────────────

function parseArgs(args: string[]): CurateOptions {
  const opts: CurateOptions = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--threshold":
        opts.threshold = parseFloat(args[++i]!);
        break;
      case "--tier":
        opts.tier = args[++i];
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
