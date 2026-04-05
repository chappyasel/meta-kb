#!/usr/bin/env bun
/**
 * meta-kb compiler: raw/ → build/ → wiki/
 *
 * 6-pass pipeline:
 *   Pass 0:  Load & index all raw sources
 *   Pass 1a: Entity extraction (per-source, Haiku, parallel)
 *   Pass 1b: Entity resolution (single Sonnet call, merge/dedup)
 *   Pass 2:  Graph construction (co-occurring pairs, Sonnet)
 *   Pass 3a: Synthesis articles (one per bucket, Sonnet, sequential)
 *   Pass 3b: Reference cards (per-entity, Sonnet, parallel)
 *   Pass 4:  Field map + indexes + landscape table
 *   Pass 5:  Mermaid diagrams + backlinks (local, no LLM)
 *   Pass 6:  Changelog (local diff)
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
} from "./types.js";

// ─── Config ─────────────────────────────────────────────────────────────

const ROOT = join(import.meta.dir, "..");
const RAW_DIR = join(ROOT, "raw");
const BUILD_DIR = join(ROOT, process.argv.find((a) => a.startsWith("--build-dir="))?.split("=")[1] ?? "build");
const WIKI_DIR = join(ROOT, process.argv.find((a) => a.startsWith("--wiki-dir="))?.split("=")[1] ?? "wiki");

const FROM_PASS = process.argv.find((a) => a.startsWith("--from-pass="))?.split("=")[1];
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
  const bucketNames: TaxonomyBucket[] = [
    "knowledge-bases",
    "agent-memory",
    "context-engineering",
    "agent-systems",
    "self-improving",
  ];

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

// ─── Pass 1a: Entity Extraction ─────────────────────────────────────────

const rawEntitySchema = z.object({
  entities: z.array(
    z.object({
      name: z.string().describe("Canonical name (e.g., 'Mem0', 'Episodic Memory')"),
      type: z.enum(["concept", "project", "person", "approach"]),
      bucket: z.enum([
        "knowledge-bases",
        "agent-memory",
        "context-engineering",
        "agent-systems",
        "self-improving",
      ]),
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
            "Extract all entities (projects, concepts, people, approaches) mentioned in this source about LLM knowledge bases and agent systems. For projects: use the canonical project name. For concepts: use the standard term. For people: full name.",
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
      bucket: z.enum([
        "knowledge-bases",
        "agent-memory",
        "context-engineering",
        "agent-systems",
        "self-improving",
      ]),
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
    system: `You are resolving entity mentions into canonical entities for a knowledge base about LLM knowledge bases, agent memory, context engineering, agent systems, and self-improving systems.

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
      .slice(0, 200)
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
      system: `Classify relationships between entity pairs in a knowledge base about LLM knowledge bases and agent systems.
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
  const bucketColors: Record<string, string> = {
    "knowledge-bases": "#e74c3c",
    "agent-memory": "#3498db",
    "context-engineering": "#2ecc71",
    "agent-systems": "#f39c12",
    "self-improving": "#9b59b6",
  };
  const bucketLabels: Record<string, string> = {
    "knowledge-bases": "Knowledge Bases",
    "agent-memory": "Agent Memory",
    "context-engineering": "Context Engineering",
    "agent-systems": "Agent Systems",
    "self-improving": "Self-Improving",
  };

  for (const bucket of Object.keys(bucketLabels)) {
    const count = entities.filter((e) => e.bucket === bucket).length;
    clusters[bucket] = {
      label: bucketLabels[bucket],
      node_count: count,
      color: bucketColors[bucket],
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

const SYNTHESIS_SYSTEM = `You are writing a landscape analysis for practitioners who build with LLM agents. This is NOT a catalog of projects. It's a synthesis that changes how practitioners THINK about this space.

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
- Write as a practitioner talking to practitioners. No academic hedging.
- Output 3000-5000 words of markdown.
${WRITING_STYLE}`;

const BUCKET_TITLES: Record<string, string> = {
  "knowledge-bases": "The State of LLM Knowledge Bases",
  "agent-memory": "The State of Agent Memory",
  "context-engineering": "The State of Context Engineering",
  "agent-systems": "The State of Agent Systems",
  "self-improving": "The State of Self-Improving Systems",
};

async function generateSynthesisArticles(
  entities: Entity[],
  graph: KnowledgeGraph,
  index: SourceIndex,
): Promise<void> {
  console.log("\n═══ Pass 3a: Synthesis Articles (Sonnet, sequential) ═══");
  await mkdir(WIKI_DIR, { recursive: true });

  for (const [bucket, title] of Object.entries(BUCKET_TITLES)) {
    console.log(`\n  Writing: ${title}...`);

    // Collect sources for this bucket
    const bucketSources = (index.byBucket[bucket] ?? [])
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 25); // Top 25 by relevance

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
        prompt: `Write "# ${title}" for the meta-kb wiki.

## Entities in this bucket (${bucketEntities.length}):
${entitySummary}

## Relationships:
${edgeSummary}

## Source material (${bucketSources.length} sources, sorted by relevance):
${sourceContent}`,
      });

      // Add frontmatter
      const frontmatter = {
        title,
        type: "synthesis",
        bucket,
        sources: bucketSources.map((s) => s.path),
        entities: bucketEntities.map((e) => e.id),
        last_compiled: new Date().toISOString(),
      };

      const output = matter.stringify(text, frontmatter);
      await writeFile(join(WIKI_DIR, `${bucket}.md`), output);
      console.log(`  ✓ ${title} (${text.split("\n").length} lines)`);
    } catch (err) {
      console.error(`  ✗ Failed to generate ${title}: ${err}`);
    }
  }
}

// ─── Pass 3b: Reference Cards ───────────────────────────────────────────

const REFERENCE_CARD_SYSTEM = `Generate a reference card for a project, concept, or person in the LLM knowledge base space.

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

  // Create output directories
  for (const dir of ["projects", "concepts", "approaches"]) {
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

Source material:
${sourceContent || "No direct sources — write from general knowledge, mark claims as [unverified]."}`,
        });

        // Determine output directory
        const dir =
          entity.type === "project"
            ? "projects"
            : entity.type === "concept" || entity.type === "approach"
              ? "concepts"
              : "concepts"; // people go in concepts too for simplicity

        const frontmatter = {
          entity_id: entity.id,
          type: entity.type,
          bucket: entity.bucket,
          sources: entity.source_refs,
          related: neighbors.map((n) => n?.split(" (")[0] ?? ""),
          last_compiled: new Date().toISOString(),
        };

        const output = matter.stringify(text, frontmatter);
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
      system: `You are writing the flagship overview article for meta-kb, a knowledge base about LLM knowledge bases, agent memory, context engineering, agent systems, and self-improving systems.

This is THE article people read first. It should be 3000-5000 words. It is NOT a taxonomy of separate markets — it is a SYSTEMS MAP showing how these five areas form one emerging stack.

Start with a brief "Five Layers" overview — one paragraph per bucket naming the central engineering problem and linking to its synthesis article. Then move into the systems analysis.

Structure:
1. **The unifying insight**: Name the single architectural idea that connects all five buckets. Example: "These five areas are five layers of the same stack — knowledge feeds memory, memory shapes context, context enables skills, skills compound via self-improvement."

2. **Integration points**: For each pair of adjacent buckets, explain how one feeds the other. What is the interface? What breaks when it's missing?

3. **Paradigm fragmentation**: Where multiple valid approaches coexist (e.g., vector vs graph vs keyword retrieval), explain the ROUTING LOGIC — when to use which, not which is "better."

4. **Implementation maturity**: What's production-ready vs research-only? Name specific projects at each level. Be honest.

5. **What the field got wrong**: One major assumption that turned out to be false and what replaced it.

6. **The practitioner's flow**: Describe concretely how a mature stack processes a real task end-to-end, naming specific tools at each step.

7. **Cross-cutting themes**: 4-6 patterns that span all five buckets. Examples: markdown as universal format, git as infrastructure, context as finite budget, agents as authors of their own knowledge, the emergence of forgetting.

8. **Reading guide**: What to read next based on what you're building.

Write as a knowledgeable practitioner, not an academic. Be opinionated. Name specific projects and approaches. Link to synthesis articles: [Agent Memory](agent-memory.md), [Knowledge Bases](knowledge-bases.md), etc.
Link to project cards: [Mem0](projects/mem0.md), [gstack](projects/gstack.md), etc.

Start with "# The Landscape of LLM Knowledge Systems" as the H1.
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
      title: "The Landscape of LLM Knowledge Systems",
      type: "field-map",
      last_compiled: new Date().toISOString(),
    };
    await writeFile(join(WIKI_DIR, "field-map.md"), matter.stringify(text, frontmatter));
    console.log(`  ✓ field-map.md (${text.split("\n").length} lines)`);
  } catch (err) {
    console.error(`  ✗ Failed to generate field-map: ${err}`);
  }

  // Generate deterministic indexes
  await mkdir(join(WIKI_DIR, "indexes"), { recursive: true });
  await mkdir(join(WIKI_DIR, "comparisons"), { recursive: true });

  // projects.md index
  const projects = entities.filter((e) => e.type === "project").sort((a, b) => (b.relevance_composite ?? 0) - (a.relevance_composite ?? 0));
  const projectsIndex = `# Projects Index\n\n| Project | Bucket | Sources | Stars |\n|---|---|---|---|\n${projects.map((p) => {
    const src = index.sources.find((s) => s.path === p.source_refs[0]);
    const stars = src?.frontmatter.stars ?? "";
    return `| [${p.name}](../projects/${p.id}.md) | ${p.bucket} | ${p.source_refs.length} | ${stars ? stars.toLocaleString() : "—"} |`;
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
  const repoEntities = projects.filter((p) => {
    const src = index.sources.find((s) => s.path === p.source_refs[0]);
    return src?.frontmatter.stars;
  });
  const landscapeTable = `# Landscape Comparison\n\nAll major projects at a glance.\n\n| Project | Bucket | Stars | Language | License | Description |\n|---|---|---|---|---|---|\n${repoEntities.map((p) => {
    const src = index.sources.find((s) => s.path === p.source_refs[0]);
    const fm = src?.frontmatter as any;
    return `| [${p.name}](../projects/${p.id}.md) | ${p.bucket} | ${(fm?.stars ?? 0).toLocaleString()} | ${fm?.language ?? "—"} | ${fm?.license ?? "—"} | ${p.description.slice(0, 80)} |`;
  }).join("\n")}`;
  await writeFile(join(WIKI_DIR, "comparisons", "landscape.md"), landscapeTable);

  console.log(`  ✓ indexes/projects.md (${projects.length} projects)`);
  console.log(`  ✓ indexes/topics.md (${concepts.length} topics)`);
  console.log(`  ✓ indexes/missing.md (${stubs.length} stubs)`);
  console.log(`  ✓ comparisons/landscape.md (${repoEntities.length} rows)`);
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

  const changelog = `# Changelog\n\nCompilation history for the meta-kb wiki.\n\n${entry}`;
  await writeFile(join(WIKI_DIR, "CHANGELOG.md"), changelog);
  console.log("  ✓ CHANGELOG.md written");
}

// ─── Helpers ────────────────────────────────────────────────────────────

function shouldRunPass(pass: string): boolean {
  if (!FROM_PASS) return true;
  const order = ["0", "1a", "1b", "2", "3a", "3b", "4", "5", "6"];
  return order.indexOf(pass) >= order.indexOf(FROM_PASS);
}

async function loadBuildArtifact<T>(filename: string): Promise<T> {
  const path = join(BUILD_DIR, filename);
  return JSON.parse(await readFile(path, "utf-8"));
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║        meta-kb compiler v0.1.0               ║");
  console.log("╚══════════════════════════════════════════════╝");
  if (DRY_RUN) console.log("  [DRY RUN — no files will be written]");
  if (FROM_PASS) console.log(`  [Resuming from pass ${FROM_PASS}]`);

  let index: SourceIndex;
  let rawEntities: RawEntity[];
  let entities: Entity[];
  let graph: KnowledgeGraph;

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

  const full = entities.filter((e) => e.article_level === "full").length;
  const stub = entities.filter((e) => e.article_level === "stub").length;
  console.log("\n════════════════════════════════════");
  console.log("  Compilation complete.");
  console.log(`  Sources: ${index.sources.length}`);
  console.log(`  Entities: ${entities.length} (${full} full, ${stub} stub)`);
  console.log(`  Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
  console.log("════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Compilation failed:", err);
  process.exit(1);
});
