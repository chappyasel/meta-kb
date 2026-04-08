import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";

const SEEN_PATH = "build/seen-urls.json";

export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "").replace(/#.*$/, "");
}

export async function loadSeen(): Promise<Set<string>> {
  let seen = new Set<string>();

  // Load persisted set if it exists
  if (existsSync(SEEN_PATH)) {
    const data = await Bun.file(SEEN_PATH).json();
    seen = new Set(data as string[]);
  }

  // Seed from existing raw/ files (scan frontmatter URLs)
  const seeded = await seedFromExistingRaw(seen);
  if (seeded > 0) {
    console.log(`  seeded dedup set with ${seeded} URLs from existing raw/ files`);
    await saveSeen(seen);
  }

  return seen;
}

// Scan all raw/ .md files, extract url from frontmatter, add to seen set.
async function seedFromExistingRaw(seen: Set<string>): Promise<number> {
  let seeded = 0;
  const rawDirs = ["raw/tweets", "raw/repos", "raw/articles", "raw/papers"];

  for (const dir of rawDirs) {
    if (!existsSync(dir)) continue;
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      try {
        const content = await Bun.file(join(dir, file)).text();
        const { data } = matter(content);
        const url = data.url as string | undefined;
        if (url) {
          const normalized = normalizeUrl(url);
          if (!seen.has(normalized)) {
            seen.add(normalized);
            seeded++;
          }
        }
      } catch {
        // Skip files that can't be parsed
      }
    }
  }

  return seeded;
}

export async function saveSeen(seen: Set<string>): Promise<void> {
  await mkdir("build", { recursive: true });
  await Bun.write(SEEN_PATH, JSON.stringify([...seen], null, 2));
}

/** Returns true if already seen (skip it). Adds to set either way. */
export function markSeen(seen: Set<string>, url: string, force = false): boolean {
  const normalized = normalizeUrl(url);
  if (!force && seen.has(normalized)) return true;
  seen.add(normalized);
  return false;
}
