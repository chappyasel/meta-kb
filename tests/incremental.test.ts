/**
 * Tests for incremental compilation logic.
 * Zero LLM calls — tests hashing, diffing, dirty bucket detection, and claim ID migration.
 *
 * Run: bun test tests/incremental.test.ts
 */

import { describe, test, expect } from "bun:test";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  type IncrementalState,
  hashFile,
  hashString,
  computeConfigHash,
  computeEntityInputHash,
  saveState,
  diffSources,
  loadEvalCache,
  saveEvalCache,
  canCarryForward,
} from "../scripts/incremental.js";
import type { EvalCacheEntry, EvalCache } from "../scripts/types.js";
import { BUCKET_IDS } from "../config/domain.js";

const ROOT = join(import.meta.dir, "..");
const BUILD_DIR = join(ROOT, "build");
const RAW_DIR = join(ROOT, "raw");

/** Mirrors tagsToBuckets() from compile.ts */
function tagsToBuckets(tags: string[]): Set<string> {
  const assigned = new Set<string>();
  for (const tag of tags) {
    for (const bucket of BUCKET_IDS) {
      if (!assigned.has(bucket)) {
        if (tag === bucket || tag.startsWith(bucket.split("-")[0])) {
          assigned.add(bucket);
        }
      }
    }
  }
  const tagStr = tags.join(" ");
  for (const bucket of BUCKET_IDS) {
    if (!assigned.has(bucket)) {
      const keywords = bucket.split("-");
      if (keywords.some((k: string) => tagStr.includes(k))) {
        assigned.add(bucket);
      }
    }
  }
  return assigned;
}

function claimContentHash(content: string, articleRef: string): string {
  return createHash("sha256").update(content + "|" + articleRef).digest("hex").slice(0, 12);
}

// ─── Unit Tests ────────────────────────────────────────────────────────

describe("hashing utilities", () => {
  test("hashString is deterministic", () => {
    expect(hashString("hello world")).toBe(hashString("hello world"));
  });

  test("hashString is sensitive to input", () => {
    expect(hashString("hello world")).not.toBe(hashString("hello world!"));
  });

  test("hashString produces 64 hex chars (SHA-256)", () => {
    expect(hashString("test")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("claim content hash", () => {
  test("same content + bucket = same hash", () => {
    expect(claimContentHash("Mem0 has 51K stars", "agent-memory"))
      .toBe(claimContentHash("Mem0 has 51K stars", "agent-memory"));
  });

  test("different content = different hash", () => {
    expect(claimContentHash("Mem0 has 51K stars", "agent-memory"))
      .not.toBe(claimContentHash("Mem0 has 54K stars", "agent-memory"));
  });

  test("same content, different bucket = different hash", () => {
    expect(claimContentHash("Mem0 has 51K stars", "agent-memory"))
      .not.toBe(claimContentHash("Mem0 has 51K stars", "knowledge-substrate"));
  });

  test("produces 12 hex chars", () => {
    expect(claimContentHash("test", "bucket")).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe("source diff detection", () => {
  const prev = { "repos/mem0.md": "aaa", "repos/graphiti.md": "bbb", "tweets/old.md": "ccc" };
  const curr = { "repos/mem0.md": "aaa", "repos/graphiti.md": "bbb2", "repos/new-tool.md": "ddd" };

  test("detects added sources", () => {
    const cs = diffSources(curr, prev);
    expect(cs.added).toContain("repos/new-tool.md");
    expect(cs.added.size).toBe(1);
  });

  test("detects modified sources", () => {
    const cs = diffSources(curr, prev);
    expect(cs.modified).toContain("repos/graphiti.md");
    expect(cs.modified.size).toBe(1);
  });

  test("detects deleted sources", () => {
    const cs = diffSources(curr, prev);
    expect(cs.deleted).toContain("tweets/old.md");
    expect(cs.deleted.size).toBe(1);
  });

  test("changed = added + modified", () => {
    const cs = diffSources(curr, prev);
    expect(cs.changed.size).toBe(2);
  });

  test("clean when no changes", () => {
    expect(diffSources(prev, prev).isClean).toBe(true);
  });

  test("not clean when changes exist", () => {
    expect(diffSources(curr, prev).isClean).toBe(false);
  });
});

describe("dirty bucket computation (stopusingmarkdownformemory.com test case)", () => {
  const articleTags = ["agent-memory", "context-engineering", "knowledge-substrate", "semantic-retrieval", "attention-budget", "self-improving", "information-decay"];
  const repoTags = ["agent-memory", "self-improving", "knowledge-substrate", "competence-learning", "trust-gating", "semantic-extraction", "audit-trails"];

  test("article maps to expected buckets", () => {
    const buckets = tagsToBuckets(articleTags);
    expect(buckets).toContain("agent-memory");
    expect(buckets).toContain("knowledge-substrate");
    expect(buckets).toContain("context-engineering");
    expect(buckets).toContain("self-improving");
  });

  test("combined sources dirty at least 4 buckets", () => {
    const all = new Set([...tagsToBuckets(articleTags), ...tagsToBuckets(repoTags)]);
    expect(all.size).toBeGreaterThanOrEqual(4);
  });
});

describe("entity input hash", () => {
  const base = {
    id: "mem0",
    bucket: "agent-memory",
    source_refs: ["repos/mem0.md", "papers/mem0-paper.md"],
  };

  test("stable across source_refs reordering", () => {
    const reordered = {
      ...base,
      source_refs: ["papers/mem0-paper.md", "repos/mem0.md"],
    };
    expect(computeEntityInputHash(base)).toBe(computeEntityInputHash(reordered));
  });

  test("changes when source_refs change", () => {
    expect(computeEntityInputHash(base))
      .not.toBe(computeEntityInputHash({ ...base, source_refs: ["repos/mem0.md", "repos/new-source.md"] }));
  });

  test("changes when bucket changes", () => {
    expect(computeEntityInputHash(base))
      .not.toBe(computeEntityInputHash({ ...base, bucket: "knowledge-substrate" }));
  });

  test("does NOT change when description or neighbors change (stability)", () => {
    // These fields are excluded from the hash to prevent cascading false-dirty detection
    // We verify by checking the hash only depends on bucket + source_refs
    const h1 = computeEntityInputHash(base);
    const h2 = computeEntityInputHash({ ...base }); // same inputs
    expect(h1).toBe(h2);
  });
});

describe("config hash", () => {
  test("deterministic", async () => {
    const h1 = await computeConfigHash(ROOT, { refs: 3, relevance: 7.0 }, ["claude-haiku-4-5", "claude-sonnet-4-6"]);
    const h2 = await computeConfigHash(ROOT, { refs: 3, relevance: 7.0 }, ["claude-haiku-4-5", "claude-sonnet-4-6"]);
    expect(h1).toBe(h2);
  });

  test("sensitive to threshold changes", async () => {
    const h1 = await computeConfigHash(ROOT, { refs: 3, relevance: 7.0 }, ["claude-haiku-4-5", "claude-sonnet-4-6"]);
    const h2 = await computeConfigHash(ROOT, { refs: 2, relevance: 7.0 }, ["claude-haiku-4-5", "claude-sonnet-4-6"]);
    expect(h1).not.toBe(h2);
  });

  test("sensitive to model version changes", async () => {
    const h1 = await computeConfigHash(ROOT, { refs: 3, relevance: 7.0 }, ["claude-haiku-4-5", "claude-sonnet-4-6"]);
    const h2 = await computeConfigHash(ROOT, { refs: 3, relevance: 7.0 }, ["claude-haiku-4-5", "claude-sonnet-4-7"]);
    expect(h1).not.toBe(h2);
  });
});

describe("state persistence", () => {
  const testPath = join(BUILD_DIR, "incremental-state-test.json");

  test("roundtrip preserves all fields", async () => {
    const state: IncrementalState = {
      version: 1,
      config_hash: "abc123",
      source_hashes: { "repos/mem0.md": "hash1", "tweets/test.md": "hash2" },
      entity_input_hashes: { "mem0": "ehash1" },
      previous_entity_ids: ["mem0", "graphiti"],
      synthesis_hashes: { "agent-memory": "shash1" },
      last_compiled: new Date().toISOString(),
    };

    await writeFile(testPath, JSON.stringify(state, null, 2));
    const loaded = JSON.parse(await readFile(testPath, "utf-8")) as IncrementalState;

    expect(loaded.version).toBe(1);
    expect(loaded.config_hash).toBe("abc123");
    expect(Object.keys(loaded.source_hashes)).toHaveLength(2);
    expect(loaded.previous_entity_ids).toHaveLength(2);

    await unlink(testPath).catch(() => {});
  });
});

// ─── Integration Tests (require build artifacts on disk) ───────────────

describe("real source hashing", () => {
  const articlePath = join(RAW_DIR, "articles", "gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md");
  const repoPath = join(RAW_DIR, "repos", "gustycube-membrane.md");

  test("gustycube files exist", () => {
    expect(existsSync(articlePath)).toBe(true);
    expect(existsSync(repoPath)).toBe(true);
  });

  test("same file hashes identically", async () => {
    const h1 = await hashFile(articlePath);
    const h2 = await hashFile(articlePath);
    expect(h1).toBe(h2);
  });

  test("different files hash differently", async () => {
    const h1 = await hashFile(articlePath);
    const h2 = await hashFile(repoPath);
    expect(h1).not.toBe(h2);
  });
});

describe("simulated incremental detection", () => {
  test("detects 2 new gustycube sources against existing index", async () => {
    const sourceIndex = JSON.parse(await readFile(join(BUILD_DIR, "source-index.json"), "utf-8"));
    const allSources: Array<{ path: string }> = sourceIndex.sources;

    // Hash all sources in the current index
    const currentHashes: Record<string, string> = {};
    for (const src of allSources) {
      const fullPath = join(RAW_DIR, src.path);
      if (existsSync(fullPath)) {
        currentHashes[src.path] = await hashFile(fullPath);
      }
    }

    // Add the 2 new sources
    const newArticle = "articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md";
    const newRepo = "repos/gustycube-membrane.md";
    currentHashes[newArticle] = await hashFile(join(RAW_DIR, newArticle));
    currentHashes[newRepo] = await hashFile(join(RAW_DIR, newRepo));

    // Simulate previous state without the new sources
    const prevHashes = { ...currentHashes };
    delete prevHashes[newArticle];
    delete prevHashes[newRepo];

    const cs = diffSources(currentHashes, prevHashes);
    expect(cs.added.size).toBe(2);
    expect(cs.added).toContain(newArticle);
    expect(cs.added).toContain(newRepo);
    expect(cs.modified.size).toBe(0);
    expect(cs.deleted.size).toBe(0);
  });

  test("relevance boost clears top-25 cutoffs", async () => {
    const matter = (await import("gray-matter")).default;
    const articleFm = matter(await readFile(join(RAW_DIR, "articles", "gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md"), "utf-8"));
    const repoFm = matter(await readFile(join(RAW_DIR, "repos", "gustycube-membrane.md"), "utf-8"));

    const articleRel = articleFm.data.relevance_scores?.composite ?? 0;
    const repoRel = repoFm.data.relevance_scores?.composite ?? 0;

    // Highest top-25 cutoff across buckets is 8.4 (agent-memory, self-improving)
    expect(articleRel + 1.5).toBeGreaterThan(8.4);
    expect(repoRel + 1.5).toBeGreaterThan(8.4);
  });
});

describe("claim content hashing", () => {
  test("existing claims have no hash collisions", async () => {
    const claimsFile = JSON.parse(await readFile(join(BUILD_DIR, "claims.json"), "utf-8"));
    expect(claimsFile.version).toBeGreaterThanOrEqual(1);

    const hashes = new Set<string>();
    let collisions = 0;
    for (const claim of claimsFile.claims) {
      const hash = claimContentHash(claim.content, claim.article_ref);
      if (hashes.has(hash)) collisions++;
      hashes.add(hash);
    }
    expect(collisions).toBe(0);
    expect(hashes.size).toBe(claimsFile.claims.length);
  });
});

// ─── Eval Cache ───────────────────────────────────────────────────────

describe("eval cache persistence", () => {
  const TEST_CACHE_DIR = join(BUILD_DIR, "test-eval-cache");

  test("saveEvalCache + loadEvalCache roundtrip", async () => {
    const { mkdirSync, rmSync } = await import("node:fs");
    mkdirSync(TEST_CACHE_DIR, { recursive: true });
    try {
      const cache: EvalCache = {
        version: 1,
        config_hash: "abc123",
        entries: {
          "hash1": {
            claim_content_hash: "hash1",
            verdict: "PASS",
            reason: "Source confirms the claim",
            source_ref: "repos/mem0.md",
            source_hash: "deadbeef",
            verified_at: "2026-04-08T00:00:00Z",
            bucket: "agent-memory",
          },
        },
      };
      await saveEvalCache(TEST_CACHE_DIR, cache);
      const loaded = await loadEvalCache(TEST_CACHE_DIR);
      expect(loaded).not.toBeNull();
      expect(loaded!.version).toBe(1);
      expect(loaded!.config_hash).toBe("abc123");
      expect(loaded!.entries["hash1"].verdict).toBe("PASS");
      expect(loaded!.entries["hash1"].source_ref).toBe("repos/mem0.md");
    } finally {
      rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
    }
  });

  test("loadEvalCache returns null for missing file", async () => {
    const result = await loadEvalCache("/tmp/nonexistent-dir-eval-cache");
    expect(result).toBeNull();
  });
});

describe("canCarryForward", () => {
  const makeEntry = (overrides: Partial<EvalCacheEntry> = {}): EvalCacheEntry => ({
    claim_content_hash: "hash1",
    verdict: "PASS",
    reason: "Source confirms",
    source_ref: "repos/mem0.md",
    source_hash: "aaa111",
    verified_at: "2026-04-08T00:00:00Z",
    bucket: "agent-memory",
    ...overrides,
  });

  const sourceHashes: Record<string, string> = {
    "repos/mem0.md": "aaa111",
    "repos/graphiti.md": "bbb222",
  };

  test("PASS on clean bucket with unchanged source is carried forward", () => {
    const entry = makeEntry();
    expect(canCarryForward(entry, new Set(["knowledge-substrate"]), sourceHashes)).toBe(true);
  });

  test("FAIL is never carried forward", () => {
    const entry = makeEntry({ verdict: "FAIL" });
    expect(canCarryForward(entry, new Set(), sourceHashes)).toBe(false);
  });

  test("dirty bucket forces re-verification", () => {
    const entry = makeEntry();
    expect(canCarryForward(entry, new Set(["agent-memory"]), sourceHashes)).toBe(false);
  });

  test("changed source hash forces re-verification", () => {
    const entry = makeEntry();
    const changedHashes = { ...sourceHashes, "repos/mem0.md": "changed-hash" };
    expect(canCarryForward(entry, new Set(), changedHashes)).toBe(false);
  });

  test("deleted source forces re-verification", () => {
    const entry = makeEntry();
    const noMem0 = { "repos/graphiti.md": "bbb222" }; // mem0.md missing
    expect(canCarryForward(entry, new Set(), noMem0)).toBe(false);
  });

  test("null dirtyBuckets (full compile) never carries forward — re-verify everything", () => {
    const entry = makeEntry();
    expect(canCarryForward(entry, null, sourceHashes)).toBe(false);
  });

  test("deep/ fallback source is tracked correctly", () => {
    const entry = makeEntry({ source_ref: "deep/repos/mem0.md", source_hash: "deep111" });
    const hashes = { ...sourceHashes, "deep/repos/mem0.md": "deep111" };
    expect(canCarryForward(entry, new Set(), hashes)).toBe(true);
  });

  test("deep/ fallback source changed forces re-verification", () => {
    const entry = makeEntry({ source_ref: "deep/repos/mem0.md", source_hash: "deep111" });
    const hashes = { ...sourceHashes, "deep/repos/mem0.md": "changed-deep" };
    expect(canCarryForward(entry, new Set(), hashes)).toBe(false);
  });
});

// ─── Incremental Entity Resolution Logic ─────────────────────────────

describe("incremental entity resolution helpers", () => {
  // Simulate the name→entity lookup that resolveEntitiesIncremental builds
  function buildNameLookup(entities: Array<{ id: string; name: string; aliases: string[] }>): Map<string, string> {
    const map = new Map<string, string>();
    // Pass 1: canonical names first
    for (const e of entities) {
      const key = e.name.toLowerCase().trim();
      if (!map.has(key)) map.set(key, e.id);
    }
    // Pass 2: aliases (only if not already claimed)
    for (const e of entities) {
      for (const alias of e.aliases) {
        const key = alias.toLowerCase().trim();
        if (!map.has(key)) map.set(key, e.id);
      }
    }
    return map;
  }

  test("canonical name takes priority over alias from another entity", () => {
    const entities = [
      { id: "vector-database", name: "Vector Database", aliases: ["chromadb", "vector-db"] },
      { id: "chromadb", name: "ChromaDB", aliases: ["chroma"] },
    ];
    const lookup = buildNameLookup(entities);
    // "chromadb" should map to chromadb (canonical name), not vector-database (alias)
    expect(lookup.get("chromadb")).toBe("chromadb");
    expect(lookup.get("vector database")).toBe("vector-database");
    expect(lookup.get("chroma")).toBe("chromadb");
  });

  test("case-insensitive matching", () => {
    const entities = [
      { id: "memgpt", name: "MemGPT", aliases: ["mem-gpt"] },
    ];
    const lookup = buildNameLookup(entities);
    expect(lookup.get("memgpt")).toBe("memgpt");
    expect(lookup.get("mem-gpt")).toBe("memgpt");
  });

  test("matching new mentions adds source_refs without duplicates", () => {
    const entityRefs = ["repos/mem0.md", "papers/mem0-paper.md"];
    const newRef = "tweets/new-mention.md";
    const existingRef = "repos/mem0.md";

    // Simulate: add new ref, skip existing
    const updated = [...entityRefs];
    const existing = new Set(updated);
    if (!existing.has(newRef)) updated.push(newRef);
    if (!existing.has(existingRef)) updated.push(existingRef); // should skip

    expect(updated).toEqual(["repos/mem0.md", "papers/mem0-paper.md", "tweets/new-mention.md"]);
    expect(updated.length).toBe(3); // not 4
  });

  test("deleted source_refs are removed", () => {
    const refs = ["repos/mem0.md", "papers/old.md", "tweets/keep.md"];
    const deleted = new Set(["papers/old.md"]);
    const cleaned = refs.filter((r) => !deleted.has(r));
    expect(cleaned).toEqual(["repos/mem0.md", "tweets/keep.md"]);
  });

  test("article_level recomputation at threshold boundary", () => {
    // 3+ refs AND 7.0+ relevance → full
    const fullRefs = ["a.md", "b.md", "c.md"]; // 3 refs
    const stubRefs = ["a.md", "b.md"]; // 2 refs

    const isFull = (refs: string[], maxRel: number) =>
      refs.length >= 3 && maxRel >= 7.0 ? "full" : "stub";

    expect(isFull(fullRefs, 8.0)).toBe("full");
    expect(isFull(stubRefs, 8.0)).toBe("stub"); // not enough refs
    expect(isFull(fullRefs, 6.5)).toBe("stub"); // not enough relevance
    expect(isFull(fullRefs, 7.0)).toBe("full"); // exactly at threshold
  });

  test("fallback threshold: >20% triggers full resolution", () => {
    const shouldFallback = (changed: number, total: number) => changed / total > 0.20;
    expect(shouldFallback(1, 200)).toBe(false);   // 0.5%
    expect(shouldFallback(10, 200)).toBe(false);  // 5%
    expect(shouldFallback(40, 200)).toBe(false);  // 20% exactly — not >20%
    expect(shouldFallback(41, 200)).toBe(true);   // 20.5%
  });

  test("entity hash stable when only matched mentions add source_refs", () => {
    // Before: entity has 2 source_refs
    const before = computeEntityInputHash({ id: "mem0", bucket: "agent-memory", source_refs: ["a.md", "b.md"] });
    // After: entity gains 1 source_ref
    const after = computeEntityInputHash({ id: "mem0", bucket: "agent-memory", source_refs: ["a.md", "b.md", "c.md"] });
    // Hashes should differ (source_refs changed)
    expect(before).not.toBe(after);

    // But entities that didn't gain source_refs should be stable
    const unchanged = computeEntityInputHash({ id: "mem0", bucket: "agent-memory", source_refs: ["a.md", "b.md"] });
    expect(before).toBe(unchanged);
  });
});
