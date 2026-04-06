---
entity_id: narrative-qa
type: project
bucket: knowledge-bases
abstract: >-
  NarrativeQA is a reading comprehension benchmark requiring free-text answers
  over full books and movie scripts, testing genuine document-level
  understanding rather than passage lookup.
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/osu-nlp-group-hipporag.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T23:16:42.258Z'
---
# NarrativeQA

## What It Is

NarrativeQA is a reading comprehension benchmark released by Kočiský et al. (2018) at DeepMind. It requires systems to answer questions about full-length books (from Project Gutenberg) and movie scripts, where the source documents run to tens of thousands of words. Questions were written by human annotators who read summaries, then answered against the full text — a design choice that intentionally prevents questions from being answerable by simple keyword matching or passage retrieval.

The dataset contains roughly 1,572 stories with 46,765 question-answer pairs. Each story has an associated human-written summary, and the original benchmark setup offered two evaluation modes: answering from the full document or from the summary only. Most subsequent work uses the full-document setting, which is the harder and more meaningful test.

## Why It Matters

Most QA benchmarks prior to NarrativeQA (SQuAD, TriviaQA, Natural Questions) could be solved by retrieving a short passage and extracting a span. NarrativeQA was designed to break that approach. The documents are too long to fit in standard context windows, the questions require tracking characters and events across chapter-length spans, and the answers are free-form rather than extractive spans.

This makes it a natural stress test for long-context retrieval systems, RAG pipelines, and any architecture claiming to "understand" documents rather than retrieve from them. When HippoRAG 2 wants to demonstrate "sense-making" — integrating large, complex contexts — NarrativeQA is one of the three benchmarks it uses alongside multi-hop QA tasks ([HippoRAG source](../raw/repos/osu-nlp-group-hipporag.md)). The context engineering survey similarly cites it as the primary evaluation for long-context reading comprehension in RAG systems ([Survey source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)).

## How It Works

**Dataset construction:** Annotators read Wikipedia summaries of books and scripts, then wrote questions whose answers could only be confirmed by reading the full source text. This indirection means questions tend to ask about plot logic, character motivation, and causal chains rather than named entities or dates.

**Evaluation:** Answers are scored using BLEU, ROUGE-L, and METEOR against human reference answers (each question has two references). These metrics are imperfect — they penalize valid paraphrases — but remain the standard for comparison across papers.

**Document length:** Source documents average around 60,000–80,000 tokens, far exceeding the context windows of most models until 2023–2024. Even with large context windows (128K+), simply stuffing the full book into the prompt is expensive and may not be the best approach.

**The retrieval challenge:** Because the full document cannot fit in a single context, systems typically need to retrieve relevant passages before generation. NarrativeQA tests whether that retrieval can handle narrative dependencies: a question about why a character acted in chapter 12 may require context from chapters 3, 7, and 11. Flat vector retrieval of individual passages tends to fail here.

## Strengths

**Genuine comprehension requirement.** The question-writing process filters out questions answerable by keyword lookup. A system that scores well has to track narrative structure across thousands of tokens.

**Long-established baseline.** The benchmark has been evaluated by dozens of systems since 2018, giving practitioners a meaningful comparison surface. You can directly compare against BERT-era extractive models, early RAG systems, and current long-context LLMs.

**Differentiates retrieval strategies.** Flat chunk retrieval, sparse retrieval, graph-based retrieval, and full-document approaches all behave differently on NarrativeQA. It surfaces the distinction between finding the right passage and integrating information across passages.

## Critical Limitations

**Metric inadequacy.** BLEU and ROUGE-L are weak proxies for comprehension quality. A system can generate a correct answer in different words and score poorly; a system can produce fluent but wrong answers and score acceptably. Papers that report only these metrics are measuring proxy signals, not understanding.

**Infrastructure assumption:** Evaluation assumes you can process the full document (or a meaningful portion of it) per query. Running NarrativeQA at scale requires either large context windows, chunking infrastructure, or substantial compute for document preprocessing. The benchmark has no lightweight evaluation mode — you cannot meaningfully approximate it with short passages.

**Summary-vs-document ambiguity.** Early papers sometimes reported results on the summary setting (much shorter input, easier task) without clearly labeling this. When comparing numbers across papers, confirm which setting was used.

**English-only, literary domain.** All documents are English-language books and scripts. Performance on NarrativeQA does not predict performance on technical documents, multilingual text, or dialogue-heavy formats like chat logs.

## When NOT to Use It

Do not use NarrativeQA to benchmark systems designed for short-context or structured-data tasks. If your production use case involves retrieving facts from chunked enterprise documents, FAQ lookup, or any scenario where documents are under 10,000 words, NarrativeQA's performance numbers will not transfer. The narrative domain is also specific: character tracking and plot comprehension are different skills from technical document understanding or legal reasoning.

If you need a benchmark where answers are verifiable with high precision, avoid NarrativeQA. The free-text evaluation introduces enough noise that small score differences (1–2 ROUGE points) are often within measurement error.

## Unresolved Questions

**Score interpretation across model generations.** NarrativeQA scores from 2019 BERT models and 2024 frontier LLMs are not directly comparable because the evaluation infrastructure, preprocessing, and retrieval components differ significantly across papers. There is no standard pipeline.

**Full-document vs. retrieved-passage evaluation.** As context windows expand, some systems simply ingest the entire book. Whether this should be treated as the same task as retrieval-augmented generation over chunked documents is unsettled. The benchmark does not specify retrieval strategy, so papers optimizing for different constraints (latency, cost, accuracy) are evaluated identically.

**Human performance ceiling.** The original paper reported human performance, but humans reading summaries and answering against full text is a different cognitive task than reading the full book. Whether the benchmark's ceiling reflects genuine comprehension limits or annotation artifacts is unclear.

## Reported Performance Numbers

NarrativeQA ROUGE-L scores in published work range from roughly 35–45 for strong RAG systems to 55–65 for frontier LLMs with full-document access. HippoRAG 2 reports improvements on NarrativeQA's sense-making dimension compared to baseline RAG — these are self-reported in the ICML 2025 paper and not independently validated as of writing. The context engineering survey treats NarrativeQA as a standard benchmark without citing a specific state-of-the-art number, consistent with its role as a reference point rather than a leaderboard target.

## Alternatives

**QuALITY** (multiple-choice, long documents): Use when you need less noise from free-text evaluation metrics and want clear right/wrong answers over long texts.

**SCROLLS benchmark suite**: Use when you want a broader evaluation across multiple long-document tasks rather than narrative-specific comprehension.

**HotpotQA / MuSiQue**: Use when your system needs to demonstrate multi-hop reasoning over shorter passages rather than narrative understanding over book-length documents.

**SQuAD 2.0**: Use when you need a well-understood extractive QA baseline with span-level precision — but accept that it tests passage retrieval, not document comprehension.

Choose NarrativeQA when you specifically need to evaluate a system's ability to track information across very long narrative text, and when ROUGE/METEOR metrics are acceptable proxies for your use case.
