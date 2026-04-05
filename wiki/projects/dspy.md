---
entity_id: dspy
type: project
bucket: context-engineering
abstract: >-
  DSPy compiles LLM pipelines by automatically optimizing prompts and few-shot
  examples through teleprompters, replacing hand-written prompt engineering with
  systematic search over program parameters.
sources:
  - repos/laurian-context-compression-experiments-2508.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
related:
  - Prompt Engineering
  - Context Engineering
last_compiled: '2026-04-05T20:32:24.524Z'
---
# DSPy

## What It Does

DSPy is a Python framework from Stanford that treats LLM pipelines as programs with optimizable parameters rather than static prompt templates. Instead of manually crafting prompts, you write a pipeline using typed `Signature` objects and `Module` components, then run an optimizer (called a "teleprompter") that searches for prompts and few-shot examples that maximize a metric on your data.

The core bet: prompt engineering is a form of hyperparameter tuning, and it should be automated the same way neural network training is automated.

## Architecture

### Signatures and Modules

A `Signature` declares the typed interface of an LLM call:

```python
class GenerateAnswer(dspy.Signature):
    """Answer questions with short factoid answers."""
    context: list[str] = dspy.InputField()
    question: str = dspy.InputField()
    answer: str = dspy.OutputField()
```

`Module` subclasses compose these signatures into pipelines. Built-in modules include `dspy.Predict` (single call), `dspy.ChainOfThought` (adds reasoning field), `dspy.ReAct` (tool use loop), and `dspy.ProgramOfThought` (code generation). Users subclass `dspy.Module` and wire these together in `forward()`.

At compile time, optimizers inspect the module tree, identify every `Predict` call, and modify their parameters (the instruction text, few-shot demonstrations) to maximize the evaluation metric.

### Teleprompters (Optimizers)

DSPy ships several optimizers with different tradeoffs:

- **`BootstrapFewShot`**: Runs the pipeline on training examples, collects traces where the final metric passes, and uses passing intermediate outputs as few-shot demonstrations. Cheap but limited to what the unoptimized program can already do.
- **`BootstrapFewShotWithRandomSearch`**: Same as above but samples multiple candidate demonstration sets and keeps the best.
- **`MIPROv2`**: Proposes instruction candidates via a meta-prompt ("what task is this module doing?"), then runs Bayesian optimization over (instruction, demonstration) combinations. More expensive but finds better instructions.
- **`GEPA`**: The newest addition. Uses genetic-Pareto evolutionary search with LLM-readable execution traces as the feedback signal, rather than scalar rewards. See the [GEPA source analysis](../raw/deep/repos/gepa-ai-gepa.md) for details on how it achieves 35x fewer evaluations than RL-based approaches.

Optimizers write back to the module in place. The compiled module is serializable to JSON via `save()` / `load()`.

### LM Abstraction

`dspy.LM` wraps any LLM provider (OpenAI, Anthropic, local via litellm). You configure it globally with `dspy.configure(lm=...)` or thread-locally with `dspy.context(lm=...)`. Every `Predict` call goes through the configured LM, capturing inputs and outputs into a trace for the optimizer to inspect.

### Assertions and Constraints

`dspy.Assert` and `dspy.Suggest` let you add runtime constraints on LLM outputs. `Assert` raises an exception if the constraint fails; `Suggest` triggers a retry with the failure message appended to the prompt. This gives the optimizer feedback signals beyond the final metric.

## Key Numbers

- GitHub stars: ~23,000 (as of mid-2025)
- MIPROv2 on MATH benchmark: moves `ChainOfThought` from 67% to 93% accuracy when used with GEPA for full program optimization [Source](../raw/deep/repos/gepa-ai-gepa.md) — these figures are from the GEPA paper (self-reported, Oral at ICLR 2026, not independently replicated in the DSPy repo itself)
- Context compression case study: GEPA running as `dspy.GEPA` improved gpt-4o-mini extraction success from 0% to 62% baseline, with a TextGrad+GEPA hybrid reaching 100% on a 296-example held-out set [Source](../raw/repos/laurian-context-compression-experiments-2508.md) — practitioner-reported, small dataset

## Strengths

**Systematic over ad-hoc.** When you have evaluation data and a metric, DSPy converts "tweak prompts until it works" into a measurable optimization run. Improvements are reproducible and auditable.

**Pipeline-level optimization.** Unlike tools that optimize a single prompt in isolation, DSPy optimizes all prompts in a pipeline jointly. A three-hop retrieval + reasoning + answer pipeline gets coherent prompts tuned against the end metric, not optimized step by step.

**Backend agnosticism.** The same program compiles against OpenAI, Anthropic, or local models. Switching backends and recompiling often recovers performance lost from using a cheaper model.

**Typed interfaces reduce output failures.** Signatures with typed output fields parse structured data from LLM responses, and `dspy.Assert` / `dspy.Suggest` add retry logic without manual try/except chains.

## Critical Limitations

**One concrete failure mode: optimizer overfitting on small training sets.** Bootstrap-based optimizers sample demonstrations from training traces. With fewer than 50-100 diverse training examples, the demonstrations tend to cluster around similar inputs, and the optimized module degrades on distribution shifts. There is no built-in detection for this: the validation metric can look fine while generalization collapses.

**Unspoken infrastructure assumption: you need fast, cheap evaluation.** Every optimizer variant runs your pipeline tens to hundreds of times during optimization. MIPROv2 with 100 candidates needs ~100 full pipeline evaluations. If your pipeline costs $0.05/run and takes 10 seconds, MIPROv2 costs $5 and takes ~17 minutes. GEPA can cost more per iteration (it calls a separate reflection LLM) while needing fewer iterations total. Without rate limits, caching, or batching, optimization runs block for hours and generate unexpected API bills. DSPy provides a cache for LLM calls but not for full pipeline evaluations.

## When Not to Use It

**Your pipeline has no evaluation data.** DSPy optimization requires a training set with ground-truth labels or a metric function that reliably scores outputs. If you are in early exploration and cannot define success, the optimizer has nothing to optimize toward and you get arbitrary output.

**You need sub-100ms latency.** Compiled modules have the same runtime cost as their underlying LLM calls. DSPy adds no runtime overhead, but it does not reduce it either. If your baseline pipeline is too slow, optimization will not help.

**You have one LLM call and a stable task.** For a single prompt on a well-understood task with consistent inputs, careful manual prompt engineering or a few-shot template is faster than setting up a DSPy pipeline and optimizer. DSPy pays off on multi-step pipelines or tasks with measurable variance.

**Your metric cannot be automated.** Some quality judgments require human review. DSPy has no built-in human-in-the-loop optimization loop. Workarounds exist (LLM-as-judge metrics) but introduce their own reliability problems.

## Unresolved Questions

**Optimizer selection guidance is weak.** The documentation describes what each optimizer does but offers minimal guidance on which to pick for a given dataset size, pipeline complexity, or budget. Practitioners often have to run multiple optimizers to find which fits their situation, which compounds cost.

**How compiled modules degrade over time.** A module compiled against data from last month may produce worse results as the task distribution shifts. There is no built-in staleness detection, re-optimization trigger, or monitoring hook. The burden of deciding when to recompile falls entirely on the user.

**Cost at scale is opaque.** The optimization cost depends on training set size, module depth, optimizer choice, and LLM pricing — none of which is surfaced in a pre-run estimate. The [context compression case study](../raw/repos/laurian-context-compression-experiments-2508.md) notes that GEPA ran for over an hour on 50 training examples. Scaling to 500 examples is not straightforwardly 10x.

**Governance of compiled artifacts.** Compiled modules are JSON blobs containing optimized prompt strings. There is no built-in versioning, diff tooling, or audit trail. Teams that compile frequently need external infrastructure to track which compiled model is in production.

## Relationship to Context Engineering

DSPy implements [context engineering](../concepts/context-engineering.md) through optimization rather than manual construction. Where manual context engineering asks "what should I put in this prompt?", DSPy asks "what should the optimizer put in this prompt, given this metric and data?" The `Signature` fields define the structured context schema; the optimizer fills it with the right instructions and examples.

The agentic computation graph survey [Source](../raw/deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md) classifies DSPy as "node-level optimization within fixed scaffolds" — it keeps the pipeline topology fixed and optimizes parameters at each node, which it distinguishes from topology-search approaches like AFlow. That classification identifies the ceiling: DSPy cannot discover that your pipeline needs an extra reasoning step, only that the existing steps should have different prompts.

## Alternatives

- **TextGrad**: Gradient-based text optimization using LLMs as differentiators. Works well on single-prompt tasks and can refine DSPy-optimized prompts further (the [hybrid approach](../raw/repos/laurian-context-compression-experiments-2508.md) demonstrates this). Use TextGrad when you want iterative refinement without the Pareto-search overhead.
- **GEPA standalone**: The same optimizer available as `dspy.GEPA` can be used independently of the DSPy program abstraction via its `optimize_anything` API. Use GEPA standalone when you are optimizing non-prompt artifacts (CUDA kernels, configuration files, agent skills) or when you want explicit control over the evolutionary search.
- **Manual prompt engineering**: For single-step tasks with stable distributions and fewer than ~20 training examples, manual iteration with structured evaluation is faster than DSPy setup overhead.
- **PromptLayer / LangSmith**: If you want prompt versioning and A/B testing without automated optimization, these are monitoring tools rather than optimizers. They complement DSPy rather than competing with it.


## Related

- [Prompt Engineering](../concepts/prompt-engineering.md) — extends (0.8)
- [Context Engineering](../concepts/context-engineering.md) — implements (0.7)
