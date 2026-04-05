#!/usr/bin/env bun
/**
 * meta-kb deep research: raw/ sources → raw/deep/ enriched sources
 *
 * For repos:  clones, maps structure, reads key files, synthesizes via LLM
 * For papers: fetches full text (HTML), synthesizes via LLM
 *
 * Usage:
 *   bun run research <url1> [url2] ...   # Research specific URLs
 *   bun run research --all               # All unresearched sources
 *   bun run research --repos-only        # Only repos
 *   bun run research --papers-only       # Only papers
 */

import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, basename } from "node:path";
import { existsSync } from "node:fs";
import { generateText, generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import matter from "gray-matter";
import { slugify } from "./utils/slugify.js";
import { extractOwnerRepo } from "./utils/url-extract.js";
import { scoreRelevance, generateInsightAndTags } from "./utils/llm.js";
import type { RawSourceFrontmatter } from "./types.js";

// ─── Config ────────────────────────────────────────────────────────────

const ROOT = join(import.meta.dir, "..");
const RAW_DIR = join(ROOT, "raw");
const DEEP_DIR = join(RAW_DIR, "deep");
const TEMP_DIR = join(ROOT, ".tmp");

const REPO_CONCURRENCY = 2;
const PAPER_CONCURRENCY = 3;
const MAX_FILES_PER_REPO = 25;
const MAX_LINES_PER_FILE = 1000;
const MAX_SOURCE_CHARS = 80_000;
const MAX_EXTERNAL_DOCS = 6;

// ─── Provider ──────────────────────────────────────────────────────────

let provider: ReturnType<typeof createAnthropic> | null = null;
function getProvider() {
  if (!provider) {
    provider = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return provider;
}

// ─── Concurrency ───────────────────────────────────────────────────────

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

// ─── Clone & Map ───────────────────────────────────────────────────────

async function cloneRepo(url: string): Promise<string> {
  const ownerRepo = extractOwnerRepo(url);
  if (!ownerRepo) throw new Error(`Cannot parse owner/repo from ${url}`);
  const slug = slugify(ownerRepo.replace("/", "-"));
  const cloneDir = join(TEMP_DIR, slug);

  if (existsSync(cloneDir)) await rm(cloneDir, { recursive: true });
  await mkdir(TEMP_DIR, { recursive: true });

  const proc = Bun.spawn(
    ["git", "clone", "--depth", "1", "--single-branch", url, cloneDir],
    { stdout: "pipe", stderr: "pipe" },
  );
  await proc.exited;
  if (proc.exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`git clone failed: ${stderr.slice(0, 200)}`);
  }
  return cloneDir;
}

const SKIP_DIRS = new Set([
  ".git", "node_modules", "__pycache__", "vendor", "dist", "build",
  ".next", ".venv", "venv", "env", ".tox", "target", ".cache",
  "coverage", ".mypy_cache", ".pytest_cache", "eggs", "*.egg-info",
]);

async function mapDirectoryTree(dir: string, maxDepth = 4): Promise<string> {
  const lines: string[] = [];
  async function walk(current: string, depth: number, prefix: string) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    const sorted = entries
      .filter((e) => !e.name.startsWith(".") && !SKIP_DIRS.has(e.name))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    for (const entry of sorted) {
      if (entry.isDirectory()) {
        lines.push(`${prefix}${entry.name}/`);
        await walk(join(current, entry.name), depth + 1, prefix + "  ");
      } else {
        lines.push(`${prefix}${entry.name}`);
      }
    }
  }
  await walk(dir, 0, "");
  return lines.join("\n");
}

// ─── Key File Identification ───────────────────────────────────────────

const keyFilesSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().describe("Relative path from repo root"),
        reason: z.string().describe("Why this file matters for understanding the architecture"),
      }),
    )
    .describe("The 8-15 most important files to understand this project"),
});

async function identifyKeyFiles(
  repoUrl: string,
  directoryTree: string,
  readme: string,
): Promise<{ path: string; reason: string }[]> {
  const { object } = await generateObject({
    model: getProvider()("claude-haiku-4-5"),
    schema: keyFilesSchema,
    system: `You identify the most architecturally important files in a repository for understanding how it works.

Focus on: entry points, core business logic, schema/type definitions, configuration, architecture docs, example code.
Skip: tests (unless they show key usage patterns), CI/CD, lockfiles, generated code, images, migrations, fixtures.
Return 15-25 files. Prioritize files that explain HOW the system works. Include examples/ if they exist.`,
    prompt: `Repository: ${repoUrl}

Directory tree:
${directoryTree.slice(0, 8000)}

README excerpt:
${readme.slice(0, 3000)}

Which files should I read?`,
  });
  return object.files.slice(0, MAX_FILES_PER_REPO);
}

async function readRepoFiles(
  cloneDir: string,
  files: { path: string; reason: string }[],
): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = [];
  for (const file of files) {
    const fullPath = join(cloneDir, file.path);
    if (!existsSync(fullPath)) continue;
    try {
      const content = await readFile(fullPath, "utf-8");
      const truncated = content.split("\n").slice(0, MAX_LINES_PER_FILE).join("\n");
      results.push({ path: file.path, content: truncated });
    } catch {
      // binary or unreadable
    }
  }
  return results;
}

// ─── External Docs Fetching ────────────────────────────────────────────

async function fetchExternalDocs(
  readme: string,
  cloneDir?: string,
): Promise<{ url: string; content: string }[]> {
  // Extract doc URLs from README
  const patterns = [
    /https?:\/\/[^\s)>\]"']+(?:docs|documentation|guide|architecture|design|wiki|blog)[^\s)>\]"']*/gi,
    /https?:\/\/help\.[^\s)>\]"']+/gi,
    /https?:\/\/docs\.[^\s)>\]"']+/gi,
    /https?:\/\/[^\s)>\]"']*\.readthedocs\.[^\s)>\]"']*/gi,
    /https?:\/\/[^\s)>\]"']*\.gitbook\.[^\s)>\]"']*/gi,
  ];
  const urls = new Set<string>();
  for (const pattern of patterns) {
    for (const match of readme.matchAll(pattern)) {
      const url = match[0].replace(/[.,;)]+$/, "");
      if (!url.includes("badge") && !url.includes("img.shields") && !url.includes("github.com")) {
        urls.add(url);
      }
    }
  }

  const results: { url: string; content: string }[] = [];

  // Check for local architecture docs in the clone
  if (cloneDir) {
    for (const docFile of ["ARCHITECTURE.md", "DESIGN.md", "CONTRIBUTING.md", "docs/README.md", "docs/architecture.md", "docs/design.md"]) {
      const docPath = join(cloneDir, docFile);
      if (existsSync(docPath)) {
        try {
          const content = await readFile(docPath, "utf-8");
          if (content.length > 200) {
            results.push({ url: `local://${docFile}`, content: content.slice(0, 8000) });
          }
        } catch {}
      }
    }
  }
  for (const url of [...urls].slice(0, MAX_EXTERNAL_DOCS)) {
    try {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "meta-kb-research/1.0" },
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000);
      if (text.length > 200) results.push({ url, content: text });
    } catch {
      // skip
    }
  }
  return results;
}

// ─── Paper Full Text ───────────────────────────────────────────────────

async function fetchPaperFullText(arxivId: string): Promise<string | null> {
  // Try arXiv HTML first
  for (const baseUrl of [
    `https://arxiv.org/html/${arxivId}v1`,
    `https://ar5iv.labs.arxiv.org/html/${arxivId}`,
  ]) {
    try {
      const resp = await fetch(baseUrl, {
        signal: AbortSignal.timeout(15_000),
        headers: { "User-Agent": "meta-kb-research/1.0" },
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[\s\S]*?<\/footer>/gi, "")
        .replace(/<header[\s\S]*?<\/header>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (text.length > 2000) return text.slice(0, 60_000);
    } catch {
      // try next
    }
  }
  return null;
}

// ─── LLM Synthesis Prompts ─────────────────────────────────────────────

const REPO_SYNTHESIS_SYSTEM = `You are a senior software architect conducting a deep technical analysis of an open-source project. Your audience is practitioners who build with LLM agents, knowledge bases, and memory systems.

Write a structured analysis with these exact sections:

## Architecture Overview
How the codebase is organized. Key modules, entry points, data flow between components.

## Core Mechanism
The key algorithm or pattern that makes this project work. Explain with enough detail that a reader could reimplement the core idea. Reference specific files and functions. Include simplified code snippets where helpful.

## Design Tradeoffs
What architectural choices were made and what alternatives were rejected. Be specific — name the alternatives and explain why they weren't chosen.

## Failure Modes & Limitations
What breaks, when, and why. Known limitations, edge cases, scaling issues. This is the most valuable section for practitioners — be honest and specific.

## Integration Patterns
How this connects to the ecosystem. Supported LLM providers, database backends, frameworks (LangChain, LangGraph, etc.). What does a real integration look like?

## Benchmarks & Performance
Actual numbers from code, tests, or docs. Verify README claims against what the code shows. Note discrepancies between marketing and implementation.

Rules:
- Name specific files, functions, classes.
- No marketing language.
- 3000-6000 words. Depth over breadth.`;

const PAPER_SYNTHESIS_SYSTEM = `You are a researcher writing a detailed technical summary of an academic paper for practitioners who build with LLM agents and knowledge bases.

Write a structured analysis with these exact sections:

## Architecture Overview
The system architecture. Key components, data flow, how they interact.

## Core Mechanism
The key technique or algorithm. Explain HOW it works with enough detail to understand the implementation, not just the concept. Include mathematical intuition where relevant.

## Design Tradeoffs
What alternatives existed and why this approach was chosen. What assumptions does the design rest on?

## Experimental Results
Key benchmark numbers, baselines, ablation results. What improved, by how much, on what tasks? Note surprising results or acknowledged limitations.

## Failure Modes & Limitations
What doesn't work, both stated and inferable from methodology.

## Practical Implications
What does this mean for builders? How would you use these ideas in a real system? What's the gap between the paper and production?

Rules:
- Be specific about numbers and comparisons.
- Distinguish claims from results.
- 2000-4000 words.`;

// ─── Synthesis Functions ───────────────────────────────────────────────

async function synthesizeRepo(
  repoUrl: string,
  directoryTree: string,
  readme: string,
  files: { path: string; content: string }[],
  externalDocs: { url: string; content: string }[],
): Promise<string> {
  const fileContent = files
    .map((f) => `### File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  const docsContent =
    externalDocs.length > 0
      ? `\n\n## External Documentation\n${externalDocs.map((d) => `### ${d.url}\n${d.content}`).join("\n\n")}`
      : "";

  const { text } = await generateText({
    model: getProvider()("claude-sonnet-4-6"),
    system: REPO_SYNTHESIS_SYSTEM,
    prompt: `Analyze this repository: ${repoUrl}

## Directory Structure
${directoryTree.slice(0, 4000)}

## README
${readme.slice(0, 4000)}

## Source Code
${fileContent.slice(0, MAX_SOURCE_CHARS)}
${docsContent.slice(0, 10_000)}`,
    maxTokens: 8192,
  });
  return text;
}

async function synthesizePaper(
  paperUrl: string,
  abstract: string,
  fullText: string,
  existingInsight: string,
): Promise<string> {
  const { text } = await generateText({
    model: getProvider()("claude-sonnet-4-6"),
    system: PAPER_SYNTHESIS_SYSTEM,
    prompt: `Analyze this paper: ${paperUrl}

## Existing Key Insight
${existingInsight}

## Abstract
${abstract}

## Full Paper Text
${fullText.slice(0, MAX_SOURCE_CHARS)}`,
    maxTokens: 6144,
  });
  return text;
}

// ─── Find Original Source ──────────────────────────────────────────────

async function findOriginalSource(
  url: string,
): Promise<{ path: string; frontmatter: RawSourceFrontmatter; body: string } | null> {
  const normalizedUrl = url.replace(/\/+$/, "").replace(/\.git$/, "");
  for (const type of ["repos", "papers", "articles", "tweets"]) {
    const dir = join(RAW_DIR, type);
    if (!existsSync(dir)) continue;
    const files = await readdir(dir);
    for (const file of files.filter((f) => f.endsWith(".md"))) {
      const raw = await readFile(join(dir, file), "utf-8");
      const { data, content } = matter(raw);
      const sourceUrl = ((data as any).url ?? "").replace(/\/+$/, "").replace(/\.git$/, "");
      if (sourceUrl === normalizedUrl) {
        return { path: `${type}/${file}`, frontmatter: data as RawSourceFrontmatter, body: content };
      }
    }
  }
  return null;
}

// ─── Write Deep Source ─────────────────────────────────────────────────

async function writeDeepSource(
  type: "repos" | "papers",
  slug: string,
  frontmatter: Record<string, unknown>,
  body: string,
): Promise<string> {
  const dir = join(DEEP_DIR, type);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `${slug}.md`);
  if (existsSync(filePath)) {
    console.log(`  ⏭ Already exists: deep/${type}/${slug}.md`);
    return filePath;
  }
  const output = matter.stringify(body, frontmatter);
  await Bun.write(filePath, output);
  return filePath;
}

async function linkOriginalSource(originalPath: string, deepRelPath: string): Promise<void> {
  const fullPath = join(RAW_DIR, originalPath);
  if (!existsSync(fullPath)) return;
  const raw = await readFile(fullPath, "utf-8");
  const { data, content } = matter(raw);
  if ((data as any).deep_researched) return;
  (data as any).deep_researched = deepRelPath;
  await Bun.write(fullPath, matter.stringify(content, data));
}

// ─── Deep Research: Repo ───────────────────────────────────────────────

export async function deepResearchRepo(url: string): Promise<void> {
  const ownerRepo = extractOwnerRepo(url);
  if (!ownerRepo) {
    console.error(`  ✗ Cannot parse owner/repo from ${url}`);
    return;
  }
  const slug = slugify(ownerRepo.replace("/", "-"));
  if (existsSync(join(DEEP_DIR, "repos", `${slug}.md`))) {
    console.log(`  ⏭ Already researched: ${slug}`);
    return;
  }

  console.log(`\n  ── ${ownerRepo} ──`);
  console.log(`  📂 Cloning...`);
  let cloneDir: string;
  try {
    cloneDir = await cloneRepo(url);
  } catch (err) {
    console.error(`  ✗ Clone failed: ${err}`);
    return;
  }

  try {
    console.log(`  🗂  Mapping structure...`);
    const tree = await mapDirectoryTree(cloneDir);

    const readmePath = ["README.md", "readme.md", "Readme.md", "README.rst"]
      .map((f) => join(cloneDir, f))
      .find((p) => existsSync(p));
    const readme = readmePath ? await readFile(readmePath, "utf-8") : "";

    console.log(`  🔍 Identifying key files...`);
    const keyFiles = await identifyKeyFiles(url, tree, readme);
    console.log(`  📖 Reading ${keyFiles.length} files...`);
    const filesRead = await readRepoFiles(cloneDir, keyFiles);

    console.log(`  🌐 Fetching external docs...`);
    const docs = await fetchExternalDocs(readme, cloneDir);

    console.log(`  🧠 Synthesizing (Sonnet)...`);
    const synthesis = await synthesizeRepo(url, tree, readme, filesRead, docs);

    // Get original source metadata
    const original = await findOriginalSource(url);

    // Score the deep source
    const insightInput = synthesis.slice(0, 6000);
    const [scores, insight] = await Promise.all([
      scoreRelevance(insightInput, "repo"),
      generateInsightAndTags(insightInput, "repo"),
    ]);

    const frontmatter: Record<string, unknown> = {
      url,
      type: "repo",
      author: original?.frontmatter.author ?? ownerRepo.split("/")[0],
      date: new Date().toISOString().split("T")[0],
      tags: insight?.tags ?? original?.frontmatter.tags ?? [],
      key_insight: insight?.key_insight ?? original?.frontmatter.key_insight ?? "",
      stars: original?.frontmatter.stars,
      forks: original?.frontmatter.forks,
      language: original?.frontmatter.language,
      license: original?.frontmatter.license,
      deep_research: {
        method: "source-code-analysis",
        files_analyzed: filesRead.map((f) => f.path),
        external_docs: docs.map((d) => d.url),
        analyzed_at: new Date().toISOString().split("T")[0],
        original_source: original?.path,
      },
      relevance_scores: scores
        ? {
            topic_relevance: scores.topic_relevance,
            practitioner_value: scores.practitioner_value,
            novelty: scores.novelty,
            signal_quality: scores.signal_quality,
            composite: scores.composite,
            reason: scores.reason,
          }
        : original?.frontmatter.relevance_scores,
    };

    await writeDeepSource("repos", slug, frontmatter, synthesis);
    if (original) {
      await linkOriginalSource(original.path, `deep/repos/${slug}.md`);
    }
    console.log(`  ✓ ${slug} — ${synthesis.split("\n").length} lines, ${filesRead.length} files analyzed`);
  } finally {
    await rm(cloneDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── Deep Research: Paper ──────────────────────────────────────────────

export async function deepResearchPaper(url: string): Promise<void> {
  const idMatch = url.match(/(\d{4}\.\d{4,5})/);
  if (!idMatch) {
    console.error(`  ✗ Cannot extract arXiv ID from ${url}`);
    return;
  }
  const arxivId = idMatch[1];
  const canonicalUrl = `https://arxiv.org/abs/${arxivId}`;

  // Find original source to reuse its slug
  const original = (await findOriginalSource(url)) ?? (await findOriginalSource(canonicalUrl));
  const slug = original ? basename(original.path, ".md") : slugify(arxivId);

  if (existsSync(join(DEEP_DIR, "papers", `${slug}.md`))) {
    console.log(`  ⏭ Already researched: ${slug}`);
    return;
  }

  console.log(`\n  ── ${arxivId} ──`);
  console.log(`  📄 Fetching full text...`);
  const fullText = await fetchPaperFullText(arxivId);
  if (!fullText) {
    console.error(`  ✗ No HTML available for ${arxivId}`);
    return;
  }
  console.log(`  📏 Got ${fullText.length} chars of full text`);

  console.log(`  🧠 Synthesizing (Sonnet)...`);
  const synthesis = await synthesizePaper(
    canonicalUrl,
    original?.body.slice(0, 2000) ?? "",
    fullText,
    original?.frontmatter.key_insight ?? "",
  );

  const insightInput = synthesis.slice(0, 6000);
  const [scores, insight] = await Promise.all([
    scoreRelevance(insightInput, "paper"),
    generateInsightAndTags(insightInput, "paper"),
  ]);

  const frontmatter: Record<string, unknown> = {
    url: canonicalUrl,
    type: "paper",
    author: original?.frontmatter.author ?? "unknown",
    date: original?.frontmatter.date ?? new Date().toISOString().split("T")[0],
    tags: insight?.tags ?? original?.frontmatter.tags ?? [],
    key_insight: insight?.key_insight ?? original?.frontmatter.key_insight ?? "",
    deep_research: {
      method: "paper-full-text",
      text_length: fullText.length,
      analyzed_at: new Date().toISOString().split("T")[0],
      original_source: original?.path,
    },
    relevance_scores: scores
      ? {
          topic_relevance: scores.topic_relevance,
          practitioner_value: scores.practitioner_value,
          novelty: scores.novelty,
          signal_quality: scores.signal_quality,
          composite: scores.composite,
          reason: scores.reason,
        }
      : original?.frontmatter.relevance_scores,
  };

  await writeDeepSource("papers", slug, frontmatter, synthesis);
  if (original) {
    await linkOriginalSource(original.path, `deep/papers/${slug}.md`);
  }
  console.log(`  ✓ ${slug} — ${synthesis.split("\n").length} lines`);
}

// ─── Find Unresearched Sources ─────────────────────────────────────────

export async function findUnresearchedSources(
  type?: "repos" | "papers",
): Promise<string[]> {
  const urls: string[] = [];
  const types = type ? [type] : ["repos", "papers"];
  for (const t of types) {
    const dir = join(RAW_DIR, t);
    if (!existsSync(dir)) continue;
    const files = await readdir(dir);
    for (const file of files.filter((f) => f.endsWith(".md"))) {
      const raw = await readFile(join(dir, file), "utf-8");
      const { data } = matter(raw);
      if (!(data as any).deep_researched) {
        urls.push((data as any).url);
      }
    }
  }
  return urls;
}

// ─── CLI ───────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║       meta-kb deep research v0.1.0           ║");
  console.log("╚══════════════════════════════════════════════╝");

  const args = process.argv.slice(2);
  let urls: string[];

  if (args.includes("--all")) {
    urls = await findUnresearchedSources();
    console.log(`\n  Found ${urls.length} unresearched sources`);
  } else if (args.includes("--repos-only")) {
    urls = await findUnresearchedSources("repos");
    console.log(`\n  Found ${urls.length} unresearched repos`);
  } else if (args.includes("--papers-only")) {
    urls = await findUnresearchedSources("papers");
    console.log(`\n  Found ${urls.length} unresearched papers`);
  } else {
    urls = args.filter((a) => !a.startsWith("--"));
  }

  if (urls.length === 0) {
    console.log("  No URLs to research. Pass URLs or use --all / --repos-only / --papers-only");
    return;
  }

  const repos = urls.filter((u) => u.includes("github.com"));
  const papers = urls.filter((u) => u.includes("arxiv.org") || /\d{4}\.\d{4,5}/.test(u));
  const unknown = urls.filter((u) => !repos.includes(u) && !papers.includes(u));
  if (unknown.length > 0) console.log(`\n  ⚠ Skipping ${unknown.length} unrecognized URLs`);

  console.log(`\n  📦 ${repos.length} repos  📄 ${papers.length} papers\n`);

  // Process repos
  if (repos.length > 0) {
    console.log("═══ Repos ═══");
    const limit = pLimit(REPO_CONCURRENCY);
    let done = 0;
    await Promise.all(
      repos.map((url) =>
        limit(async () => {
          try {
            await deepResearchRepo(url);
          } catch (err) {
            console.error(`  ✗ ${url}: ${err}`);
          }
          done++;
          if (repos.length > 1) console.log(`  [${done}/${repos.length} repos]`);
        }),
      ),
    );
  }

  // Process papers
  if (papers.length > 0) {
    console.log("\n═══ Papers ═══");
    const limit = pLimit(PAPER_CONCURRENCY);
    let done = 0;
    await Promise.all(
      papers.map((url) =>
        limit(async () => {
          try {
            await deepResearchPaper(url);
          } catch (err) {
            console.error(`  ✗ ${url}: ${err}`);
          }
          done++;
          if (papers.length > 1) console.log(`  [${done}/${papers.length} papers]`);
        }),
      ),
    );
  }

  // Cleanup
  if (existsSync(TEMP_DIR)) await rm(TEMP_DIR, { recursive: true, force: true }).catch(() => {});

  console.log("\n════════════════════════════════════");
  console.log("  Deep research complete.");
  console.log("════════════════════════════════════\n");
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Deep research failed:", err);
    process.exit(1);
  });
}
