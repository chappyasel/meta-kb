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
} from "../scripts/incremental.js";
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
      .not.toBe(claimContentHash("Mem0 has 51K stars", "knowledge-bases"));
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
  const articleTags = ["agent-memory", "context-engineering", "knowledge-bases", "semantic-retrieval", "attention-budget", "self-improving", "information-decay"];
  const repoTags = ["agent-memory", "self-improving", "knowledge-bases", "competence-learning", "trust-gating", "semantic-extraction", "audit-trails"];

  test("article maps to expected buckets", () => {
    const buckets = tagsToBuckets(articleTags);
    expect(buckets).toContain("agent-memory");
    expect(buckets).toContain("knowledge-bases");
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
    description: "An AI memory system",
    bucket: "agent-memory",
    aliases: ["mem0ai", "mem0"],
    source_refs: ["repos/mem0.md", "papers/mem0-paper.md"],
    neighborIds: ["graphiti", "letta"],
  };

  test("stable across array reordering", () => {
    const reordered = {
      ...base,
      aliases: ["mem0", "mem0ai"],
      source_refs: ["papers/mem0-paper.md", "repos/mem0.md"],
      neighborIds: ["letta", "graphiti"],
    };
    expect(computeEntityInputHash(base)).toBe(computeEntityInputHash(reordered));
  });

  test("changes when description changes", () => {
    expect(computeEntityInputHash(base))
      .not.toBe(computeEntityInputHash({ ...base, description: "Updated description" }));
  });

  test("changes when neighbors change", () => {
    expect(computeEntityInputHash(base))
      .not.toBe(computeEntityInputHash({ ...base, neighborIds: ["graphiti", "letta", "new-neighbor"] }));
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
