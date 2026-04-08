import matter from "gray-matter";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { scoreRelevance, type RelevanceScore } from "./llm.js";
import type { RawSourceFrontmatter } from "../types.js";
import * as readline from "node:readline/promises";

/** Minimum Sonnet relevance composite for automatic acceptance. */
const MIN_RELEVANCE = 6.0;

export interface WriteOptions {
  /**
   * How to handle low relevance scores:
   * - "auto-reject": silently skip (curation / auto-chain paths)
   * - "prompt": warn and ask the user (manual ingestion, default)
   */
  lowRelevance?: "auto-reject" | "prompt";
  /** Force re-ingest even if file already exists. */
  force?: boolean;
}

/** Cache of scores for sources that were rejected — avoids re-scoring on retry. */
const scoreCache = new Map<string, RelevanceScore>();

export async function writeRawSource(
  dir: string,
  slug: string,
  frontmatter: RawSourceFrontmatter,
  bodyMarkdown: string,
  opts: WriteOptions = {},
): Promise<string> {
  const { lowRelevance = "prompt", force = false } = opts;
  const filePath = path.join("raw", dir, `${slug}.md`);

  // Never overwrite existing files (unless force re-ingest)
  if (!force && existsSync(filePath)) {
    console.log(`  skip (file exists): ${filePath}`);
    return filePath;
  }

  // Score relevance at write time so every source gets scores in frontmatter
  // Check cache first (source may have been scored but rejected in a prior run)
  const cacheKey = `${dir}/${slug}`;
  let relevance = scoreCache.get(cacheKey) ?? null;
  if (!relevance) {
    const contentForScoring = [
      frontmatter.key_insight ?? "",
      bodyMarkdown.slice(0, 3000),
    ].join("\n\n");
    relevance = await scoreRelevance(contentForScoring, frontmatter.type);
    if (relevance) scoreCache.set(cacheKey, relevance);
  }

  // Quality gate for low relevance
  if (relevance && relevance.composite < MIN_RELEVANCE) {
    if (lowRelevance === "auto-reject") {
      console.log(`  skip (relevance ${relevance.composite} < ${MIN_RELEVANCE}): ${relevance.reason}`);
      return "";
    }

    // Prompt mode — warn the user and ask
    console.log(`\n  ⚠ Low relevance: ${relevance.composite}/10 (threshold: ${MIN_RELEVANCE})`);
    console.log(`    ${relevance.reason}`);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question("    Write anyway? [y/N] ");
    rl.close();
    if (answer.trim().toLowerCase() !== "y") {
      console.log(`  skip (user declined)`);
      return "";
    }
  }

  const fullFrontmatter = {
    ...frontmatter,
    ...(relevance && {
      relevance_scores: {
        topic_relevance: relevance.topic_relevance,
        practitioner_value: relevance.practitioner_value,
        novelty: relevance.novelty,
        signal_quality: relevance.signal_quality,
        composite: relevance.composite,
        reason: relevance.reason,
      },
    }),
  };

  await mkdir(path.dirname(filePath), { recursive: true });

  const content = matter.stringify(bodyMarkdown, fullFrontmatter as unknown as Record<string, unknown>);
  await Bun.write(filePath, content);

  console.log(`  wrote ${filePath}${relevance ? ` [relevance: ${relevance.composite}]` : ""}`);
  return filePath;
}

export async function appendDiscoveredUrl(url: string, source: string): Promise<void> {
  await mkdir("build", { recursive: true });
  const entry = JSON.stringify({ url, discovered_from: source, ts: new Date().toISOString() });
  const file = Bun.file("build/discovered-urls.jsonl");
  const existing = (await file.exists()) ? await file.text() : "";
  await Bun.write("build/discovered-urls.jsonl", existing + entry + "\n");
}
