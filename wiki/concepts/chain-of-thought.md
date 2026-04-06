---
entity_id: chain-of-thought
type: approach
bucket: context-engineering
abstract: >-
  Chain-of-Thought prompting elicits intermediate reasoning steps from LLMs
  before a final answer, improving accuracy on multi-step problems by making the
  model's reasoning process explicit in the context window.
sources:
  - repos/aiming-lab-agent0.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related: []
last_compiled: '2026-04-06T02:14:10.472Z'
---
# Chain-of-Thought

## What It Is

Chain-of-Thought (CoT) is a prompting technique where an LLM generates a sequence of intermediate reasoning steps before producing a final answer. The core idea: complex problems become tractable when decomposed into explicit, sequential sub-steps that the model can both generate and condition on.

The original formulation, from Wei et al. (2022), showed that adding the phrase "Let's think step by step" to a prompt, or providing a few worked examples with explicit reasoning traces, caused models to generate their own reasoning chains before answering. This dramatically improved performance on arithmetic, symbolic, and commonsense reasoning tasks where direct answer generation failed.

What distinguishes CoT from basic prompting is not just the instruction to think carefully — it is that the reasoning occupies the context window as actual tokens, making intermediate conclusions available to the model when it generates subsequent steps. The model attends to its own prior reasoning, compressing a potentially complex computation into a series of simpler steps that fit within the distribution of text patterns learned during training.

## How It Works

### The Mechanics of Intermediate Tokens

In a standard prompt-and-answer exchange, the model must map from the problem directly to a final answer in a single forward pass. For problems requiring multiple reasoning steps, this compresses all computation into the final token prediction, which overwhelms the model's in-context working memory.

CoT breaks this by treating reasoning as text generation. When the model writes "Step 1: convert miles to kilometers, 5 miles × 1.6 = 8 km," that text enters the context. The next step conditions on it. Each intermediate conclusion is now available as attended context, not merely as a latent representation.

This aligns with how the context engineering framework models reasoning: CoT occupies the `c_know` and `c_state` slots dynamically, filling the context window with self-generated knowledge. The [Context Engineering](../concepts/context-engineering.md) survey formalizes this as a component of context processing — the model transforms its own context through generation.

### Variants

**Zero-shot CoT** appends "Let's think step by step" to the user prompt. No examples needed. Effective on capable models; unreliable on smaller ones.

**Few-shot CoT** provides several worked examples with full reasoning traces before the target question. More reliable but requires careful example selection — poorly chosen examples can introduce reasoning patterns that generalize badly.

**Self-consistency CoT** samples multiple reasoning chains for the same question and returns the majority answer. Compensates for variance in any single chain. Requires 10–40 samples, so costs 10–40x more at inference. Provides verified accuracy improvement on reasoning benchmarks over single-chain CoT.

**Tree-of-Thought (ToT)** extends CoT from linear chains to branching search trees. The model generates multiple candidate reasoning steps at each node, evaluates them, and prunes unpromising branches. More powerful than CoT on problems requiring search or backtracking, but substantially harder to implement and slower.

**Graph-of-Thought (GoT)** further generalizes to arbitrary directed graphs, allowing reasoning paths to merge (synthesis) and split (decomposition). Rarely used in production due to implementation complexity.

**Least-to-Most Prompting** decomposes a problem into sub-problems explicitly before solving them — a structured variant of CoT that works well on problems with clear hierarchical structure.

**Program-of-Thought / ReAct** externalizes computation by generating code or tool calls as reasoning steps. The model writes Python to compute an intermediate result, executes it, and uses the output as a reasoning step. This directly addresses CoT's core failure mode: factual or computational errors within the reasoning chain.

### Relationship to [ReAct](../concepts/react.md)

ReAct is CoT with tool calls interleaved. Instead of reasoning steps that are pure text, the model can emit `Action: search("...")` or `Action: calculator(...)`, execute them, and incorporate the results as observations. This grounds the reasoning chain in external state, preventing the model from hallucinating intermediate facts. ReAct is the standard CoT variant for agent systems because it eliminates the problem of compounding errors in long chains.

### Why It Emergently Works

CoT requires a model large enough to leverage it — empirically, the capability emerges sharply around the 100B parameter range for the original Wei et al. results, though smaller fine-tuned models now show CoT gains at much lower parameter counts. The mechanism is debated:

One view: CoT works because it increases effective computation depth. More tokens generated means more sequential transformer operations, which in some sense approximates deeper computation.

A competing view: CoT works because training data contains many instances of step-by-step reasoning (worked math problems, tutorial explanations, logical arguments). The model pattern-matches to these formats and inherits their structure.

Both are likely partially correct. The practical implication either way: CoT is a prompt-level intervention, not a training intervention, and its effectiveness degrades when the model must reason about problems dissimilar from its training distribution.

## Relationship to Related Techniques

**[Reflexion](../concepts/reflexion.md)** extends CoT by adding a self-reflection loop: after a failed attempt, the model generates a verbal critique of its own reasoning chain, stores that critique in episodic memory, and uses it to guide a revised chain on the next attempt. This turns CoT from a single-pass technique into an iterative learning mechanism without weight updates.

**[Task Decomposition](../concepts/task-decomposition.md)** treats CoT's chain structure as a planning mechanism: each step in the chain maps to a sub-task that may be executed by a different agent or tool. This is the architectural backbone of multi-agent orchestration in systems like [LangGraph](../projects/langgraph.md) and [CrewAI](../projects/crewai.md).

**[DSPy](../projects/dspy.md)** automates CoT prompt optimization. Rather than hand-crafting reasoning examples, DSPy treats the few-shot examples and prompt template as learnable parameters, using a training set to compile effective prompts. CoT-with-DSPy replaces hand-engineering with programmatic optimization.

**[Prompt Compression](../concepts/prompt-compression.md)** intersects with CoT in a tension: long reasoning chains consume context budget. Systems must choose between full-fidelity reasoning (more tokens, more accurate) and compressed representations (fewer tokens, potential information loss). The context engineering survey's asymmetry finding — models comprehend better than they generate — suggests that spending tokens on explicit reasoning is often worth the cost.

## Performance Evidence

The original Wei et al. results on GPT-3 (540B PaLM) showed CoT improving accuracy from 18% to 57% on GSM8K and from 29% to 54% on SVAMP — large gains on math word problems where baseline prompting failed. These results are from the original paper's own evaluation (self-reported), but have been extensively reproduced and extended across labs.

Self-consistency CoT on GPT-3 reached 78.0% on GSM8K vs 46.9% for zero-shot CoT. These numbers come from Wang et al. (2023) and have been independently validated in follow-on work.

The Reflexion paper showed that GPT-4 with ReAct-style CoT plus self-reflection reached 91% pass@1 on HumanEval, vs 80.1% for GPT-4 alone. This is self-reported but the HumanEval benchmark is standardized and results are reproducible.

Across benchmarks, CoT provides consistent improvement on tasks requiring multi-step reasoning (arithmetic, logical deduction, multi-hop question answering) and near-zero benefit on tasks answerable in a single step. This boundary is the clearest selection criterion for when to apply CoT.

## Strengths

**No training required.** CoT is a purely inference-time intervention. Any model can be prompted with CoT without fine-tuning, though benefit scales with model capability.

**Interpretable failure modes.** The reasoning chain is visible. When the model makes an error, you can identify at which step it went wrong. This dramatically simplifies debugging compared to systems where reasoning is implicit.

**Composable with other techniques.** CoT is the reasoning primitive that other methods extend: Reflexion adds self-correction, ReAct adds tool use, ToT adds search, self-consistency adds voting. It is the most versatile single technique in the prompting toolkit.

**Scales with model capability.** As foundation models improve, CoT chains become more accurate, enabling progressively harder problems to be tackled without changing the prompt structure.

## Limitations

### Compounding Errors

Each step in a CoT chain conditions on all prior steps. An error at step 3 propagates to steps 4, 5, 6. For long chains (10+ steps), this compounding becomes a serious reliability problem — the final answer depends on a product of per-step accuracies. If each step is 90% accurate over 10 steps, the chain produces a correct answer roughly 35% of the time.

The mitigation is tool use (ReAct) for computations the model is unreliable at, and self-consistency for high-stakes answers. Neither is free: ReAct requires tool infrastructure; self-consistency multiplies inference cost.

### Confabulation Within Chains

The model can generate reasoning steps that are internally coherent but factually wrong. The chain "A → B → C" may be logically valid while A is false. Without grounding to external facts (via retrieval or tool calls), CoT reasoning chains cannot be trusted for fact-sensitive domains. [RAG](../concepts/rag.md) addresses the knowledge grounding problem; CoT addresses the reasoning structure problem. Neither addresses the other's failure mode alone.

### Verbosity and Context Budget

Explicit reasoning chains consume context tokens that could hold retrieved documents, examples, or other information. For a 128K token context window, a 3000-token reasoning chain is a small fraction, but in agents with many tool call results, memory contents, and system instructions, reasoning token cost is a real budget consideration. [Prompt Compression](../concepts/prompt-compression.md) can reduce reasoning verbosity post-hoc, though this risks losing critical intermediate conclusions.

### Sensitive to Example Quality in Few-Shot Settings

Few-shot CoT examples that contain systematic errors or inappropriate reasoning styles transfer those patterns to the model's generations. Example selection is non-trivial: examples should match the reasoning style required by the target problem, not just the domain. Poorly chosen examples can make performance worse than zero-shot.

### Does Not Help Simple Tasks

CoT adds latency and token cost. For single-step retrieval, classification, or extraction tasks, it provides no accuracy benefit and slows response time. The overhead of generating a reasoning chain before a trivial answer is pure waste.

## When Not to Use CoT

Skip CoT when:

- The task requires a single lookup or classification with no multi-step reasoning (e.g., named entity extraction, sentiment classification, direct retrieval).
- Latency is tightly constrained — CoT adds generation time proportional to chain length.
- The model is too small to benefit (sub-7B models often generate incoherent chains that hurt rather than help).
- The problem involves long-horizon factual recall where confabulation risk is high and tool grounding is unavailable.
- Cost is paramount and the task does not require high accuracy on reasoning-intensive problems.

Use CoT when tasks require planning, multi-step arithmetic, logical deduction, code synthesis, or multi-hop question answering. For agent systems handling complex, open-ended tasks, CoT (or its extensions ReAct and Reflexion) is the default reasoning mechanism.

## Unresolved Questions

**Optimal chain length is unknown.** The field has no principled method for determining how many reasoning steps a problem requires. Current practice: let the model decide, which can produce both unnecessarily long chains and prematurely short ones.

**Evaluation of chain quality vs. answer quality.** Research typically evaluates CoT by whether the final answer is correct, not whether the reasoning chain is valid. A model can produce a correct answer through an invalid chain (lucky guess) or an incorrect answer through a largely valid chain (single error in the last step). Measuring chain quality independently of answer accuracy remains an open methodological problem.

**Transferability across domains.** CoT shows strong gains on math and logical reasoning but inconsistent gains on tasks requiring common-sense reasoning about social situations or physical world dynamics. The conditions under which CoT transfers to new domains are not well characterized.

**Long-term memory integration.** Current CoT implementations are stateless across sessions. Combining CoT chains with persistent memory systems (as [Reflexion](../concepts/reflexion.md) attempts within a session, or as [Agent Memory](../concepts/agent-memory.md) systems attempt across sessions) remains an active research area without settled best practices.

## Alternatives and Selection Guidance

| Technique | Use when |
|---|---|
| Zero-shot CoT ("think step by step") | Quick experiments; capable model; no examples available |
| Few-shot CoT | High reliability needed; you can curate good reasoning examples |
| [ReAct](../concepts/react.md) | Agent tasks; external tool access; factual accuracy matters |
| Self-consistency CoT | High-stakes single queries; latency is acceptable; cost is not the constraint |
| [Reflexion](../concepts/reflexion.md) | Iterative agent tasks; failure recovery matters; session-level learning |
| [Task Decomposition](../concepts/task-decomposition.md) | Complex multi-agent pipelines; sub-tasks map to distinct capabilities |
| [DSPy](../projects/dspy.md) | Prompt optimization at scale; systematic evaluation data available |
| Direct prompting (no CoT) | Simple retrieval or classification; latency-sensitive production |
