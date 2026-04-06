---
entity_id: progressive-disclosure
type: concept
bucket: context-engineering
abstract: >-
  Progressive Disclosure loads context into an agent's context window in stages
  (metadata → instructions → resources) based on demonstrated need, preventing
  context bloat without sacrificing depth. Differentiator: it shifts retrieval
  decisions from embedding similarity to agent reasoning.
sources:
  - repos/memodb-io-acontext.md
  - repos/thedotmack-claude-mem.md
  - repos/michaelliv-napkin.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/michaelliv-napkin.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
related:
  - anthropic
  - mcp
  - agent-skills
  - obsidian
  - claude-code
  - rag
last_compiled: '2026-04-06T02:02:25.842Z'
---
# Progressive Disclosure

Progressive Disclosure is a context management strategy where information enters an agent's context window in stages, each triggered by demonstrated need. An agent starts with minimal orientation (a few dozen tokens), requests more detail when relevant, and loads deep reference material only when a task demands it. The goal is keeping context windows uncluttered without hiding information the agent might need.

This pattern appears throughout LLM systems engineering under different names: layered context loading, tiered context, on-demand context injection. The Agent Skills specification formalizes it as a three-level architecture. Napkin implements it through BM25 search over a structured vault. Acontext implements it through tool-call-driven skill file navigation. The same idea recurs because it solves the same tension: LLMs perform better with focused context, but you cannot know in advance what an agent will need.

## Why It Matters

Context windows are finite and expensive. More critically, attention quality degrades when irrelevant content crowds relevant content — the model's focus scatters. Front-loading every potentially relevant document is wasteful at best and actively harmful at worst.

Traditional retrieval-augmented generation ([RAG](../concepts/rag.md)) attempts to solve this through embedding-based pre-filtering: a smaller model scores document chunks by semantic similarity, then passes the top-K to the LLM. This has a structural problem — retrieval decisions get made by a weaker model before the capable model ever sees the query in context. The embedding model cannot reason about the task; it can only approximate semantic distance.

Progressive Disclosure inverts the decision hierarchy. The capable model (the agent) examines a cheap summary layer, reasons about what it needs, and requests more detail through tool calls or structured navigation. Retrieval becomes a first-class reasoning task rather than a preprocessing step.

Napkin's benchmarks on LongMemEval make this concrete. BM25 retrieval with progressive disclosure (overview → search → read) achieved 91% accuracy on the S-dataset, beating embedding-based RAG systems at 86% and GPT-4o with full context stuffing at 64% — using no embedding infrastructure at all. [(Source)](../raw/deep/repos/michaelliv-napkin.md)

## How It Works

### The Three-Level Architecture

The [Agent Skills](../concepts/agent-skills.md) specification formalizes Progressive Disclosure into three levels:

**Level 1 — Metadata (~dozen tokens):** Always loaded. Contains the skill name and a one-line description. Enough for routing decisions: does this skill apply to the current task?

**Level 2 — Instructions (hundreds to thousands of tokens):** Loaded when the agent determines a skill is relevant. Contains the complete procedural knowledge: how to do the thing, what to watch for, common pitfalls. Injected into conversation context as hidden messages.

**Level 3 — Resources (thousands of tokens):** Loaded on-demand within active skill execution. Technical reference material, API documentation, complete examples, executable scripts. Loaded only when the task specifically requires that depth.

The Obsidian Skills repository demonstrates this in practice. The `obsidian-bases` skill keeps its primary `SKILL.md` at 497 lines (roughly 4,000 tokens), with `FUNCTIONS_REFERENCE.md` as a separate 174-line document loaded only when formula-heavy tasks require it. An agent doing basic Obsidian note creation pays ~4K tokens; an agent building complex database views with custom formulas pays ~6K. The system never pays the full 20K token cost unless every skill and every reference file is active simultaneously. [(Source)](../raw/deep/repos/kepano-obsidian-skills.md)

### Implementation Patterns

Three distinct implementations demonstrate the range of approaches:

**Structured vault navigation (Napkin):** Napkin's four-level model — NAPKIN.md (always loaded), Overview (TF-IDF keyword map by folder), Search (BM25 + backlink count + recency), Read (full file) — lets the agent navigate a knowledge base without any LLM preprocessing. The overview layer generates a compressed topic map from all `.md` files using weighted TF-IDF: headings get 3x weight, filenames and frontmatter titles 2x, body text 1x. The agent reads this map, decides which folders are relevant, then runs a BM25 search within that scope, then reads specific files. Each step is a deliberate agent choice, not an automated retrieval pipeline. [(Source)](../raw/deep/repos/michaelliv-napkin.md)

**Tool-call-driven skill navigation (Acontext):** Acontext rejects embedding search and makes retrieval fully explicit. Agents call `list_skills` to see available skills, `get_skill` to list files within a skill, and `get_skill_file` to read specific content. Navigation is deterministic: if the agent reads the wrong files, you can trace exactly which tool calls led there. The `SKILL.md` within each skill acts as a manifest that guides the agent to the right data files — progressive disclosure enforced by information architecture rather than by automated retrieval. [(Source)](../raw/deep/repos/memodb-io-acontext.md)

**Declarative skill files (Agent Skills specification):** The [SKILL.md](../concepts/skill-md.md) format structures progressive disclosure at the ecosystem level. Skill repositories publish dozens of skills; agents load all Level 1 metadata at startup (a few hundred tokens total), then pull Level 2 instructions only when a skill matches the current task. [Claude Code](../projects/claude-code.md), Cursor, GitHub Copilot, and Gemini CLI all implement this pattern against the same specification, enabling skills authored once to work across runtimes. [(Source)](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

### Contrast with RAG

[Retrieval-Augmented Generation](../concepts/rag.md) and Progressive Disclosure are not mutually exclusive, but they reflect different assumptions about where intelligence should live.

RAG pre-filters before the agent acts. An embedding model scores chunks, the top-K enter context, the agent reasons over whatever the retrieval step selected. The agent cannot request more chunks if the initial selection was insufficient, cannot decide that a different document is more relevant, and cannot navigate hierarchically from overview to detail.

Progressive Disclosure post-filters through agent reasoning. The agent examines cheap summary layers, decides what is relevant, and requests specific content. This costs more in latency (multiple tool calls) and requires the agent to reason well about its own information needs. The payoff is that the capable model makes retrieval decisions rather than delegating them to a weaker embedding model.

These approaches are also composable. [Agentic RAG](../concepts/agentic-rag.md) systems use embedding retrieval to populate an initial context layer, then give agents tools to request additional content from that initial retrieval set. Progressive Disclosure becomes the outer loop; vector similarity becomes one possible mechanism for individual lookup steps.

## Who Implements It

**[Anthropic](../projects/anthropic.md)** built the Agent Skills specification formalizing the three-level model and ships it through [Claude Code](../projects/claude-code.md)'s plugin system. The specification is implemented by multiple competing platforms, which signals it as an emerging standard rather than proprietary design.

**[Obsidian](../projects/obsidian.md)** (the note-taking application) ships the `obsidian-skills` repository, authored by CEO Steph Ango, as a reference implementation of documentation-as-capability. The repository contains zero executable code — five `SKILL.md` files teach agents Obsidian's proprietary file formats purely through structured markdown documentation with progressive disclosure built into the directory structure.

**[Model Context Protocol](../concepts/mcp.md)** is complementary infrastructure. MCP provides the transport layer (how tools connect); Progressive Disclosure provides the knowledge layer (what knowledge loads when). A skill file might instruct an agent to use a particular MCP server, specify how to interpret its outputs, and define fallback strategies.

**Napkin** (by Michael Livshits) implements Progressive Disclosure as agent memory for software projects, with a TypeScript CLI and SDK, BM25 search, backlink-weighted ranking, and auto-distillation that writes knowledge back to the vault at session end.

**Acontext** implements Progressive Disclosure as a learned memory system, transforming agent execution traces into structured skill files through a three-stage pipeline: task extraction, LLM-as-judge distillation, and skill authoring.

## Practical Implications

**Information architecture determines disclosure quality.** Progressive Disclosure works when the summary layer accurately predicts what the detail layer contains. Napkin's TF-IDF overview works because markdown files with strong heading discipline surface the right keywords. Acontext's skill manifests work because the `SKILL.md` within each skill accurately describes the data files alongside it. If your summary layer is inaccurate or generic, agents will navigate to wrong detail layers — and progressive disclosure becomes progressive misdirection.

**Smaller, focused documents outperform large aggregated ones.** Napkin's benchmark uses per-round notes (~2,500 characters each) rather than per-session logs (~15,000 characters). BM25 term concentration is higher in smaller documents — one note about authentication outranks a session log that briefly mentions authentication among thirty other topics. This has direct architectural implications: memory systems should write many small files rather than appending to large session logs.

**Score visibility harms agent reasoning.** Napkin hides BM25 scores from agents deliberately. When agents see numerical confidence scores, they anchor on the numbers instead of evaluating content quality from the actual text. Scores drive ordering invisibly; agents evaluate relevance from snippets. Any system providing retrieval results to an LLM should consider whether exposing confidence scores helps or hinders relevance judgment.

**Phase transitions bound flat skill registries.** Research on skill-based agent systems documents a critical threshold beyond which skill selection accuracy collapses as library size grows. The agent cannot route correctly among hundreds of skills with only Level 1 metadata. Hierarchical organization — skill categories, meta-skill routing, sub-categories — is not optional at scale; it is a prerequisite. [(Source)](../raw/deep/papers/xu-agent-skills-for-large-knowledge-models-architectu.md)

## Failure Modes

**Vocabulary mismatch breaks BM25-based disclosure.** BM25 requires term overlap between the query and the document. "Authentication" will not surface files about "authn" unless both terms appear together. Embedding-based retrieval handles synonyms better. Progressive Disclosure with BM25 is more reliable when documents use consistent terminology — which is not always under the agent's control.

**Agent reasoning quality gates retrieval quality.** Progressive Disclosure requires the agent to correctly identify which summary layer signals warrant deeper investigation. A poorly reasoning agent skips relevant skills, loads irrelevant ones, or fails to recognize when to go deeper. This is not a retrieval algorithm failure — it is an agent capability dependency. The system performs only as well as the agent's ability to reason about its own information needs.

**Abstention is unsolved.** BM25 always returns ranked results, with no calibrated confidence threshold to signal "I don't know." Napkin's benchmark shows 50% accuracy on abstention tasks — the model cannot reliably determine when no relevant information exists. For production memory systems where false confidence is worse than admitting ignorance, this is a significant gap.

**No conflict resolution across skill files.** When multiple skill files contain contradictory information about the same domain, agents have no principled mechanism for resolving conflicts. Progressive Disclosure surfaces the contradiction but provides no framework for adjudicating it. Acontext mitigates this through sequential skill learning (one writer at a time per learning space), but the underlying problem remains for any multi-source disclosure system.

**Security gates are prerequisite, not optional.** In community skill ecosystems, 26.1% of analyzed skills contain at least one vulnerability; 5.2% show patterns suggesting malicious intent. Skills with executable scripts are 2.12× more vulnerable than instruction-only skills. Progressive Disclosure's trust model — loaded instructions are treated as authoritative context — makes it exploitable via long `SKILL.md` files designed to override agent behavior through trust escalation. [(Source)](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

## When Not to Use It

**One-shot retrieval with stable, well-structured documents.** If the task requires extracting specific information from a document corpus with stable content and high-quality metadata, vector similarity retrieval with a single round-trip is faster and sufficient. Progressive Disclosure adds latency through multiple tool calls; for tasks where a single well-formed embedding query suffices, that overhead buys nothing.

**Agents with weak tool-calling discipline.** Progressive Disclosure requires agents to reason about what they need and request it explicitly. Agents that call tools inconsistently, skip navigation steps, or fail to recognize information gaps will underperform compared to front-loading all relevant context.

**Rapidly changing information without freshness signals.** BM25 indexes stale as content changes; embedding indexes stale too. Progressive Disclosure with neither staleness detection nor temporal ranking will surface outdated content with the same confidence as current content. Real-time or frequently updated knowledge bases need explicit freshness mechanisms before Progressive Disclosure is reliable.

## Alternatives and Selection Guidance

**Use [RAG](../concepts/rag.md)** when vocabulary is heterogeneous, synonym matching matters, and you have infrastructure to maintain an embedding pipeline. RAG handles the vocabulary gap that BM25 cannot bridge.

**Use [Hybrid Retrieval](../concepts/hybrid-retrieval.md)** when you want Progressive Disclosure's multi-step navigation with semantic fallback for vocabulary mismatches. Combine BM25 with vector similarity using Reciprocal Rank Fusion; use Progressive Disclosure as the outer navigation loop.

**Use [Agentic RAG](../concepts/agentic-rag.md)** when you need Progressive Disclosure's multi-round retrieval but your corpus requires semantic similarity rather than keyword matching. Agentic RAG gives agents tools to re-query, refine, and navigate retrieval results iteratively.

**Use [Context Graphs](../concepts/context-graphs.md)** when information has rich relational structure and graph traversal better represents the navigation semantics than hierarchical disclosure. Graph-based disclosure and document-hierarchical disclosure suit different knowledge topologies.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — The broader discipline of which Progressive Disclosure is one technique
- [Agent Skills](../concepts/agent-skills.md) — The specification that formalizes the three-level disclosure architecture
- [skill.md](../concepts/skill-md.md) — The file format implementing Progressive Disclosure for skill packages
- [Retrieval-Augmented Generation](../concepts/rag.md) — The alternative approach Progressive Disclosure most directly contrasts with
- [Prompt Compression](../concepts/prompt-compression.md) — A complementary technique for reducing context cost at individual layers
- [Context Collapse](../concepts/context-collapse.md) — The failure mode Progressive Disclosure is designed to prevent
- [Agent Memory](../concepts/agent-memory.md) — The broader problem space; Progressive Disclosure is one strategy for memory access
- [Procedural Memory](../concepts/procedural-memory.md) — Skill files as procedural memory implement Progressive Disclosure at the knowledge encoding level
