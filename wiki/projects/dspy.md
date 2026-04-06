---
entity_id: dspy
type: project
bucket: context-engineering
abstract: >-
  DSPy compiles declarative LLM pipelines by optimizing prompts and few-shot
  examples automatically, replacing hand-crafted prompt engineering with
  algorithmic search over instruction and demonstration space.
sources:
  - repos/laurian-context-compression-experiments-2508.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
related: []
last_compiled: '2026-04-06T02:08:20.366Z'
---
# DSPy

## What It Does

DSPy is a Python framework from Stanford NLP that treats LLM pipelines as programs to be compiled rather than prompts to be written. You define a pipeline using typed `Signature` objects (specifying inputs, outputs, and descriptions), compose them into `Module` classes, and then run an optimizer (called a "teleprompter") that automatically finds good instructions and few-shot examples for each module.

The core bet: prompt engineering is an empirical search problem. DSPy automates that search given a metric function and a small training set, rather than having engineers hand-write instructions through trial and error.

## Core Mechanism

### Signatures and Modules

A `dspy.Signature` declares what a step does:

```python
class AnswerQuestion(dspy.Signature):
    """Answer questions with short factoid answers."""
    context = dspy.InputField(desc="may contain relevant facts")
    question = dspy.InputField()
    answer = dspy.OutputField(desc="often between 1 and 5 words")
```

A `dspy.Module` composes these into pipelines:

```python
class RAGPipeline(dspy.Module):
    def __init__(self):
        self.retrieve = dspy.Retrieve(k=3)
        self.generate = dspy.ChainOfThought(AnswerQuestion)
    
    def forward(self, question):
        context = self.retrieve(question).passages
        return self.generate(context=context, question=question)
```

Built-in module types include `Predict` (direct prediction), `ChainOfThought` (adds reasoning steps), `ReAct` (tool-using agents), and `MultiChainComparison`. Each module type translates its signature into a different prompting pattern.

### Teleprompters (Optimizers)

The compilation step runs a teleprompter against a training set and metric:

```python
optimizer = dspy.MIPROv2(metric=validate_answer, auto="medium")
compiled = optimizer.compile(pipeline, trainset=trainset)
```

The main optimizers:

**BootstrapFewShot**: Generates candidate demonstrations by running the uncompiled program on training examples, keeping examples where the metric passes. Simple but requires a labeled training set.

**MIPRO / MIPROv2**: Proposes instruction candidates using a meta-prompt that reasons about the task, then uses Bayesian optimization (via `optuna`) to search the joint space of instructions and demonstrations. MIPROv2 is the recommended default for most tasks.

**COPRO**: Generates instruction candidates using a teacher LLM and hill-climbs toward the best instructions.

**GEPA**: Available as `dspy.GEPA`, uses genetic-Pareto evolutionary search with LLM-readable execution traces (see [GEPA](../concepts/gepa.md)). Reported as 35x faster than RL-based approaches (self-reported, source: GEPA authors).

**BetterTogether**: Jointly optimizes prompts and model weights (via fine-tuning) for maximum efficiency.

The compiled program saves to JSON with optimized instructions and demonstrations baked in, deployable without re-running optimization.

### How MIPROv2 Works Internally

MIPROv2 runs in three phases:

1. **Bootstrapping**: Run the uncompiled program on training examples to collect labeled traces (input/output pairs with intermediate reasoning).

2. **Proposal generation**: Use a meta-prompt to generate N candidate instructions for each module, seeded by the bootstrapped traces and the signature description.

3. **Bayesian search**: Use `optuna` (TPE sampler) to select combinations of instruction candidates and demonstration sets. Each trial evaluates the full pipeline on a dev set using the metric function.

The search space grows exponentially with pipeline depth, so MIPROv2 uses early stopping and a configurable `num_trials` budget.

### Storage and Serialization

Compiled programs serialize to JSON with a structure like:
```json
{
  "generate_answer.predict.signature.instructions": "...",
  "generate_answer.predict.demos": [...]
}
```

The `load`/`save` methods handle this. Programs can be shared and loaded without the original training set.

## Key Numbers

| Benchmark | Baseline | DSPy (MIPROv2) | Notes |
|-----------|----------|-----------------|-------|
| MATH | 67% (CoT) | 93% (full program opt) | Self-reported by GEPA authors on DSPy integration |
| Context compression (gpt-4o-mini) | 0% success | 45% val / 62% test | Independent test (laurian/context-compression-experiments) |
| AIME 2025 (GPT-4.1 Mini) | 46.67% | 60.00% | Self-reported by GEPA |

GitHub stars: ~22k (as of mid-2025). Credibility caveat: most benchmark numbers are self-reported by the DSPy team or downstream users. Independent replication is limited, and performance gains depend heavily on metric design and training set quality.

## Strengths

**Prompt-model decoupling**: Because signatures describe intent rather than encoding model-specific prompt tricks, the same pipeline can be recompiled when you switch models. Migrating from GPT-4o to Claude means re-running the optimizer, not rewriting prompts.

**Metric-driven development**: Optimization requires a metric function, which forces teams to define what "good" means quantitatively before building. This is a forcing function toward evaluability.

**Composability**: Modules nest cleanly. A `ChainOfThought` module inside a larger agent pipeline gets optimized in context, not in isolation.

**Gradient-free optimization for discrete text**: No differentiability required. The optimizer treats prompt space as a combinatorial search problem, which is appropriate for discrete tokens.

**Integration surface**: The ecosystem has grown to include adapters for LangChain, LangGraph, Pydantic AI, and now GEPA. HippoRAG uses DSPy's optimizer to train its recognition memory filter (the `DSPyFilter` class in `rerank.py`), demonstrating real-world adoption beyond benchmarks.

## Critical Limitations

**Concrete failure mode -- metric gaming**: DSPy optimizes toward whatever your metric function rewards. A metric that checks substring match will produce prompts that inject expected answers. A metric that uses an LLM judge inherits that judge's biases. The optimizer has no awareness of overfitting and will happily find instructions that exploit metric quirks. In the context-compression experiment, the GEPA-optimized prompt reached 62% on test data but evolved domain-specific instructions that hardcoded knowledge about the specific corpus (visible in the redacted examples -- domain terms leaked into the prompt template itself). This prompt may generalize poorly to different document types.

**Unspoken infrastructure assumption**: MIPROv2 requires running your full pipeline N times (default: 50-200 trials × training set size). For a pipeline with API-based retrieval, tool calls, or expensive LLM steps, this means hundreds to thousands of API calls during optimization. A pipeline that costs $0.01 per query becomes $5-20 in optimization overhead at minimum. At production scale (thousands of unique pipeline configurations), the cost compounds. The framework provides no built-in cost estimation or budget guardrails -- you set `num_trials` and pay accordingly.

## When NOT to Use DSPy

**One-off tasks with no stable metric**: If you cannot write a metric function that accurately reflects quality, the optimizer has nothing to optimize toward. Ad-hoc exploratory prompting is faster.

**Very short optimization horizon**: Compiling a pipeline takes time and money. If you plan to use a prompt five times total, hand-writing it is cheaper.

**Pipelines that change topology per query**: DSPy optimizes a fixed module graph. If your pipeline structure changes dramatically based on input (e.g., you sometimes use 3 retrieval steps and sometimes 0), the compiled optimizations apply inconsistently.

**Teams without evaluation infrastructure**: The real prerequisite for DSPy is a test set and a reliable metric. Teams that lack these are not ready to use DSPy -- they will compile a program with a proxy metric and deploy something that tests well on the wrong thing.

**Latency-critical paths where prompt size matters**: Compiled DSPy programs include multi-shot demonstrations in every prompt. On latency-sensitive endpoints, the extra tokens (often 2-5x longer prompts post-compilation) may outweigh the accuracy gains.

## Unresolved Questions

**Conflict resolution between modules**: When two modules in a pipeline produce contradictory intermediate outputs, DSPy has no built-in conflict resolution. The downstream module receives the contradiction and handles it however the LLM handles it. The optimizer does not learn to resolve conflicts -- it just finds instructions that reduce overall metric loss.

**Cost at scale is undocumented**: The documentation describes `num_trials` but does not provide guidance on when optimization plateaus or how to estimate total API cost before running. Real-world users have reported optimization runs costing $50-200 for moderately complex pipelines with large training sets.

**Governance for compiled programs**: Who owns a compiled program? If the teacher LLM (used for instruction proposal) changes, does the compiled program need re-optimization? The JSON artifacts have no versioning metadata linking them to the LLM versions used during compilation, creating reproducibility issues.

**Cross-module interference in optimization**: MIPROv2 optimizes instructions for all modules simultaneously via Bayesian search. It is unclear how much the optimizer accounts for interaction effects (module A's instruction quality conditional on module B's output). The search space treats modules more independently than they actually are.

## Alternatives

| Alternative | When to Choose |
|-------------|---------------|
| [LangChain](../projects/langchain.md) | When you want a broader ecosystem with more integrations and are comfortable with manual prompt engineering |
| [LangGraph](../projects/langgraph.md) | When you need stateful, graph-based agent execution with explicit control flow over optimization |
| [LlamaIndex](../projects/llamaindex.md) | When the primary task is RAG with complex retrieval strategies and you want purpose-built retrieval primitives |
| Manual [Prompt Engineering](../concepts/prompt-engineering.md) | When your task lacks a reliable metric, your training set is too small (<20 examples), or your pipeline runs too infrequently to justify compilation cost |
| [GEPA](../concepts/gepa.md) | When you have execution traces with rich diagnostic information and want faster convergence than MIPROv2 (GEPA is available as `dspy.GEPA`) |

Use DSPy when you have a stable pipeline structure, a reliable evaluation metric, a training set of at least 50 examples, and a task where prompt quality demonstrably affects outcomes. It pays off most on pipelines you will run thousands of times against consistent task types.
