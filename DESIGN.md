# Self-Improving Knowledge Base: System Design

*An independent design for turning raw sources into a self-improving knowledge base optimized for agent harness consumption and continuous improvement.*

---

## The Core Problem

The current meta-kb pipeline is a **one-shot compiler**: raw sources go in, a wiki comes out, and nothing flows back. The compilation is high quality — 203K words, 213 files, strong synthesis across 5 taxonomy buckets. But it has no mechanism to detect its own errors, discover its own gaps, or improve over successive compilations. It documents self-improving systems without being one.

The question this document answers: **What would a knowledge base look like if it practiced what it preaches?**

Everything below draws on the patterns the wiki itself documents — progressive disclosure, temporal validity, claim-level provenance, binary evaluation, the Karpathy loop — and applies them to the KB's own architecture.

---

## Part 1: Tonight's Recompilation (Hours-Scale Changes)

These are concrete, additive changes to `compile.ts` that don't break the existing pipeline but meaningfully improve the output for agent consumption and lay groundwork for self-improvement.

### 1.1 — Generate ROOT.md (Agent Entry Point)

**What:** Add a ROOT.md generation step to Pass 4 that produces a <3K token topic index — the single file an agent loads at session start to know what the KB contains.

**Why:** The wiki's own research shows this is the highest-leverage change possible. Hipocampus's ROOT.md pattern produces a 5.1x improvement on unknown-unknown discovery (21% vs 3.4% for search alone). Currently, the field-map.md is 2,754 words of prose — useful for humans, terrible for agents. An agent needs a compressed map, not a narrative.

**Format:**
```markdown
# meta-kb ROOT

## Topics
knowledge-bases [synthesis, 31 sources]: compiled wikis, RAG, graph-based, vectorless → knowledge-bases.md
agent-memory [synthesis, 27 sources]: Mem0, Graphiti, temporal KGs, zettelkasten → agent-memory.md
context-engineering [synthesis, 22 sources]: CLAUDE.md, progressive disclosure, compression → context-engineering.md
agent-systems [synthesis, 52 sources]: SKILL.md, orchestration, multi-agent → agent-systems.md
self-improving [synthesis, 19 sources]: autoresearch, reflexion, skill accumulation → self-improving.md

## Top Projects (by relevance × adoption)
mem0 [agent-memory, 51880★]: selective memory retrieval, 26% accuracy gain → projects/mem0.md
graphiti [knowledge-bases, 24473★]: temporal knowledge graphs with validity windows → projects/graphiti.md
openviking [context-engineering, 20813★]: L0/L1/L2 tiered context loading → projects/openviking.md
autoresearch [self-improving, 65009★]: Karpathy loop, eval-driven self-improvement → projects/autoresearch.md
...

## Key Concepts
progressive-disclosure: load minimum context at lowest resolution → concepts/progressive-disclosure.md
temporal-validity: facts have time bounds, not just truth values → concepts/bi-temporal-indexing.md
...

## Last compiled: 2026-04-05 | Sources: 170 | Entities: 107 | Edges: 194
```

**Implementation:** One Haiku call at end of Pass 4. Input: entities.json + source-index.json. Output: `wiki/ROOT.md`. Constraint: <3,000 tokens. Each line is a pointer, not a description.

### 1.2 — Add Abstracts to Every Article

**What:** During Pass 3a (synthesis) and Pass 3b (reference cards), ask the LLM to produce a 1-2 sentence `abstract` that goes into frontmatter.

**Why:** This enables L0/L1 progressive loading. An agent can load all abstracts (~5K tokens for 100+ articles) to decide which articles to read in full. Currently, the only way to know what an article contains is to read it.

**Implementation:** Add `abstract` to the synthesis system prompt output requirements. For reference cards, add to the REFERENCE_CARD_SYSTEM prompt. Parse the abstract from the generated text and inject into frontmatter. Minimal LLM cost — it's one extra sentence per article.

**Frontmatter addition:**
```yaml
abstract: "Temporal knowledge graphs with bi-temporal indexing outperform vector-only retrieval on multi-hop and temporal queries, but entity extraction errors during ingestion are the primary failure mode."
```

### 1.3 — Claim Extraction Pass (Pass 3c)

**What:** After synthesis articles and reference cards are written, extract atomic claims from each article. Store in `build/claims.json` and optionally `wiki/claims/`.

**Why:** Claims are the atomic unit of verifiable knowledge. Prose synthesis is great for human comprehension but terrible for automated verification. Extracting claims makes the KB auditable, testable, and incrementally updatable.

**Claim schema:**
```typescript
interface Claim {
  id: string;                    // e.g., "kb-claim-042"
  content: string;               // "Napkin achieves 91% accuracy on LongMemEval medium sessions"
  confidence: "verified" | "reported" | "inferred";
  source_refs: string[];         // raw/ paths that support this claim
  article_ref: string;           // wiki/ path where this claim appears
  entity_refs: string[];         // entity IDs involved
  temporal_scope?: string;       // "as of 2026-03" or null if timeless
  contradicts?: string[];        // claim IDs that disagree
}
```

**Implementation:** One Haiku call per synthesis article (5 calls total). Extract 20-40 claims per article. System prompt: "Extract every factual claim from this article. Each claim must be a single, verifiable statement. Include the source path that supports it. Mark confidence: 'verified' if you can see the evidence in the source, 'reported' if the article cites a benchmark without showing data, 'inferred' if the article synthesizes across sources."

**Output:** `build/claims.json` (100-200 claims total). This becomes the foundation for self-eval and incremental recompilation.

### 1.4 — Self-Eval Pass (Pass 7)

**What:** After compilation, sample 20-30 claims from `build/claims.json` and verify each against the raw source it cites. Output a quality score and list of failures.

**Why:** The KB documents that binary evaluation beats subjective scoring. Apply that principle to itself. A single pass/fail per claim — does the cited source actually support this statement? — gives you a compilation quality metric that's deterministic and debuggable.

**Implementation:**
```
For each sampled claim:
  1. Read the cited raw source
  2. Ask Haiku: "Does this source support this claim? YES or NO. If NO, explain the discrepancy."
  3. Record result
  
Output: build/eval-report.json
  { total_sampled: 25, passed: 22, failed: 3, accuracy: 0.88,
    failures: [{ claim_id, claim, source_path, reason }] }
```

**Cost:** ~25 Haiku calls. Cheap. The output goes into CHANGELOG.md as a compilation quality signal.

### 1.5 — Staleness Markers

**What:** Add `source_date_range` and `newest_source` fields to synthesis article frontmatter.

**Why:** An agent (or future self-improvement loop) needs to know when the knowledge was current. If all sources for a topic are >6 months old, that's a gap signal.

**Implementation:** During Pass 3a, compute `min(date)` and `max(date)` across bucket sources. Add to frontmatter:
```yaml
source_date_range: "2025-09 to 2026-04"
newest_source: "2026-04-02"
staleness_risk: low  # low (<30d), medium (30-90d), high (>90d since newest source)
```

### 1.6 — Contradiction Tracking

**What:** During Pass 3a synthesis, explicitly instruct the LLM to flag disagreements between sources. Add a `## Active Disagreements` section to each synthesis article (or fold into "The Divergence" section with more precision).

**Why:** The current synthesis smooths over contradictions. RAG vs GraphRAG is a genuine empirical disagreement. Sources disagree on whether entity extraction errors are fatal or manageable. Making these explicit helps agents reason about uncertainty rather than treating the wiki as ground truth.

**Implementation:** Add to SYNTHESIS_SYSTEM prompt: "When sources contradict each other on a factual claim, name both sides with their evidence. Do not resolve the contradiction — flag it with both source paths."

---

## Part 2: The Optimal System (Weeks-Scale Build)

If we had multiple weeks, here's the architecture I'd build. It's informed by what the KB itself documents as best practice, applied recursively.

### 2.1 — Architecture: The Claim-Graph KB

Three layers, each with a distinct job:

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

#### Layer 1: Claim Store

The fundamental shift: **the atomic unit of knowledge is a claim, not an article**.

Each raw source produces 5-50 claims during ingestion (not just key_insight + tags). Claims are stored in a structured format with full provenance. The claim store is the source of truth; articles are views over it.

```typescript
interface Claim {
  id: string;
  content: string;
  type: "empirical" | "architectural" | "opinion" | "definition";
  confidence: number;              // 0-1, decays over time
  sources: SourceRef[];            // which raw files support this
  first_seen: string;              // ISO date
  last_verified: string;           // ISO date of last check
  temporal_scope: {
    valid_from?: string;
    valid_until?: string;          // null = still current
    is_timeless: boolean;          // "BM25 is a ranking function" vs "Mem0 has 51K stars"
  };
  entity_refs: string[];
  contradicted_by: string[];       // other claim IDs
  superseded_by?: string;          // if a newer claim replaces this
  verification_history: {
    date: string;
    result: "pass" | "fail" | "stale";
    method: string;
  }[];
}
```

**Why claims over articles?**
- **Verifiable**: Each claim can be checked against its source independently
- **Composable**: Different articles can cite the same claim without duplication
- **Updatable**: When a source changes, only affected claims need re-verification
- **Forgettable**: Claims with decayed confidence can be pruned without rewriting articles
- **Contradictable**: Two claims can disagree — the system tracks the disagreement rather than hiding it

#### Layer 2: Synthesis Layer

Articles are **generated from claims**, not from raw sources. This inverts the current pipeline:

Current: `raw sources → (LLM) → articles`  
Proposed: `raw sources → (LLM) → claims → (LLM) → articles`

The extra step costs more LLM calls but buys:
- **Incremental recompilation**: When new claims arrive, only articles that reference affected claims need regeneration. No full recompile.
- **Traceability**: Every sentence in an article traces to specific claims, which trace to specific sources. Three-hop provenance.
- **Quality control**: If a claim fails verification, every article that cites it is flagged.

Article structure becomes claim-aware:
```markdown
---
title: The State of Agent Memory
claims_cited: [claim-001, claim-007, claim-042, ...]
last_compiled: 2026-04-05
dirty: false  # set to true when cited claims change
---
```

#### Layer 3: Agent Interface

Optimized for machine consumption with progressive disclosure:

**L0 — ROOT.md** (~2K tokens, always loaded):
Topic index with one-line pointers. What exists, where to find it. Updated every compilation.

**L1 — Abstracts** (~5K tokens for all articles):
One-sentence summary per article. An agent loads all L1 to decide what to read deeper.

**L2 — Full Articles** (~3K tokens each, loaded on demand):
The synthesis articles and reference cards as they exist today.

**L3 — Claims + Sources** (loaded for verification or deep reasoning):
The atomic claims with full provenance. An agent loads these when it needs to verify a fact, understand a disagreement, or trace a claim to its origin.

**Query telemetry:**
Every time an agent loads a file from the KB, log it:
```jsonl
{"timestamp": "...", "agent_id": "...", "file": "wiki/projects/mem0.md", "level": "L2", "task_context": "debugging memory retrieval"}
{"timestamp": "...", "agent_id": "...", "file": "wiki/ROOT.md", "level": "L0", "task_context": "session_init"}
```
This becomes the signal for gap detection and coverage prioritization.

### 2.2 — Five Self-Improvement Loops

The KB becomes self-improving through five feedback loops, each operating at a different timescale:

#### Loop 1: Freshness (daily)

**Signal:** Claim temporal_scope and last_verified date.  
**Action:** For claims with temporal content (star counts, benchmark results, "as of" dates), check if the source has been updated. For GitHub repos: fetch current stars, check if README changed. For papers: check if a newer version exists.  
**Output:** Claims marked "stale" get reduced confidence. Articles citing stale claims get `dirty: true`.

```
Schedule: Daily cron
Cost: ~50 API calls (GitHub, arXiv) + ~20 Haiku calls for re-verification
```

#### Loop 2: Contradiction Resolution (on ingestion)

**Signal:** New claim extracted from a freshly ingested source conflicts with an existing claim.  
**Action:** Present both claims with their evidence to Sonnet. Ask: "Do these claims contradict? If so, which has stronger evidence? If neither is clearly wrong, flag as active disagreement."  
**Output:** Updated contradiction graph. Claims marked `contradicted_by`. Affected articles flagged dirty.

```
Trigger: Every new source ingestion
Cost: ~5 Sonnet calls per new source (only for claims that conflict)
```

#### Loop 3: Coverage Gap Detection (weekly)

**Signal:** Query telemetry + claim distribution analysis.  
**Action:** 
1. Identify topics where agents frequently load ROOT.md but never proceed deeper (topic exists but content is thin).
2. Identify entity clusters with few claims (well-known project, sparse coverage).
3. Identify temporal gaps (active area, no sources newer than 60 days).
4. Generate ranked list of research targets: "We need more sources about X because Y."

**Output:** `build/research/gaps.json` — prioritized list of topics/projects to investigate.

```
Schedule: Weekly
Cost: ~5 Sonnet calls for gap analysis
```

#### Loop 4: Quality Verification (per compilation)

**Signal:** Claim-source alignment.  
**Action:** Sample 50 claims. For each, read the cited source and verify the claim is supported. Binary pass/fail.  
**Output:** `build/eval-report.json` with accuracy score, failure list, and trend over time.

**The Karpathy Loop applied to compilation quality:**
```
program.md  = "compilation accuracy should be >95%"
train.py    = compile.ts prompts and thresholds
eval        = claim verification pass
keep/revert = if accuracy drops, revert prompt changes
```

Over successive compilations, track: `accuracy_v1: 88%, accuracy_v2: 91%, accuracy_v3: 94%`. The eval is the fitness function. Prompt engineering is the search.

```
Schedule: Every compilation
Cost: ~50 Haiku calls
```

#### Loop 5: Source Acquisition (weekly, semi-autonomous)

**Signal:** Gap detection output + trending topics.  
**Action:**
1. Take top 5 gaps from Loop 3.
2. For each gap, generate search queries (GitHub, arXiv, Twitter, web).
3. Run discovery pipeline (existing `scripts/research/discover.ts`).
4. Score candidates.
5. Auto-ingest candidates above 8.0 relevance. Queue 6.0-8.0 for human review.

**Output:** New raw sources ingested. New claims extracted. Dirty articles flagged.

This is the full self-improvement loop: **the KB identifies its own gaps and fills them**.

```
Schedule: Weekly
Cost: ~20 Sonnet calls + API calls for discovery
```

### 2.3 — Incremental Recompilation

The biggest architectural win: **never recompile everything**.

Current system: Any change requires a full 6-pass recompile (~$15-30 in API costs, ~30 minutes).

Proposed system: Track a dependency graph from sources → claims → articles. When claims change, only recompile affected articles.

```
Dependency graph:
  raw/repos/mem0.md → [claim-001, claim-002, claim-003]
  claim-001 → wiki/agent-memory.md, wiki/projects/mem0.md
  claim-002 → wiki/agent-memory.md
  claim-003 → wiki/projects/mem0.md, wiki/context-engineering.md

If mem0.md is re-ingested:
  1. Re-extract claims from mem0.md
  2. Diff new claims against old claims
  3. For changed/new/removed claims: mark citing articles dirty
  4. Recompile only dirty articles
  5. Regenerate ROOT.md (cheap, always regenerated)
```

**Dirty propagation rules:**
- New claim → articles in the same bucket get `dirty: true`
- Changed claim → all articles citing that claim get `dirty: true`
- Removed claim → all articles citing that claim get `dirty: true`
- Claim confidence drops below 0.5 → citing articles get `dirty: true`

**Cost savings:** If 5 new sources are ingested, instead of recompiling all 100+ articles (~$20), recompile only the 10-15 affected ones (~$3).

### 2.4 — Multi-Perspective Compilation

The "best-of-three" idea from the git history (never implemented) is worth doing properly:

**For synthesis articles (the highest-stakes output):**
1. Generate 3 independent versions with different system prompts:
   - Version A: "Prioritize implementation details and failure modes"
   - Version B: "Prioritize convergence patterns and selection guidance"
   - Version C: "Prioritize emerging trends and active disagreements"
2. Extract claims from all 3 versions.
3. Claims supported by 2+ versions → high confidence.
4. Claims in only 1 version → flag for verification.
5. Merge into final article using the union of verified claims.

**Cost:** 3x synthesis cost (~$15 → $45 for a full compilation). Worth it for the 5 synthesis articles. Not worth it for 100+ reference cards.

### 2.5 — The Eval Framework

A proper evaluation framework with three levels:

**Level 1: Claim Accuracy (automated, per-compilation)**
- Sample N claims, verify against sources
- Metric: % of claims supported by cited source
- Target: >95%

**Level 2: Coverage Completeness (automated, weekly)**
- For each taxonomy bucket: count claims, count source diversity, measure temporal coverage
- Metric: % of known entities with >5 claims from >2 sources
- Target: >80% for full-article entities

**Level 3: Agent Utility (requires telemetry, monthly)**
- Track which KB files agents actually load
- Track whether loading a KB file correlated with task success
- Metric: % of agent sessions that loaded KB content and completed their task
- Target: directional improvement quarter over quarter

Only Level 1 is fully automatable today. Level 2 requires the claim store. Level 3 requires agent integration and telemetry.

### 2.6 — Agent Harness Integration

The KB should be consumable as a **SKILL.md-compatible resource**:

```
.claude/skills/meta-kb/
  SKILL.md          # Trigger: when working on agent memory, knowledge bases, etc.
  ROOT.md           # Always loaded when skill triggers
  load-article.md   # Instructions for progressive loading
  verify-claim.md   # Instructions for fact-checking against sources
```

When an agent's task touches any of the 5 taxonomy topics, the skill triggers, ROOT.md loads, and the agent can progressively drill into articles and claims as needed.

The SKILL.md frontmatter:
```yaml
---
name: meta-kb
description: Knowledge base about building LLM knowledge bases, agent memory, context engineering
trigger: When working on agent memory, knowledge bases, RAG, context engineering, self-improving agents, or SKILL.md patterns
---
```

---

## Part 3: Priority Ordering

### Tonight (3-4 hours)

| Priority | Change | Files Modified | LLM Cost | Impact |
|----------|--------|---------------|----------|--------|
| **P0** | ROOT.md generation | compile.ts (Pass 4) | ~$0.01 | Enables agent progressive loading |
| **P0** | Abstracts in frontmatter | compile.ts (Pass 3a, 3b) | ~$0.50 | Enables L0/L1 tiering |
| **P1** | Claim extraction pass | compile.ts (new Pass 3c) | ~$0.50 | Foundation for self-eval |
| **P1** | Self-eval pass | compile.ts (new Pass 7) | ~$0.25 | First quality metric |
| **P2** | Staleness markers | compile.ts (Pass 3a) | $0 | Date math, no LLM |
| **P2** | Contradiction tracking | compile.ts (Pass 3a prompt) | $0 | Prompt change only |

### Week 1-2

- Implement claim store (claims.json → claims/ directory with individual files)
- Build source → claim → article dependency graph
- Implement incremental recompilation
- Add freshness loop (daily cron checking GitHub stars, paper versions)

### Week 3-4

- Implement contradiction resolution loop
- Implement coverage gap detection
- Build SKILL.md integration for agent consumption
- Add query telemetry hooks

### Month 2

- Multi-perspective compilation for synthesis articles
- Source acquisition loop (semi-autonomous)
- Full eval framework (Levels 1-3)
- Claim confidence decay over time

---

## Design Principles

These principles are drawn directly from the KB's own findings, applied to itself:

1. **Claims are atomic, articles are views.** The claim store is the source of truth. Articles are generated perspectives over claims. This mirrors Graphiti's entity/edge model — facts are first-class, narratives are derived.

2. **Progressive disclosure, always.** ROOT.md → abstracts → articles → claims → sources. Never load more than the task requires. This is the Napkin/OpenViking pattern applied to the KB's own output.

3. **Temporal validity is non-negotiable.** Every claim with temporal content gets a validity window. "Mem0 has 51K stars" is a fact with a shelf life. "BM25 is a ranking function" is timeless. Treat them differently.

4. **Binary evaluation over subjective scoring.** Does the source support this claim? YES or NO. Does this article cite its claims correctly? YES or NO. The moment you introduce a quality scale, the system learns to score 5 and read like garbage.

5. **Forgetting is a feature.** Claims with decayed confidence get pruned. Articles that cite only stale claims get flagged. The KB shouldn't grow monotonically — it should grow in accuracy.

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

The KB got meaningfully better without a human writing a single article. The human's role: review sourcing decisions, resolve flagged contradictions, and occasionally adjust the fitness function.

That's the system practicing what it preaches.
