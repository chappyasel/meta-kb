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

The script pipeline compiles the current wiki, using Opus for synthesis articles and Sonnet for reference cards. A link validation sweep in Pass 5 fixes broken internal links post-generation.

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

5. **The Karpathy Loop works for compilation quality.** Treating eval accuracy as the fitness function and prompts as the artifact being optimized produced measurable improvement across two cycles: V3 baseline 63.9% → V4 with new sources 74.4% → V4 after prompt fix 78.6% → V5 with Opus + prompt surgery 80.0%. The dominant failure mode is fabricated details (component names, directory paths, benchmark numbers not in the cited source). Adding explicit source-fidelity rules to the synthesis prompt reduced architectural claim failures by 9.1% and directional claim failures by 11.9% in a single iteration.

## Learnings from V4

Three findings from implementing incremental recompilation and the Karpathy loop:

6. **Entity resolution volatility defeats incremental savings.** Pass 1b (single Sonnet call resolving all entities) is non-deterministic — the same inputs produce different entity IDs, descriptions, and bucket assignments across runs. This means the first incremental run after a full compilation often looks like a full recompile because all entity input hashes changed. True incremental savings require entity ID stability, which the current architecture doesn't guarantee.

7. **Content-hash claim IDs solve the eval stability problem.** Positional claim IDs (`claim-001`) silently break eval-report references when claims are re-extracted. SHA-256 content hashes (`claim-a1b2c3d4e5f6`) make eval results stable across runs and enable claim diffing between compilations.

8. **The dominant eval failure is fabricated specificity, not factual error.** The LLM writes plausible-sounding component names ("Recursive Reflector"), directory paths ("claude-plugin/skills/autoresearch/references/"), and benchmark numbers ("52.08% on LoCoMo10") that don't appear in any cited source. The synthesis content is directionally correct but the specifics are invented. Source-fidelity rules in the prompt help but don't eliminate this — it's an inherent tension between "write with specificity" and "only state what's in the source."

## Learnings from V4 Evaluation

Head-to-head comparison of V4 (script pipeline + Karpathy loop, 134 entities) against V3 (three-way merge, 176 entities) across structural compliance, citation integrity, synthesis quality, writing quality, and cross-domain synthesis power.

9. **Coverage and accuracy are in tension.** V4 improved claim accuracy from 63.9% to 78.6% but deleted 42 entity cards to get there. The deletions broke 23.5% of internal links and removed cross-bucket connective tissue (context-graphs, organizational-memory, context-collapse) that enabled cross-domain synthesis. V3 had zero broken links and better cross-domain navigation despite lower claim accuracy. Both dimensions must be optimized together.

10. **The synthesis prompt template produces uniform output.** All 5 V4 articles open with "the field shifted from X to Y." The 9-section structure produces articles that read identically. 8 of 10 articles across both compilations use the same rhetorical formula. The prompt asks "what fundamentally changed?" — so the model answers with a shift narrative every time. Prompt variation (randomized opening instructions per article) is the fix.

11. **Cross-article evidence repetition is the dominant redundancy problem.** The same evidence (napkin BM25, Graphiti bi-temporal, Karpathy loop) appears nearly verbatim in 4 of 5 articles. Each article is compiled independently with no awareness of what others cover. Sequential compilation with an evidence registry (tracking which project+claim pairs already appear) would eliminate this.

12. **Source depth is the binding constraint in 2 of 5 buckets.** Knowledge Bases has 33 sources and Agent Systems has 23, despite both being core topics. Agent Memory (81 sources) and Self-Improving (75 sources) have enough depth for expert-level synthesis. No compilation approach can produce insight from thin source material. The deep sources (52 files in `raw/deep/`) are exceptionally high quality — specific file paths, data model schemas, algorithm implementations, benchmark data — and articles citing deep sources at higher rates have fewer fabricated details.

13. **Writing quality plateaus at 6.5/10 regardless of compilation method.** Both three-way merge and script pipeline produce prose with identical AI patterns: 1600+ lines containing em dashes, "ecosystem" 128 times, "not just" 75 times. The stop-slop rules exist in the prompt but are appended at the end where they get buried. Moving anti-slop rules to the prompt top and adding a banned-words hard constraint measurably reduces these patterns.

14. **Five alternative architectures were evaluated (see Approaches Considered below).** Claims-first (raw → claims → articles) solves attribution and dedup but risks narrative quality regression. Question-driven compilation (structure around practitioner needs, not taxonomy) scores highest on cross-domain synthesis but has fuzzy boundaries and harder incremental recompilation. Model stratification (Opus for 5 synthesis articles at +$3.30 total) provides 20% quality improvement atop prompt surgery. Graph-native (no articles, agents navigate typed edges) wins on token efficiency but loses editorial narrative. The hybrid recommendation: prompt surgery + Opus for synthesis + question-routing ROOT.md + claims-first migration over time.

---

## Source Coverage Constraints

The insight ceiling is set by source material, not compilation quality. Per-bucket assessment:

| Bucket | Sources | Deep Sources | Assessment |
|---|---|---|---|
| Agent Memory | 81 | 15+ | Expert-level synthesis possible |
| Self-Improving | 75 | 10+ | Expert-level synthesis possible |
| Context Engineering | 69 | 8 | Good breadth, moderate depth |
| Knowledge Bases | 33 | 5 | Thin — primary pillar, weakest coverage |
| Agent Systems | 23 | 3 | Severely under-sourced |

Missing source types that limit the wiki's ability to answer practitioner questions:
- Production case studies and enterprise deployment postmortems
- Historical retrospectives (what approaches were tried and abandoned)
- Evaluation methodology (how to build eval harnesses, benchmark design)

## Learnings from V5

Four findings from implementing prompt surgery and switching to Opus for synthesis:

15. **Opus synthesis eliminated formulaic writing without reducing accuracy.** Em dashes dropped from 1600+ lines to 1. Banned words dropped to 1 occurrence ("ecosystem", once) across all synthesis articles. Claim accuracy held at 80.0%. The $3.30 incremental cost is negligible.

16. **Opening variation works when assigned deterministically.** Three opening strategies (surprising finding, concrete failure, strongest disagreement) assigned by bucket index produced 5 distinct article openings. No two articles use the same rhetorical formula. Deterministic assignment avoids non-reproducible compilations.

17. **Link validation as a post-processing pass is the right pattern.** Pass 5 found and fixed 53 broken internal links by replacing them with plain text. This is cheap (string processing, no LLM calls) and catches links broken by entity resolution volatility, entity card deletion, or path mismatches. Should run on every compilation.

18. **Restoring entity cards from previous compilations preserves cross-domain navigation.** Copying 15 cards from V3 (8 concepts, 7 projects) restored cross-bucket connective tissue without affecting accuracy. These cards are not overwritten by full recompilation because the pipeline only writes cards for entities it resolves from sources. The cards persist until explicitly deleted.

---

## Roadmap

### Phase 1: Prompt Surgery + Quick Fixes ✓

Completed. Results: writing quality improved (em dashes 1600+ → 1, banned words eliminated from synthesis), 53 broken links fixed to zero, 15 entity cards restored from V3, accuracy maintained at 80.0%, all synthesis articles have 10 sections including new Deprecated Approaches. See Learnings from V5 below.

### Phase 2: Source Acquisition

Fill gaps no compilation can fix:
- 15-20 new sources for Knowledge Bases (KB compilation approaches, markdown-as-interchange, alternatives to vector retrieval)
- 10-15 new sources for Agent Systems (production multi-agent architectures, skill registries, harness engineering)
- 5-10 historical retrospectives and postmortems
- 5-10 production case studies
- 3-5 evaluation methodology sources

### Phase 3: Cross-Article Synthesis

Add cross-article awareness to the compilation pipeline:
- Convert parallel synthesis to sequential with evidence registry
- Inject "already covered" context into each article's prompt
- Add evidence budget rule (each example in at most one article)
- Add question-routing layer to ROOT.md

### Phase 4: Claims-First Migration

Stage the claim-graph architecture described above:
- Build per-source claim extraction alongside current pipeline
- Build claim dedup and contradiction detection
- Validate claim accuracy against current baseline before swapping synthesis step
- Add source → claim → article dependency graph for reliable incremental recompilation
