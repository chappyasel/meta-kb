---
entity_id: progressive-disclosure
type: concept
bucket: context-engineering
abstract: >-
  Progressive disclosure is a context management strategy that delivers
  information to an agent in layers — summary first, detail on demand — keeping
  context windows lean without sacrificing access to deep knowledge.
sources:
  - repos/memodb-io-acontext.md
  - repos/michaelliv-napkin.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/anthropics-skills.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/michaelliv-napkin.md
related:
  - Anthropic
  - Obsidian
  - Agent Skills
  - Context Engineering
last_compiled: '2026-04-05T20:25:25.021Z'
---
# Progressive Disclosure

## What It Is

Progressive disclosure is a context management strategy where an agent receives information in stages, starting with a lightweight summary and retrieving detail only when the summary proves insufficient. The agent navigates knowledge rather than receiving it wholesale.

The core tension it resolves: context windows are finite, but the knowledge relevant to any given task can be vast. Stuffing everything into context wastes tokens on irrelevant material and degrades model reasoning by diluting signal with noise. Leaving too much out risks missing the critical fact. Progressive disclosure threads this needle by building a navigation layer that lets the agent pull exactly what it needs.

This pattern appears across several distinct implementations in the current LLM tooling space, each making different tradeoffs about how layers are structured, how retrieval is triggered, and what sits at each tier.

## Why It Matters

The naive alternatives fail predictably. Full context stuffing becomes untenable as knowledge bases grow — a 500-document corpus cannot fit in any context window, and attempting it with selective retrieval typically means semantic search over embeddings, which replaces one problem (too much context) with another (retrieval quality depends on a smaller, less capable model making the selection decision).

Progressive disclosure shifts the selection responsibility to the primary model itself. The agent sees a map of available knowledge, decides what is relevant given the current task, and requests specific content. This is structurally better: the model doing the work is also the model making the retrieval call, using its full reasoning capability rather than cosine similarity from an embedding model.

Napkin's benchmark results make this concrete. On LongMemEval-S (a 40-session-per-question long-term memory benchmark), BM25 with progressive disclosure achieves 91% accuracy versus 86% for the best prior embedding-based system and 64% for GPT-4o with full context stuffing. The gain comes not from a better retrieval algorithm but from a better architecture: let the capable model navigate, not a retrieval proxy. [Source](../raw/deep/repos/michaelliv-napkin.md)

## How It Works: The Tier Structure

Multiple implementations converge on a three-to-four tier model, differing mainly in what lives at each tier and how tier transitions are triggered.

### Tier 0: Always-Present Anchor (100-500 tokens)

Something small is always in context, orienting the agent to what knowledge exists. In Anthropic's Agent Skills system, this is the YAML frontmatter `name` and `description` fields for every installed skill — roughly 100 tokens per skill, always loaded, serving as a table of contents. In Napkin, this is `NAPKIN.md`, a pinned project note containing goals, conventions, and key decisions. In Acontext, the agent's initial tooling includes `list_skills`, which returns skill names and metadata without file content. [Source](../raw/deep/repos/anthropics-skills.md)

This tier must be kept small enough that loading it for every session costs nothing meaningful. Its job is orientation, not information delivery.

### Tier 1: Navigational Overview (1-2K tokens)

One level deeper: enough information to decide whether a topic is relevant, without committing to reading the full content. Napkin's `getOverview()` function in `src/core/overview.ts` generates this by running TF-IDF across the vault, weighting headings 3x, filenames 2x, and body text 1x. The output is a per-folder keyword map — the agent can see that the `authentication/` folder contains terms like "OAuth," "JWT," and "session management" without reading any of the actual files. In Agent Skills, this corresponds to the skill description — structured to convey not just what the skill covers but when to use it. [Source](../raw/deep/repos/michaelliv-napkin.md)

The Anthropic skills documentation explicitly describes this as "description-driven triggering" — Claude reads descriptions and decides whether to activate a skill before loading any skill content. Undertriggering is a documented failure mode: descriptions must be specific enough to match the actual task, including concrete conditions and use cases, not just general topic labels. [Source](../raw/deep/repos/anthropics-skills.md)

### Tier 2: Working Knowledge (2-6K tokens)

Loaded when Tier 1 indicates relevance. This is the full instruction set or document body for the matched topic. In Agent Skills, this is the `SKILL.md` body — the recommended budget is under 500 lines or approximately 5,000 tokens. In Napkin, this is a BM25 search result with contextual snippets: the `searchVault()` function returns matching file excerpts with surrounding context lines, not full files. In Acontext, this corresponds to `get_skill`, which lists files within a skill and their metadata without returning file content. [Source](../raw/deep/repos/anthropics-skills.md)

The key constraint at this tier: it must fit in context alongside the active task. Skills with extensive reference material address this by keeping the SKILL.md summary-level and pointing toward Tier 3 resources.

### Tier 3: Deep Reference (unlimited, loaded on demand)

Full file content, loaded selectively. In Agent Skills, this is the `references/`, `scripts/`, and `assets/` directories — consulted when the Tier 2 instructions explicitly direct the agent there. The Obsidian skills repository demonstrates this: `obsidian-bases`'s SKILL.md is 497 lines with an additional 174-line `FUNCTIONS_REFERENCE.md`. A simple query loads only the SKILL.md; a formula-intensive query triggers loading the full functions reference. In Acontext, this is `get_skill_file`, reading specific file content. In Napkin, this is `napkin read` for the full file. [Source](../raw/deep/repos/kepano-obsidian-skills.md)

The Anthropic spec explicitly warns against "deeply nested reference chains" — Tier 3 resources should be one level deep from the Tier 2 document. Deeper nesting risks the agent losing track of what it has loaded or making unnecessary round trips. [Source](../raw/deep/repos/kepano-obsidian-skills.md)

## The Retrieval Mechanism Question

The biggest implementation decision is what drives the tier transitions. Two approaches have emerged:

**Semantic matching (description-based)**: The agent runtime compares the current query or task against stored descriptions and activates matching knowledge automatically. Anthropic's Agent Skills uses this: skill descriptions are matched against user intent, and matching skills load their Tier 2 content without the agent explicitly requesting them. Advantage: the agent can be unaware of specific skill names. Disadvantage: triggering quality depends on description quality; undertriggering is hard to diagnose.

**Tool-call navigation (explicit)**: The agent issues explicit tool calls to traverse tiers — `list_skills` → `get_skill` → `get_skill_file`. Acontext uses this exclusively, and describes it as a deliberate choice over embedding-based search: "Retrieval is by tool use and reasoning, not semantic top-k." Advantage: fully deterministic, debuggable, no semantic similarity dependency. Disadvantage: a poorly-reasoning agent may not discover relevant skills, or may fail to traverse the hierarchy when needed. [Source](../raw/deep/repos/memodb-io-acontext.md)

Napkin uses a hybrid: the Tier 1 overview is automatically generated and injected into session context, but the agent then uses explicit tool calls (`napkin search`, `napkin read`) to retrieve specific files. The overview provides enough orientation that tool-call navigation becomes tractable — the agent knows where to look without needing semantic matching to find it.

## The Score-Hiding Design Pattern

One non-obvious implementation detail from Napkin: search scores are deliberately hidden from agent output. When BM25 returns results ranked by composite score (BM25 + backlinks + recency), the agent sees the ordered results and snippets but never the numeric scores. The reasoning: visible scores cause anchoring — the agent focuses on the number rather than evaluating content relevance from the actual text. The score drives ordering; the agent judges relevance from the content itself. [Source](../raw/deep/repos/michaelliv-napkin.md)

This principle generalizes: any system surfacing retrieval results to an LLM should consider whether confidence numbers help or hurt. In most cases, they anchor rather than inform.

## The Anti-Pattern Documentation Pattern

Obsidian-skills demonstrates a progressive-disclosure-specific documentation strategy: document failure modes where they are most likely to occur, and repeat them in proportion to their frequency. The Obsidian Bases skill documents the Duration type's `.round()` incompatibility three separate times across the skill files because it is the most common LLM error. [Source](../raw/deep/repos/kepano-obsidian-skills.md)

For knowledge consumed by LLMs through progressive disclosure, repetition of critical constraints is not redundant — it is the mechanism for ensuring the constraint appears in context regardless of which tier the agent loaded.

## Failure Modes

**Undertriggering**: The agent fails to load relevant knowledge because the Tier 0/1 representation does not match the current task vocabulary. This is the dominant failure mode in description-based triggering systems. The mitigation is writing descriptions that include concrete use cases, specific conditions, and domain-relevant terminology — not just general topic labels. Even so, there is no reliable way to detect undertriggering without monitoring actual trigger rates in production.

**Over-retrieval**: The agent loads too many Tier 2 and Tier 3 documents, exhausting the context budget on marginally relevant content. Tool-call navigation systems are more susceptible than automatic triggering systems, because the agent can keep pulling files without a token budget constraint. Acontext's documentation notes that for large skill libraries, explicit navigation "could become cumbersome" — the agent must make good decisions about what to stop loading. [Source](../raw/deep/repos/memodb-io-acontext.md)

**Navigation quality dependence**: In tool-call systems, retrieval quality equals agent reasoning quality. A poorly-reasoning agent that doesn't explore the skill hierarchy, or that anchors on the first file it finds, will miss relevant knowledge. This failure mode is invisible in logs — the agent simply doesn't retrieve what it needed, and the output degrades silently.

**Stale tier mismatch**: Tier 0 representations (descriptions, overviews) become stale as the underlying knowledge changes. If a skill's description no longer matches its actual content, triggering breaks down. Systems without automatic Tier 0 refresh create drift over time. Napkin's `getOverview()` recomputes on every session call, avoiding this; Agent Skills descriptions are static files that require manual updates.

**No confidence calibration at Tier 0**: BM25 and description matching both always return results ranked by score. There is no threshold below which the system says "nothing relevant here." Napkin's LongMemEval results show 50% accuracy on abstention tasks (knowing when not to answer) — the BM25 returns a best-match even when no match is actually good, and the agent lacks signal to detect this. [Source](../raw/deep/repos/michaelliv-napkin.md)

## When to Use Progressive Disclosure

Use it when the total knowledge base exceeds what fits in a single context window and retrieval quality matters more than implementation simplicity. This is the common case for any agent with persistent memory, a skill library, or access to a substantial documentation corpus.

It is less appropriate when:

- The knowledge base is small enough to fit in context (under ~20K tokens) and the task is time-sensitive — progressive disclosure adds latency from multiple retrieval round trips
- The agent is not capable of reliable tool-call navigation — the architecture assumes the agent can follow a traversal plan
- Vocabulary gaps between stored knowledge and query terminology are common and unavoidable — BM25-based Tier 1 navigation will miss synonym matches that embeddings would catch

## Implementations

| System | Tier 0 | Tier 1 | Tier 2 | Tier 3 | Trigger Mechanism |
|---|---|---|---|---|---|
| [Agent Skills](../projects/anthropic-agent-skills.md) | Frontmatter (~100 tokens) | Skill description | SKILL.md body (<5K tokens) | references/, scripts/, assets/ | Semantic description matching |
| [Acontext](../projects/acontext.md) | `list_skills` tool | `get_skill` (file listing) | `get_skill_file` | — | Explicit tool calls |
| [Napkin](../projects/napkin.md) | NAPKIN.md + auto-injected overview | TF-IDF keyword map by folder | BM25 search snippets | Full file read | Automatic (overview) + explicit (search/read) |
| Obsidian-skills | Plugin description | SKILL.md body | references/ files | — | Semantic (via Agent Skills runtime) |

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — Progressive disclosure is one mechanism within the broader challenge of managing what enters an agent's context window
- [Agent Skills](../projects/anthropic-agent-skills.md) — The canonical implementation of three-tier progressive disclosure for reusable agent capabilities
- [Acontext](../projects/acontext.md) — Treats agent memory as navigable skill files with explicit tool-call disclosure rather than semantic search
- [Napkin](../projects/napkin.md) — Demonstrates that BM25 with progressive disclosure outperforms embedding retrieval on long-term memory benchmarks
