#!/usr/bin/env bun
/**
 * Retroactively score all raw sources for relevance.
 * Adds relevance_scores to frontmatter of every source that doesn't already have them.
 * Scores are metadata for the compiler (weight high-scoring sources more), not a filter.
 *
 * Usage:
 *   bun run rescore                    # score all unscored sources
 *   bun run rescore --force            # re-score everything, even already-scored
 *   bun run rescore --dry-run          # show what would be scored without writing
 */

import { scoreRelevance } from "./utils/llm.js";
import matter from "gray-matter";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { RawSourceType } from "./types.js";

const RAW_DIRS = ["raw/tweets", "raw/repos", "raw/articles", "raw/papers"];

interface ScoreResult {
  file: string;
  composite: number;
  topic_relevance: number;
  practitioner_value: number;
  novelty: number;
  signal_quality: number;
  reason: string;
}

async function main() {
  const force = process.argv.includes("--force");
  const dryRun = process.argv.includes("--dry-run");

  // Collect all .md files
  const files: string[] = [];
  for (const dir of RAW_DIRS) {
    if (!existsSync(dir)) continue;
    const entries = await readdir(dir);
    for (const entry of entries) {
      if (entry.endsWith(".md")) files.push(join(dir, entry));
    }
  }

  // Filter to unscored (unless --force)
  const toScore: string[] = [];
  for (const file of files) {
    const content = await Bun.file(file).text();
    const { data } = matter(content);
    if (!force && data.relevance_scores) {
      continue;
    }
    toScore.push(file);
  }

  console.log(`\n=== Rescore: ${toScore.length} of ${files.length} sources ${force ? "(forced)" : "(unscored only)"} ===\n`);

  if (dryRun) {
    for (const file of toScore) {
      console.log(`  would score: ${file}`);
    }
    console.log(`\n${toScore.length} files would be scored. Run without --dry-run to execute.`);
    return;
  }

  const results: ScoreResult[] = [];
  let scored = 0;
  let failed = 0;

  for (const file of toScore) {
    const raw = await Bun.file(file).text();
    const { data, content: body } = matter(raw);
    const sourceType = (data.type as RawSourceType) ?? "article";

    // Build content for scoring: key_insight + body (truncated by scoreRelevance internally)
    const contentForScoring = [
      data.key_insight ?? "",
      body.slice(0, 3000),
    ].join("\n\n");

    const relevance = await scoreRelevance(contentForScoring, sourceType);

    if (!relevance) {
      console.log(`  FAIL: ${file}`);
      failed++;
      continue;
    }

    scored++;
    const shortFile = file.replace("raw/", "");
    console.log(
      `  [${relevance.composite.toFixed(1)}] ${shortFile} (topic=${relevance.topic_relevance} practitioner=${relevance.practitioner_value} novelty=${relevance.novelty} signal=${relevance.signal_quality})`,
    );

    results.push({
      file,
      composite: relevance.composite,
      topic_relevance: relevance.topic_relevance,
      practitioner_value: relevance.practitioner_value,
      novelty: relevance.novelty,
      signal_quality: relevance.signal_quality,
      reason: relevance.reason,
    });

    // Write scores into frontmatter
    const updatedData = {
      ...data,
      relevance_scores: {
        topic_relevance: relevance.topic_relevance,
        practitioner_value: relevance.practitioner_value,
        novelty: relevance.novelty,
        signal_quality: relevance.signal_quality,
        composite: relevance.composite,
        reason: relevance.reason,
      },
    };

    const updatedContent = matter.stringify(body, updatedData as unknown as Record<string, unknown>);
    await Bun.write(file, updatedContent);
  }

  // Summary
  results.sort((a, b) => b.composite - a.composite);

  console.log(`\n=== Summary ===`);
  console.log(`Scored: ${scored}, Failed: ${failed}, Skipped: ${files.length - toScore.length}`);

  if (results.length > 0) {
    console.log(`\nScore distribution:`);
    const brackets = [
      { label: "Excellent (8+)", min: 8, count: 0 },
      { label: "Good (6-8)", min: 6, count: 0 },
      { label: "Fair (4-6)", min: 4, count: 0 },
      { label: "Low (<4)", min: 0, count: 0 },
    ];
    for (const r of results) {
      for (const b of brackets) {
        if (r.composite >= b.min) { b.count++; break; }
      }
    }
    for (const b of brackets) {
      const bar = "█".repeat(b.count);
      console.log(`  ${b.label.padEnd(20)} ${bar} ${b.count}`);
    }

    console.log(`\nTop 10:`);
    for (const r of results.slice(0, 10)) {
      console.log(`  [${r.composite.toFixed(1)}] ${r.file.replace("raw/", "")}`);
    }

    console.log(`\nBottom 5:`);
    for (const r of results.slice(-5)) {
      console.log(`  [${r.composite.toFixed(1)}] ${r.file.replace("raw/", "")} — ${r.reason}`);
    }
  }
}

main().catch(console.error);
