---
entity_id: dspy
type: project
bucket: self-improving
abstract: >-
  DSPy compiles LLM pipelines by algorithmically optimizing prompts and few-shot
  examples rather than requiring hand-written instructions, treating pipeline
  construction as a machine learning problem.
sources:
  - repos/laurian-context-compression-experiments-2508.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/repos/gepa-ai-gepa.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
related:
  - retrieval-augmented-generation
last_compiled: '2026-04-08T02:53:58.653Z'
---
# DSPy

## What It Does

DSPy is a Python framework from Stanford that treats LLM pipeline construction as a machine learning problem. You write a pipeline using declarative modules and signatures, then run an optimizer (called a "teleprompter") that automatically finds prompts, few-shot examples, or instruction sets that maximize a metric on your training data. The output is a compiled program with the optimized prompts baked in.

The core claim: stop hand-writing prompts and start writing metrics. Define what "good" looks like, provide examples, and let the optimizer search for instructions that achieve it.

## What's Architecturally Unique

Most LLM frameworks treat prompts as static configuration. DSPy treats them as optimizable parameters in a computational graph. A `dspy.Signature` is analogous to a function signature in typed code: it declares inputs, outputs, and optional field descriptors but does not specify the instruction text. The optimizer fills in the instructions.

This separation between program structure (which the developer writes) and prompt text (which the optimizer discovers) is the key architectural decision. A program written against DSPy signatures can be reoptimized for a different model, a different dataset, or different evaluation criteria without changing application code.

DSPy also separates the model call (a `dspy.Predict` or `dspy.ChainOfThought` module) from the signature, enabling module-level composition. You can stack modules into pipelines and the optimizer works across all of them simultaneously.

## Core Mechanism

### Signatures and Modules

A signature specifies input/output field names and types:

```python
class QuestionAnswer(dspy.Signature):
    """Answer questions with short factual responses."""
    context: str = dspy.InputField()
    question: str = dspy.OutputField()
    answer: str = dspy.OutputField()
```

The docstring becomes a candidate for optimization. Modules like `dspy.ChainOfThought` wrap signatures and add structural patterns (chain-of-thought, multi-hop retrieval, etc.).

### Optimizers (Teleprompters)

The optimizer population includes:

- **BootstrapFewShot**: Runs the program on training examples, collects traces where the metric passes, uses those as few-shot demonstrations. The simplest optimizer — no LLM calls required to generate prompts.

- **MIPROv2** (`teleprompt/miprov2.py`): Bayesian optimization over a search space of instruction variants. Generates candidate instructions by prompting a meta-LLM with summaries of training examples, then uses TPE (Tree-structured Parzen Estimator) to select which instructions to evaluate. More expensive than BootstrapFewShot but finds better instructions.

- **GEPA**: Genetic-Pareto optimizer using LLM-readable execution traces (Actionable Side Information) for reflection-based mutation. Available as `dspy.GEPA`. Claimed 35x faster convergence than GRPO approaches, +10% over MIPROv2. [GEPA source](../raw/deep/repos/gepa-ai-gepa.md) documents the mechanism in detail. Self-reported benchmarks from the GEPA authors.

- **BootstrapFinetune**: Uses collected traces to generate fine-tuning data, then fine-tunes the underlying model. Bridges prompt optimization and weight optimization.

- **COPRO** and **SignatureOptimizer**: Earlier approaches now largely superseded by MIPROv2.

### Compilation

`program.compile(trainset, metric)` runs the optimizer, returning a new program object with optimized prompts embedded. The compiled program can be saved to JSON with `program.save()` and loaded later — the JSON contains the discovered instructions and few-shot examples.

### RAG Integration

DSPy is the reference framework for [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipelines where the retriever and generator both need optimization. [HippoRAG](../raw/deep/repos/osu-nlp-group-hipporag.md) uses DSPy's `DSPyFilter` class to optimize its recognition memory filter — the few-shot examples baked into `filter_default_prompt.py` were discovered by a DSPy optimization run, not hand-written.

The [context-compression-experiments-2508](../raw/repos/laurian-context-compression-experiments-2508.md) case study shows DSPy GEPA recovering 62% success rate from 0% on a gpt-4o-mini context compression task that previously required falling back to gpt-4o.

### Evaluation Loop

DSPy optimizers require a metric function `(example, prediction) -> float`. The metric is the optimization target. This forces explicit articulation of what "correct" means, which is both a strength (reproducible evaluation) and a constraint (tasks without clear metrics don't benefit from optimization).

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| GitHub stars | ~25k | GitHub |
| MIPROv2 vs. baseline | +5-15% on most benchmarks | Self-reported in DSPy papers |
| GEPA vs. MIPROv2 | +10% average, +12% on AIME-2025 | Self-reported by GEPA authors |
| GEPA vs. GRPO | 35x fewer rollouts | Self-reported, ICLR 2026 Oral |
| Context compression recovery | 0% → 62% (GEPA), 0% → 79% (TextGrad), 0% → 100% (hybrid) | Independent user experiment |

The context compression numbers are the most credible: a practitioner ran an independent experiment on production traces from their own system, not on a curated benchmark. The GEPA/MIPROv2 comparisons are self-reported by the respective teams. The 5-15% MIPROv2 improvement over manual prompting is a rough median across varied published evaluations.

## Strengths

**Systematic prompt search.** For tasks with clear metrics and training data, DSPy finds instructions that beat what most practitioners write by hand. The optimizer explores a larger space of instruction variants than a human would try.

**Reoptimization.** When you switch models (GPT-4 to Claude, GPT-4o to GPT-4o-mini), you recompile rather than manually rewrite prompts. This makes model migrations tractable at scale.

**Compositional pipelines.** Chaining multiple DSPy modules preserves the optimization-friendliness of each component. A multi-hop RAG pipeline where retrieval, reading, and synthesis are separate modules can be optimized end-to-end.

**Production case studies.** The context compression experiment shows real-world applicability: a practitioner diagnosed a rate-limit-induced fallback failure and used DSPy to make the cheap model perform acceptably without manual prompt engineering.

## Critical Limitations

**Concrete failure mode: optimization overfits to training distribution.** MIPROv2 and BootstrapFewShot select few-shot examples that maximize your training metric. If your training set is small (under 50 examples) or unrepresentative, the optimizer discovers instructions that work on training examples but generalize poorly. The compiled program encodes assumptions about the data distribution. This is not a hypothetical — it's the standard failure mode for any few-shot selection scheme.

**Unspoken infrastructure assumption: you have labeled training data and a programmatic metric.** DSPy requires both. If you're building on user feedback, subjective quality, or tasks where "correct" is ambiguous, the optimization loop doesn't engage. Many real LLM applications fall into this category. The framework also assumes you can run the pipeline many times during compilation — a 300-call GEPA run on a production-equivalent pipeline with expensive LLM calls may cost $50-$500 before you have a compiled program.

## When NOT to Use It

**Skip DSPy when you have fewer than ~50 labeled examples.** BootstrapFewShot selects from traces that pass your metric; with too little data, the selection is arbitrary. MIPROv2 needs enough examples to reliably estimate instruction quality.

**Skip DSPy when task requirements change frequently.** Compiled programs embed assumptions. Changing what "good" means requires recompilation. If your evaluation criteria shift weekly, the compilation overhead doesn't amortize.

**Skip DSPy for one-shot or low-call-volume tasks.** If you're running a pipeline a few dozen times total, the optimization cost exceeds the benefit. DSPy pays off at scale where marginal improvements per call compound.

**Skip DSPy when you need interpretable prompts under human review.** The optimizer produces prompts that work but aren't necessarily readable or explainable. In regulated domains where prompts must be audited, machine-generated instructions create compliance problems.

## Unresolved Questions

**Benchmark selection and self-reporting.** DSPy's canonical benchmarks (HotpotQA, MATH, code generation tasks) are chosen by the DSPy team. Independent replication on arbitrary tasks produces more variable results. The +5-15% figure is a median, not a floor.

**Cost at scale.** Compilation runs many evaluations. The framework doesn't expose a reliable cost estimate before you start. GEPA documentation recommends "50-200 total evaluations for meaningful improvement," but that number depends entirely on your pipeline's per-call cost.

**Conflict resolution between modules.** When a multi-module pipeline is compiled and two modules develop conflicting implicit assumptions (module A learns to produce verbose output, module B's examples assume terse input), the optimizer has no mechanism to detect or resolve this. You learn about it from degraded downstream performance.

**Governance of compiled artifacts.** A compiled JSON file contains discovered instructions that no human wrote. Questions about who owns these, how to audit them, and how to version-control them across model updates are not addressed in the framework.

## Alternatives

- **[LangChain](../projects/langchain.md)**: Use when you need breadth of integrations and explicit control over every prompt. No optimization loop, but full visibility into what the LLM receives.
- **[LangGraph](../projects/langgraph.md)**: Use when the problem is workflow orchestration with branching and cycles rather than prompt optimization.
- **Manual prompt engineering + [LLM-as-Judge](../concepts/llm-as-judge.md)**: Use when your metric can't be programmatically defined or you have too little labeled data for optimization to work.
- **[GEPA](../concepts/gepa.md) standalone**: Use when you have a non-prompt artifact to optimize (CUDA kernels, agent skill descriptions, configuration files) or need faster convergence than MIPROv2 provides.
- **Fine-tuning** (via DSPy's `BootstrapFinetune` or directly): Use when you have 1k+ labeled examples and need inference-time cost reduction rather than prompt quality improvement.

## Related Concepts

- [Prompt Optimization](../concepts/prompt-optimization.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Chain-of-Thought](../concepts/chain-of-thought.md)
- [Self-Improving Agents](../concepts/self-improving-agents.md)
- [GEPA](../concepts/gepa.md)
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md)
