---
entity_id: gaia
type: project
bucket: agent-systems
sources:
  - repos/bingreeky-memevolve.md
  - repos/agent-on-the-fly-memento.md
  - deep/repos/bingreeky-memevolve.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/memento-teams-memento-skills.md
related: []
last_compiled: '2026-04-05T05:31:45.614Z'
---
# GAIA Benchmark

## What It Is

GAIA (General AI Assistant benchmark) tests AI assistants on real-world tasks that require combining multi-step reasoning, web search, file parsing, code execution, and factual recall. Each question has a single, unambiguous correct answer that a human could verify. The benchmark resists prompt engineering because the bottleneck is tool-use and reasoning chains, not phrasing.

Questions span three difficulty levels. Level 1 requires fewer than five steps. Level 2 involves moderate tool chaining. Level 3 demands sustained multi-hop reasoning across many steps and diverse information sources, often requiring agents to process attached files (PDFs, spreadsheets, audio, images) alongside web search.

GAIA is hosted on Hugging Face at `gaia-benchmark/GAIA`. The February 2025 version (commit `897f2dfbb5c952b5c3c1509e648381f9c7b70316`) includes a `validation/metadata.jsonl` file alongside task attachments. Test set answers are withheld; evaluation runs through a leaderboard submission system.

## Architectural Design

GAIA's design philosophy distinguishes it from most LLM benchmarks. Most benchmarks test knowledge retrieval or reasoning in isolation. GAIA combines them in tasks that mirror real assistant usage: "What is the elevation of the mountain visible in this image, in feet, rounded to the nearest hundred?" requires image recognition, geographic lookup, unit conversion, and rounding, chained together.

The unambiguous-answer constraint is load-bearing. It means automatic evaluation is reliable and human annotation of model outputs is unnecessary. The tradeoff is that the benchmark skews toward factual, verifiable tasks and away from open-ended synthesis or judgment.

File attachments distinguish harder questions from benchmarks that operate purely through text. Agents must parse `.xlsx`, `.mp3`, `.pdf`, and image files as intermediate reasoning steps, not just as context. This tests the full tool-use stack rather than just search and retrieval.

## Key Numbers

GAIA's leaderboard shows strong frontier model performance at Level 1 but steep drop-offs at Level 3. Systems built on GPT-5-class models with strong tool integration (web search, code execution, document parsing) report scores in the 70-85% range on the validation set overall. Flash-Searcher reports 82.5 on GAIA ([Source](../../raw/repos/bingreeky-memevolve.md)); Memento reports competitive results on validation and test sets ([Source](../../raw/repos/agent-on-the-fly-memento.md)).

These numbers are self-reported by research teams evaluating their own systems on the public validation split. Independent verification of validation scores is limited because the test set answers are hidden, and validation-set performance may reflect optimization toward known questions over time. Treat leaderboard validation numbers as directional rather than definitive.

Human baseline on GAIA hovers around 92%, providing a ceiling. The gap between state-of-the-art agents and humans narrows as tool access improves but remains meaningful at Level 3.

## Strengths

GAIA rewards genuine capability. Because questions require chaining tools across multiple steps, a system cannot shortcut to correct answers through memorization alone. An agent that cannot reliably execute web searches, parse a spreadsheet, and reason over combined results will fail Level 2 and Level 3 questions regardless of its base model strength.

The benchmark is operationally reproducible. The `metadata.jsonl` format, attached files, and automatic string-match evaluation make it straightforward to integrate into agent evaluation pipelines. Multiple research projects (MemEvolve, Memento, Flash-Searcher) use GAIA as a primary benchmark, which means comparative numbers across systems are at least consistent in methodology.

Task diversity is genuine. Questions pull from geography, history, mathematics, science, and pop culture, requiring breadth rather than depth in any single domain.

## Limitations

**Concrete failure mode**: Agents that succeed at Level 1 and 2 questions can fail catastrophically at Level 3 not because they lack reasoning ability but because they accumulate tool errors over long chains. A single failed web search or misparse of an attachment early in a 15-step chain propagates forward. GAIA scores do not decompose this error source from genuine reasoning failures, making it hard to diagnose which part of an agent's stack needs improvement.

**Unspoken infrastructure assumption**: Strong GAIA performance requires reliable access to live web search. Systems evaluated without real-time search (using only model weights or static knowledge) score significantly lower, particularly on questions requiring current facts or obscure historical details. Many published GAIA results assume SearxNG, Bing, or commercial search APIs as infrastructure. Evaluations in restricted or air-gapped environments are not comparable.

## When Not to Use It

GAIA measures task completion by a general assistant, not capability in any specific professional domain. If you need to evaluate an agent for legal document review, medical diagnosis support, or code generation quality, GAIA's question distribution will not tell you much. The benchmark also does not test sustained multi-turn dialogue, user preference alignment, or safety behaviors. Using GAIA scores to make hiring or deployment decisions for domain-specific applications is a category error.

GAIA is also a poor proxy for systems that operate without tool access. A retrieval-augmented generation system that answers questions from a fixed corpus will look weak on GAIA not because RAG is bad but because the benchmark specifically requires dynamic tool use.

## Unresolved Questions

The benchmark's governance and update cadence are not documented publicly. The February 2025 version replaced an earlier version, but the process for deciding when to update questions, how to prevent answer leakage into training data over time, and who controls the test set evaluation server is unclear.

At scale, the evaluation infrastructure (leaderboard submission, answer comparison) is a single point of failure with no published SLA or fallback. Research teams depending on the leaderboard for paper submissions face schedule risk.

The benchmark does not publish per-question difficulty metadata beyond the three levels, so it is hard to identify which capability gaps matter most. A team scoring 70% overall cannot easily determine whether they fail on audio processing, multi-hop web search, or mathematical reasoning without building custom analysis tooling.

## Alternatives

**HLE (Humanity's Last Exam)**: Use when you want a ceiling benchmark that tests deep expert-level knowledge rather than tool-use breadth. Memento reports competitive HLE results alongside GAIA ([Source](../../raw/repos/agent-on-the-fly-memento.md)).

**WebWalkerQA**: Use when you specifically want to evaluate web navigation and crawling capability rather than general assistant behavior. MemEvolve evaluates on WebWalkerQA as a complement to GAIA ([Source](../../raw/repos/bingreeky-memevolve.md)).

**xBench DeepSearch**: Use when you want a harder, more recent benchmark with stronger emphasis on deep research tasks. Flash-Searcher reports 83.0 on xBench alongside 82.5 on GAIA, suggesting the two benchmarks track similar but not identical capabilities ([Source](../../raw/repos/bingreeky-memevolve.md)).

**SimpleQA**: Use when you want to isolate factual recall from tool use, or when you need fast, cheap evaluation without infrastructure dependencies.
