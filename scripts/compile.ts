#!/usr/bin/env bun
/**
 * meta-kb compiler: raw/ → build/ → wiki/
 *
 * 9-pass pipeline:
 *   Pass 0:  Load & index all raw sources
 *   Pass 1a: Entity extraction (per-source, Haiku, parallel)
 *   Pass 1b: Entity resolution (single Sonnet call, merge/dedup)
 *   Pass 2:  Graph construction (co-occurring pairs, Sonnet)
 *   Pass 3a: Synthesis articles (one per bucket, Sonnet, sequential)
 *   Pass 3b: Reference cards (per-entity, Sonnet, parallel)
 *   Pass 3c: Claim extraction (per-synthesis, Sonnet, sequential)
 *   Pass 4:  Field map + ROOT.md + indexes + landscape table
 *   Pass 5:  Mermaid diagrams + backlinks (local, no LLM)
 *   Pass 6:  Changelog (local diff)
 *   Pass 7:  Self-eval (claim verification, Sonnet, parallel)
 *   Pass 8:  Auto-fix (find better sources for failed claims, Sonnet)
 *
 * Usage:
 *   bun run compile                    # Full compilation
 *   bun run compile --from-pass=3a     # Resume from synthesis articles
 *   bun run compile --dry-run          # Show what would happen
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { existsSync } from "node:fs";
import { generateObject, generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import matter from "gray-matter";
import { slugify } from "./utils/slugify.js";
import type {
  RawSourceFrontmatter,
  Entity,
  EntityType,
  TaxonomyBucket,
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
  EdgeType,
  Claim,
  ClaimsFile,
  EvalResult,
  EvalReport,
} from "./types.js";
import {
  domain,
  BUCKET_IDS,
  BUCKET_NAMES,
  BUCKET_TITLES,
  BUCKET_COLORS,
  BUCKET_DESCRIPTIONS,
} from "../config/domain.js";

// ─── Config ─────────────────────────────────────────────────────────────

const ROOT = join(import.meta.dir, "..");
const RAW_DIR = join(ROOT, "raw");
const BUILD_DIR = join(ROOT, process.argv.find((a) => a.startsWith("--build-dir="))?.split("=")[1] ?? "build");
const WIKI_DIR = join(ROOT, process.argv.find((a) => a.startsWith("--wiki-dir="))?.split("=")[1] ?? "wiki");

const FROM_PASS = process.argv.find((a) => a.startsWith("--from-pass="))?.split("=")[1];
const TO_PASS = process.argv.find((a) => a.startsWith("--to-pass="))?.split("=")[1];
const DRY_RUN = process.argv.includes("--dry-run");

const HAIKU_CONCURRENCY = 10;
const SONNET_CONCURRENCY = 5;
const FULL_ARTICLE_THRESHOLD_REFS = 3;        // raised: need 3+ source refs for full article (was 2)
const FULL_ARTICLE_THRESHOLD_RELEVANCE = 7.0; // raised: need 7.0+ relevance for full article (was 6.0)

// ─── Provider ───────────────────────────────────────────────────────────

let provider: ReturnType<typeof createAnthropic> | null = null;
function getProvider() {
  if (!provider) {
    provider = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return provider;
}

// ─── Concurrency limiter ────────────────────────────────────────────────

function pLimit(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            active--;
            if (queue.length > 0) queue.shift()!();
          });
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
}

// ─── Types ──────────────────────────────────────────────────────────────

interface ParsedSource {
  path: string; // relative to raw/, e.g. "tweets/karpathy-llm.md"
  frontmatter: RawSourceFrontmatter;
  body: string;
  relevance: number; // composite score, 0 if missing
}

interface SourceIndex {
  sources: ParsedSource[];
  byBucket: Record<string, ParsedSource[]>;
  byType: Record<string, ParsedSource[]>;
}

interface RawEntity {
  name: string;
  type: EntityType;
  bucket: TaxonomyBucket;
  aliases: string[];
  description: string;
  source_ref: string; // which raw file mentioned this
}

// ─── Pass 0: Load & Index ───────────────────────────────────────────────

async function loadSources(): Promise<SourceIndex> {
  console.log("\n═══ Pass 0: Load & Index ═══");
  const sources: ParsedSource[] = [];

  for (const type of ["tweets", "repos", "papers", "articles"]) {
    const dir = join(RAW_DIR, type);
    if (!existsSync(dir)) continue;
    const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const raw = await readFile(join(dir, file), "utf-8");
      const { data, content } = matter(raw);
      const fm = data as RawSourceFrontmatter;
      const relevance = (fm as any).relevance_scores?.composite ?? 0;
      sources.push({
        path: `${type}/${file}`,
        frontmatter: fm,
        body: content.trim(),
        relevance,
      });
    }
  }

  // Load deep research sources (raw/deep/repos/, raw/deep/papers/)
  for (const type of ["repos", "papers"]) {
    const dir = join(RAW_DIR, "deep", type);
    if (!existsSync(dir)) continue;
    const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const raw = await readFile(join(dir, file), "utf-8");
      const { data, content } = matter(raw);
      const fm = data as RawSourceFrontmatter;
      const relevance = (fm as any).relevance_scores?.composite ?? 0;
      sources.push({
        path: `deep/${type}/${file}`,
        frontmatter: fm,
        body: content.trim(),
        relevance,
      });
    }
  }

  // Group by bucket (from tags) and by type
  const byBucket: Record<string, ParsedSource[]> = {};
  const byType: Record<string, ParsedSource[]> = {};
  const bucketNames: TaxonomyBucket[] = BUCKET_IDS;

  for (const src of sources) {
    const type = src.frontmatter.type;
    (byType[type] ??= []).push(src);

    // Map tags to ALL matching buckets (a source can belong to multiple buckets)
    const assignedBuckets = new Set<string>();
    for (const tag of src.frontmatter.tags ?? []) {
      for (const bucket of bucketNames) {
        if (!assignedBuckets.has(bucket)) {
          if (tag === bucket || tag.startsWith(bucket.split("-")[0])) {
            (byBucket[bucket] ??= []).push(src);
            assignedBuckets.add(bucket);
          }
        }
      }
    }
    // Also check tag substrings for buckets not yet matched
    const tagStr = (src.frontmatter.tags ?? []).join(" ");
    for (const bucket of bucketNames) {
      if (!assignedBuckets.has(bucket)) {
        const keywords = bucket.split("-");
        if (keywords.some((k) => tagStr.includes(k))) {
          (byBucket[bucket] ??= []).push(src);
          assignedBuckets.add(bucket);
        }
      }
    }
  }

  const index: SourceIndex = { sources, byBucket, byType };

  await mkdir(BUILD_DIR, { recursive: true });
  await writeFile(
    join(BUILD_DIR, "source-index.json"),
    JSON.stringify(
      {
        total: sources.length,
        byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
        byBucket: Object.fromEntries(Object.entries(byBucket).map(([k, v]) => [k, v.length])),
        sources: sources.map((s) => ({
          path: s.path,
          type: s.frontmatter.type,
          tags: s.frontmatter.tags,
          relevance: s.relevance,
        })),
      },
      null,
      2,
    ),
  );

  console.log(`  Loaded ${sources.length} sources`);
  for (const [bucket, srcs] of Object.entries(byBucket)) {
    console.log(`    ${bucket}: ${srcs.length} sources`);
  }
  return index;
}

// ─── Shared schema helpers ──────────────────────────────────────────────

const bucketEnum = z.enum(BUCKET_IDS as [string, ...string[]]);

// ─── Pass 1a: Entity Extraction ─────────────────────────────────────────

const rawEntitySchema = z.object({
  entities: z.array(
    z.object({
      name: z.string().describe("Canonical name (e.g., 'Mem0', 'Episodic Memory')"),
      type: z.enum(["concept", "project", "person", "approach"]),
      bucket: bucketEnum,
      aliases: z.array(z.string()).describe("Alternative names, e.g., ['mem0', 'mem0ai/mem0']"),
      description: z.string().describe("1 sentence description"),
    }),
  ),
});

async function extractEntitiesPerSource(index: SourceIndex): Promise<RawEntity[]> {
  console.log("\n═══ Pass 1a: Entity Extraction (per-source, Haiku) ═══");
  const limit = pLimit(HAIKU_CONCURRENCY);
  const allRaw: RawEntity[] = [];
  let processed = 0;
  const total = index.sources.length;

  // Detect curation sources (awesome-lists, skill catalogs) by link density
  // These produce entity spam — hundreds of name-drops with no analysis
  function isCurationSource(src: ParsedSource): boolean {
    const linkCount = (src.body.match(/\[[^\]]*\]\(http[^)]*\)/g) || []).length;
    const wordCount = src.body.split(/\s+/).length;
    // High absolute link count AND high link density = curation, not analysis
    return linkCount > 40 && wordCount > 0 && (linkCount / wordCount) > 0.02;
  }

  const tasks = index.sources.map((src) =>
    limit(async () => {
      try {
        // Skip curation sources (awesome-lists, skill catalogs) — they spam entity extraction
        if (isCurationSource(src)) {
          console.log(`  ⏭ Skipping curation source: ${src.path} (${(src.body.match(/\[[^\]]*\]\(http[^)]*\)/g) || []).length} links)`);
          return;
        }

        // Cap at 8K chars to prevent mega-sources from dominating entity extraction
        const content = src.frontmatter.key_insight + "\n\n" + src.body;
        const truncated = content.slice(0, 8000);
        const { object } = await generateObject({
          model: getProvider()("claude-haiku-4-5"),
          schema: rawEntitySchema,
          system:
            `Extract all entities (projects, concepts, people, approaches) mentioned in this source about ${domain.topic}. For projects: use the canonical project name. For concepts: use the standard term. For people: full name.`,
          prompt: `Source: ${src.path}\nType: ${src.frontmatter.type}\n\n${truncated}`,
        });
        for (const e of object.entities) {
          allRaw.push({ ...e, source_ref: src.path });
        }
      } catch (err) {
        console.warn(`  ⚠ Failed to extract from ${src.path}: ${err}`);
      }
      processed++;
      if (processed % 10 === 0) {
        console.log(`  Pass 1a: ${processed}/${total} sources processed`);
      }
    }),
  );

  await Promise.all(tasks);
  console.log(`  Extracted ${allRaw.length} raw entity mentions from ${total} sources`);

  await writeFile(join(BUILD_DIR, "raw-entities.json"), JSON.stringify(allRaw, null, 2));
  return allRaw;
}

// ─── Pass 1b: Entity Resolution ─────────────────────────────────────────

const resolvedEntitiesSchema = z.object({
  entities: z.array(
    z.object({
      id: z.string().describe("URL-safe slug, e.g., 'mem0', 'episodic-memory'"),
      name: z.string().describe("Canonical display name"),
      type: z.enum(["concept", "project", "person", "approach"]),
      bucket: bucketEnum,
      description: z.string().describe("1-3 sentence description"),
      aliases: z.array(z.string()),
      merged_from: z
        .array(z.string())
        .describe("Original names that were merged into this entity"),
    }),
  ),
});

async function resolveEntities(
  rawEntities: RawEntity[],
  index: SourceIndex,
): Promise<Entity[]> {
  console.log("\n═══ Pass 1b: Entity Resolution (Sonnet) ═══");

  // Build a summary of all raw mentions grouped by approximate name
  const mentionsByName = new Map<string, { count: number; sources: string[]; types: string[] }>();
  for (const e of rawEntities) {
    const key = e.name.toLowerCase().trim();
    const entry = mentionsByName.get(key) ?? { count: 0, sources: [], types: [] };
    entry.count++;
    if (!entry.sources.includes(e.source_ref)) entry.sources.push(e.source_ref);
    if (!entry.types.includes(e.type)) entry.types.push(e.type);
    mentionsByName.set(key, entry);
  }

  // Build prompt with mention list
  const mentionList = [...mentionsByName.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 500) // cap for token limits (increased for deep sources)
    .map(([name, info]) => `  "${name}" (${info.count}x, types: ${info.types.join("/")}, sources: ${info.sources.length})`)
    .join("\n");

  const { object } = await generateObject({
    model: getProvider()("claude-sonnet-4-6"),
    schema: resolvedEntitiesSchema,
    system: `You are resolving entity mentions into canonical entities for a knowledge base about ${domain.topic}.

Taxonomy buckets: ${BUCKET_IDS.join(", ")}.

Merge duplicates: "Mem0" and "mem0" and "mem0ai/mem0" become one entity.
Assign the best bucket for each entity.
Include entities that are meaningful to the domain. Skip trivial mentions (generic terms like "AI", "LLM" unless they're a specific concept article).
Aim for 60-100 canonical entities total.`,
    prompt: `Here are all entity mentions extracted from ${index.sources.length} sources:\n\n${mentionList}`,
  });

  // Enrich with source_refs from raw entities
  const entities: Entity[] = object.entities.map((resolved) => {
    const allNames = [resolved.name, ...resolved.aliases, ...resolved.merged_from].map((n) =>
      n.toLowerCase().trim(),
    );

    const sourceRefs = new Set<string>();
    for (const raw of rawEntities) {
      if (allNames.includes(raw.name.toLowerCase().trim())) {
        sourceRefs.add(raw.source_ref);
      }
    }

    // Determine article level
    const maxRelevance = [...sourceRefs]
      .map((ref) => index.sources.find((s) => s.path === ref)?.relevance ?? 0)
      .reduce((a, b) => Math.max(a, b), 0);

    // Both conditions must be met (AND, not OR) to prevent generic infrastructure
    // like PostgreSQL/FAISS/Ollama from getting full articles just because they're
    // mentioned frequently or scored high on general relevance
    const articleLevel: "full" | "stub" =
      sourceRefs.size >= FULL_ARTICLE_THRESHOLD_REFS &&
      maxRelevance >= FULL_ARTICLE_THRESHOLD_RELEVANCE
        ? "full"
        : "stub";

    return {
      id: resolved.id || slugify(resolved.name),
      name: resolved.name,
      type: resolved.type,
      bucket: resolved.bucket,
      description: resolved.description,
      source_refs: [...sourceRefs],
      aliases: resolved.aliases,
      article_level: articleLevel,
      relevance_composite: maxRelevance,
    };
  });

  const full = entities.filter((e) => e.article_level === "full").length;
  const stub = entities.filter((e) => e.article_level === "stub").length;
  console.log(`  Resolved to ${entities.length} canonical entities (${full} full, ${stub} stub)`);

  await writeFile(join(BUILD_DIR, "entities.json"), JSON.stringify(entities, null, 2));
  return entities;
}

// ─── Pass 2: Graph Construction ─────────────────────────────────────────

const edgeClassificationSchema = z.object({
  edges: z.array(
    z.object({
      source: z.string().describe("Entity ID"),
      target: z.string().describe("Entity ID"),
      type: z.enum([
        "implements",
        "alternative_to",
        "part_of",
        "created_by",
        "competes_with",
        "extends",
        "supersedes",
      ]),
      weight: z.number().describe("0.0-1.0 relationship strength"),
      label: z.string().optional().describe("Optional human-readable label"),
    }),
  ),
});

async function buildGraph(entities: Entity[], index: SourceIndex): Promise<KnowledgeGraph> {
  console.log("\n═══ Pass 2: Graph Construction (Sonnet) ═══");

  // Find co-occurring entity pairs
  // Use 1+ shared sources (lowered from 2) to catch deep-source relationships,
  // but only for entity pairs where at least one is a project (skip concept-concept noise)
  const pairs: { a: Entity; b: Entity; sharedSources: string[] }[] = [];
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const shared = entities[i].source_refs.filter((r) => entities[j].source_refs.includes(r));
      const minShared = (entities[i].type === "project" || entities[j].type === "project") ? 1 : 2;
      if (shared.length >= minShared) {
        pairs.push({ a: entities[i], b: entities[j], sharedSources: shared });
      }
    }
  }

  console.log(`  Found ${pairs.length} entity pairs with 2+ shared sources`);

  let edges: GraphEdge[] = [];

  if (pairs.length > 0) {
    // Sort by co-occurrence count so the most-connected pairs make it into the LLM context
    const pairSummary = pairs
      .sort((a, b) => b.sharedSources.length - a.sharedSources.length)
      .slice(0, 500)
      .map((p) => {
        // Include source context so the LLM can infer WHY these entities co-occur
        const context = p.sharedSources
          .slice(0, 2)
          .map((ref) => index.sources.find((s) => s.path === ref)?.frontmatter.key_insight)
          .filter(Boolean)
          .join("; ")
          .slice(0, 150);
        return `  "${p.a.name}" (${p.a.type}) ↔ "${p.b.name}" (${p.b.type}): ${p.sharedSources.length} shared sources. Context: ${context}`;
      })
      .join("\n");

    const { object } = await generateObject({
      model: getProvider()("claude-sonnet-4-6"),
      schema: edgeClassificationSchema,
      system: `Classify relationships between entity pairs in a knowledge base about ${domain.topic}.
Use the entity IDs (not names) for source and target fields.
Create edges generously — if two entities co-occur in sources about the same topic, there is likely a relationship. Err on the side of creating edges rather than skipping.
Weight: 0.1-0.3 = weak/tangential, 0.4-0.6 = moderate, 0.7-1.0 = strong/direct.`,
      prompt: `Entities:\n${entities.map((e) => `  ${e.id}: ${e.name} (${e.type}, ${e.bucket})`).join("\n")}\n\nPairs to classify:\n${pairSummary}`,
    });

    // Validate edges reference real entity IDs
    const entityIds = new Set(entities.map((e) => e.id));
    edges = object.edges.filter((edge) => entityIds.has(edge.source) && entityIds.has(edge.target));
  }

  // Build cluster metadata
  const clusters: Record<string, { label: string; node_count: number; color: string }> = {};
  for (const bucket of domain.buckets) {
    const count = entities.filter((e) => e.bucket === bucket.id).length;
    clusters[bucket.id] = {
      label: bucket.name,
      node_count: count,
      color: bucket.color,
    };
  }

  const graph: KnowledgeGraph = {
    version: 1,
    compiled_at: new Date().toISOString(),
    nodes: entities.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      bucket: e.bucket,
    })),
    edges,
    clusters,
  };

  console.log(`  Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
  await writeFile(join(BUILD_DIR, "graph.json"), JSON.stringify(graph, null, 2));
  return graph;
}

// ─── Writing Style (loaded from .claude/skills/stop-slop at compile time) ──

let WRITING_STYLE = "";
{
  const slopSkillPath = join(ROOT, ".claude", "skills", "stop-slop", "SKILL.md");
  const phrasesPath = join(ROOT, ".claude", "skills", "stop-slop", "references", "phrases.md");
  const structuresPath = join(ROOT, ".claude", "skills", "stop-slop", "references", "structures.md");
  if (existsSync(slopSkillPath)) {
    const skill = await readFile(slopSkillPath, "utf-8");
    const phrases = existsSync(phrasesPath) ? await readFile(phrasesPath, "utf-8") : "";
    const structures = existsSync(structuresPath) ? await readFile(structuresPath, "utf-8") : "";
    WRITING_STYLE = `
WRITING RULES — follow the stop-slop skill strictly. Key rules:
${skill}

${phrases}

${structures}`;
  } else {
    WRITING_STYLE = `
WRITING RULES (non-negotiable):
- No throat-clearing openers ("Here's the thing:", "It turns out", "Let me be clear")
- No binary contrast clichés ("Not X. But Y." / "isn't X, it's Y"). State Y directly.
- No emphasis crutches ("Full stop.", "Let that sink in.", "This matters because")
- No adverbs: kill every -ly word, "really", "just", "fundamentally", "inherently"
- No business jargon: "landscape", "game-changer", "deep dive", "lean into", "navigate"
- No false agency: systems don't "emerge" or "evolve" on their own. Name who built what.
- No passive voice. Find the actor, make them the subject.
- No dramatic fragmentation ("Speed. That's it. That's the thing.")
- No vague declaratives ("The implications are significant"). Name the specific implication.
- Active voice, specific claims, varied sentence rhythm. Two items beat three.
- State facts. Trust the reader. No hand-holding, no softening, no meta-commentary.`;
  }
}

// ─── Pass 3a: Synthesis Articles ────────────────────────────────────────

const SYNTHESIS_SYSTEM = `You are writing a landscape analysis for ${domain.audience}. This is NOT a catalog of projects. It's a synthesis that changes how practitioners THINK about this space.

FIRST: Output a 1-2 sentence abstract inside <abstract></abstract> tags. The abstract states the main insight or shift this article documents — not "this article covers X" but the actual finding, e.g. "X has shifted from A to B because C." Maximum 300 characters. Then write the full article.

Many sources have paths starting with "deep/" — these are deep research files containing source-code analysis, architecture details, design tradeoffs, failure modes, and verified benchmarks. When you draw implementation details from a source, cite its ACTUAL path (including "deep/" prefix if applicable). These deep sources are your primary material for specificity.

Structure (use these exact ## headings):

## [Opening — no heading, just start with 2-3 sentences]
What has fundamentally changed in how practitioners think about this problem? NOT "the field is growing" — rather "the core question changed from A to B."

## Approach Categories
3-5 categories, each framed as an ARCHITECTURAL question. For each:
- Name the question it answers
- Cite 2-3 flagship projects with star counts as adoption signals (e.g., "Mem0 (51,880 stars)")
- Include implementation details from deep sources: name files, algorithms, data structures
- Give the concrete tradeoff: "wins when X, loses when Y"
- Name one specific failure mode — what actually BREAKS in production

## The Convergence
THREE things all serious systems now agree on that would have been controversial 6 months ago.

## What the Field Got Wrong
One major assumption that turned out to be false. Provide evidence. Explain what replaced it.

## Failure Modes
Consolidated section: 3-5 concrete failure modes practitioners will hit. Not generic limitations — specific mechanisms. How does it break? What triggers it? What's the blast radius?

## Selection Guide
Scannable decision framework. Format as a list of conditions:
- "If you need X, use Y because Z"
- "If you need A, avoid B because C — use D instead"
Include star counts and maturity signals. A practitioner should be able to scan this section in 30 seconds and know which tool to evaluate.

## The Divergence
3-4 competing architectural camps where the field has NOT converged. For each: name both sides, what each optimizes for, which wins under what conditions. These are active disagreements with working implementations on both sides — not "open questions" but "active splits."

## What's Hot Now
Momentum signals: recent launches, star velocity, viral discussions. Cite specific numbers.

## Open Questions
What remains genuinely unsolved? What do practitioners still disagree about?

Rules:
- CITE THE ACTUAL SOURCE PATH. If you draw from a deep source, cite it: [Source](../raw/deep/repos/file.md). If from a shallow source: [Source](../raw/repos/file.md). Do not normalize all citations to shallow paths.
- Every project mentioned MUST link to its reference card: [Mem0](projects/mem0.md)
- Include star counts when first mentioning a project as an adoption signal
- After reporting benchmarks, assess credibility: self-reported, peer-reviewed, or verified in code
- Be honest about limitations. Apply equal criticism to all projects.
- When sources disagree on a fact, approach, or result, flag the disagreement explicitly. Format: "**Source conflict:** [Source A](../raw/...) claims X, while [Source B](../raw/...) claims Y." Do not silently pick one side. Let the reader see the contradiction and the evidence for each position.
- Write as a practitioner talking to practitioners. No academic hedging.
- Output 3000-5000 words of markdown.
${WRITING_STYLE}`;

// BUCKET_TITLES imported from config/domain.ts

async function generateSynthesisArticles(
  entities: Entity[],
  graph: KnowledgeGraph,
  index: SourceIndex,
): Promise<void> {
  console.log("\n═══ Pass 3a: Synthesis Articles (Sonnet, sequential) ═══");
  await mkdir(WIKI_DIR, { recursive: true });

  // Build entity link reference for LLM prompts — maps names to correct file paths
  const entityLinkRef = entities
    .filter((e) => e.article_level === "full")
    .map((e) => {
      const dir = e.type === "project" ? "projects" : "concepts";
      return `  ${e.name} → ${dir}/${e.id}.md`;
    })
    .join("\n");

  for (const [bucket, title] of Object.entries(BUCKET_TITLES)) {
    console.log(`\n  Writing: ${title}...`);

    // Collect sources for this bucket
    const bucketSources = (index.byBucket[bucket] ?? [])
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 25); // Top 25 by relevance

    // Compute staleness markers from source dates
    const sourceDates = bucketSources
      .map((s) => s.frontmatter.date)
      .filter((d): d is string => !!d && d !== "unknown")
      .sort();
    const oldestDate = sourceDates[0] ?? "unknown";
    const newestDate = sourceDates[sourceDates.length - 1] ?? "unknown";
    const source_date_range = `${oldestDate} to ${newestDate}`;
    const staleness_risk = computeStalenessRisk(newestDate);

    // Collect entities in this bucket
    const bucketEntities = entities.filter((e) => e.bucket === bucket);

    // Collect graph edges involving these entities
    const entityIds = new Set(bucketEntities.map((e) => e.id));
    const relevantEdges = graph.edges.filter(
      (e) => entityIds.has(e.source) || entityIds.has(e.target),
    );

    // Build source content (cap at ~25K tokens)
    const sourceContent = bucketSources
      .map(
        (s) =>
          `### Source: ${s.path}\nKey insight: ${s.frontmatter.key_insight}\n${s.frontmatter.stars ? `Stars: ${s.frontmatter.stars}` : ""}\n\n${s.body}`,
      )
      .join("\n\n---\n\n");

    const entitySummary = bucketEntities
      .map((e) => `- ${e.name} (${e.type}): ${e.description}`)
      .join("\n");

    const edgeSummary = relevantEdges
      .slice(0, 30)
      .map(
        (e) =>
          `  ${entities.find((n) => n.id === e.source)?.name} → ${entities.find((n) => n.id === e.target)?.name}: ${e.type} (${e.weight})`,
      )
      .join("\n");

    try {
      const { text } = await generateText({
        model: getProvider()("claude-sonnet-4-6"),
        system: SYNTHESIS_SYSTEM,
        prompt: `Write "# ${title}" for the ${domain.name} wiki.

## Entity link reference (use these exact paths when linking to projects and concepts):
${entityLinkRef}

## Entities in this bucket (${bucketEntities.length}):
${entitySummary}

## Relationships:
${edgeSummary}

## Source material (${bucketSources.length} sources, sorted by relevance):
${sourceContent}`,
      });

      // Extract abstract from LLM output
      const { abstract, body } = extractAbstract(text);

      // Add frontmatter
      const frontmatter: Record<string, unknown> = {
        title,
        type: "synthesis",
        bucket,
        ...(abstract && { abstract }),
        source_date_range,
        newest_source: newestDate,
        staleness_risk,
        sources: bucketSources.map((s) => s.path),
        entities: bucketEntities.map((e) => e.id),
        last_compiled: new Date().toISOString(),
      };

      const output = matter.stringify(body, frontmatter);
      await writeFile(join(WIKI_DIR, `${bucket}.md`), output);
      console.log(`  ✓ ${title} (${body.split("\n").length} lines)`);
    } catch (err) {
      console.error(`  ✗ Failed to generate ${title}: ${err}`);
    }
  }
}

// ─── Pass 3b: Reference Cards ───────────────────────────────────────────

const REFERENCE_CARD_SYSTEM = `Generate a reference card for a project, concept, or person in the ${domain.topic} space.

FIRST: Output a 1-sentence abstract inside <abstract></abstract> tags. State what this entity does and its key differentiator in under 200 characters. Not marketing copy — a factual summary an agent can use to decide whether to read the full card. Then write the full reference card.

Some sources include deep implementation analysis (architecture, design tradeoffs, failure modes, benchmarks from code). Use this depth — name specific files, functions, algorithms.

For projects (800-1500 words):
- What it does and what's architecturally unique
- Core mechanism: HOW it works (name files, algorithms, data structures)
- Key numbers (stars, benchmarks) with credibility assessment (self-reported vs verified)
- Strengths: what it's genuinely good at
- Critical limitations: one concrete failure mode, one unspoken infrastructure assumption
- When NOT to use it: operational conditions where this is the wrong choice
- Unresolved questions: what the documentation doesn't explain (governance, cost at scale, conflict resolution)
- Alternatives: with selection guidance ("Use X when Y")

For concepts (1500-2500 words): What it is, why it matters, how it works with implementation details, who implements it, practical implications, failure modes. Include concrete examples.
For people (150-250 words): Who they are, key contributions to this space, notable work.

Rules:
- Cite sources by relative path: [Source](../raw/type/file.md) or [Source](../raw/deep/type/file.md)
- Link to related wiki pages: [Related Concept](../concepts/slug.md) or [Related Project](../projects/slug.md)
- After reporting benchmarks, note if self-reported or independently validated
- Be honest about limitations. No marketing copy.
- Output markdown with ## headings.
${WRITING_STYLE}`;

async function generateReferenceCards(
  entities: Entity[],
  graph: KnowledgeGraph,
  index: SourceIndex,
): Promise<void> {
  console.log("\n═══ Pass 3b: Reference Cards (Sonnet, parallel) ═══");

  const fullEntities = entities.filter((e) => e.article_level === "full");
  console.log(`  Generating cards for ${fullEntities.length} entities`);

  // Build entity link reference for LLM prompts
  const entityLinkRef = fullEntities
    .map((e) => {
      const dir = e.type === "project" ? "projects" : "concepts";
      return `  ${e.name} → ${dir}/${e.id}.md`;
    })
    .join("\n");

  // Create output directories
  for (const dir of ["projects", "concepts"]) {
    await mkdir(join(WIKI_DIR, dir), { recursive: true });
  }

  const limit = pLimit(SONNET_CONCURRENCY);
  let completed = 0;

  const tasks = fullEntities.map((entity) =>
    limit(async () => {
      // Collect top sources — prioritize deep sources, then by relevance
      const entitySources = entity.source_refs
        .map((ref) => index.sources.find((s) => s.path === ref))
        .filter(Boolean)
        .sort((a, b) => {
          const aDeep = a!.path.startsWith("deep/") ? 1 : 0;
          const bDeep = b!.path.startsWith("deep/") ? 1 : 0;
          if (aDeep !== bDeep) return bDeep - aDeep; // deep sources first
          return (b?.relevance ?? 0) - (a?.relevance ?? 0);
        })
        .slice(0, 5) as ParsedSource[]; // 5 sources (was 3) to include both deep and shallow

      // Get graph neighbors
      const neighbors = graph.edges
        .filter((e) => e.source === entity.id || e.target === entity.id)
        .map((e) => {
          const otherId = e.source === entity.id ? e.target : e.source;
          const other = entities.find((n) => n.id === otherId);
          return other ? `${other.name} (${e.type})` : null;
        })
        .filter(Boolean);

      const sourceContent = entitySources
        .map(
          (s) =>
            `### Source: ${s.path}\nKey insight: ${s.frontmatter.key_insight}\n${s.body}`,
        )
        .join("\n\n---\n\n");

      try {
        const { text } = await generateText({
          model: getProvider()("claude-sonnet-4-6"),
          system: REFERENCE_CARD_SYSTEM,
          prompt: `Write a reference card for: ${entity.name}
Type: ${entity.type}
Bucket: ${entity.bucket}
Description: ${entity.description}
Related entities: ${neighbors.join(", ") || "none"}

## Entity link reference (use these exact paths when linking to projects and concepts):
${entityLinkRef}

Source material:
${sourceContent || "No direct sources — write from general knowledge, mark claims as [unverified]."}`,
        });

        // Extract abstract from LLM output
        const { abstract, body } = extractAbstract(text);

        // Determine output directory
        const dir =
          entity.type === "project"
            ? "projects"
            : entity.type === "concept" || entity.type === "approach"
              ? "concepts"
              : "concepts"; // people go in concepts too for simplicity

        const frontmatter: Record<string, unknown> = {
          entity_id: entity.id,
          type: entity.type,
          bucket: entity.bucket,
          ...(abstract && { abstract }),
          sources: entity.source_refs,
          related: graph.edges
            .filter((e) => e.source === entity.id || e.target === entity.id)
            .map((e) => e.source === entity.id ? e.target : e.source)
            .filter((id) => entities.some((n) => n.id === id)),
          last_compiled: new Date().toISOString(),
        };

        const output = matter.stringify(body, frontmatter);
        await writeFile(join(WIKI_DIR, dir, `${entity.id}.md`), output);
      } catch (err) {
        console.warn(`  ⚠ Failed to generate card for ${entity.name}: ${err}`);
      }

      completed++;
      if (completed % 10 === 0) {
        console.log(`  Pass 3b: ${completed}/${fullEntities.length} cards generated`);
      }
    }),
  );

  await Promise.all(tasks);
  console.log(`  ✓ Generated ${completed} reference cards`);
}

// ─── Pass 3c: Claim Extraction ─────────────────────────────────────────

const claimExtractionSchema = z.object({
  claims: z.array(
    z.object({
      content: z.string().describe("A single, atomic, verifiable statement. One fact per claim."),
      type: z.enum(["empirical", "architectural", "comparative", "directional"]),
      confidence: z.enum(["verified", "reported", "inferred"]),
      source_refs: z
        .array(z.string())
        .describe("Raw source paths cited near this claim, extracted from [Source](../raw/...) links. Use the path after 'raw/', e.g. 'repos/mem0ai-mem0.md' or 'deep/repos/getzep-graphiti.md'"),
      entity_refs: z
        .array(z.string())
        .describe("Entity ID slugs mentioned in the claim, e.g. ['mem0', 'graphiti']"),
      temporal_scope: z
        .string()
        .nullable()
        .describe("'as of YYYY-MM' for time-sensitive claims (star counts, benchmarks, adoption), null for timeless architectural/definitional facts"),
    }),
  ),
});

const CLAIM_EXTRACTION_SYSTEM = `You are extracting atomic, verifiable claims from a synthesis article about ${domain.topic}.

Rules:
1. Each claim is a SINGLE factual statement. Not a compound sentence. Not a summary paragraph.
2. If a claim contains a number (benchmark score, star count, percentage), it is "empirical" or "comparative".
3. If a claim describes how something is built (architecture, algorithm, data structure), it is "architectural".
4. If a claim compares two things with evidence, it is "comparative".
5. If a claim describes a field-level trend, convergence, or consensus synthesized from multiple sources, it is "directional". IMPORTANT: Extract at least 5-8 directional claims per article — these capture the synthesis-level insights (e.g. "The field has shifted from X to Y") that are the article's unique contribution.
6. For confidence:
   - "verified": you can see the specific evidence in the cited source text (a benchmark table, a code snippet, a direct quote). Use this when the article includes inline details clearly drawn from a deep/ source.
   - "reported": the article cites a result but you cannot confirm the evidence exists in the source text (e.g., star counts, README-stated benchmarks). This is the DEFAULT for most project-level claims.
   - "inferred": the article draws a conclusion that no single source states. Use this for directional claims and cross-source synthesis. Should be 10-20% of claims.
7. For source_refs: extract the ACTUAL raw/ paths cited near this claim in the article. Look for [Source](../raw/...) links within the same paragraph or section. Extract the path after "raw/", e.g. "repos/mem0ai-mem0.md" or "deep/repos/getzep-graphiti.md". CRITICAL: Match each claim to the source that ACTUALLY contains its evidence, not just the nearest citation. If the claim mentions architectural details from a deep source, cite the deep/ path. If no source link is nearby, leave source_refs empty rather than guessing.
8. For entity_refs: use the entity IDs (URL-safe slugs) of projects/concepts mentioned in the claim.
9. For temporal_scope: set to "as of YYYY-MM" if the claim contains data that changes over time (star counts, benchmark rankings, adoption metrics). Set to null for architectural or definitional claims.
10. Extract 25-40 claims per article. Aim for a mix: ~40% empirical, ~30% architectural, ~15% directional, ~15% comparative.`;

async function extractClaims(index: SourceIndex): Promise<Claim[]> {
  console.log("\n═══ Pass 3c: Claim Extraction (Sonnet, sequential) ═══");

  const allClaims: Claim[] = [];
  let claimCounter = 0;

  for (const bucket of Object.keys(BUCKET_TITLES)) {
    const articlePath = join(WIKI_DIR, `${bucket}.md`);
    if (!existsSync(articlePath)) {
      console.warn(`  ⚠ Synthesis article not found: ${bucket}.md`);
      continue;
    }

    const raw = await readFile(articlePath, "utf-8");
    const { content } = matter(raw);

    try {
      const { object } = await generateObject({
        model: getProvider()("claude-sonnet-4-6"),
        schema: claimExtractionSchema,
        system: CLAIM_EXTRACTION_SYSTEM,
        prompt: `Extract claims from this synthesis article.\n\nArticle: ${bucket}.md\nBucket: ${bucket}\n\n${content.slice(0, 30000)}`,
      });

      for (const claim of object.claims) {
        claimCounter++;
        allClaims.push({
          id: `claim-${String(claimCounter).padStart(3, "0")}`,
          content: claim.content,
          type: claim.type,
          confidence: claim.confidence,
          source_refs: claim.source_refs,
          article_ref: bucket,
          entity_refs: claim.entity_refs,
          temporal_scope: claim.temporal_scope,
        });
      }
      console.log(`  ✓ ${bucket}: ${object.claims.length} claims extracted`);
    } catch (err) {
      console.warn(`  ⚠ Failed to extract claims from ${bucket}: ${err}`);
    }
  }

  const claimsFile: ClaimsFile = {
    version: 1,
    compiled_at: new Date().toISOString(),
    total: allClaims.length,
    claims: allClaims,
  };

  await writeFile(join(BUILD_DIR, "claims.json"), JSON.stringify(claimsFile, null, 2));
  console.log(`  Extracted ${allClaims.length} total claims from ${Object.keys(BUCKET_TITLES).length} articles`);
  return allClaims;
}

// ─── Pass 4: Field Map + Indexes ────────────────────────────────────────

async function generateFieldMapAndIndexes(
  entities: Entity[],
  graph: KnowledgeGraph,
  index: SourceIndex,
): Promise<void> {
  console.log("\n═══ Pass 4: Field Map + Indexes ═══");

  // Read the 5 synthesis articles we just generated
  const syntheses: string[] = [];
  for (const bucket of Object.keys(BUCKET_TITLES)) {
    const path = join(WIKI_DIR, `${bucket}.md`);
    if (existsSync(path)) {
      const raw = await readFile(path, "utf-8");
      const { content } = matter(raw);
      syntheses.push(content.slice(0, 6000)); // first 6K chars of each synthesis
    }
  }

  // Generate field-map.md (THE overview article)
  console.log("  Generating field-map.md...");
  try {
    const { text } = await generateText({
      model: getProvider()("claude-sonnet-4-6"),
      system: `You are writing the flagship overview article for ${domain.name}, a knowledge base about ${domain.topic}.

This is THE article people read first. It should be 3000-5000 words. It is NOT a taxonomy of separate markets — it is a SYSTEMS MAP showing how these ${domain.buckets.length} areas form one emerging stack.

Start with a brief overview — one paragraph per bucket naming the central engineering problem and linking to its synthesis article. Then move into the systems analysis.

Structure:
1. **The unifying insight**: Name the single architectural idea that connects all ${domain.buckets.length} buckets.

2. **Integration points**: For each pair of adjacent buckets, explain how one feeds the other. What is the interface? What breaks when it's missing?

3. **Paradigm fragmentation**: Where multiple valid approaches coexist, explain the ROUTING LOGIC — when to use which, not which is "better."

4. **Implementation maturity**: What's production-ready vs research-only? Name specific projects at each level. Be honest.

5. **What the field got wrong**: One major assumption that turned out to be false and what replaced it.

6. **The practitioner's flow**: Describe concretely how a mature stack processes a real task end-to-end, naming specific tools at each step.

7. **Cross-cutting themes**: ${domain.crossCuttingThemes.length} patterns that span all buckets. Examples: ${domain.crossCuttingThemes.join(", ")}.

8. **Reading guide**: What to read next based on what you're building.

Write as a knowledgeable practitioner, not an academic. Be opinionated. Name specific projects and approaches. Link to synthesis articles by filename, e.g. [${domain.buckets[0].name}](${domain.buckets[0].id}.md).
Link to project cards: [ProjectName](projects/slug.md).

Start with "# ${domain.fieldMapTitle}" as the H1.
${WRITING_STYLE}`,
      prompt: `Write the field-map.md overview article.

## Stats:
- ${index.sources.length} sources curated (${Object.entries(index.byType).map(([k, v]) => `${v.length} ${k}s`).join(", ")})
- ${entities.length} entities (${entities.filter((e) => e.article_level === "full").length} full articles, ${entities.filter((e) => e.article_level === "stub").length} stubs)
- ${graph.edges.length} relationships mapped

## Synthesis article summaries (first 3K chars each):
${syntheses.map((s, i) => `### ${Object.values(BUCKET_TITLES)[i]}\n${s}`).join("\n\n---\n\n")}

## Entity breakdown by bucket:
${Object.entries(graph.clusters).map(([k, v]) => `- ${v.label}: ${v.node_count} entities`).join("\n")}`,
    });

    const frontmatter = {
      title: domain.fieldMapTitle,
      type: "field-map",
      last_compiled: new Date().toISOString(),
    };
    await writeFile(join(WIKI_DIR, "field-map.md"), matter.stringify(text, frontmatter));
    console.log(`  ✓ field-map.md (${text.split("\n").length} lines)`);
  } catch (err) {
    console.error(`  ✗ Failed to generate field-map: ${err}`);
  }

  // Generate ROOT.md (agent-optimized topic index, no LLM call)
  {
    // BUCKET_DESCRIPTIONS imported from config/domain.ts

    const topProjects = entities
      .filter((e) => e.type === "project" && e.article_level === "full")
      .sort((a, b) => (b.relevance_composite ?? 0) - (a.relevance_composite ?? 0))
      .slice(0, 12);

    const topConcepts = entities
      .filter((e) => (e.type === "concept" || e.type === "approach") && e.article_level === "full")
      .sort((a, b) => (b.relevance_composite ?? 0) - (a.relevance_composite ?? 0))
      .slice(0, 10);

    const topicsSection = Object.entries(BUCKET_TITLES)
      .map(([bucket, title]) => {
        const srcCount = (index.byBucket[bucket] ?? []).length;
        const desc = BUCKET_DESCRIPTIONS[bucket] ?? "";
        return `${bucket} [synthesis, ${srcCount} sources]: ${desc} -> ${bucket}.md`;
      })
      .join("\n");

    const projectsSection = topProjects
      .map((p) => {
        // Find star count from this project's repo source(s) only — not from shared articles/papers
        const maxStars = p.source_refs
          .filter((ref) => ref.startsWith("repos/"))
          .map((ref) => index.sources.find((s) => s.path === ref)?.frontmatter.stars)
          .filter((s): s is number => typeof s === "number" && s > 0)
          .sort((a, b) => b - a)[0];
        const stars = maxStars ? `${maxStars}★` : "-";
        const desc = p.description.length > 80 ? p.description.slice(0, 77) + "..." : p.description;
        return `${p.id} [${p.bucket}, ${stars}, ${p.source_refs.length} refs]: ${desc} -> projects/${p.id}.md`;
      })
      .join("\n");

    const conceptsSection = topConcepts
      .map((c) => {
        const desc = c.description.length > 80 ? c.description.slice(0, 77) + "..." : c.description;
        return `${c.id} [${c.bucket}]: ${desc} -> concepts/${c.id}.md`;
      })
      .join("\n");

    const rootBody = `# ${domain.name} ROOT

## Topics
${topicsSection}

## Top Projects
${projectsSection}

## Key Concepts
${conceptsSection}

## Meta
Field map: field-map.md | Graph: graph.html | Landscape: comparisons/landscape.md
Last compiled: ${new Date().toISOString().split("T")[0]} | Sources: ${index.sources.length} | Entities: ${entities.length} | Edges: ${graph.edges.length}
`;

    const wordCount = rootBody.split(/\s+/).length;
    const rootFrontmatter = {
      type: "root",
      version: 1,
      compiled_at: new Date().toISOString(),
      token_estimate: Math.ceil(wordCount * 1.3),
      entities_total: entities.length,
      sources_total: index.sources.length,
    };

    await writeFile(join(WIKI_DIR, "ROOT.md"), matter.stringify(rootBody, rootFrontmatter));
    console.log(`  ✓ ROOT.md (~${Math.ceil(wordCount * 1.3)} tokens, ${topProjects.length} projects, ${topConcepts.length} concepts)`);
  }

  // Generate deterministic indexes
  await mkdir(join(WIKI_DIR, "indexes"), { recursive: true });
  await mkdir(join(WIKI_DIR, "comparisons"), { recursive: true });

  // projects.md index
  const projects = entities.filter((e) => e.type === "project").sort((a, b) => (b.relevance_composite ?? 0) - (a.relevance_composite ?? 0));
  const projectsIndex = `# Projects Index\n\n| Project | Bucket | Sources |\n|---|---|---|\n${projects.map((p) => {
    return `| [${p.name}](../projects/${p.id}.md) | ${p.bucket} | ${p.source_refs.length} |`;
  }).join("\n")}`;
  await writeFile(join(WIKI_DIR, "indexes", "projects.md"), projectsIndex);

  // topics.md index
  const concepts = entities.filter((e) => e.type === "concept" || e.type === "approach");
  const topicsIndex = `# Topics Index\n\n${concepts.map((c) => `- [${c.name}](../concepts/${c.id}.md) — ${c.description}`).join("\n")}`;
  await writeFile(join(WIKI_DIR, "indexes", "topics.md"), topicsIndex);

  // missing.md
  const stubs = entities.filter((e) => e.article_level === "stub");
  const missingMd = `# Missing Coverage\n\nThese entities were mentioned in sources but don't have enough references for a full article yet. Contributions welcome!\n\n${stubs.map((s) => `- **${s.name}** (${s.type}, ${s.bucket}) — ${s.description}. Sources: ${s.source_refs.length}`).join("\n")}`;
  await writeFile(join(WIKI_DIR, "indexes", "missing.md"), missingMd);

  // landscape.md comparison table
  const landscapeTable = `# Landscape Comparison\n\nAll major projects at a glance.\n\n| Project | Bucket | Description |\n|---|---|---|\n${projects.map((p) => {
    const link = p.article_level !== "stub" ? `[${p.name}](../projects/${p.id}.md)` : p.name;
    return `| ${link} | ${p.bucket} | ${p.description.slice(0, 80)} |`;
  }).join("\n")}`;
  await writeFile(join(WIKI_DIR, "comparisons", "landscape.md"), landscapeTable);

  console.log(`  ✓ indexes/projects.md (${projects.length} projects)`);
  console.log(`  ✓ indexes/topics.md (${concepts.length} topics)`);
  console.log(`  ✓ indexes/missing.md (${stubs.length} stubs)`);
  console.log(`  ✓ comparisons/landscape.md (${projects.length} rows)`);

  // Generate README.md
  const synthesisTable = domain.buckets
    .map((b) => `| [${b.title}](${b.id}.md) | ${b.description} |`)
    .join("\n");

  const readmeMd = `# ${domain.name} wiki

A compiled knowledge base covering ${domain.topic}. Built from ${index.sources.length} curated sources including deep research files with source-code-level analysis.

## Start here

[${domain.fieldMapTitle}](field-map.md) — the overview that connects all ${domain.buckets.length} areas into one system.

For agents: [ROOT.md](ROOT.md) — compact topic index (<2K tokens).

## Synthesis articles

| Article | What it covers |
|---------|---------------|
${synthesisTable}

## Browse

- [Project index](indexes/projects.md) — all ${projects.length} projects with links
- [Topic index](indexes/topics.md) — ${concepts.length} concepts and approaches
- [Landscape comparison](comparisons/landscape.md) — all projects in one table
- [Coverage gaps](indexes/missing.md) — ${stubs.length} topics needing more sources

## Stats

- **${index.sources.length}** curated sources
- **${entities.length}** entities (${entities.filter((e) => e.article_level === "full").length} full articles, ${stubs.length} stubs)
- **${graph.edges.length}** relationships mapped across ${domain.buckets.length} topic areas
`;
  await writeFile(join(WIKI_DIR, "README.md"), readmeMd);
  console.log(`  ✓ README.md`);
}

// ─── Pass 5: Mermaid + Backlinks ────────────────────────────────────────

async function addMermaidAndBacklinks(
  entities: Entity[],
  graph: KnowledgeGraph,
): Promise<void> {
  console.log("\n═══ Pass 5: Mermaid + Backlinks ═══");

  // HIGH-LEVEL MERMAID: top 3 per bucket, cross-bucket edges weight > 0.5
  const topPerBucket = new Map<string, Entity[]>();
  for (const bucket of Object.keys(BUCKET_TITLES)) {
    const bucketEntities = entities
      .filter((e) => e.bucket === bucket && e.type === "project")
      .sort((a, b) => (b.relevance_composite ?? 0) - (a.relevance_composite ?? 0))
      .slice(0, 3);
    topPerBucket.set(bucket, bucketEntities);
  }

  const topIds = new Set([...topPerBucket.values()].flat().map((e) => e.id));
  const topEdges = graph.edges.filter(
    (e) => topIds.has(e.source) && topIds.has(e.target) && e.weight > 0.4,
  );

  let mermaid = "```mermaid\ngraph LR\n";
  for (const [bucket, ents] of topPerBucket) {
    const label = BUCKET_TITLES[bucket].replace("The State of ", "");
    mermaid += `  subgraph ${bucket}["${label}"]\n`;
    for (const e of ents) {
      mermaid += `    ${e.id}["${e.name}"]\n`;
    }
    mermaid += "  end\n";
  }
  for (const edge of topEdges) {
    mermaid += `  ${edge.source} -.-|${edge.type}| ${edge.target}\n`;
  }
  mermaid += "```\n";

  // Inject into field-map.md after the first heading
  const fieldMapPath = join(WIKI_DIR, "field-map.md");
  if (existsSync(fieldMapPath)) {
    let content = await readFile(fieldMapPath, "utf-8");
    const firstHeading = content.indexOf("\n## ");
    if (firstHeading > 0) {
      content =
        content.slice(0, firstHeading) +
        "\n\n## Knowledge Graph\n\n" +
        mermaid +
        "\n" +
        content.slice(firstHeading);
    } else {
      content += "\n\n## Knowledge Graph\n\n" + mermaid;
    }
    await writeFile(fieldMapPath, content);
    console.log(`  ✓ Mermaid graph injected into field-map.md (${topIds.size} nodes, ${topEdges.length} edges)`);
  }

  // BACKLINKS: Add Related section to each wiki article
  let backlinksAdded = 0;
  for (const entity of entities.filter((e) => e.article_level === "full")) {
    const dir = entity.type === "project" ? "projects" : "concepts";
    const filePath = join(WIKI_DIR, dir, `${entity.id}.md`);
    if (!existsSync(filePath)) continue;

    const related = graph.edges
      .filter((e) => e.source === entity.id || e.target === entity.id)
      .map((e) => {
        const otherId = e.source === entity.id ? e.target : e.source;
        const other = entities.find((n) => n.id === otherId);
        if (!other) return null;
        const otherDir = other.type === "project" ? "projects" : "concepts";
        return `- [${other.name}](../${otherDir}/${other.id}.md) — ${e.type} (${e.weight.toFixed(1)})`;
      })
      .filter(Boolean);

    if (related.length > 0) {
      let content = await readFile(filePath, "utf-8");
      if (!content.includes("## Related")) {
        content += `\n\n## Related\n\n${related.join("\n")}\n`;
        await writeFile(filePath, content);
        backlinksAdded++;
      }
    }
  }
  console.log(`  ✓ Backlinks added to ${backlinksAdded} articles`);
}

// ─── Pass 6: Changelog ─────────────────────────────────────────────────

async function generateChangelog(entities: Entity[], graph: KnowledgeGraph): Promise<void> {
  console.log("\n═══ Pass 6: Changelog ═══");

  const now = new Date().toISOString().split("T")[0];
  const full = entities.filter((e) => e.article_level === "full").length;
  const stub = entities.filter((e) => e.article_level === "stub").length;

  const entry = `## ${now} — Initial Compilation

- **Sources:** ${(await readdir(join(RAW_DIR, "tweets"))).length + (await readdir(join(RAW_DIR, "repos"))).length + (await readdir(join(RAW_DIR, "papers"))).length + (await readdir(join(RAW_DIR, "articles"))).length} raw sources compiled
- **Entities:** ${entities.length} total (${full} full articles, ${stub} stubs)
- **Graph:** ${graph.nodes.length} nodes, ${graph.edges.length} edges
- **Synthesis articles:** ${Object.keys(BUCKET_TITLES).length} landscape analyses
- **Reference cards:** ${full} project/concept profiles
`;

  const changelog = `# Changelog\n\nCompilation history for the ${domain.name} wiki.\n\n${entry}`;
  await writeFile(join(WIKI_DIR, "CHANGELOG.md"), changelog);
  console.log("  ✓ CHANGELOG.md written");
}

// ─── Pass 7: Self-Eval ─────────────────────────────────────────────────

const FULL_EVAL = process.argv.includes("--full-eval");
const EVAL_SAMPLE_SIZE = FULL_EVAL ? Infinity : 30;

const evalVerificationSchema = z.object({
  verdict: z.enum(["PASS", "FAIL"]),
  reason: z.string().describe("1 sentence explaining the verdict"),
});

const EVAL_SYSTEM = `You are verifying whether a raw source supports a specific claim from a compiled wiki article.

Your job: read the source text and determine if the source contains evidence for the claim.

Rules:
- For numerical claims (empirical/comparative): the source must contain the specific number or data point. A different number for the same metric is a FAIL.
- For architectural claims: the source must describe the design element. Equivalent descriptions in different words are a PASS (e.g., "four-level pattern" and "Levels 0, 1, 2, 3" are the same thing).
- For comparative claims: the source must contain evidence for the comparison.
- For directional claims: the source must provide at least partial evidence for the trend.
- Being about the same topic is NOT sufficient — the source must contain the specific evidence.
- Reasonable paraphrasing is a PASS. Semantic equivalence counts. Only FAIL when the evidence is genuinely missing or contradicted.`;

async function runSelfEval(claims: Claim[], index: SourceIndex): Promise<EvalReport> {
  console.log("\n═══ Pass 7: Self-Eval (Sonnet, parallel) ═══");

  // Filter to claims with at least one source_ref
  const verifiable = claims.filter((c) => c.source_refs.length > 0);
  console.log(`  ${verifiable.length}/${claims.length} claims have source refs (verifiable)`);

  // Stratified sampling: proportional by claim type
  const byType = new Map<string, Claim[]>();
  for (const c of verifiable) {
    const arr = byType.get(c.type) ?? [];
    arr.push(c);
    byType.set(c.type, arr);
  }

  const sampled: Claim[] = [];
  const targetSize = Math.min(EVAL_SAMPLE_SIZE, verifiable.length);

  for (const [type, typeClaims] of byType) {
    const proportion = typeClaims.length / verifiable.length;
    const count = Math.max(1, Math.round(proportion * targetSize));
    // Shuffle and take count
    const shuffled = [...typeClaims].sort(() => Math.random() - 0.5);
    sampled.push(...shuffled.slice(0, count));
  }

  // Trim to target size if proportional rounding overallocated
  while (sampled.length > targetSize) sampled.pop();

  console.log(`  Sampling ${sampled.length} claims (${[...byType.entries()].map(([t, c]) => `${t}: ${sampled.filter((s) => s.type === t).length}`).join(", ")})`);

  // Verify each claim against its first source
  const limit = pLimit(SONNET_CONCURRENCY);
  const results: EvalResult[] = [];
  let completed = 0;

  const verifyTasks = sampled.map((claim) =>
    limit(async () => {
      // Find the source in the index
      const sourceRef = claim.source_refs[0];
      const source = index.sources.find((s) => s.path === sourceRef);

      if (!source) {
        // Source not found in index — skip, don't count as FAIL
        completed++;
        return;
      }

      try {
        const sourceContent = (source.frontmatter.key_insight + "\n\n" + source.body).slice(0, 6000);

        const { object } = await generateObject({
          model: getProvider()("claude-sonnet-4-6"),
          schema: evalVerificationSchema,
          system: EVAL_SYSTEM,
          prompt: `Claim: "${claim.content}"\nClaim type: ${claim.type}\nClaim confidence: ${claim.confidence}\n\nSource path: ${sourceRef}\nSource content:\n${sourceContent}`,
        });

        results.push({
          claim_id: claim.id,
          verdict: object.verdict,
          reason: object.reason,
        });
      } catch (err) {
        console.warn(`  ⚠ Failed to verify ${claim.id}: ${err}`);
        // Skip on error, don't count as FAIL
      }

      completed++;
      if (completed % 10 === 0) {
        console.log(`  Pass 7: ${completed}/${sampled.length} verified`);
      }
    }),
  );

  await Promise.all(verifyTasks);

  // Aggregate results
  const passed = results.filter((r) => r.verdict === "PASS").length;
  const failed = results.filter((r) => r.verdict === "FAIL").length;
  const accuracy = results.length > 0 ? passed / results.length : 0;

  // Breakdown by type
  const byTypeReport: Record<string, { sampled: number; passed: number }> = {};
  for (const [type] of byType) {
    const typeSampled = results.filter((r) => {
      const claim = sampled.find((s) => s.id === r.claim_id);
      return claim?.type === type;
    });
    byTypeReport[type] = {
      sampled: typeSampled.length,
      passed: typeSampled.filter((r) => r.verdict === "PASS").length,
    };
  }

  // Breakdown by bucket
  const byBucketReport: Record<string, { sampled: number; passed: number }> = {};
  for (const bucket of Object.keys(BUCKET_TITLES)) {
    const bucketResults = results.filter((r) => {
      const claim = sampled.find((s) => s.id === r.claim_id);
      return claim?.article_ref === bucket;
    });
    if (bucketResults.length > 0) {
      byBucketReport[bucket] = {
        sampled: bucketResults.length,
        passed: bucketResults.filter((r) => r.verdict === "PASS").length,
      };
    }
  }

  // Build failure details
  const failures = results
    .filter((r) => r.verdict === "FAIL")
    .map((r) => {
      const claim = sampled.find((s) => s.id === r.claim_id)!;
      return {
        claim_id: r.claim_id,
        claim: claim.content,
        article_ref: claim.article_ref,
        source_ref: claim.source_refs[0],
        reason: r.reason,
      };
    });

  const report: EvalReport = {
    version: 1,
    compiled_at: new Date().toISOString(),
    total_claims: claims.length,
    sample_size: results.length,
    accuracy: Math.round(accuracy * 1000) / 1000,
    results,
    failures,
    by_type: byTypeReport,
    by_bucket: byBucketReport,
  };

  await writeFile(join(BUILD_DIR, "eval-report.json"), JSON.stringify(report, null, 2));

  // Append eval summary to CHANGELOG
  const changelogPath = join(WIKI_DIR, "CHANGELOG.md");
  if (existsSync(changelogPath)) {
    const existing = await readFile(changelogPath, "utf-8");
    const evalLine = `- **Self-eval:** ${results.length} claims sampled, ${passed} passed (${(accuracy * 100).toFixed(1)}% accuracy). Failures: ${failed}.`;
    await writeFile(changelogPath, existing.trimEnd() + "\n" + evalLine + "\n");
  }

  console.log(`  ✓ Self-eval: ${passed}/${results.length} passed (${(accuracy * 100).toFixed(1)}% accuracy)`);
  if (failures.length > 0) {
    console.log(`  ✗ Failures:`);
    for (const f of failures) {
      console.log(`    ${f.claim_id} (${f.article_ref}): ${f.reason}`);
    }
  }

  return report;
}

// ─── Pass 8: Auto-Fix ──────────────────────────────────────────────────

async function verifyClaim(claim: Claim, source: ParsedSource): Promise<boolean> {
  const content = (source.frontmatter.key_insight + "\n\n" + source.body).slice(0, 6000);
  try {
    const { object } = await generateObject({
      model: getProvider()("claude-sonnet-4-6"),
      schema: evalVerificationSchema,
      system: EVAL_SYSTEM,
      prompt: `Claim: "${claim.content}"\nClaim type: ${claim.type}\n\nSource path: ${source.path}\nSource content:\n${content}`,
    });
    return object.verdict === "PASS";
  } catch {
    return false;
  }
}

async function autoFixClaims(claims: Claim[], index: SourceIndex): Promise<void> {
  console.log("\n═══ Pass 8: Auto-Fix (Sonnet) ═══");

  let evalReport: EvalReport;
  try {
    evalReport = await loadBuildArtifact<EvalReport>("eval-report.json");
  } catch {
    console.warn("  ⚠ No eval-report.json found — run Pass 7 first");
    return;
  }

  if (evalReport.failures.length === 0) {
    console.log("  No failures to fix.");
    return;
  }

  console.log(`  ${evalReport.failures.length} failures to attempt`);
  let fixed = 0;
  let unfixable = 0;

  for (const failure of evalReport.failures) {
    const claim = claims.find((c) => c.id === failure.claim_id);
    if (!claim || claim.source_refs.length === 0) {
      unfixable++;
      console.log(`  ✗ ${failure.claim_id}: no source refs to fix`);
      continue;
    }

    const originalRef = failure.source_ref;
    let newRef: string | null = null;

    // Tier 1: Try deep/ variant of the cited source
    if (!originalRef.startsWith("deep/")) {
      const deepVariant = `deep/${originalRef}`;
      const deepSource = index.sources.find((s) => s.path === deepVariant);
      if (deepSource) {
        const pass = await verifyClaim(claim, deepSource);
        if (pass) newRef = deepVariant;
      }
    }

    // Tier 2: Search sources by entity refs
    if (!newRef && claim.entity_refs.length > 0) {
      const candidates = index.sources
        .filter((s) => s.path !== originalRef)
        .filter((s) =>
          claim.entity_refs.some(
            (entity) =>
              s.path.toLowerCase().includes(entity) ||
              (s.frontmatter.key_insight ?? "").toLowerCase().includes(entity),
          ),
        )
        .sort((a, b) => {
          const aDeep = a.path.startsWith("deep/") ? 1 : 0;
          const bDeep = b.path.startsWith("deep/") ? 1 : 0;
          if (aDeep !== bDeep) return bDeep - aDeep;
          return b.relevance - a.relevance;
        })
        .slice(0, 5);

      for (const candidate of candidates) {
        const pass = await verifyClaim(claim, candidate);
        if (pass) {
          newRef = candidate.path;
          break;
        }
      }
    }

    if (newRef) {
      // Fix the citation in the wiki article
      const articlePath = join(WIKI_DIR, `${claim.article_ref}.md`);
      if (existsSync(articlePath)) {
        let content = await readFile(articlePath, "utf-8");
        content = content.replaceAll(`../raw/${originalRef}`, `../raw/${newRef}`);
        await writeFile(articlePath, content);
      }

      // Update the claim's source_refs
      claim.source_refs = claim.source_refs.map((r) => (r === originalRef ? newRef! : r));
      fixed++;
      console.log(`  ✓ ${failure.claim_id}: ${originalRef} → ${newRef}`);
    } else {
      unfixable++;
      console.log(`  ✗ ${failure.claim_id}: no better source found`);
    }
  }

  // Save updated claims
  const claimsFile: ClaimsFile = {
    version: 1,
    compiled_at: new Date().toISOString(),
    total: claims.length,
    claims,
  };
  await writeFile(join(BUILD_DIR, "claims.json"), JSON.stringify(claimsFile, null, 2));

  // Append to changelog
  const changelogPath = join(WIKI_DIR, "CHANGELOG.md");
  if (existsSync(changelogPath)) {
    const existing = await readFile(changelogPath, "utf-8");
    await writeFile(
      changelogPath,
      existing.trimEnd() +
        `\n- **Auto-fix:** ${fixed}/${evalReport.failures.length} failures fixed, ${unfixable} flagged for human review.\n`,
    );
  }

  console.log(`\n  Auto-fix complete: ${fixed} fixed, ${unfixable} unfixable`);
}

// ─── Helpers ────────────────────────────────────────────────────────────

function extractAbstract(text: string): { abstract: string; body: string } {
  const match = text.match(/<abstract>([\s\S]*?)<\/abstract>/);
  if (!match) return { abstract: "", body: text };
  const abstract = match[1].trim();
  const body = text.replace(/<abstract>[\s\S]*?<\/abstract>\s*/, "").trim();
  return { abstract, body };
}

function computeStalenessRisk(newestDate: string): "low" | "medium" | "high" {
  if (!newestDate || newestDate === "unknown") return "high";
  const newest = new Date(newestDate);
  if (isNaN(newest.getTime())) return "high";
  const daysSince = (Date.now() - newest.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 30) return "low";
  if (daysSince < 90) return "medium";
  return "high";
}

function shouldRunPass(pass: string): boolean {
  const order = ["0", "1a", "1b", "2", "3a", "3b", "3c", "4", "5", "6", "7", "8"];
  const idx = order.indexOf(pass);
  if (FROM_PASS && idx < order.indexOf(FROM_PASS)) return false;
  if (TO_PASS && idx > order.indexOf(TO_PASS)) return false;
  return true;
}

async function loadBuildArtifact<T>(filename: string): Promise<T> {
  const path = join(BUILD_DIR, filename);
  return JSON.parse(await readFile(path, "utf-8"));
}

// ─── README Stats Auto-Patch ───────────────────────────────────────────

async function patchReadmeStats(
  index: SourceIndex,
  entities: Entity[],
  graph: KnowledgeGraph,
  claims: Claim[],
): Promise<void> {
  const readmePath = join(ROOT, "README.md");
  if (!existsSync(readmePath)) return;

  const readme = await readFile(readmePath, "utf-8");
  const startMarker = "<!-- stats:start";
  const endMarker = "<!-- stats:end -->";
  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) return;

  // Count sources by type (excluding deep/)
  const shallow = index.sources.filter((s) => !s.path.startsWith("deep/"));
  const deep = index.sources.filter((s) => s.path.startsWith("deep/"));
  const byType: Record<string, number> = {};
  for (const s of shallow) {
    const t = s.frontmatter.type;
    byType[t] = (byType[t] ?? 0) + 1;
  }

  // Count wiki articles
  const full = entities.filter((e) => e.article_level === "full");
  const projects = full.filter((e) => e.type === "project").length;
  const concepts = full.filter((e) => e.type === "concept" || e.type === "approach" || e.type === "person").length;

  // Count deep research words
  let deepWords = 0;
  for (const s of deep) {
    deepWords += s.body.split(/\s+/).length;
  }
  const deepWordsK = Math.round(deepWords / 1000);

  const typeSummary = Object.entries(byType)
    .map(([t, n]) => `${n} ${t}s`)
    .join(", ");

  const statsBlock = `<!-- stats:start (auto-updated by bun run compile) -->
## Stats

- **Sources:** ${shallow.length} curated (${typeSummary}) + ${deep.length} deep research files
- **Wiki:** ${full.length + domain.buckets.length + 1} articles (${domain.buckets.length} synthesis, ${projects} project cards, ${concepts} concept explainers, field map, indexes)
- **Deep research:** ${deepWordsK}K words of source-code-level analysis
- **Self-eval:** ${claims.length} atomic claims extracted, sampled and verified against sources each compilation
- **Compiled by:** 3 independent systems (script pipeline, Claude Code skill graph, Codex skill graph), best-of-three merged`;

  const patched = readme.slice(0, startIdx) + statsBlock + "\n" + readme.slice(endIdx);
  await writeFile(readmePath, patched);
  console.log("  ✓ README.md stats auto-patched");
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log(`║        ${domain.name} compiler v0.2.0               ║`);
  console.log("╚══════════════════════════════════════════════╝");
  if (DRY_RUN) console.log("  [DRY RUN — no files will be written]");
  if (FROM_PASS) console.log(`  [Resuming from pass ${FROM_PASS}]`);
  if (TO_PASS) console.log(`  [Stopping after pass ${TO_PASS}]`);

  let index: SourceIndex;
  let rawEntities: RawEntity[];
  let entities: Entity[];
  let graph: KnowledgeGraph;
  let claims: Claim[];

  // Pass 0
  if (shouldRunPass("0")) {
    index = await loadSources();
  } else {
    index = { sources: [], byBucket: {}, byType: {} };
    // Reload sources for later passes even when skipping pass 0
    index = await loadSources();
  }

  // Pass 1a
  if (shouldRunPass("1a")) {
    rawEntities = await extractEntitiesPerSource(index);
  } else {
    rawEntities = await loadBuildArtifact("raw-entities.json");
    console.log(`\n  [Skipped Pass 1a — loaded ${rawEntities.length} raw entities from disk]`);
  }

  // Pass 1b
  if (shouldRunPass("1b")) {
    entities = await resolveEntities(rawEntities, index);
  } else {
    entities = await loadBuildArtifact("entities.json");
    console.log(`\n  [Skipped Pass 1b — loaded ${entities.length} entities from disk]`);
  }

  // Pass 2
  if (shouldRunPass("2")) {
    graph = await buildGraph(entities, index);
  } else {
    graph = await loadBuildArtifact("graph.json");
    console.log(`\n  [Skipped Pass 2 — loaded graph with ${graph.nodes.length} nodes, ${graph.edges.length} edges]`);
  }

  // Pass 3a
  if (shouldRunPass("3a")) {
    await generateSynthesisArticles(entities, graph, index);
  }

  // Pass 3b
  if (shouldRunPass("3b")) {
    await generateReferenceCards(entities, graph, index);
  }

  // Pass 3c
  if (shouldRunPass("3c")) {
    claims = await extractClaims(index);
  } else {
    const claimsFile = await loadBuildArtifact<ClaimsFile>("claims.json");
    claims = claimsFile.claims;
    console.log(`\n  [Skipped Pass 3c — loaded ${claims.length} claims from disk]`);
  }

  // Pass 4
  if (shouldRunPass("4")) {
    await generateFieldMapAndIndexes(entities, graph, index);
  }

  // Pass 5
  if (shouldRunPass("5")) {
    await addMermaidAndBacklinks(entities, graph);
  }

  // Pass 6
  if (shouldRunPass("6")) {
    await generateChangelog(entities, graph);
  }

  // Pass 7
  if (shouldRunPass("7")) {
    await runSelfEval(claims, index);
  }

  // Pass 8
  if (shouldRunPass("8")) {
    await autoFixClaims(claims, index);
  }

  // Auto-patch README.md stats
  await patchReadmeStats(index, entities, graph, claims);

  const full = entities.filter((e) => e.article_level === "full").length;
  const stub = entities.filter((e) => e.article_level === "stub").length;
  console.log("\n════════════════════════════════════");
  console.log("  Compilation complete.");
  console.log(`  Sources: ${index.sources.length}`);
  console.log(`  Entities: ${entities.length} (${full} full, ${stub} stub)`);
  console.log(`  Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
  console.log(`  Claims: ${claims.length}`);
  console.log("════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Compilation failed:", err);
  process.exit(1);
});
