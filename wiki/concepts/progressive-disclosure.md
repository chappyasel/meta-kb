---
entity_id: progressive-disclosure
type: approach
bucket: context-engineering
abstract: >-
  Progressive disclosure is a context engineering pattern that loads information
  to agents in layers — summary first, detail on demand — keeping context
  windows lean while preserving access to deep knowledge.
sources:
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/anthropics-skills.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/michaelliv-napkin.md
  - repos/memodb-io-acontext.md
  - repos/michaelliv-napkin.md
  - repos/thedotmack-claude-mem.md
related:
  - claude-code
  - openai
  - anthropic
  - claude
  - agent-skills
last_compiled: '2026-04-08T22:59:42.926Z'
---
# Progressive Disclosure

## What It Is

Progressive disclosure is a context engineering strategy where information is made available to agents in tiers rather than loaded all at once. The agent receives a compressed summary first, requests more specific detail when needed, and reads full content only if the detail proves insufficient. Each tier consumes tokens proportional to its specificity; the full cost is paid only when the task actually requires it.

The pattern originates in UX design, where it describes hiding interface complexity until users need it. In agent systems, the same logic applies to context windows: presenting everything upfront fills the budget with noise, degrades attention over long sequences, and burns tokens on information that never influences the output.

This is a subconcept of [Context Engineering](../concepts/context-engineering.md) and [Context Management](../concepts/context-management.md). It directly addresses [Lost in the Middle](../concepts/lost-in-the-middle.md) effects and enables [Token Efficiency](../concepts/token-efficiency.md) at scale.

---

## Why It Matters

LLMs have two related attention problems. The first is finite context: models have hard token limits, and exceeding them means truncation or degraded performance. The second is degraded attention over long sequences: even within the limit, information buried in the middle of a long context is recalled less reliably than information at the edges (the Lost-in-the-Middle finding from Liu et al., 2023, independently validated across multiple models).

A naive solution — load only a small summary — fails when the task requires precise facts. Full context loading — load everything — fails at scale or when multiple skills and documents are needed simultaneously. Progressive disclosure is the resolution: guarantee access to full depth while paying for it only when earned.

For multi-agent systems and long-running tasks, this compounds. A single agent handling a complex software task might need documentation for five libraries, three architectural decision records, and two API references. Loading all of this upfront is prohibitive. Progressive disclosure lets the agent start from summaries, identify which two documents actually matter, and read those two in full.

---

## How It Works

### The Tier Pattern

Every progressive disclosure implementation shares the same structure, though implementations vary in how many tiers they use and what they contain.

**Tier 0 — Always resident (~100–500 tokens):** A brief description or name that lets the agent decide whether this resource is relevant at all. In [Agent Skills](../concepts/agent-skills.md), this is the YAML `name` and `description` frontmatter in a skill file — always available in the agent's context, never expanding until the agent decides to use the skill. In [CLAUDE.md](../concepts/claude-md.md), it is the pinned project context note loaded at session start. In napkin's architecture, it is the `NAPKIN.md` file and any project-level `_about.md` stubs.

**Tier 1 — Loaded on trigger (~1,000–2,000 tokens):** A structured summary of what a resource contains — enough to confirm relevance and navigate to the right detail. The anthropic/skills repository loads the full `SKILL.md` body only after the agent determines the skill's description matches the task. Napkin generates a TF-IDF keyword map per folder using a weighted scoring formula (headings 3×, filenames/frontmatter titles 2×, body text 1×), producing a navigable topic index without reading any full documents.

**Tier 2 — Targeted retrieval (~2,000–5,000 tokens):** Search or filtered access to specific relevant content. For skill-based systems, this corresponds to reading specific reference files within a skill bundle. For file-based memory systems like napkin, this is BM25 keyword search returning ranked results with surrounding-line snippets — enough content to evaluate relevance without loading full files.

**Tier 3 — Full content (~5,000–20,000 tokens per file):** Complete document content, read only when the agent has confirmed this specific resource is necessary. Paid once, used fully.

The key invariant: each tier is only entered when the prior tier confirmed relevance. Skipping tiers in either direction is always possible — a highly confident routing from Tier 0 can jump straight to Tier 3; a Tier 2 search might reveal the answer is in a snippet without needing Tier 3 at all.

---

### Implementation: Skills (Anthropic/skills)

The [anthropics/skills](../projects/claude-code.md) repository is the canonical implementation for the skill-based variant of progressive disclosure. Skills are folders with a mandatory `SKILL.md` containing YAML frontmatter plus instructions.

The three-tier structure:

1. **Metadata (~100 tokens, always in context):** The `name` and `description` fields live in the agent's `available_skills` list. This is the trigger — Claude decides whether to consult a skill based solely on this description, without loading any other content.

2. **SKILL.md body (loaded on trigger, <5,000 tokens / ~500 lines recommended):** Full instructions for executing the skill. Contains enough detail to complete the task, organized so bundled resources are referenced but not pre-loaded.

3. **Bundled resources (loaded on demand, unlimited):** Reference docs, scripts, asset libraries. Scripts execute without entering the context window. Reference files are read selectively based on SKILL.md instructions — e.g., the `claude-api` skill bundles docs for Python, TypeScript, Java, Go, Ruby, C#, PHP, and curl, but loads only the relevant language's reference when triggered.

The `claude-api` skill's description demonstrates the specificity required for reliable tier-0 triggering:

```yaml
# Trigger when: code imports `anthropic`/`@anthropic-ai/sdk`/`claude_agent_sdk`
# Do NOT trigger when: code imports `openai`/other AI SDK
```

This precision matters because triggering is purely semantic — the LLM reads the description and decides. Vague descriptions cause undertriggering; descriptions that are too broad cause spurious triggering. The `skill-creator` meta-skill addresses this with an empirical description optimizer: it runs 3× per query, splits test cases 60/40 train/test to avoid overfitting, and iterates up to 5 times. [Source](../raw/deep/repos/anthropics-skills.md)

---

### Implementation: File-Based Memory (napkin)

Napkin's architecture implements progressive disclosure over markdown vaults without embedding models or vector databases. The four-level structure:

| Level | Mechanism | Tokens | Content |
|-------|-----------|--------|---------|
| L0 | `NAPKIN.md` | ~200 | Project context, conventions, key decisions |
| L1 | `overview` | ~1,000–2,000 | TF-IDF keyword map by folder + tag inventory |
| L2 | `search` | ~2,000–5,000 | BM25 results with surrounding-line snippets |
| L3 | `read` | ~5,000–20,000 | Full file content |

The L1 overview uses a TF-IDF calculation where each folder is treated as a document. After scoring, it selects top-K keywords per folder with bigram suppression (if a bigram appears in the output, its constituent unigrams are dropped). The result: a compact navigable map of what each folder contains, generated without any LLM calls.

The L2 search uses MiniSearch (a JavaScript BM25 implementation) with a composite three-signal ranking:

```
composite = BM25_score + backlink_count × 0.5 + recency_normalized × 1.0
```

Crucially, search scores are **not** shown to the agent — only ordered results with content snippets. Visible confidence numbers cause anchoring bias; agents fixate on scores rather than evaluating content quality. The ranking drives ordering invisibly.

On LongMemEval (ICLR 2025), this BM25-with-progressive-disclosure approach achieves 91% accuracy on the S-dataset (~40 sessions per question) versus 86% for the best prior embedding-based system and 64% for GPT-4o with full context loading. The M-dataset (500 sessions, ~1.5M tokens per question) reaches 83% versus 72% for the best prior system. These benchmarks are self-reported by the napkin project. [Source](../raw/deep/repos/michaelliv-napkin.md)

The abstention task (knowing when *not* to answer) scores only 50%, revealing a structural limitation: BM25 always returns ranked results, with no calibrated confidence threshold to signal "the answer is not in this knowledge base."

---

### Implementation: Pipeline-Phase Disclosure (Ars Contexta)

Ars Contexta applies progressive disclosure at a different granularity: across pipeline stages rather than within a single retrieval call. The 6Rs processing pipeline (Record → Reduce → Reflect → Reweave → Verify → Rethink) spawns a fresh subagent context per phase. Each subagent receives only the context relevant to its phase — the Reduce agent gets the raw note and schema; the Reflect agent gets the reduced note and existing MOCs; the Reweave agent gets both.

This implements progressive disclosure in the temporal dimension: no single context window accumulates everything. The rationale is that LLM quality degrades as context fills, so each phase runs in a clean window rather than a progressively more polluted one. The cost is multiplicative — 5+ subagent spawns to process a single note through the full pipeline. [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md)

The same principle applies in acontext's Skill Learner Agent: it processes distilled contexts from a Redis queue via multi-turn batching, extending its token budget dynamically when new contexts arrive, rather than pre-loading all pending work into a single context window.

---

### Implementation: Learning Systems (Acontext)

Acontext's approach to progressive disclosure focuses on the retrieval side of a write-back memory loop. Rather than embedding-based search, agents navigate skill files through three explicit tool calls:

1. `list_skills` — See what skill categories exist in the learning space
2. `get_skill` — List files within a specific skill
3. `get_skill_file` — Read specific file content

Each `SKILL.md` acts as a manifest describing what data files the skill contains and when to read each one. The agent decides which files to read based on the manifest, not cosine similarity. This is deterministic, debuggable, and requires no embedding infrastructure. [Source](../raw/deep/repos/memodb-io-acontext.md)

---

## Triggering: The Central Unsolved Problem

Across implementations, triggering — the mechanism by which an agent decides to ascend from one tier to the next — is the most difficult part to get right.

**Semantic triggering** (used by anthropic/skills): The agent reads a description and decides whether to load more. This requires descriptions to be precisely scoped. The skill-creator repo notes that Claude "tends to not invoke skills when they would be useful" and recommends making descriptions "a little bit pushy" — including specific contexts and conditions. The failure mode: vague descriptions cause the agent to skip relevant skills; overly broad descriptions cause spurious loading.

**Query-based triggering** (used by napkin, acontext): The agent issues an explicit search or tool call. This is more reliable than semantic description matching but requires the agent to know a search would be useful — which is not always obvious from the task description alone.

**Automatic injection** (used by Ars Contexta, CLAUDE.md): Some tier-0 content is loaded unconditionally at session start via hooks or system prompt injection. The agent does not decide to load it — it is always present. This guarantees orientation but consumes tokens regardless of relevance.

Most production systems combine all three: unconditional injection for orientation data, query-based search for targeted retrieval, and semantic matching for skill/tool selection.

---

## Failure Modes

**Undertriggering:** The agent does not ascend to the next tier despite needing the information. This is the most common failure in description-triggered systems. The agent decides from Tier 0 that a skill is not relevant, and never loads the instructions that would have improved its output.

**Tier skip at cost:** Progressive disclosure assumes each tier is necessary to reach the next. Agents under context pressure may skip Tier 1 and Tier 2 and attempt to work from Tier 0 alone, producing answers that lack precision.

**No confidence calibration:** BM25 and semantic description matching produce rankings, not calibrated probabilities. An agent cannot distinguish between "this skill is highly relevant" and "this skill is the least irrelevant thing available." Napkin's 50% abstention score on LongMemEval illustrates this — when no relevant information exists, the system still returns ranked results rather than signaling absence.

**Context budget exhaustion from cascading loads:** If multiple skills or files pass their tier-0 filters simultaneously, and all get loaded to Tier 1 or Tier 2, the combined token cost can exceed budget even though no single load was unreasonable.

**Vocabulary mismatch in keyword-based retrieval:** BM25-based Tier 2 retrieval fails when query terminology does not overlap with document terminology. "Authentication" does not retrieve documents that use only "login" and "session." Embedding-based search handles this better at the cost of infrastructure; backlink signals partially compensate by connecting synonymous concepts through co-citation.

**Stale tier-0 descriptions:** When a skill or document's content changes but its tier-0 description is not updated, the agent makes triggering decisions based on outdated metadata. This is especially problematic in live codebases where skill files evolve.

---

## Infrastructure Assumptions (Unspoken)

Progressive disclosure assumes the agent can make tool calls between reasoning steps. In practice, this means:

1. **The agent framework supports multi-turn tool use.** A single-shot completion model cannot implement progressive disclosure — it cannot decide mid-generation to request more information. ReAct-style or agentic frameworks are required.

2. **Tool call latency is acceptable.** Each tier transition adds at minimum one round-trip. In interactive applications, a three-tier retrieval sequence (overview → search → read) introduces 3× the latency of full-context loading. The token savings are real, but so is the latency cost.

3. **The underlying storage responds fast enough.** Progressive disclosure over files works at sub-second speeds for small vaults. At 10,000+ files, BM25 index rebuild (without caching) can take seconds. Tier-0 metadata must be read fast or pre-cached; Tier 3 full reads can tolerate more latency.

4. **The agent can navigate from summaries.** If tier-0 and tier-1 content is poorly organized or misleadingly named, the agent cannot make correct triggering decisions regardless of the underlying retrieval quality. Taxonomy and naming discipline is a prerequisite for the pattern to work.

---

## When Not to Use It

**When the task always requires the full context.** Some tasks — detailed code review, full document rewriting, complex reasoning over a complete specification — need everything up front. Progressive disclosure adds overhead (additional tool calls, tier-0 routing decisions) without providing savings if every session ends in full-context loading anyway.

**When latency matters more than token efficiency.** Tier-by-tier retrieval introduces sequential round-trips. In real-time or interactive systems with strict latency requirements, parallel full-context loading may be preferable even at higher token cost.

**When the knowledge base is small and stable.** For a system with 20 well-defined documents, loading all tier-0 and tier-1 summaries simultaneously consumes only a few thousand tokens and eliminates the risk of undertriggering. Progressive disclosure is most valuable as knowledge base size grows.

**When agents lack reliable self-assessment.** Progressive disclosure assumes agents can evaluate whether tier-0 information is sufficient. Agents that consistently underestimate their own information gaps — requesting too little and producing confident but incorrect answers — will perform worse under progressive disclosure than with full-context loading.

---

## Relationships to Adjacent Concepts

- **[Context Compression](../concepts/context-compression.md):** Compression reduces tokens within a tier; progressive disclosure reduces which tiers are loaded. Complementary strategies.
- **[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md):** RAG systems typically implement progressive disclosure implicitly — retrieve first, then include retrieved chunks in context. Progressive disclosure makes the tiering structure explicit and multi-step.
- **[Agent Skills](../concepts/agent-skills.md):** The anthropic/skills implementation is the most concrete application of progressive disclosure to capability loading.
- **[Short-Term Memory](../concepts/short-term-memory.md):** The in-context window is the workspace within which progressive disclosure operates.
- **[Semantic Search](../concepts/semantic-search.md):** One mechanism for tier-2 retrieval, complementary to BM25 for vocabulary gap coverage.
- **[Procedural Memory](../concepts/procedural-memory.md):** Skills loaded via progressive disclosure often encode procedural knowledge — how to do something, not just what something is.

---

## Unresolved Questions

**Optimal tier count.** Napkin uses four tiers; anthropic/skills uses three; acontext uses three tool calls. No principled analysis exists of when additional tiers help versus when they add coordination overhead without retrieval benefit.

**Dynamic tier boundaries.** All current implementations use fixed tier sizes (e.g., Tier 1 ≤ 500 lines). Whether adaptive tier sizing — compressing Tier 1 summaries when context budget is tight, expanding them when it is ample — would improve performance is an open question.

**Triggering reliability at scale.** As skill libraries grow to hundreds of entries, semantic description matching may become less reliable (more false positives and false negatives). No systematic study of triggering accuracy as a function of library size has been published.

**Cross-tier consistency.** If Tier 0 metadata and Tier 1 content diverge (due to updates), the agent may make routing decisions based on stale descriptions. No current implementation includes automated consistency validation across tiers.

**Cost attribution.** In systems where progressive disclosure is used by many agents simultaneously, attributing token costs to specific tiers (and therefore to specific routing decisions) is non-trivial. This makes optimization and debugging difficult.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.6)
- [OpenAI](../projects/openai.md) — implements (0.4)
- [Anthropic](../projects/anthropic.md) — implements (0.5)
- [Claude](../projects/claude.md) — implements (0.5)
- [Agent Skills](../concepts/agent-skills.md) — implements (0.7)
