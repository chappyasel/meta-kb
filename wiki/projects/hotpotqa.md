---
entity_id: hotpotqa
type: project
bucket: knowledge-bases
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/bytedtsinghua-sia-memagent.md
  - repos/gepa-ai-gepa.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/michaelliv-napkin.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/repos/topoteretes-cognee.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:24:18.870Z'
---
# HotpotQA

## What It Is

HotpotQA is a reading comprehension benchmark dataset released in 2018 by Yang et al. (Carnegie Mellon, Stanford, MIT). It contains roughly 113,000 question-answer pairs drawn from English Wikipedia, where answering each question requires reading and reasoning across two separate documents. The dataset comes in two settings: a "distractor" setting (10 paragraphs provided, 2 relevant) and a "fullwiki" setting (the entire Wikipedia corpus as the retrieval pool). A subset of questions also carry supporting fact annotations, which evaluators use to score both answer accuracy and explanation quality.

HotpotQA is widely used as a standard benchmark for Retrieval-Augmented Generation systems and multi-hop reasoning research.

## Why It Matters

Most QA benchmarks test single-document lookup. A system can achieve high scores by retrieving one passage and extracting a span. HotpotQA breaks that pattern by requiring the system to chain two or more retrieval steps: find the first document, extract a bridge entity, use that entity to find the second document, then synthesize both into an answer. This makes it a useful proxy for whether a retrieval or reasoning system can actually compose information rather than pattern-match.

The fullwiki setting is the harder and more operationally realistic variant. Given an open question and no pre-selected candidates, a system must retrieve, filter, and reason from scratch.

## How It Works

**Dataset structure.** Each example contains: the question text, the gold answer (usually a short string or yes/no), two gold supporting paragraphs, and sentence-level supporting fact labels. In the distractor setting, eight additional irrelevant paragraphs are bundled with the two gold ones.

**Multi-hop structure types.** Questions break into two main categories:
- *Bridge questions*: the answer to a sub-question (bridge entity) unlocks the path to the final answer. Example: "Where was the director of [Film X] born?" requires knowing who directed the film before querying birthplace.
- *Comparison questions*: two entities must be retrieved and compared on an attribute.

**Evaluation metrics.** Systems are scored on answer F1 (token overlap), exact match (EM), supporting fact F1, and a joint F1 that multiplies answer and supporting fact scores. The joint metric is the hardest to game because it punishes retrieving the right answer through wrong reasoning paths.

**Retrieval chain mechanics.** In the fullwiki setting, strong systems implement iterative retrieval: query once with the original question, extract entities from top results, reformulate a second query using those entities, retrieve again, then pass both document sets to a reader model. The GEPA repository includes an optimized prompt for this exact pipeline, where the second-hop query generator takes `question` and `summary_1` as inputs and produces a targeted search query for the missing document. [Source](../../raw/repos/gepa-ai-gepa.md)

## Who Uses It and How

HotpotQA appears in benchmarks for:

- **RAG pipelines**: testing whether retrieval reformulation (re-ranking, query rewriting, iterative search) improves multi-hop accuracy over single-shot retrieval.
- **Agent memory systems**: the GAM research codebase uses HotpotQA alongside LoCoMo, RULER, and NarrativeQA to evaluate hierarchical memory retrieval from long documents. [Source](../../raw/repos/vectorspacelab-general-agentic-memory.md)
- **Long-context models**: MemAgent's RL training pipeline uses HotpotQA as a verifiable-reward task, with a strict `\boxed{}` answer format during training and a lenient verifier (stripping articles like "a/the") at test time. The dataset is distributed on HuggingFace under `BytedTsinghua-SIA/hotpotqa`. [Source](../../raw/repos/bytedtsinghua-sia-memagent.md)
- **Prompt optimization**: GEPA uses HotpotQA to demonstrate that evolved prompts can encode explicit second-hop retrieval logic, showing that optimization pressure can discover the bridge-entity retrieval pattern without hand-engineering it. [Source](../../raw/repos/gepa-ai-gepa.md)

## Key Numbers

The original paper reported human performance at ~91% answer F1 and ~80% joint F1 on the distractor setting. State-of-the-art model performance on the fullwiki leaderboard has exceeded 70% joint F1 as of 2023, with top systems using retrieval-augmented readers and iterative search. These figures come from the official leaderboard and published papers; they are not independently re-verified here.

The dataset has ~90,500 training examples, ~7,400 dev examples. Test set labels are held by the original authors and require submission for scoring.

## Strengths

**Bridge-entity signal.** The supporting fact annotations let you audit whether a system found the right path or got lucky. Systems that score well on joint F1 are doing something structurally correct, not just extracting the right token from random context.

**Controlled difficulty levels.** The distractor setting is tractable for ablations during development. The fullwiki setting approximates production conditions. You can use both without changing your model.

**Wide adoption.** Results are directly comparable across a large body of literature, which matters when positioning a system or paper.

## Limitations

**Concrete failure mode: single-hop shortcuts.** Many HotpotQA questions can be answered from a single document if the second-hop answer happens to appear in the first retrieved paragraph as background context. Researchers have shown that strong single-hop baselines achieve surprisingly high answer F1 on the distractor setting, undermining the benchmark's premise. Systems that score well here may not generalize to harder multi-hop tasks where shortcuts don't exist.

**Unspoken infrastructure assumption: Wikipedia as a closed world.** The fullwiki setting assumes your retrieval corpus is a fixed Wikipedia snapshot from 2018. Systems trained or tuned on this setting often embed implicit assumptions about entity naming, article structure, and link patterns specific to that snapshot. Deploying the same retrieval logic against a different corpus (internal documents, a newer Wikipedia dump, a domain-specific knowledge base) typically degrades performance in ways that are hard to predict before you run it.

**Answer format brittleness.** Answers are short strings. The EM metric punishes minor formatting differences. Production QA systems that generate longer, more explanatory answers need separate evaluation infrastructure; HotpotQA scores don't transfer cleanly.

**Annotation artifacts.** Question authors knew which two documents they were working from when writing questions. This introduces lexical overlap between questions and gold paragraphs that retrieval systems can exploit, partly explaining why keyword-based retrieval still competes with learned retrievers on the distractor setting.

## When Not to Use It

Skip HotpotQA as your primary benchmark if:

- You care about multi-hop reasoning over more than two documents. HotpotQA is almost entirely two-hop; it won't stress-test longer chains.
- Your domain is outside general encyclopedic knowledge. Performance on Wikipedia facts doesn't predict performance on legal documents, scientific papers, or enterprise data.
- You need to evaluate open-ended generation quality. The short-answer format and F1 scoring don't capture whether a system produces coherent, useful explanations.
- You're evaluating retrieval in a streaming or incremental context. The dataset is static; there's no notion of document arrival order or freshness.

## Unresolved Questions

**Leakage from pre-training.** Large language models have seen Wikipedia extensively during pre-training. It's not clear how much HotpotQA scores reflect genuine retrieval-augmented reasoning versus memorized associations. No standard protocol decontaminates evaluations.

**Second-hop retrieval formulation.** The dataset doesn't specify how systems should structure iterative retrieval. Different implementations (entity extraction vs. query rewriting vs. full-document summarization as a bridge) produce different results on the same underlying capability, making cross-system comparison noisy.

**Leaderboard maintenance.** The original leaderboard has had inconsistent uptime and submission requirements. Test-set access depends on the original authors, creating a dependency that academic groups sometimes work around by over-fitting to the dev set.

## Alternatives

| Benchmark | Use when |
|---|---|
| **MuSiQue** | You need genuine multi-hop reasoning that resists single-hop shortcuts; MuSiQue was designed explicitly to close the shortcut gap in HotpotQA |
| **2WikiMultiHopQA** | You want two-hop reasoning with explicit cross-document structural annotations and a cleaner evidence chain |
| **QASPER** | Your domain is scientific papers rather than encyclopedic facts |
| **FRAMES** | You need longer reasoning chains (5+ hops) or want to stress-test agent memory across many retrieval steps |
| **NarrativeQA** | You're evaluating comprehension of long narrative documents rather than factoid retrieval |

## Related Concepts

- Retrieval-Augmented Generation
