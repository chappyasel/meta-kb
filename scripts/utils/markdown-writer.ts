import matter from "gray-matter";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { scoreRelevance } from "./llm.js";
import type { RawSourceFrontmatter } from "../types.js";

export async function writeRawSource(
  dir: string,
  slug: string,
  frontmatter: RawSourceFrontmatter,
  bodyMarkdown: string,
): Promise<string> {
  const filePath = path.join("raw", dir, `${slug}.md`);

  // Never overwrite existing files
  if (existsSync(filePath)) {
    console.log(`  skip (file exists): ${filePath}`);
    return filePath;
  }

  // Score relevance at write time so every source gets scores in frontmatter
  const contentForScoring = [
    frontmatter.key_insight ?? "",
    bodyMarkdown.slice(0, 3000),
  ].join("\n\n");
  const relevance = await scoreRelevance(contentForScoring, frontmatter.type);

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
