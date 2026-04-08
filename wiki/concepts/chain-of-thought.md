---
entity_id: chain-of-thought
type: approach
bucket: context-engineering
abstract: >-
  Chain-of-Thought prompting elicits intermediate reasoning steps from LLMs
  before final answers, improving accuracy on multi-step tasks; key
  differentiator is interleaving with tool calls in agentic variants.
sources:
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - repos/aiming-lab-agent0.md
  - tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md
related:
  - retrieval-augmented-generation
  - context-engineering
  - agent-memory
last_compiled: '2026-04-08T23:16:29.882Z'
---
# Chain-of-Thought

## What It Is

Chain-of-Thought (CoT) is a prompting technique that asks an LLM to produce intermediate reasoning steps before committing to a final answer. The core observation, from Wei et al. (2022), is simple: models make fewer errors on multi-step problems when forced to externalize their working. A prompt that ends with "Let's think step by step" can turn a wrong answer into a correct one, with no weight updates.

This is not a unified technique. CoT describes a family of related approaches that share one mechanism: structured intermediate text between input and output. The variants differ in who constructs the intermediate steps (the model or the human), whether there is one path or many, and whether reasoning interleaves with external actions.

The technique matters to the [Context Engineering](../concepts/context-engineering.md) space because it sits at the intersection of [Context Generation](../concepts/abductive-context.md) and [Agent Skills](../concepts/agent-skills.md): it shapes how reasoning occupies context, determines what gets passed to downstream steps, and defines how agents decide when to call tools.

## Core Variants

**Zero-shot CoT.** Appending "Let's think step by step" to a prompt. No demonstrations required. Works on models above ~100B parameters (Kojima et al., 2022). Unreliable on smaller models. The reasoning quality is unbounded -- the model can hallucinate steps confidently.

**Few-shot CoT.** Including worked examples with explicit reasoning traces in the prompt. More reliable than zero-shot but requires human-authored examples, which become stale if the task distribution shifts. The examples consume context budget.

**Self-consistency.** Sample multiple reasoning chains independently, then take a majority vote over final answers (Wang et al., 2022). Trades inference cost for accuracy. On GSM8K (grade school math), self-consistency with 40 samples outperforms single-chain CoT by ~17 percentage points. The cost scales linearly with sample count. Self-reported by the original authors; these numbers appear consistently across independent reproductions on standard benchmarks.

**Tree of Thought (ToT).** The model explicitly maintains a tree of reasoning states, evaluating branches and pruning dead ends. Useful for combinatorial search problems where greedy forward reasoning fails. Computationally expensive and hard to implement reliably -- the branching logic requires additional prompt engineering and the evaluation heuristics are task-specific.

**Graph of Thought.** Extends ToT by allowing arbitrary connections between reasoning nodes rather than strict parent-child relationships. More expressive but significantly harder to implement and evaluate. Research-stage.

**Long chain-of-thought (long CoT).** Associated with reasoning-specialized models like [OpenAI](../projects/openai.md)'s o-series and [Anthropic](../projects/anthropic.md)'s extended thinking modes. The model generates thousands of tokens of scratchpad reasoning, including backtracking and self-correction, before producing output. This is not a prompting technique in the classical sense -- it is a trained behavior where the model learns to use its scratchpad effectively. [GRPO](../concepts/grpo.md) and related RL methods train this behavior by rewarding correct final answers regardless of the path taken.

**Tool-integrated reasoning (ReAct variant).** The reasoning chain interleaves with external tool calls. The model reasons, decides it needs external information, calls a tool, observes the result, and continues reasoning. This is the foundation of [ReAct](../concepts/react.md) and is central to how modern agents work. See the ReAct entry for implementation details.

## How It Works

**The fundamental mechanism.** An LLM generates tokens autoregressively. Each token is conditioned on all preceding tokens. When the model produces reasoning steps before the answer, those steps become part of the conditioning context for the answer tokens. The model is, in effect, building a richer internal representation by writing it out.

This is why CoT works better with larger models: small models generate low-quality reasoning steps, which either contribute nothing or mislead subsequent generation. The Wei et al. (2022) paper documents a "phase transition" -- below roughly 100B parameters, CoT hurts or is neutral. Above that threshold, it helps consistently. The threshold has shifted downward as models have improved; current 7B-class models benefit from CoT on many tasks.

**Why intermediate steps help.** Multi-step problems require intermediate results that exceed what a single forward pass can reliably compute. Arithmetic: multiplying two 3-digit numbers in one step is hard; showing the work makes each multiplication tractable. Logical deduction: tracking which premises have been applied is hard without notes; writing them down makes the state visible. CoT externalizes working memory into the context window.

**Self-consistency as variance reduction.** Multiple samples from the same prompt give different reasoning paths to potentially the same or different answers. Majority voting reduces variance. The reasoning paths that agree on an answer tend to be more reliable than any single path. This works because errors in reasoning are not perfectly correlated across independent samples.

**Long CoT and backtracking.** In trained long-CoT models, the model can write "wait, that's wrong" and revise. This is not available in prompted CoT -- the model commits to each step as generated. The [Reflexion](../concepts/reflexion.md) framework achieves something similar by iterating across multiple attempts with verbal feedback, but Reflexion requires multiple inference calls, while long CoT does this within a single generation.

## Tool-Integrated Reasoning

The most operationally important variant for agent systems. The reasoning trace is not just text -- it includes structured action calls and observation results. A typical trace:

```
Thought: I need to find the current price of AAPL stock.
Action: search("AAPL stock price today")
Observation: AAPL is trading at $211.43 as of market close.
Thought: Now I can calculate the portfolio value.
Action: calculator("500 * 211.43")
Observation: 105715.0
Final answer: The portfolio is worth $105,715.
```

The reasoning steps inform which tool to call; tool results inform subsequent reasoning. This interleaving is the architecture behind most production agents. [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), and [AutoGen](../projects/autogen.md) all implement this pattern at the framework level.

The critical implementation detail: tool call decisions happen inside the reasoning trace. If the model's reasoning leads it to call a tool with incorrect arguments, the error propagates. There is no ground truth correction mechanism within a single chain -- which is why Reflexion-style iteration matters.

## Implementation Details

**Prompting for CoT.** Few-shot examples should include diverse reasoning paths, not just correct answers. Include at least one example where a naive approach fails and the step-by-step approach succeeds. This anchors the model to the purpose of reasoning.

**Context budget.** CoT trades tokens for accuracy. On a 128K context window, a 5,000-token reasoning trace is cheap. On an 8K window with a dense system prompt, it becomes constrained. The [Memento](../projects/memento.md) project addresses this directly: models trained with Memento compress completed reasoning blocks into dense summaries (mementos), reducing peak KV cache by 2-3x. This enables long CoT without context explosion in multi-turn agentic settings.

**Self-consistency implementation.** Generate N independent completions (temperature > 0). Parse each for the final answer. Take the mode. N=5 to 10 provides most of the benefit; N=40 is diminishing returns for most tasks. Cost scales linearly.

**Structured output compatibility.** CoT and structured JSON output are in tension. Some frameworks prompt for reasoning first, then structured output in a second pass. Others extract reasoning into a separate field. Neither approach is standard. If your pipeline requires both reasoning traces and structured output, test explicitly -- some models collapse the reasoning when forced into strict JSON schemas.

**Training CoT behavior.** [DSPy](../projects/dspy.md) can optimize CoT prompts programmatically, including which examples to include and how to structure reasoning instructions. [Synthetic Data Generation](../concepts/synthetic-data-generation.md) can produce CoT traces for fine-tuning, enabling smaller models to exhibit CoT behavior more reliably than prompting alone achieves.

## Failure Modes

**Confident wrong reasoning.** CoT does not guarantee correct reasoning. A model can produce a plausible-sounding step sequence that reaches a wrong answer. The reasoning is post-hoc rationalization as often as it is genuine computation. Zero-shot CoT is particularly prone to this: without examples, the model has no constraint on what "thinking step by step" means.

**Propagation errors.** In multi-step chains, an error in step 3 propagates to all subsequent steps. Unlike self-consistency (which samples independently), a single linear chain has no recovery mechanism once it goes wrong.

**Context poisoning in tool-integrated reasoning.** If a tool returns incorrect or adversarial content, the model may incorporate that content into its reasoning as fact. The reasoning trace becomes contaminated. This is a concrete security concern for agents that call external APIs or search the web.

**Length gaming in trained models.** Long CoT models trained with outcome-based RL sometimes learn to produce long reasoning traces that do not correspond to genuine computation -- the length is a proxy signal the model optimizes rather than a means to accuracy. This is not well-characterized in the literature yet.

**Cascading in multi-agent systems.** In [Multi-Agent Systems](../concepts/multi-agent-systems.md), one agent's flawed CoT trace can be passed as context to another agent, which reasons from incorrect premises without questioning them. This is documented as a failure mode in the [Context Engineering](../concepts/context-engineering.md) survey but without specific mitigation strategies.

## When Not to Use It

**Tasks that do not require multi-step reasoning.** Classification, extraction from structured data, and simple lookup tasks do not benefit from CoT. The extra tokens waste context budget and latency with no accuracy gain.

**Latency-critical applications.** CoT adds tokens and therefore time. For real-time use cases (voice interfaces, sub-second response requirements), CoT is often the wrong tradeoff. Consider whether the accuracy gain justifies the latency cost.

**Small models without capability.** Models below roughly 7B parameters (current generation) rarely benefit from CoT prompting. They generate low-quality reasoning steps. Fine-tuning on CoT traces can help, but prompting alone may hurt accuracy. Test empirically; the threshold depends on the model family and task.

**When evaluation is unreliable.** The [Reflexion](../concepts/reflexion.md) ablation showed that self-reflection without reliable feedback signals can reduce accuracy by 8 percentage points. The same applies to CoT: if you have no way to verify whether the reasoning steps are correct, CoT gives false confidence without accuracy improvement. This matters most in open-ended generation tasks where there is no ground truth.

## Relationship to Other Concepts

CoT is one mechanism within [Context Engineering](../concepts/context-engineering.md)'s broader taxonomy. The survey formalizes context as C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query). CoT operates primarily on c_state (the evolving reasoning state) and determines the structure of information that flows between steps.

[ReAct](../concepts/react.md) is tool-integrated CoT. [Reflexion](../concepts/reflexion.md) applies CoT-style verbal analysis to failure diagnosis across multiple attempts. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) uses CoT to decide what to retrieve and how to synthesize results. [Agent Memory](../concepts/agent-memory.md) systems record CoT traces as [Episodic Memory](../concepts/episodic-memory.md) for later retrieval.

The [Context Compression](../concepts/context-compression.md) and Memento work directly address CoT's primary cost: long reasoning traces consume context. Memento's 2-3x KV cache reduction makes long CoT viable for multi-turn agents that would otherwise exhaust their context window.

[Self-Improving Agents](../concepts/self-improving-agents.md) use CoT traces as training data for subsequent fine-tuning rounds. [Agent0](../projects/agent0.md)'s self-evolving framework generates CoT traces through tool-integrated reasoning, then uses those traces to train improved models with no human annotation. This closes the loop: CoT enables capable reasoning, capable reasoning generates high-quality traces, high-quality traces improve future CoT quality.

## Unresolved Questions

**When does the model actually reason vs. rationalize?** The mechanistic question of whether CoT tokens cause better final answers or simply correlate with them (because models that would get the answer right also generate plausible reasoning) remains open. Causal interventions -- corrupting reasoning steps and measuring answer quality -- suggest both effects are real, but the proportions are unclear.

**Optimal reasoning trace length.** For long CoT trained models, there is no established guidance on how long reasoning should be for a given problem difficulty. Some models pad reasoning unnecessarily; others underinvest. The relationship between trace length and accuracy is not monotonic.

**Interoperability of CoT traces across models.** Reasoning traces generated by one model and used as context for another (as in [Multi-Agent Systems](../concepts/multi-agent-systems.md)) may not transfer cleanly. The Memento paper notes that SFT on traces from a different model causes accuracy drops even before compression is applied. Cross-model reasoning trace compatibility is not characterized.

**CoT in production at scale.** Self-consistency at N=40 samples multiplies inference cost 40x. Most published results are on benchmarks; production deployments with cost constraints rarely publish the tradeoffs they accept. Whether self-consistency is viable in high-volume production systems is largely unreported.

## Alternatives

**Direct prompting.** Skip CoT entirely. Appropriate for simple tasks, latency-sensitive applications, and tasks where the model already achieves ceiling accuracy.

**[ReAct](../concepts/react.md)** when reasoning must interleave with tool use. ReAct is CoT for agentic settings; prefer it over vanilla CoT when the task requires external information or action execution.

**[Reflexion](../concepts/reflexion.md)** when a single reasoning chain is insufficient and you can afford multiple inference calls with verbal feedback between attempts.

**[DSPy](../projects/dspy.md)** when you want to optimize which CoT examples to include programmatically rather than hand-authoring them.

**Long CoT trained models** (o-series, Claude extended thinking) when the task is genuinely hard and you want the model to backtrack rather than commit to a linear chain. This requires model-level support, not just prompting.


## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — implements (0.5)
- [Context Engineering](../concepts/context-engineering.md) — implements (0.7)
- [Agent Memory](../concepts/agent-memory.md) — implements (0.5)
