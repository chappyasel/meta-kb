/**
 * Incremental compilation state — tracks what changed between compilations.
 *
 * Core artifacts:
 *   build/incremental-state.json — hashes of all inputs from last compilation
 *
 * Used by compile.ts when --incremental flag is passed.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";

// ─── Types ─────────────────────────────────────────────────────────────

export interface IncrementalState {
  version: 1;
  config_hash: string; // SHA-256 of domain.ts + thresholds + model versions
  source_hashes: Record<string, string>; // path -> SHA-256 of file contents
  entity_input_hashes: Record<string, string>; // entity_id -> hash(desc+bucket+aliases+sources+neighbors)
  previous_entity_ids: string[]; // entity IDs from last compilation
  synthesis_hashes: Record<string, string>; // bucket -> hash of synthesis article content
  last_compiled: string; // ISO timestamp
}

export interface ChangeSet {
  added: Set<string>; // new source paths
  modified: Set<string>; // changed source paths
  deleted: Set<string>; // removed source paths
  changed: Set<string>; // added + modified (convenience)
  isClean: boolean; // true if nothing changed
}

// ─── Hashing ───────────────────────────────────────────────────────────

/** SHA-256 of file contents. */
export async function hashFile(path: string): Promise<string> {
  const content = await readFile(path, "utf-8");
  return createHash("sha256").update(content).digest("hex");
}

/** SHA-256 of a string. */
export function hashString(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/**
 * Compute config hash from domain.ts content + compilation thresholds + model versions.
 * If any of these change, incremental mode should force a full recompilation.
 */
export async function computeConfigHash(
  rootDir: string,
  thresholds: { refs: number; relevance: number },
  models: string[],
): Promise<string> {
  const domainContent = await readFile(join(rootDir, "config", "domain.ts"), "utf-8");
  const input = [
    domainContent,
    `refs=${thresholds.refs}`,
    `relevance=${thresholds.relevance}`,
    ...models.map((m) => `model=${m}`),
  ].join("\n");
  return hashString(input);
}

/**
 * Compute input hash for an entity — captures inputs that reflect changed evidence.
 * Only hashes bucket + source_refs. Description, aliases, and neighborIds are excluded
 * because they change cosmetically across entity re-resolution without reflecting
 * new evidence, causing cascading false-dirty detection.
 */
export function computeEntityInputHash(entity: {
  id: string;
  bucket: string;
  source_refs: string[];
}): string {
  const input = [
    entity.bucket,
    entity.source_refs.sort().join(","),
  ].join("|");
  return hashString(input);
}

// ─── State Persistence ─────────────────────────────────────────────────

export async function loadState(buildDir: string): Promise<IncrementalState | null> {
  const path = join(buildDir, "incremental-state.json");
  if (!existsSync(path)) return null;
  try {
    const state = JSON.parse(await readFile(path, "utf-8"));
    if (state.version !== 1) {
      console.warn(`  Incremental state version mismatch (got ${state.version}, expected 1) — ignoring`);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export async function saveState(buildDir: string, state: IncrementalState): Promise<void> {
  await writeFile(join(buildDir, "incremental-state.json"), JSON.stringify(state, null, 2));
}

// ─── Eval Cache Persistence ───────────────────────────────────────────

import type { EvalCache } from "./types.js";

export async function loadEvalCache(buildDir: string): Promise<EvalCache | null> {
  const path = join(buildDir, "eval-cache.json");
  if (!existsSync(path)) return null;
  try {
    const cache = JSON.parse(await readFile(path, "utf-8"));
    if (cache.version !== 1) return null;
    return cache;
  } catch {
    return null;
  }
}

export async function saveEvalCache(buildDir: string, cache: EvalCache): Promise<void> {
  await writeFile(join(buildDir, "eval-cache.json"), JSON.stringify(cache, null, 2));
}

/**
 * Determine if a cached eval entry can be carried forward.
 * Only PASS verdicts on clean buckets with unchanged sources are reusable.
 */
export function canCarryForward(
  entry: import("./types.js").EvalCacheEntry,
  dirtyBuckets: Set<string> | null,
  currentSourceHashes: Record<string, string>,
): boolean {
  // Never carry forward FAILs — the article may have been fixed
  if (entry.verdict === "FAIL") return false;
  // Full compile (no dirty tracking) → re-verify everything
  if (dirtyBuckets === null) return false;
  // If bucket is dirty, re-verify
  if (dirtyBuckets.has(entry.bucket)) return false;
  // If the source was modified or deleted, re-verify
  const currentHash = currentSourceHashes[entry.source_ref];
  if (!currentHash || currentHash !== entry.source_hash) return false;
  return true;
}

// ─── Change Detection ──────────────────────────────────────────────────

/**
 * Diff current source hashes against saved state.
 * Returns categorized sets of added/modified/deleted/changed paths.
 */
export function diffSources(
  currentHashes: Record<string, string>,
  previousHashes: Record<string, string>,
): ChangeSet {
  const added = new Set<string>();
  const modified = new Set<string>();
  const deleted = new Set<string>();

  // Find added and modified
  for (const [path, hash] of Object.entries(currentHashes)) {
    if (!(path in previousHashes)) {
      added.add(path);
    } else if (previousHashes[path] !== hash) {
      modified.add(path);
    }
  }

  // Find deleted
  for (const path of Object.keys(previousHashes)) {
    if (!(path in currentHashes)) {
      deleted.add(path);
    }
  }

  const changed = new Set([...added, ...modified]);
  const isClean = added.size === 0 && modified.size === 0 && deleted.size === 0;

  return { added, modified, deleted, changed, isClean };
}
