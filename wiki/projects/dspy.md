---
entity_id: dspy
type: project
bucket: self-improving
abstract: >-
  DSPy replaces hand-written prompts and chains with declarative modules and
  automated optimization, compiling LLM pipelines through algorithms like MIPRO
  and GEPA that tune instructions and few-shot examples against a metric.
sources:
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/osu-nlp-group-hipporag.md
  - repos/laurian-context-compression-experiments-2508.md
related: []
last_compiled: '2026-04-08T23:11:04.745Z'
---
# DSPy

## What It Does

DSPy is a Python framework from Stanford NLP (led by Omar Khattab) that treats LLM pipelines as programs to be compiled rather than prompt strings to be hand-tuned. You write a pipeline using declarative `Signature` and `Module` abstractions, define a metric, and an optimizer (`teleprompter`) searches for instructions and few-shot examples that maximize that metric on your training data.

The key architectural claim: prompt engineering should be automated the same way hyperparameter tuning is automated in ML. You declare *what* your module should do (input/output fields with descriptions), run an optimizer, and the system figures out *how* to instruct the LLM to do it.

## Core Mechanism

### Signatures and Modules

A `Signature` describes a transformation:

```python
class SummarizeArticle(dspy.Signature):
    """Summarize a news article into one sentence."""
    article: str = dspy.InputField()
    summary: str = dspy.OutputField()
```

A `Module` wraps a signature with a reasoning strategy. Built-in modules include `Predict` (single call), `ChainOfThought` (adds a `reasoning` field before output), `ReAct` (tool-using agent loop), and `ProgramOfThought` (code generation + execution). Modules compose like PyTorch layers -- you can nest them, and the optimizer treats the whole program as the unit to optimize.

Internally, each `Predict` call constructs a prompt by concatenating: (1) field descriptions from the signature, (2) few-shot demonstrations, and (3) the current input. The compiled instructions appear as a system-level prefix. All of this is generated and mutated by the optimizer, not by you.

### Optimizers

DSPy's optimizers (in `dspy/teleprompt/`) are the substantive contribution. The main ones:

**BootstrapFewShot** (`bootstrap_fewshot.py`) -- Runs the unoptimized program on training examples, keeps traces that pass the metric, and uses passing traces as few-shot demonstrations. Cheap but limited: it can only select from demonstrations, not improve instructions.

**MIPRO / MIPROv2** (`mipro_optimizer_v2.py`) -- The current default optimizer. Uses Bayesian optimization over a discrete search space. Generates candidate instruction sets (by prompting an LLM to propose variations), evaluates them on a dev set using a surrogate model, and selects the Pareto-optimal configuration. Requires more budget (hundreds of LLM calls) but consistently outperforms bootstrap-only approaches.

**GEPA** (`gepa/gepa.py`) -- Integrates the [GEPA](../concepts/gepa.md) genetic-Pareto optimizer. Uses LLM-readable execution traces as feedback (called Actionable Side Information), enabling the optimizer to diagnose *why* a candidate failed rather than just observing *that* it failed. Reported 35x fewer evaluations than GRPO to reach equivalent performance. Available as `dspy.GEPA`.

**BootstrapFinetune** -- Generates training data from traces and fine-tunes the underlying model weights. This crosses from prompt optimization into [Continual Learning](../concepts/continual-learning.md) territory.

### Compilation and Caching

`program.compile(trainset, metric, optimizer)` runs the optimization loop. Intermediate LLM calls are cached (configurable via `dspy.settings.configure(cache_turn_on=True)`) so restarts don't rerun completed evaluations. The compiled program's state -- optimized instructions and few-shot examples -- serializes to JSON via `program.save("path.json")` and loads back without re-running optimization.

The `LM` abstraction (`dspy/clients/lm.py`) wraps any LiteLLM-compatible model, so the same optimizer code works across OpenAI, Anthropic, local models via [Ollama](../projects/ollama.md), and self-hosted endpoints.

## Key Numbers

- **GitHub stars**: ~23k (as of mid-2025, self-reported via readme badges)
- **MIPRO on HotpotQA**: DSPy docs report ~15% improvement over hand-written prompts on multi-hop QA (self-reported, not independently replicated at scale)
- **GEPA on MATH**: 67% → 93% accuracy via full program optimization (reported in GEPA paper, accepted ICLR 2026)
- **GEPA vs GRPO**: 35x fewer rollouts for equivalent performance (self-reported in GEPA paper, formal analysis in arxiv:2507.19457)
- **Production context compression** ([source](../raw/repos/laurian-context-compression-experiments-2508.md)): DSPy GEPA optimization on a RAG context compression task recovered 62% of gpt-4o-mini failures from 0% baseline; hybrid with TextGrad reached 100% success rate on the test set

Most benchmark numbers in DSPy documentation are self-reported. Independent evaluations exist but are scattered across the research literature rather than consolidated.

## Strengths

**Separation of program logic from optimization** -- You can swap optimizers without touching your pipeline code. The same `ChainOfThought` module can be bootstrapped quickly for prototyping or MIPROv2-optimized for production.

**Metric-driven iteration** -- Optimization directly targets your application metric, not a proxy. If your metric is "customer support resolution rate," that's what gets maximized. This is a meaningful advantage over manual prompt tuning.

**Composability** -- Multi-step pipelines (retrieval → reasoning → answer) are optimized jointly. BootstrapFewShot can propagate credit from the final output back to select demonstrations for intermediate steps.

**Trace-based debugging** -- `dspy.inspect_history()` shows the full prompt, LLM response, and parsed output for recent calls. Easier than debugging raw API calls.

**GEPA integration** -- For pipelines where you can log diagnostic traces, GEPA makes optimization substantially more sample-efficient than alternatives.

## Critical Limitations

**Concrete failure mode: metric leakage**. MIPRO generates candidate instructions by prompting an LLM using your training examples. If your training set is small (under ~50 examples), the optimizer can overfit: it learns instructions that specifically invoke patterns present in the training data, which don't generalize. The resulting compiled program performs well on train/dev but drops on unseen inputs. DSPy doesn't warn about this; you discover it in production.

**Unspoken infrastructure assumption**: DSPy's optimization budget assumes cheap LLM calls. MIPRO with a 50-example dev set and 20 candidates runs ~1,000 LLM calls. At GPT-4o pricing, this costs $5-50 depending on context length -- manageable. With GPT-4 or Claude Opus on long documents, the same optimization can cost $200-500. The framework doesn't surface this before you run; you get the bill afterward. Production-scale optimization requires budgeting explicitly or using cheaper models for optimization that may not generalize to the production model.

## When NOT to Use It

**Single-call, well-defined tasks** -- If your pipeline is one LLM call with a stable task (classification, extraction with a schema), a well-written system prompt will likely perform as well as a compiled DSPy program and is far simpler to debug and maintain.

**Rapidly changing requirements** -- Each requirement change invalidates the compiled program. If your metric or task definition changes weekly, you're re-running optimization constantly. The overhead dominates.

**No labeled data** -- Optimization requires a training set with expected outputs or a programmatic metric. Without either, you can run BootstrapFewShot zero-shot, but you lose most of the optimization benefit.

**Latency-critical production** -- A compiled `ChainOfThought` module adds a reasoning step. If your p99 latency budget is tight, the extra tokens from compiled instructions and reasoning fields may push you over.

## Unresolved Questions

**Cross-model transfer**: Prompts compiled against GPT-4o-mini don't necessarily transfer to Claude 3.5 Sonnet or Llama 3.1 70B. The framework has no guidance on when compiled programs are model-specific vs. portable. Teams running multi-model pipelines face this in practice.

**Optimizer selection**: The docs suggest MIPRO as the default but don't provide guidance on when GEPA, BootstrapFewShot, or BootstrapFinetune outperforms it. The tradeoff depends on budget, data size, task type, and whether execution traces are available -- none of which the framework surfaces automatically.

**Cost at scale**: For pipelines processing millions of documents where the optimization cadence is monthly, what's the expected optimization cost and how does it scale with training set size? Not documented.

**Governance in multi-agent settings**: When a compiled DSPy module is a node in a larger [Multi-Agent System](../concepts/multi-agent-systems.md), updating that module's compiled instructions can shift behavior in downstream modules. There's no change management tooling for this.

## Alternatives

**[LangChain](../projects/langchain.md)** -- Richer ecosystem of integrations and tools, but prompt optimization is manual. Use LangChain when you need breadth of integrations and don't need automated prompt search.

**[LangGraph](../projects/langgraph.md)** -- Better for complex stateful agent graphs with explicit control flow. DSPy's optimizer is the differentiator; LangGraph's graph execution model is. Use LangGraph when your agent topology matters more than your prompt quality.

**[GEPA standalone](../concepts/gepa.md)** -- If your system isn't a DSPy pipeline, GEPA's `optimize_anything` API optimizes any text artifact against any evaluator. Use standalone GEPA when you're not already in the DSPy ecosystem.

**[Prompt Optimization](../concepts/prompt-optimization.md) via TextGrad** -- Gradient-based textual optimization. Lower iteration overhead than MIPRO on small datasets; the [context compression case study](../raw/repos/laurian-context-compression-experiments-2508.md) shows TextGrad outperforming GEPA alone (79% vs 62%) but their combination reaching 100%. Use TextGrad when you have a clear baseline prompt to refine rather than a module structure to discover.

**Manual prompt engineering** -- Still the right approach for one-off tasks, rapidly-evolving requirements, or when you have domain expertise that optimization is unlikely to discover. The overhead of DSPy's compilation loop is only worth paying when you expect the optimized program to run at scale.

## Related Concepts

- [Prompt Optimization](../concepts/prompt-optimization.md) -- The broader technique DSPy automates
- [Chain-of-Thought](../concepts/chain-of-thought.md) -- The reasoning strategy wrapped by `dspy.ChainOfThought`
- [GEPA](../concepts/gepa.md) -- The genetic-Pareto optimizer now integrated as `dspy.GEPA`
- [Self-Improving Agents](../concepts/self-improving-agents.md) -- DSPy compilation as a form of offline self-improvement
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) -- BootstrapFewShot generates training traces synthetically
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) -- A common DSPy use case; optimizers can tune both retrieval and generation steps jointly
