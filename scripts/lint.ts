#!/usr/bin/env bun
/**
 * meta-kb wiki linter: checks compiled wiki for structural integrity.
 *
 * Checks:
 *   1. Broken links — relative markdown links that don't resolve
 *   2. Orphan pages — wiki pages with no inbound links
 *   3. Missing sources — pages with empty sources[] in frontmatter
 *   4. Graph integrity — edges referencing non-existent entity IDs
 *   5. Missing articles — entities marked "full" without a wiki page
 *   6. Stub coverage — % of entities that are stubs
 *
 * Usage: bun run lint
 */

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import matter from "gray-matter";
import type { Entity, KnowledgeGraph } from "./types.js";

const ROOT = join(import.meta.dir, "..");
const BUILD_DIR = join(ROOT, "build");
const WIKI_DIR = join(ROOT, "wiki");

interface LintResult {
  check: string;
  status: "PASS" | "WARN" | "FAIL";
  count: number;
  details: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────

async function globMd(dir: string): Promise<string[]> {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await globMd(path)));
    } else if (entry.name.endsWith(".md")) {
      results.push(path);
    }
  }
  return results;
}

function extractLinks(content: string): string[] {
  const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let match;
  while ((match = linkRe.exec(content)) !== null) {
    const href = match[2];
    // Only check relative links (not http/https)
    if (!href.startsWith("http") && !href.startsWith("#")) {
      links.push(href);
    }
  }
  return links;
}

// ─── Checks ─────────────────────────────────────────────────────────────

async function checkBrokenLinks(wikiFiles: string[]): Promise<LintResult> {
  const broken: string[] = [];

  for (const file of wikiFiles) {
    const content = await readFile(file, "utf-8");
    const links = extractLinks(content);
    const fileDir = dirname(file);

    for (const link of links) {
      const target = join(fileDir, link.split("#")[0]); // strip anchors
      if (!existsSync(target)) {
        const rel = file.replace(WIKI_DIR + "/", "");
        broken.push(`${rel} → ${link}`);
      }
    }
  }

  return {
    check: "Broken links",
    status: broken.length === 0 ? "PASS" : "FAIL",
    count: broken.length,
    details: broken.slice(0, 20),
  };
}

async function checkOrphanPages(wikiFiles: string[]): Promise<LintResult> {
  // Collect all inbound link targets
  const linkedTo = new Set<string>();
  for (const file of wikiFiles) {
    const content = await readFile(file, "utf-8");
    const links = extractLinks(content);
    const fileDir = dirname(file);
    for (const link of links) {
      const target = join(fileDir, link.split("#")[0]);
      linkedTo.add(target);
    }
  }

  // Find pages not linked to by any other page
  const orphans: string[] = [];
  for (const file of wikiFiles) {
    const rel = file.replace(WIKI_DIR + "/", "");
    // Top-level files, indexes, and comparisons are entry points, not orphans
    if (!rel.includes("/")) continue;
    if (rel.startsWith("indexes/") || rel.startsWith("comparisons/")) continue;
    if (!linkedTo.has(file)) {
      orphans.push(rel);
    }
  }

  return {
    check: "Orphan pages",
    status: orphans.length === 0 ? "PASS" : orphans.length <= 5 ? "WARN" : "FAIL",
    count: orphans.length,
    details: orphans.slice(0, 20),
  };
}

async function checkMissingSources(wikiFiles: string[]): Promise<LintResult> {
  const missing: string[] = [];

  for (const file of wikiFiles) {
    const raw = await readFile(file, "utf-8");
    const { data } = matter(raw);
    if (data.sources && Array.isArray(data.sources) && data.sources.length === 0) {
      missing.push(file.replace(WIKI_DIR + "/", ""));
    }
  }

  return {
    check: "Missing sources",
    status: missing.length === 0 ? "PASS" : "WARN",
    count: missing.length,
    details: missing.slice(0, 20),
  };
}

async function checkGraphIntegrity(): Promise<LintResult> {
  const graphPath = join(BUILD_DIR, "graph.json");
  if (!existsSync(graphPath)) {
    return { check: "Graph integrity", status: "WARN", count: 0, details: ["No graph.json found"] };
  }

  const graph: KnowledgeGraph = JSON.parse(await readFile(graphPath, "utf-8"));
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const badEdges: string[] = [];

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) badEdges.push(`Edge source "${edge.source}" not in nodes`);
    if (!nodeIds.has(edge.target)) badEdges.push(`Edge target "${edge.target}" not in nodes`);
  }

  return {
    check: "Graph integrity",
    status: badEdges.length === 0 ? "PASS" : "FAIL",
    count: badEdges.length,
    details: badEdges.slice(0, 20),
  };
}

async function checkMissingArticles(): Promise<LintResult> {
  const entitiesPath = join(BUILD_DIR, "entities.json");
  if (!existsSync(entitiesPath)) {
    return { check: "Missing articles", status: "WARN", count: 0, details: ["No entities.json found"] };
  }

  const entities: Entity[] = JSON.parse(await readFile(entitiesPath, "utf-8"));
  const fullEntities = entities.filter((e) => e.article_level === "full");
  const missing: string[] = [];

  for (const entity of fullEntities) {
    const dir = entity.type === "project" ? "projects" : "concepts";
    const path = join(WIKI_DIR, dir, `${entity.id}.md`);
    if (!existsSync(path)) {
      missing.push(`${entity.name} (${entity.type}) → wiki/${dir}/${entity.id}.md`);
    }
  }

  return {
    check: "Missing articles",
    status: missing.length === 0 ? "PASS" : missing.length <= 5 ? "WARN" : "FAIL",
    count: missing.length,
    details: missing.slice(0, 20),
  };
}

async function checkStubCoverage(): Promise<LintResult> {
  const entitiesPath = join(BUILD_DIR, "entities.json");
  if (!existsSync(entitiesPath)) {
    return { check: "Stub coverage", status: "WARN", count: 0, details: ["No entities.json found"] };
  }

  const entities: Entity[] = JSON.parse(await readFile(entitiesPath, "utf-8"));
  const total = entities.length;
  const stubs = entities.filter((e) => e.article_level === "stub").length;
  const pct = total > 0 ? Math.round((stubs / total) * 100) : 0;

  return {
    check: "Stub coverage",
    status: pct > 60 ? "WARN" : "PASS",
    count: stubs,
    details: [`${stubs}/${total} entities are stubs (${pct}%)`],
  };
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║        meta-kb lint                          ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const wikiFiles = await globMd(WIKI_DIR);
  console.log(`  Scanning ${wikiFiles.length} wiki files...\n`);

  const results: LintResult[] = [
    await checkBrokenLinks(wikiFiles),
    await checkOrphanPages(wikiFiles),
    await checkMissingSources(wikiFiles),
    await checkGraphIntegrity(),
    await checkMissingArticles(),
    await checkStubCoverage(),
  ];

  // Report
  let hasFailure = false;
  for (const r of results) {
    const icon = r.status === "PASS" ? "✓" : r.status === "WARN" ? "⚠" : "✗";
    console.log(`  ${icon} ${r.check}: ${r.status} (${r.count})`);
    if (r.details.length > 0 && r.status !== "PASS") {
      for (const d of r.details) {
        console.log(`      ${d}`);
      }
    }
    if (r.status === "FAIL") hasFailure = true;
  }

  console.log("");
  if (hasFailure) {
    console.log("  RESULT: FAIL — issues found that need fixing.\n");
    process.exit(1);
  } else {
    console.log("  RESULT: PASS — wiki looks healthy.\n");
  }
}

main().catch((err) => {
  console.error("Lint failed:", err);
  process.exit(1);
});
