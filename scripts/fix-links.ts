#!/usr/bin/env bun
/**
 * Fix broken internal links in compiled wiki files.
 * Maps broken links to actual files on disk using fuzzy slug matching.
 *
 * Usage: bun run scripts/fix-links.ts [--dry-run]
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { existsSync } from "node:fs";

const ROOT = join(import.meta.dir, "..");
const WIKI_DIR = join(ROOT, "wiki");
const DRY_RUN = process.argv.includes("--dry-run");

// ─── Build file index ───────────────────────────────────────────────────

async function globMd(dir: string): Promise<string[]> {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...(await globMd(path)));
    else if (entry.name.endsWith(".md")) results.push(path);
  }
  return results;
}

function slugFromPath(path: string): string {
  return path
    .replace(WIKI_DIR + "/", "")
    .replace(/\.md$/, "")
    .split("/")
    .pop()!;
}

// ─── Fuzzy matching ─────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function findBestMatch(
  brokenSlug: string,
  brokenDir: string, // "projects" | "concepts" | ""
  fileIndex: Map<string, string[]>, // normalized slug → [relative paths]
): string | null {
  const normBroken = normalize(brokenSlug);

  // 1. Exact normalized match
  const exact = fileIndex.get(normBroken);
  if (exact) {
    // Prefer match in the same directory
    const sameDir = exact.find((p) => p.startsWith(brokenDir + "/"));
    return sameDir ?? exact[0];
  }

  // 2. Suffix match (e.g., "cognee" matches "topoteretes-cognee")
  for (const [normSlug, paths] of fileIndex) {
    if (normSlug.endsWith(normBroken) || normBroken.endsWith(normSlug)) {
      const sameDir = paths.find((p) => p.startsWith(brokenDir + "/"));
      return sameDir ?? paths[0];
    }
  }

  // 3. Contains match
  for (const [normSlug, paths] of fileIndex) {
    if (normSlug.includes(normBroken) || normBroken.includes(normSlug)) {
      if (normBroken.length >= 3 && normSlug.length >= 3) {
        const sameDir = paths.find((p) => p.startsWith(brokenDir + "/"));
        return sameDir ?? paths[0];
      }
    }
  }

  return null;
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? "[dry-run] Scanning wiki for broken links...\n" : "Fixing broken links...\n");

  const allFiles = await globMd(WIKI_DIR);

  // Build index: normalized slug → relative paths from wiki/
  const fileIndex = new Map<string, string[]>();
  for (const file of allFiles) {
    const rel = relative(WIKI_DIR, file).replace(/\.md$/, "");
    const slug = slugFromPath(file);
    const norm = normalize(slug);
    const existing = fileIndex.get(norm) ?? [];
    existing.push(rel);
    fileIndex.set(norm, existing);
  }

  // Also index by full relative path (without .md)
  for (const file of allFiles) {
    const rel = relative(WIKI_DIR, file).replace(/\.md$/, "");
    const norm = normalize(rel.replace(/\//g, ""));
    if (!fileIndex.has(norm)) {
      fileIndex.set(norm, [rel]);
    }
  }

  const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  let totalFixed = 0;
  let totalBroken = 0;
  let totalUnfixable = 0;
  const unfixable: string[] = [];

  for (const file of allFiles) {
    const content = await readFile(file, "utf-8");
    const fileDir = dirname(file);
    let newContent = content;
    let fileFixed = 0;

    // Find all relative links
    const matches = [...content.matchAll(linkRe)];
    for (const match of matches) {
      const [fullMatch, linkText, href] = match;
      if (href.startsWith("http") || href.startsWith("#")) continue;

      // Source citations — try to resolve ../raw/ links
      if (href.includes("raw/") || href.match(/^(repos|tweets|papers|articles)\//)) {
        // Extract the filename from the href
        const filename = href.split("/").pop()!;
        // Search for this file in raw/
        const RAW_DIR = join(WIKI_DIR, "..", "raw");
        let found = false;
        for (const subdir of ["repos", "tweets", "papers", "articles"]) {
          const candidate = join(RAW_DIR, subdir, filename);
          if (existsSync(candidate)) {
            const correctRel = relative(fileDir, candidate);
            newContent = newContent.replace(fullMatch, `[${linkText}](${correctRel})`);
            fileFixed++;
            found = true;
            break;
          }
        }
        if (found) continue;
        // File doesn't exist in raw/ at all — leave link text, remove broken link
        newContent = newContent.replace(fullMatch, linkText);
        totalUnfixable++;
        const rel = relative(WIKI_DIR, file);
        if (unfixable.length < 30) unfixable.push(`${rel}: ${href}`);
        totalBroken++;
        continue;
      }

      const targetPath = join(fileDir, href.split("#")[0]);
      if (existsSync(targetPath)) continue; // Link is fine

      totalBroken++;

      // Try to fix it
      const hrefSlug = href.replace(/\.md$/, "").split("/").pop()!;
      const hrefDir = href.includes("/") ? href.split("/")[0] : "";

      // Also check if it's a cross-directory issue (link says projects/ but file is in concepts/)
      const bestMatch = findBestMatch(hrefSlug, hrefDir, fileIndex);

      if (bestMatch) {
        // Compute correct relative path from this file to the match
        const matchAbsolute = join(WIKI_DIR, bestMatch + ".md");
        const correctRelative = relative(fileDir, matchAbsolute);
        const newLink = `[${linkText}](${correctRelative})`;
        newContent = newContent.replace(fullMatch, newLink);
        fileFixed++;
      } else {
        // Can't fix — remove the link but keep the text
        newContent = newContent.replace(fullMatch, linkText);
        totalUnfixable++;
        const rel = relative(WIKI_DIR, file);
        if (unfixable.length < 30) unfixable.push(`${rel}: ${href}`);
      }
    }

    const fileChanged = newContent !== content;
    if (fileChanged) {
      if (!DRY_RUN) {
        await writeFile(file, newContent);
      }
      totalFixed += fileFixed;
      const rel = relative(WIKI_DIR, file);
      console.log(`  ${DRY_RUN ? "[would fix]" : "✓"} ${rel}: ${fileFixed} fixed, ${fileChanged && fileFixed === 0 ? "unfixable links cleaned" : ""}`);
    }
  }

  console.log(`\n  Total broken: ${totalBroken}`);
  console.log(`  Fixed: ${totalFixed}`);
  console.log(`  Unfixable (link text preserved, link removed): ${totalUnfixable}`);
  if (unfixable.length > 0) {
    console.log(`\n  Unfixable links:`);
    for (const u of unfixable) {
      console.log(`    ${u}`);
    }
  }
}

main().catch(console.error);
