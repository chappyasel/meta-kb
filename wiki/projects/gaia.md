---
entity_id: gaia
type: project
bucket: agent-systems
abstract: >-
  GAIA is a benchmark testing AI assistants on real-world tasks requiring
  multi-step reasoning, web search, file parsing, and tool use; distinguished by
  human-calibrated difficulty levels and resistance to pattern-matching
  shortcuts.
sources:
  - repos/bingreeky-memevolve.md
  - repos/agent-on-the-fly-memento.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - mcp
last_compiled: '2026-04-07T11:57:10.405Z'
---
# GAIA: General AI Assistants Benchmark

## What It Does

GAIA evaluates AI assistants on tasks that resist shortcuts. Each question demands a chain of real-world actions: web searches, file parsing (PDFs, spreadsheets, images, audio), code execution, and multi-hop reasoning. A question might ask an agent to find a research paper, extract a table from an attached Excel file, cross-reference it against a web source, and return a specific number. The correct answer is unambiguous and verifiable.

Three difficulty levels structure the benchmark. Level 1 requires one or two steps. Level 2 requires five or more, often involving heterogeneous tools. Level 3 requires arbitrary-length chains where intermediate failures cascade. Human annotators score around 92% on the full set. As of 2025, frontier models with agents score roughly 50-75% on validation depending on tooling, with Level 3 remaining a persistent gap.

GAIA sits inside the broader [Retrieval-Augmented Generation](../concepts/rag.md) research context and is directly relevant to [Agentic RAG](../concepts/agentic-rag.md) evaluation. The [Model Context Protocol](../concepts/mcp.md) has become a common tool interface in GAIA-targeting systems.

## Architecture and Format

The dataset lives on Hugging Face at `gaia-benchmark/GAIA`. The validation split uses commit `897f2dfbb5c952b5c3c1509e648381f9c7b70316` (February 2025). Each sample in `metadata.jsonl` carries:

- A natural language question
- An optional attached file (`.xlsx`, `.mp3`, `.pdf`, `.png`, or similar)
- A ground truth answer string
- A level tag (1, 2, or 3)
- Annotator-provided steps (validation set only; hidden in test set)

The test set withholds both answers and annotator steps, preventing agents from reverse-engineering solution strategies from metadata. Evaluation is exact-match or near-exact-match against the answer string, with lightweight normalization for number formatting and whitespace.

File attachments are what separate GAIA from pure QA benchmarks. An agent that can only search the web fails on questions requiring it to read a spreadsheet column or transcribe an audio clip. This forces evaluation of the full tool stack, not just retrieval quality.

## Key Numbers

The human baseline is ~92% across all levels (self-reported by the GAIA paper authors, Mialon et al., 2023). Published agent scores vary significantly by system:

- GPT-4 with plugins at release: ~30% on validation
- Frontier agents (GPT-4o, Claude 3.5+ with capable tool stacks) in 2025: ~50-65% on validation Level 1-2, lower on Level 3
- [Memento](../projects/memevolve.md), which uses case-based reasoning over stored GAIA trajectories, reports competitive results on validation and test without weight updates (self-reported; see [Source](../raw/repos/agent-on-the-fly-memento.md))
- [MemEvolve](../projects/memevolve.md) targets GAIA as one of three primary benchmarks alongside WebWalkerQA and xBench (self-reported; see [Source](../raw/repos/bingreeky-memevolve.md))

Scores on the public leaderboard should be read carefully. Validation answers are public, so validation scores are susceptible to overfitting. Test scores require submission to the GAIA team. The human-AI gap remains largest at Level 3.

## Strengths

**Unambiguous grading.** Answers are factual strings. There is no LLM judge, no rubric debate, no inter-annotator variance on correctness. This makes GAIA one of the few agent benchmarks where score comparisons across papers are meaningful.

**Genuine tool diversity.** Requiring file parsing alongside web search prevents agents from gaming results through search quality alone. A system must integrate multiple modalities coherently.

**Difficulty stratification.** The three-level structure lets researchers diagnose where agent pipelines break down. A system that scores 80% on Level 1 but 20% on Level 3 has a different failure mode than one that scores evenly across levels.

**Adoption as a standard.** GAIA appears as a primary benchmark in multiple agent memory and self-improvement papers (Memento, MemEvolve, Flash-Searcher). This accumulation of results makes cross-paper comparison feasible in a way that bespoke benchmarks do not.

## Critical Limitations

**Concrete failure mode: file handling brittleness.** Agents frequently fail not on reasoning but on file type handling. An agent that cannot parse a `.mp3` audio attachment or extract the right sheet from a multi-sheet `.xlsx` file fails before reasoning begins. This failure is invisible in aggregate scores but dominates Level 2-3 errors. Pipelines built for text-only retrieval will hit a ceiling imposed entirely by file parsing infrastructure, not model capability.

**Unspoken infrastructure assumption.** GAIA assumes agents have access to reliable, low-latency web search. The benchmark was designed around the assumption that a web search tool returns useful results. Systems using SearxNG (a common self-hosted option) face higher failure rates than those using commercial search APIs, because result quality varies with index freshness and geographic coverage. Papers rarely disclose which search backend they used, making score comparisons across systems quietly incomparable.

## When Not to Use It

Do not use GAIA as your primary benchmark if:

- Your system is retrieval-only with no tool use. GAIA penalizes missing tools; you will measure infrastructure gaps rather than retrieval quality.
- You need to evaluate conversational or multi-turn behavior. GAIA is single-turn: one question, one answer. It says nothing about how an agent handles clarification, follow-up, or state across turns.
- You are evaluating domain-specific performance in medicine, law, or code. GAIA questions are general-knowledge-oriented. Domain benchmarks like [SWE-bench](../projects/swe-bench.md) or [TAU-bench](../projects/tau-bench.md) are better fits.
- Your deployment environment cannot support the file types in the dataset. Without audio and spreadsheet parsing, your evaluation will systematically undercount agent capability on tasks your system actually handles.

## Unresolved Questions

**Test set contamination risk.** The validation set answers are public. Any agent system trained or tuned on GAIA-adjacent data may have seen these answers. There is no disclosed mechanism for detecting or controlling this. The test set provides a cleaner signal, but test submission requires working with the benchmark maintainers and is not automated.

**Leaderboard governance.** The leaderboard is community-maintained. There is no disclosed review process for submitted scores, no requirement to disclose model versions or search backends, and no audit of whether test answers were used during training. High leaderboard scores should be treated as claims, not facts.

**Cost at scale.** Level 3 questions can require 40+ agent steps. The [Memento repo](../raw/repos/agent-on-the-fly-memento.md) uses GPT-4.1 as planner and o3 as executor. Running the full test set with a capable tool stack costs hundreds of dollars. This creates pressure to report on small samples, which is not always disclosed. The benchmark does not specify a canonical cost-controlled evaluation protocol.

**Evolving difficulty.** As models improve, what counted as Level 3 difficulty in 2023 may become routine. The benchmark has no stated process for refreshing questions or recalibrating difficulty levels as the frontier advances.

## Alternatives

- **[SWE-bench](../projects/swe-bench.md):** Use when evaluating code agents on software engineering tasks. Better signal for coding capability; no general reasoning evaluation.
- **[WebArena](../projects/webarena.md):** Use when evaluating web navigation agents in a sandboxed browser environment. Tests different failure modes (UI interaction, session state) that GAIA does not cover.
- **[HotpotQA](../projects/hotpotqa.md):** Use when you need a simpler multi-hop QA benchmark without tool use requirements. Lower infrastructure burden, less realistic.
- **[AppWorld](../projects/appworld.md):** Use when testing agents on API-driven task completion across multiple apps. Closer to enterprise automation scenarios.
- **[LongMemEval](../projects/longmemeval.md):** Use when evaluating memory systems specifically, particularly cross-session recall and temporal reasoning. GAIA does not test persistent memory.

GAIA is the right choice when you need a realistic, multi-tool, unambiguously-scored evaluation of general agent capability and want results that are comparable across the research community.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.3)
- [Model Context Protocol](../concepts/mcp.md) — part_of (0.3)
