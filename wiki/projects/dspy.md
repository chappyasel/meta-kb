---
entity_id: dspy
type: project
bucket: context-engineering
sources:
  - repos/gepa-ai-gepa.md
  - repos/laurian-context-compression-experiments-2508.md
  - repos/alvinreal-awesome-autoresearch.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/osu-nlp-group-hipporag.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
related: []
last_compiled: '2026-04-05T05:28:11.327Z'
---
# DSPy

## What It Is

DSPy is a Python framework from Stanford that treats LLM pipeline construction as a programming problem rather than a prompt-crafting problem. You write Python modules with typed signatures, assemble them into pipelines, then run an optimizer that automatically improves the prompts (and optionally fine-tunes weights) based on a metric you define.

The core insight: prompts are parameters. If you define what you want a module to do via a signature (`question -> answer`) and provide a metric, DSPy can search for better prompt text the same way gradient descent searches for better weights.

## Architecture

**Signatures** define module behavior declaratively:

```python
class GenerateAnswer(dspy.Signature):
    """Answer questions with concise factual responses."""
    context = dspy.InputField(desc="relevant passages")
    question = dspy.InputField()
    answer = dspy.OutputField(desc="often 1-5 words")
```

**Modules** (`dspy.Predict`, `dspy.ChainOfThought`, `dspy.ReAct`) wrap signatures with specific prompting strategies. They track their prompts as learnable parameters, similar to how PyTorch layers track weights.

**Teleprompters** (DSPy's name for optimizers) search prompt space using different strategies:
- `BootstrapFewShot` — runs the pipeline on training examples, collects traces where the metric passes, uses those as few-shot demonstrations
- `MIPROv2` — proposes instruction variants using a meta-LLM, evaluates them on a dev set, selects the best combination
- `COPRO` — coordinate ascent over instructions, one module at a time
- `dspy.GEPA` — integrates the GEPA reflective evolution optimizer (see [GEPA source](../../raw/repos/gepa-ai-gepa.md)); reads full execution traces to diagnose failures, requires 100-500 evaluations vs. thousands for RL-based approaches

**Compilation** (`optimizer.compile(program, trainset=...)`) transforms an unoptimized program into an optimized one. The compiled program has frozen prompt text baked in.

Key files in the DSPy codebase: `dspy/teleprompt/` contains all optimizers; `dspy/predict/predict.py` handles the core prediction logic with signature-to-prompt translation; `dspy/signatures/signature.py` defines the typed field system.

## Key Numbers

- GitHub stars: ~20k+ (self-reported community adoption)
- GEPA integration benchmark: GPT-4.1 Mini on AIME 2025 goes from 46.6% to 56.6% after optimization (self-reported in GEPA docs, not independently validated)
- DSPy Full Program adapter with GEPA: 67% to 93% on MATH benchmark (self-reported by GEPA team)
- Context compression case study: GEPA-optimized DSPy program improved gpt-4o-mini success rate from 0% to ~62% on 296 real production failures; hybrid with TextGrad reached ~100% (independently documented by practitioner, see [source](../../raw/repos/laurian-context-compression-experiments-2508.md))

The context compression result is the most credible benchmark here: it comes from a practitioner working with real production traces, not a lab setting.

## Strengths

**Separates concerns cleanly.** You write pipeline logic once; you optimize separately. Swapping from `gpt-4o` to `claude-3-5-sonnet` doesn't require rewriting prompts by hand.

**Handles multi-step pipelines.** Most prompt optimization tools work on single prompts. DSPy propagates optimization signals through chained modules, so it can improve a retriever's query reformulation and an answer generator simultaneously.

**Works without model weights.** All optimization happens through the model's API. You can optimize GPT-5 or Claude without touching weights.

**Composable with other optimizers.** GEPA integrates as `dspy.GEPA`, MIPRO handles instruction search, BootstrapFewShot handles demonstration selection. You can combine them.

**Small data requirements.** BootstrapFewShot works with 10-20 examples. GEPA claims functional results with as few as 3.

## Limitations

**Concrete failure mode:** The metric you provide to the compiler determines everything. If your metric has blind spots, DSPy will optimize into them. The context compression experiment in [source](../../raw/repos/laurian-context-compression-experiments-2508.md) showed one variant (iteration 42) achieving high score by being extremely verbose, including domain-specific jargon from the training set that wouldn't generalize. The Pareto frontier helps, but metric gaming is real and the documentation doesn't give practitioners clear guidance on metric design.

**Unspoken infrastructure assumption:** Compilation runs many LLM calls. MIPROv2 and GEPA on non-trivial programs can cost hundreds of dollars in API fees for a single compilation run. The documentation gives example budgets (e.g., `max_metric_calls=150` for GEPA) but doesn't surface cumulative cost prominently. Teams treating compilation as a cheap development step will hit surprises.

**Prompt opacity at runtime.** Compiled programs embed long, auto-generated instruction text. When a compiled program behaves unexpectedly in production, debugging means reading multi-paragraph machine-generated prompts that weren't designed for human comprehension.

**Signature rigidity.** Signatures define input/output fields at class definition time. Pipelines with dynamic or conditional output structure (e.g., function calling with variable tool sets) require workarounds.

## When Not to Use It

Skip DSPy when:

- You have a single-step task with no need for evaluation-driven optimization. A well-crafted manual prompt will ship faster.
- Your team lacks the ability to write a reliable metric function. DSPy without a good metric doesn't optimize toward anything useful.
- You're working with streaming outputs or need fine-grained control over token generation. DSPy's abstraction sits above that level.
- Compilation cost is prohibitive and you can't afford to re-optimize when the underlying model changes (which happens frequently with hosted APIs).

## Unresolved Questions

**Optimization stability across model versions.** When OpenAI or Anthropic updates a model, compiled programs may degrade. DSPy doesn't address how or when to recompile, or how to detect drift. The optimized prompts are static artifacts, but the models they target are not.

**Cost accounting at scale.** Neither the DSPy docs nor the GEPA integration surface per-compilation cost estimates for real programs. Practitioners report significant API spend during development but there's no tooling to predict or cap it before running.

**Optimizer selection guidance.** The framework offers multiple optimizers (BootstrapFewShot, MIPROv2, COPRO, GEPA) with overlapping use cases. The documentation doesn't provide clear decision criteria for which to use when, leaving practitioners to experiment.

**Governance of compiled programs.** A compiled DSPy program is a program plus embedded prompt text. It's unclear how teams should version, audit, or review these artifacts in regulated environments where prompt content matters for compliance.

## Alternatives

- **Manual prompt engineering**: Use when you have a single module, a clear task, and enough domain knowledge to write a good prompt. Faster iteration, full transparency.
- **GEPA standalone** (`pip install gepa`): Use when you want reflective prompt evolution without the full DSPy pipeline abstraction. Better for optimizing existing non-DSPy code or for `optimize_anything` use cases beyond prompt text.
- **TextGrad**: Use when you want gradient-style optimization with natural language feedback and your team is comfortable with longer iteration cycles. The context compression experiment showed TextGrad producing higher raw success rates than GEPA alone, with hybrid approaches reaching 100%.
- **LangChain/LangGraph**: Use when you need a larger ecosystem of integrations and are building for operational flexibility over optimization. DSPy optimizes; LangChain integrates.
- **Fine-tuning**: Use when you have thousands of examples and need consistent behavior at high volume. DSPy and fine-tuning compose well (DSPy can generate synthetic training data for fine-tuning runs).
