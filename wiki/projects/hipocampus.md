# Hipocampus

> Drop-in proactive memory harness for AI agents that solves the "unknown unknowns" problem by maintaining a lightweight topic index (ROOT.md) making implicit context discoverable without search queries -- achieving 21x better performance than no memory on cross-domain recall.

## What It Does

Hipocampus gives AI agents a 3-tier memory system modeled after a CPU cache hierarchy. The key innovation is ROOT.md: a compressed (~3K token) topic index of the agent's entire conversation history, auto-loaded into every session. When a request arrives, the agent already sees all past topics at zero search cost, noticing connections that search would miss -- like relating a payment flow refactoring to a rate limiting decision from three weeks ago. It handles memory writes via subagents, runs automatic compaction (raw -> daily -> weekly -> monthly -> root), and classifies memories into types (project, feedback, user, reference) with type-aware preservation rules.

## Architecture

Three memory tiers with two retrieval mechanisms:

- **Hot (always loaded, ~3K tokens)**: ROOT.md topic index, SCRATCHPAD.md, WORKING.md, TASK-QUEUE.md
- **Warm (read on demand)**: Daily logs (YYYY-MM-DD.md), curated knowledge base, task plans
- **Cold (search + compaction tree)**: RAG via qmd (BM25/vector hybrid) for known queries, plus hierarchical compaction tree drill-down (ROOT -> monthly -> weekly -> daily -> raw) for discovery

Selective recall uses a 3-step fallback: ROOT.md triage (O(1)) -> manifest-based LLM selection (<500 tokens) -> qmd search. Smart compaction runs when cooldown expires, raw log exceeds 300 lines, or 5+ checkpoints accumulate.

Zero infrastructure -- just files. Works immediately with Claude Code, OpenCode, and OpenClaw.

## Key Numbers

- 145 GitHub stars, 11 forks
- JavaScript, MIT license
- **21.0% overall** on MemAware benchmark (21.6x better than no memory, 5.1x better than search alone)
- **8.0% on hard questions** (cross-domain, zero keyword overlap) vs 0.7% for vector search (11.4x better)
- ~3K tokens per session overhead

## Strengths

- Solves the structural limitation of search-based memory: you cannot search for what you do not know you know. The compaction tree makes implicit cross-domain connections discoverable at O(1) cost
- Zero-infrastructure file-based design means `npx hipocampus init` and you are running, with no databases or servers to manage

## Limitations

- The 3K token ROOT.md budget limits the number of topics that can be indexed (39 at default, 120 at 10K), which may become a bottleneck for agents with very broad knowledge bases
- Hard-tier cross-domain reasoning (8.0%) appears bottlenecked by the answer model rather than the index, suggesting diminishing returns from memory system improvements alone

## Alternatives

- [nemori.md](nemori.md) -- use when you need episodic memory with event segmentation theory and predict-calibrate learning loops
- [claude-memory-engine.md](claude-memory-engine.md) -- use when you want mistake-learning and correction cycles specifically for Claude Code
- [general-agentic-memory.md](general-agentic-memory.md) -- use when you need hierarchical memory with REST API access and multi-modal support

## Sources

- [kevin-hs-sohn-hipocampus.md](../../raw/repos/kevin-hs-sohn-hipocampus.md) -- "Hipocampus + Vector is 21.6x better than no memory and 5.1x better than search alone. On hard questions (cross-domain, zero keyword overlap), Hipocampus scores 8.0% vs 0.7% for vector search"
