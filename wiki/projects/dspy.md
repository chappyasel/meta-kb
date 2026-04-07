---
entity_id: dspy
type: project
bucket: context-engineering
abstract: >-
  DSPy treats LLM prompts and pipelines as optimizable programs, replacing
  hand-crafted instructions with automatic compilation and tuning via
  teleprompters, enabling systematic prompt improvement without manual
  iteration.
sources:
  - repos/laurian-context-compression-experiments-2508.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/repos/gepa-ai-gepa.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
related: []
last_compiled: '2026-04-07T11:48:40.833Z'
---
# DSPy

## What It Does

DSPy (Declarative Self-improving Python) is a framework from Stanford NLP that separates LLM pipeline *structure* from *parameters*. You define what your pipeline should do using declarative signatures and modules; DSPy's optimizers (called teleprompters) then automatically find the best prompts, instructions, and few-shot examples to make it work.

The core bet: hand-written prompts are brittle. When you swap models, change tasks, or add retrieval, your carefully tuned instructions often break. DSPy compiles the pipeline instead of asking you to maintain it.

## Core Mechanism

### Signatures and Modules

A DSPy `Signature` declares inputs and outputs with typed field names and optional docstrings. A module like `dspy.ChainOfThought(signature)` wraps this into an LLM call that DSPy can optimize. You compose modules into programs, which are plain Python classes with a `forward()` method.

This means DSPy tracks which strings are "parameters" (instructions, few-shot demonstrations) vs. fixed structure. Teleprompters treat those parameters the same way a neural optimizer treats weights.

### Teleprompters

DSPy ships several optimizers:

- **BootstrapFewShot** -- runs your program on training examples, collects successful traces, and uses them as few-shot demonstrations for future calls
- **COPRO / MIPRO / MIPROv2** -- generate candidate instructions by proposing variations and selecting the best via evaluation on a validation set; MIPROv2 adds Bayesian hyperparameter search over instruction candidates
- **BootstrapFinetune** -- compiles a pipeline into fine-tuning data for smaller models
- **GEPA** -- evolutionary Pareto-based optimizer that analyzes execution traces to diagnose failure causes and propose targeted fixes (see below)

The compilation loop is: run program on labeled examples, measure metric, propose changes to instructions or demonstrations, evaluate again, keep what improves the metric.

### GEPA Integration

DSPy now ships `dspy.GEPA`, which applies the Genetic-Pareto optimizer to entire DSPy programs, including signatures, modules, and control flow. Unlike BootstrapFewShot (which finds good demonstrations) or MIPROv2 (which searches instruction variants), GEPA reads full execution traces to diagnose *why* specific examples fail and proposes targeted fixes. Per the [GEPA source analysis](../raw/deep/repos/gepa-ai-gepa.md), this achieves 35x fewer evaluations than RL-based approaches. On MATH benchmark, GEPA lifted a DSPy ChainOfThought program from 67% to 93%.

### Retrieval Integration

DSPy provides `dspy.Retrieve` as a first-class module, making [Retrieval-Augmented Generation](../concepts/rag.md) pipelines optimizable end-to-end. The optimizer can tune not just what the LLM says, but what query it sends to the retriever and how it uses the results. This is architecturally distinct from frameworks like [LangChain](../projects/langchain.md) that treat retrieval as fixed infrastructure.

## Key Numbers

| Benchmark | Result | Source |
|-----------|--------|--------|
| MATH (ChainOfThought + GEPA) | 67% → 93% | Self-reported (GEPA paper, ICLR 2026 Oral) |
| AIME 2025 (GPT-4.1 Mini + GEPA) | 46.67% → 60.00% | Self-reported |
| Context compression (gpt-4o-mini) | 0% → 62%–100% via GEPA/TextGrad | [Practitioner report](../raw/repos/laurian-context-compression-experiments-2508.md) |
| GitHub stars | ~20k+ | As of mid-2025 |

The MATH and AIME numbers come from the GEPA paper, which is peer-reviewed (ICLR 2026 Oral) but still Stanford/GEPA team work. The context compression numbers are from an independent practitioner running production experiments, which adds credibility.

## Strengths

**Systematic prompt improvement without manual iteration.** The practitioner report shows a real production case: a context compression prompt that failed 100% of the time on gpt-4o-mini went to 62% success (GEPA alone), 79% (TextGrad alone), and 100% (hybrid) without touching the model or writing new prompts by hand.

**Model portability.** Because the optimizer re-runs for each model, you compile your pipeline once per model rather than porting hand-crafted prompts. Switching from GPT-4o to Llama-3.3-70B means recompiling, not rewriting.

**End-to-end RAG optimization.** DSPy can tune retrieval queries, re-ranking decisions, and generation instructions jointly against a single metric, which manual prompt engineering cannot do coherently.

**Composability.** Programs are Python classes. You can unit-test modules, swap in different teleprompters for different stages, and integrate with standard ML tooling.

## Critical Limitations

**Concrete failure mode -- small dataset amplification.** DSPy's teleprompters bootstrap few-shot examples from training runs. With fewer than ~20-50 labeled examples, the optimizer has limited signal and can overfit to unrepresentative demonstrations. The compiled prompt may perform well on validation but fail on distribution shift. The [context compression case](../raw/repos/laurian-context-compression-experiments-2508.md) used 40 training / 10 validation examples -- a small set where the final validation accuracy (44.7%) understated the actual test success rate (62%), suggesting inconsistent signal.

**Unspoken infrastructure assumption.** DSPy assumes you can run your full pipeline many times during compilation. For expensive pipelines (long context, many retrieval calls, GPT-4-class models), 500-2000 evaluation calls for MIPROv2 or GEPA can cost hundreds of dollars per compilation run. DSPy caches intermediate results, but cache invalidation on any structural change restarts evaluation. Production use requires treating compilation cost as a first-class budget decision, not just a one-time setup step.

## When NOT to Use It

- You have no labeled examples or evaluation metric. DSPy's optimization is entirely metric-driven. Without a reliable `metric` function and at least 20-50 labeled training examples, the teleprompters have nothing to optimize against.
- Your pipeline runs exactly once or changes constantly. Compilation cost amortizes poorly over few runs. If requirements change every week, you will spend more time recompiling than you save.
- You need deterministic, auditable prompts. DSPy-compiled prompts can be verbose, hard to read, and contain auto-generated few-shot examples that embed training data. Regulated industries that require human-readable, version-controlled prompt text may find DSPy output difficult to audit.
- Your bottleneck is model capability, not prompt quality. If GPT-4o-mini consistently fails at a task even with the best possible prompt (wrong knowledge, insufficient context length, fundamental reasoning gap), prompt optimization will not fix it.
- Latency is critical and you cannot precompile. DSPy optimization runs offline, but the compiled program still incurs any added few-shot token overhead at inference time. Programs optimized with many demonstrations will be slower and more expensive than simple zero-shot calls.

## Unresolved Questions

**Compilation governance at scale.** DSPy does not specify how organizations should manage compiled programs across teams -- who owns the training set, how compiled prompts get versioned alongside model versions, and what triggers recompilation. The framework treats this as out-of-scope, leaving teams to build their own MLOps layer.

**Metric design guidance.** The quality of optimization is entirely determined by the metric function. DSPy's documentation provides examples but limited guidance on metric design failure modes (reward hacking, metric-task mismatch). The [GEPA documentation](../raw/deep/repos/gepa-ai-gepa.md) is more explicit about this, noting that continuous accuracy scores work better than binary pass/fail and that dataset design "matters enormously."

**Cost bounds on GEPA.** GEPA's 35x sample efficiency over GRPO is a relative claim. The absolute cost of a GEPA compilation run -- in API calls and dollars -- varies by pipeline complexity and is not documented with practical upper bounds.

**Multi-tenant compilation.** If multiple teams compile pipelines against the same production model, there is no mechanism for sharing compiled knowledge across teams or reusing intermediate optimization results.

## Relation to Adjacent Concepts

DSPy is a specific implementation of [Prompt Optimization](../concepts/dspy-optimization.md) (the concept it helped popularize). The GEPA optimizer connects it to [Self-Improving Agent](../concepts/self-improving-agent.md) patterns, since compiled pipelines can improve without human intervention. The compilation loop resembles [Reinforcement Learning](../concepts/reinforcement-learning.md) but operates on text parameters rather than model weights.

For [Agentic RAG](../concepts/agentic-rag.md) pipelines, DSPy can optimize the full chain -- query reformulation, retrieval, synthesis -- which is harder to achieve with [LangChain](../projects/langchain.md) or [LlamaIndex](../projects/llamaindex.md) because those frameworks do not expose prompt parameters to an optimizer by default.

[HippoRAG](../projects/hipporag.md) uses DSPy specifically to optimize its recognition memory filter, demonstrating the pattern of integrating DSPy at a sub-component level within a larger retrieval system.

## Alternatives

| Framework | Choose When |
|-----------|------------|
| [LangChain](../projects/langchain.md) | You need a broad ecosystem of integrations and are willing to write prompts manually; pipeline structure matters more than optimization |
| [LlamaIndex](../projects/llamaindex.md) | Your primary concern is RAG data architecture (chunking, indexing, retrieval strategies) rather than prompt optimization |
| Manual [Prompt Engineering](../concepts/prompt-engineering.md) | You have strong domain expertise, limited labeled data, and pipelines that change frequently enough that compilation cost does not amortize |
| TextGrad | You want gradient-based text optimization and have a differentiable-ish feedback signal; the practitioner report shows GEPA + TextGrad hybrid outperforms either alone |
| [GEPA](../concepts/gepa.md) standalone | You want evolutionary prompt optimization outside of the DSPy program abstraction, or you are optimizing non-prompt text artifacts like CUDA kernels or configurations |

The practical tradeoff: [LangChain](../projects/langchain.md) and [LlamaIndex](../projects/llamaindex.md) give you more control and a larger community; DSPy gives you automatic optimization but requires a labeled dataset and evaluation metric from day one. Most teams start with manual prompting, then reach for DSPy when they have enough labeled data and a stable enough task that compilation cost is justified.
