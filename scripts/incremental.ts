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
 * Compute input hash for an entity — captures all inputs that affect its reference card.
 * If this changes, the entity's card needs regeneration.
 */
export function computeEntityInputHash(entity: {
  id: string;
  description: string;
  bucket: string;
  aliases: string[];
  source_refs: string[];
  neighborIds: string[];
}): string {
  const input = [
    entity.description,
    entity.bucket,
    entity.aliases.sort().join(","),
    entity.source_refs.sort().join(","),
    entity.neighborIds.sort().join(","),
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
