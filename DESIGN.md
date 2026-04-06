# Self-Improving Knowledge Base: System Design

An architectural design for turning raw sources into a self-improving knowledge base optimized for agent consumption. The design draws on patterns the wiki itself documents (progressive disclosure, temporal validity, claim-level provenance, binary evaluation, the Karpathy loop) and applies them to the KB's own architecture.

---

## The Problem

A typical knowledge base is a one-shot compiler: raw sources go in, a wiki comes out, and nothing flows back. The compilation may be high quality, but there is no mechanism to detect errors, discover gaps, or improve over successive compilations.

The question this document answers: **what would a knowledge base look like if it practiced what it preaches?**

## Current Architecture

The meta-kb pipeline today has two compilation paths that produce the same output structure.

**Script pipeline** (`scripts/compile.ts`): An 8-pass deterministic pipeline using the Anthropic API. Passes 0-2 extract entities and build a knowledge graph. Pass 3a-3b generate synthesis articles and reference cards. Pass 3c extracts atomic claims from articles. Pass 4 generates ROOT.md (agent entry point), indexes, and a landscape table. Pass 7 runs self-evaluation by verifying a sample of claims against their cited sources.

**Skill graph** (`.claude/skills/compile-*/`): Six skills that any agent harness can orchestrate. The orchestrator (`compile-wiki`) sequences phases and spawns subagents for parallel work. Synthesis articles and reference cards compile in parallel. Each skill has focused context — the synthesis skill loads one bucket's sources, not the full set.

Both paths implement **progressive disclosure**:
- **L0 — ROOT.md** (~600 tokens): compressed topic index loaded at session start
- **L1 — Abstracts** (~5K tokens total): one-sentence summary per article in YAML frontmatter
- **L2 — Full articles** (~3K tokens each): synthesis articles and reference cards loaded on demand
- **L3 — Claims + sources** (loaded for verification): atomic claims with provenance traceable to raw sources

Three-way compilation (script + Claude Code skill graph + Codex skill graph) with best-of-three merge produces the final wiki.

---

## The Claim-Graph Architecture

The next architectural step: **the atomic unit of knowledge is a claim, not an article.**

### Three Layers

```
┌─────────────────────────────────────────────┐
│  Layer 3: Agent Interface                    │
│  ROOT.md → L0 abstracts → L1 summaries →    │
│  L2 full articles → L3 claims + sources      │
│  Query telemetry, usage signals              │
├─────────────────────────────────────────────┤
│  Layer 2: Synthesis Layer                    │
│  Narrative articles built FROM claims        │
│  Incremental recompilation on claim changes  │
│  Contradiction-aware, temporally scoped      │
├─────────────────────────────────────────────┤
│  Layer 1: Claim Store                        │
│  Atomic facts with provenance + confidence   │
│  Temporal validity windows                   │
│  Contradiction graph                         │
│  Source → claim → article traceability       │
└─────────────────────────────────────────────┘
         ↑                          │
    Raw Sources                Feedback Loops
   (ingestion)            (eval, gaps, freshness)
```

**Layer 1 — Claim Store**: Each raw source produces 5-50 claims during ingestion. Claims are stored with full provenance: which sources support them, when they were first seen, when they were last verified, and whether they have a temporal scope ("Mem0 has 51K stars" expires; "BM25 is a ranking function" does not). Claims can contradict each other — the system tracks the disagreement rather than hiding it.

**Layer 2 — Synthesis Layer**: The compiler generates articles from claims, not from raw sources. This inverts the pipeline: `raw → claims → articles` instead of `raw → articles`. The extra step enables incremental recompilation. When new claims arrive, only articles that cite affected claims need regeneration. Every sentence traces to specific claims, which trace to specific sources. Three-hop provenance.

**Layer 3 — Agent Interface**: Progressive disclosure at every level. ROOT.md tells the agent what exists. Abstracts tell it whether to read deeper. Full articles give the narrative. Claims and sources give the evidence. Query telemetry tracks what agents actually load, creating the signal for gap detection and coverage prioritization.

### Five Self-Improvement Loops

**1. Freshness (daily):** For claims with temporal content, check if the source has been updated. GitHub stars change, papers get new versions, projects get archived. Claims marked stale get reduced confidence. Articles citing stale claims get flagged for recompilation.

**2. Contradiction Resolution (on ingestion):** When a new claim conflicts with an existing one, present both with evidence and determine which has stronger support. If neither is clearly wrong, flag as active disagreement. The wiki should surface contradictions, not paper over them.

**3. Coverage Gap Detection (weekly):** Identify topics where few claims exist, entity clusters with sparse coverage, or temporal gaps where no recent sources exist. Generate ranked research targets.

**4. Quality Verification (per compilation):** Sample claims and verify each against its cited source. Binary pass/fail. The accuracy metric is the fitness function — prompt engineering is the search, and the Karpathy loop applies: improve the prompts, re-eval, keep what scores higher.

**5. Source Acquisition (weekly, semi-autonomous):** Take gaps from Loop 3, generate search queries, run the discovery pipeline, score candidates, auto-ingest those above threshold. The KB identifies its own gaps and fills them.

### Incremental Recompilation

**Never recompile everything.**

Track a dependency graph from sources → claims → articles. When claims change, only recompile affected articles.

```
If mem0.md is re-ingested:
  1. Re-extract claims from mem0.md
  2. Diff new claims against existing claims
  3. For changed/new/removed claims: mark citing articles dirty
  4. Recompile only dirty articles
  5. Regenerate ROOT.md (cheap, always regenerated)
```

Adding 5 new sources should cost ~$3 and take ~5 minutes, not $15 and 30 minutes.

### Multi-Perspective Compilation

For synthesis articles (the highest-stakes output), generate 3 independent versions with different emphases: implementation details, convergence patterns, and emerging trends. Extract claims from all 3. Claims supported by 2+ versions get high confidence. Claims in only 1 version get flagged for verification. Merge into final article using the union of verified claims.

### The Eval Framework

Three levels of evaluation, each requiring more infrastructure:

**Level 1 — Claim Accuracy** (automated, per-compilation): Sample N claims, verify against sources. Target: >95%.

**Level 2 — Coverage Completeness** (automated, weekly): For each entity, count claims, count source diversity, measure temporal coverage. Target: >80% of full-article entities have 5+ claims from 2+ sources.

**Level 3 — Agent Utility** (requires telemetry, monthly): Track which KB files agents load, whether loading correlated with task success.

---

## Design Principles

1. **Claims are atomic, articles are views.** The claim store is the source of truth. Articles are generated perspectives over claims. Facts are first-class; narratives are derived.

2. **Progressive disclosure, always.** ROOT.md → abstracts → articles → claims → sources. Never load more than the task requires.

3. **Temporal validity is non-negotiable.** Every claim with temporal content gets a validity window. "Mem0 has 51K stars" is a fact with a shelf life. "BM25 is a ranking function" is timeless. Treat them differently.

4. **Binary evaluation over subjective scoring.** Does the source support this claim? YES or NO. The moment you introduce a quality scale, the system learns to score 5 and read like garbage.

5. **Forgetting is a feature.** Claims with decayed confidence get pruned. Articles that cite only stale claims get flagged. The KB should grow in accuracy, not just in size.

6. **The Karpathy Loop for compilation quality.** The eval report is the fitness function. The prompts in compile.ts are the artifact being improved. Each compilation is an experiment. Keep what scores higher.

7. **Git as the memory system.** Every compilation is a commit. Claim changes are diffable. Article regeneration is auditable. The KB's improvement history is its git log.

---

## What This System Looks Like When It's Working

A week in the life:

**Monday:** Freshness loop runs. 3 claims about Mem0's star count are stale (actual count changed from 51K to 54K). Claims updated, `agent-memory.md` flagged dirty.

**Tuesday:** User ingests 5 new sources about a new memory system. Claim extraction produces 40 new claims. 3 contradict existing claims about vector retrieval accuracy. Contradiction resolution flags these as active disagreements. 2 articles flagged dirty.

**Wednesday:** Incremental recompile runs. Only 3 dirty articles are regenerated (not all 100+). ROOT.md updated with new project. Cost: $2 instead of $20. Self-eval pass samples 25 claims from regenerated articles: 24 pass, 1 fail. Failed claim is flagged.

**Thursday:** Coverage gap detection runs. Identifies that "multi-agent shared memory" has only 2 claims from 1 source, despite being referenced 8 times in synthesis articles. Generates research target.

**Friday:** Source acquisition loop finds 3 new repos and 1 paper about multi-agent shared memory. Auto-ingests the 2 above threshold. Queues 2 for human review.

**Saturday:** Human reviews queued sources, approves 1. Incremental recompile adds coverage. Claim count for "multi-agent shared memory" goes from 2 to 9. Article quality improves.

The KB improved without a human writing a single article. The human's role: review sourcing decisions, resolve flagged contradictions, and occasionally adjust the fitness function.

---

## Learnings from V3

Five findings from implementing the first version of this system:

1. **Source attribution is the quality bottleneck, not factual accuracy.** Eval failures are citations pointing to the wrong source file (shallow instead of deep), not fabricated claims. The synthesis content is accurate; the provenance tracking is fragile.

2. **Claim extraction is non-deterministic.** Re-extracting claims from the same articles produces different sets with different source attribution quality. Claim sets should be pinned and iterated on, not regenerated every run.

3. **Agent-native compilation produces better synthesis but worse coverage.** The skill graph wrote the best synthesis articles (longer, more opinionated, all sections present) but generated fewer reference cards. The deterministic script produced the most complete coverage.

4. **Template-based generation beats LLM for structured outputs.** ROOT.md and indexes are more reliable when generated deterministically from structured data than when asking an LLM to format them.

5. **The Karpathy Loop works for compilation quality.** Treating eval accuracy as the fitness function and prompts as the artifact being optimized produced measurable improvement (64% → 83%) in one iteration.
