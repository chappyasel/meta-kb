#!/usr/bin/env bun
/**
 * arXiv paper ingestion script.
 * Fetches paper metadata + abstract via arXiv Atom API, generates key_insight/tags.
 *
 * Usage:
 *   bun run scripts/ingest-arxiv.ts [url-or-id1] [url-or-id2] ...
 *   bun run scripts/ingest-arxiv.ts              # reads config/sources.json
 */

import { generateInsightAndTags } from "./utils/llm.js";
import { writeRawSource } from "./utils/markdown-writer.js";
import { slugify } from "./utils/slugify.js";
import { loadSeen, saveSeen, markSeen, normalizeUrl } from "./utils/dedup.js";
import { loadSourceUrls } from "./utils/config.js";
import { parseDate } from "./utils/date.js";
import type { RawSourceFrontmatter } from "./types.js";

// ─── arXiv ID extraction ──────────────────────────────────────────────

const ARXIV_ID_RE = /(\d{4}\.\d{4,5}(?:v\d+)?)/;

function extractArxivId(input: string): string | null {
  const match = input.match(ARXIV_ID_RE);
  return match?.[1] ?? null;
}

function canonicalUrl(id: string): string {
  // Strip version for dedup (v1 and v2 are the same paper)
  const baseId = id.replace(/v\d+$/, "");
  return `https://arxiv.org/abs/${baseId}`;
}

// ─── arXiv API fetching ───────────────────────────────────────────────

interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  published: string; // YYYY-MM-DD
  updated: string; // YYYY-MM-DD
  categories: string[];
  pdfUrl: string;
  absUrl: string;
}

async function fetchArxivMetadata(id: string): Promise<ArxivPaper | null> {
  const apiUrl = `http://export.arxiv.org/api/query?id_list=${id}`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    console.warn(`  arXiv API returned ${response.status} for ${id}`);
    return null;
  }

  const xml = await response.text();

  // Parse with simple regex — arXiv Atom XML is very predictable
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
  if (!entry) {
    console.warn(`  no entry found in arXiv response for ${id}`);
    return null;
  }

  const title = entry
    .match(/<title>([\s\S]*?)<\/title>/)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();

  if (!title || title === "Error") {
    console.warn(`  arXiv returned error for ${id} — invalid paper ID?`);
    return null;
  }

  const authors = [...entry.matchAll(/<author>\s*<name>(.*?)<\/name>/g)].map(
    (m) => m[1]!.trim(),
  );

  const abstract = entry
    .match(/<summary>([\s\S]*?)<\/summary>/)?.[1]
    ?.replace(/\s+/g, " ")
    .trim() ?? "";

  const published = parseDate(
    entry.match(/<published>(.*?)<\/published>/)?.[1] ?? "",
  );
  const updated = parseDate(
    entry.match(/<updated>(.*?)<\/updated>/)?.[1] ?? "",
  );

  const categories = [
    ...entry.matchAll(/<category[^>]*term="([^"]+)"/g),
  ].map((m) => m[1]!);

  const pdfUrl = `https://arxiv.org/pdf/${id}`;
  const absUrl = `https://arxiv.org/abs/${id}`;

  return {
    id,
    title,
    authors,
    abstract,
    published,
    updated,
    categories,
    pdfUrl,
    absUrl,
  };
}

// ─── Main ingestion logic ─────────────────────────────────────────────

interface IngestOptions {
  seen?: Set<string>;
  force?: boolean;
}

export async function ingestArxivPapers(
  inputs: string[],
  opts: IngestOptions = {},
): Promise<string[]> {
  const { force = false } = opts;
  const seen = opts.seen ?? (await loadSeen());
  const written: string[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]!;

    try {
      const id = extractArxivId(input);
      if (!id) {
        console.warn(`  could not extract arXiv ID from: ${input}`);
        continue;
      }

      const url = canonicalUrl(id);
      if (!force && seen.has(normalizeUrl(url))) {
        console.log(`  skip (already seen): ${id}`);
        continue;
      }

      console.log(`\n[arxiv] fetching ${id}...`);
      const paper = await fetchArxivMetadata(id);
      if (!paper) continue;

      markSeen(seen, url);

      const { key_insight, tags } = await generateInsightAndTags(
        `${paper.title}\n\n${paper.abstract}`,
        "paper",
      );

      const frontmatter: RawSourceFrontmatter = {
        url: paper.absUrl,
        type: "paper",
        author: paper.authors.join(", "),
        date: paper.published,
        tags,
        key_insight,
      };

      const body = buildPaperBody(paper);
      const lastNameSlug =
        paper.authors[0]?.split(" ").pop()?.toLowerCase() ?? "unknown";
      const slug = slugify(`${lastNameSlug}-${paper.title.slice(0, 50)}`);
      const filePath = await writeRawSource("papers", slug, frontmatter, body, force);
      written.push(filePath);

      // arXiv rate limit: 3 second delay between requests
      if (i < inputs.length - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      console.warn(`  error processing ${input}: ${err}`);
    }
  }

  await saveSeen(seen);
  return written;
}

function buildPaperBody(paper: ArxivPaper): string {
  const lines: string[] = [];
  lines.push(`## ${paper.title}`);
  lines.push("");
  lines.push(`**Authors:** ${paper.authors.join(", ")}`);
  lines.push("");
  lines.push(
    `**Published:** ${paper.published} | **Updated:** ${paper.updated}`,
  );
  lines.push("");
  lines.push(`**Categories:** ${paper.categories.join(", ")}`);
  lines.push("");
  lines.push(`**PDF:** [${paper.pdfUrl}](${paper.pdfUrl})`);
  lines.push("");
  lines.push("### Abstract");
  lines.push("");
  lines.push(paper.abstract);
  lines.push("");
  return lines.join("\n");
}

// ─── CLI entry point ──────────────────────────────────────────────────

async function main() {
  let inputs = process.argv.slice(2);

  if (inputs.length === 0) {
    inputs = await loadSourceUrls("arxiv_papers");
    console.log(`loaded ${inputs.length} arXiv IDs from config/sources.json`);
  }

  console.log(`\n=== arXiv Ingestion: ${inputs.length} papers ===\n`);

  const seen = await loadSeen();
  const written = await ingestArxivPapers(inputs, { seen });
  await saveSeen(seen);

  console.log(`\n=== Done: ${written.length} files written ===`);
}

if (import.meta.main) {
  main().catch(console.error);
}
