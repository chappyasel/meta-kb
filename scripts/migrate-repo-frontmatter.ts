#!/usr/bin/env bun
/**
 * Migration script: extract language, license from body text into frontmatter.
 * Run: bun run scripts/migrate-repo-frontmatter.ts [--dry-run]
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";

const REPOS_DIR = join(import.meta.dir, "..", "raw", "repos");
const DRY_RUN = process.argv.includes("--dry-run");

// Patterns the GitHub ingester writes into body text
const LANG_RE = /\|\s*Language\s*\|\s*(.+?)\s*\|/i;
const LICENSE_RE = /\|\s*License\s*\|\s*(.+?)\s*\|/i;

async function main() {
  const files = (await readdir(REPOS_DIR)).filter((f) => f.endsWith(".md"));
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const path = join(REPOS_DIR, file);
    const raw = await readFile(path, "utf-8");
    const { data, content } = matter(raw);

    let changed = false;

    // Extract language from body
    if (!data.language) {
      const langMatch = content.match(LANG_RE);
      if (langMatch) {
        data.language = langMatch[1].trim();
        changed = true;
      }
    }

    // Extract license from body
    if (!data.license) {
      const licMatch = content.match(LICENSE_RE);
      if (licMatch) {
        data.license = licMatch[1].trim();
        changed = true;
      }
    }

    if (changed) {
      if (DRY_RUN) {
        console.log(
          `[dry-run] ${file}: language=${data.language ?? "?"}, license=${data.license ?? "?"}`,
        );
      } else {
        const output = matter.stringify(content, data);
        await writeFile(path, output);
        console.log(
          `  ✓ ${file}: language=${data.language ?? "?"}, license=${data.license ?? "?"}`,
        );
      }
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(
    `\n${DRY_RUN ? "[dry-run] " : ""}Done: ${updated} updated, ${skipped} already had fields or no match.`,
  );
}

main().catch(console.error);
