---
entity_id: chain-of-thought
type: approach
bucket: context-engineering
abstract: >-
  Chain-of-Thought prompting instructs LLMs to generate explicit intermediate
  reasoning steps before answering, improving multi-step task performance by
  making computation visible and correctable.
sources:
  - repos/aiming-lab-agent0.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - context-engineering
  - agent-memory
  - retrieval-augmented-generation
  - react
last_compiled: '2026-04-08T02:59:16.047Z'
---
# Chain-of-Thought

## What It Is

Chain-of-thought (CoT) prompting elicits intermediate reasoning steps from a language model before it produces a final answer. Instead of asking a model to jump from question to answer, you ask it to "think through" the problem step by step. This makes the model's computation explicit and auditable, and it turns out that surfacing the reasoning process also improves accuracy on tasks that require it.

The technique was described formally in Wei et al. (2022) "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models," though the underlying idea appeared in earlier work on scratchpads. The core observation: for tasks like arithmetic, commonsense reasoning, and symbolic manipulation, adding a handful of worked examples with intermediate steps to the prompt caused large models to spontaneously produce similar step-by-step reasoning on new inputs. The same GPT-3 (540B parameters) that failed to solve a multi-step math word problem directly solved it correctly when given CoT examples. Smaller models showed little benefit, pointing to an emergent capability threshold around 100B parameters.

CoT sits at the intersection of [Context Engineering](../concepts/context-engineering.md) and [Agent Memory](../concepts/agent-memory.md) because it occupies context window space with reasoning traces that substitute for internal computation the model cannot perform in a single forward pass. Understanding when and how to use it requires understanding that tradeoff.

## Why It Matters

Three reasons CoT matters practically:

**It makes multi-step reasoning tractable.** Models cannot hold arbitrarily complex state across a single forward pass. Externalizing intermediate results to the context window lets the model build on those results in subsequent steps, effectively using the context as working memory. This is why CoT works on arithmetic: the model can "write down" a partial result rather than holding it implicitly.

**It shifts the bottleneck from generation to comprehension.** The survey in [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) identifies a fundamental asymmetry: LLMs understand complex context far better than they can generate equally sophisticated outputs. CoT exploits this by breaking generation into smaller, more tractable chunks. Each step is a simpler generation problem than producing the final answer directly.

**It enables verification and error correction.** When reasoning is explicit, you can check it. Users, downstream systems, and the model itself can identify where a chain goes wrong. [Reflexion](../concepts/reflexion.md) builds on this directly: it stores self-reflection on failed reasoning traces in episodic memory, providing verbal feedback that improves subsequent attempts by 8-12 percentage points over simply remembering that a prior attempt failed.

## How It Works

### The Basic Mechanism

**Few-shot CoT:** Include 3-8 examples in the prompt where each example shows both the reasoning chain and the final answer. The model learns the format from examples and applies it to new inputs. Example structure:

```
Q: Roger has 5 tennis balls. He buys 2 more cans of 3 balls each. How many does he have?
A: Roger starts with 5 balls. 2 cans of 3 balls each is 6 balls. 5 + 6 = 11. The answer is 11.

Q: [New question]
A: [Model generates reasoning chain, then answer]
```

**Zero-shot CoT:** Kojima et al. (2022) showed that appending "Let's think step by step" to a prompt, without any examples, substantially improves performance. This finding was significant because it demonstrated that the capability is latent in sufficiently large models, not learned from demonstration format. The phrase serves as a mode-switch signal.

**Self-consistency:** Wang et al. (2022) extended CoT by sampling multiple independent reasoning chains and taking a majority vote on the final answers. Self-consistency consistently improves over greedy single-chain CoT by 1-17 percentage points on arithmetic and commonsense benchmarks, because diversity in reasoning paths surfaces the correct answer even when individual chains make errors.

### Structural Variants

The basic linear chain has spawned a family of more complex structures:

**Tree of Thought (ToT):** Yao et al. (2023) frames reasoning as tree search. The model generates multiple candidate next steps at each decision point, evaluates them, and selectively expands promising branches. This enables backtracking, which linear CoT cannot do. Effective for tasks with discrete structure like game-playing and creative writing where some branches are clearly wrong. Computationally expensive: requires many LLM calls.

**Graph of Thought:** Extends ToT to allow arbitrary graph connections between thoughts, enabling the model to synthesize across branches. Adds implementation complexity with limited empirical evidence of consistent improvement over ToT on standard benchmarks.

**Program of Thought / Program-aided Language Models (PAL):** Rather than natural language reasoning steps, the model generates code that is then executed by an interpreter. The interpreter handles arithmetic and symbolic manipulation reliably, eliminating one of CoT's main failure modes (arithmetic errors within the chain). Strong for quantitative tasks; requires a code execution environment.

**ReAct:** [ReAct](../concepts/react.md) interleaves reasoning traces with tool actions (search, calculator, API calls). Each action yields an observation, which feeds back into the next reasoning step. This extends CoT beyond pure internal reasoning to handle tasks requiring external information retrieval.

### Training-Time vs. Inference-Time CoT

The original CoT papers treat reasoning steps as a prompting technique applied at inference time. A parallel development treats long reasoning chains as training data:

**Reasoning-trained models** (OpenAI o1/o3, Anthropic Claude 3.7 Sonnet with extended thinking, DeepSeek-R1) are fine-tuned or trained with reinforcement learning on problems where longer internal reasoning chains produce better outcomes. These models generate reasoning tokens that are sometimes hidden from the user but visible to the model during generation. The [GRPO](../concepts/grpo.md) training algorithm is used in some of these systems to optimize for correct final answers without requiring step-level supervision.

This distinction matters for practitioners: prompting-based CoT is universally available but model-dependent; training-based reasoning is baked into specific model variants and not user-configurable.

### Implementation in Agent Systems

In [Context Engineering](../concepts/context-engineering.md) terms, CoT reasoning traces are a form of the `c_state` component, dynamic state that the model generates and conditions subsequent generation on. The survey formalizes this: `C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)`, where the reasoning trace occupies `c_state`.

In agent loops, CoT typically appears in two places:

1. **Planning:** The agent reasons through a multi-step task before beginning execution, producing a plan as a structured reasoning trace.
2. **Per-step reasoning:** Before each action, the agent reasons about the current state and what to do next (the pattern [ReAct](../concepts/react.md) codifies).

[Reflexion](../concepts/reflexion.md) adds a third location: after failure, the evaluator prompts the model to reason about *why* it failed. This post-hoc reasoning stored in [Episodic Memory](../concepts/episodic-memory.md) produced 91% pass@1 on HumanEval versus GPT-4's 80%. The reflection mechanism is architecturally simple: one additional LLM call per retry, with the output appended to the memory buffer for subsequent attempts.

[DSPy](../projects/dspy.md) treats reasoning steps as learnable prompt components, automatically optimizing few-shot CoT examples and chain structure for a target task. This addresses one of CoT's manual burdens: crafting good example chains requires effort proportional to task complexity.

## Key Numbers

Accuracy gains from CoT are task-dependent and model-dependent. From Wei et al. (2022) on PaLM 540B:

- GSM8K (grade school math): from ~17% to ~58% with few-shot CoT (self-reported)
- SVAMP (adversarial math): from ~65% to ~79% (self-reported)
- StrategyQA (commonsense): from ~73% to ~76% (modest; task is less chain-dependent)

Self-consistency on GPT-3 code-davinci-002:
- GSM8K: 78% with self-consistency vs 63% with greedy CoT (self-reported, Wang et al. 2022)

Reflexion on HumanEval (Python, GPT-4 backbone):
- 91% pass@1 vs 80.1% without Reflexion (self-reported, Shinn et al. 2023 per [Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md))

These numbers are largely self-reported by paper authors. Independent replication has generally confirmed the qualitative finding (CoT helps on multi-step reasoning) but exact numbers vary with model versions and evaluation details.

One well-established finding, replicated across many groups: CoT provides near-zero benefit on models below roughly 100B parameters. This has been confirmed independently enough to treat as reliable.

## Strengths

**Reliable improvement on decomposable tasks.** Any task that decomposes into a sequence of subtasks where getting each subtask right contributes to getting the whole task right benefits from CoT. Mathematical reasoning, multi-hop question answering, code debugging, and planning all fit this pattern.

**Interpretability as a byproduct.** The reasoning trace tells you *how* the model arrived at an answer. This is practically valuable: you can often spot errors in the chain before checking the final answer, and you can use chain quality as a signal for output reliability. An incoherent reasoning chain is a red flag even if the final answer looks correct.

**No training required.** Prompting-based CoT works on any sufficiently large model with no fine-tuning. You can layer it onto existing inference infrastructure.

**Composability with other techniques.** CoT pairs well with retrieval (retrieve relevant context, then reason over it), tool use (reason about what tool to call, call it, reason about the result), and self-correction (reason about why a prior attempt failed). The [ReAct](../concepts/react.md) pattern is just CoT with tool calls inserted into the chain.

## Limitations

**Token cost scales with chain length.** Each reasoning step consumes tokens both during generation and as context for subsequent steps. For long chains or many parallel self-consistency samples, this becomes expensive quickly. A 40-step reasoning chain might use 10x the tokens of direct generation. At scale, this is a real infrastructure cost.

**Arithmetic errors within chains persist.** Even with CoT, models make arithmetic errors inside reasoning steps. PAL-style code execution removes this failure mode, but natural language chains do not. An error in step 3 of a 10-step chain typically propagates to an incorrect final answer, and the model rarely detects it.

**Quality depends on example quality.** Few-shot CoT is only as good as the examples provided. Poor examples lead to shallow, incorrect, or stylistically wrong reasoning chains. Constructing good few-shot CoT examples for a new domain requires non-trivial expertise and evaluation effort.

**Verbosity does not equal correctness.** A confident, fluent, detailed reasoning chain can be completely wrong. Users who interpret chain length or sophistication as a reliability signal will be misled. The ablation in [Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md) showed that self-reflection *without reliable evaluation signals* actually hurt performance by -8pp, because the model generated plausible-sounding but incorrect self-analysis.

**Concrete failure mode:** A model given a math problem writes a 6-step chain, makes an arithmetic error in step 2, correctly follows the flawed result through steps 3-6, and arrives at a confident wrong answer with a fully coherent-looking trace. Self-consistency helps but does not eliminate this because multiple chains may share the same systematic error pattern on problems where one operation is non-obvious.

**Unspoken infrastructure assumption:** CoT works best when outputs are deterministic or near-deterministic enough that self-consistency majority voting is meaningful. At high temperature (for creative tasks) or with very long chains where entropy accumulates, self-consistency degrades and the core verification mechanism breaks down.

## When NOT to Use It

**Simple lookup tasks.** If the task is factual retrieval with no multi-step reasoning requirement, CoT adds token cost without benefit and can introduce hallucinated reasoning steps that pull the model away from a direct correct answer.

**Latency-constrained production paths.** Chain generation takes time. An API with strict latency SLAs cannot absorb a 2-5x generation overhead for reasoning traces. Direct generation with a better prompt or retrieval is usually the right trade.

**Tasks requiring exploration over refinement.** The WebShop failure in Reflexion illustrates this directly: when the problem requires trying diverse strategies (searching with different query types, exploring a broad space), linear CoT locks the model into incremental refinement of whatever approach it starts with. It cannot backtrack or try fundamentally different approaches without tree-structured variants that are much more expensive.

**Very small models.** Below the emergent capability threshold (roughly sub-70B for most benchmarks), CoT provides no reliable benefit. Using CoT with a small model wastes tokens.

## Relationship to Related Concepts

CoT is listed as `part_of` [Context Engineering](../concepts/context-engineering.md) because it is a specific strategy for how to use context window space. The survey's six-component model (`c_instr, c_know, c_tools, c_mem, c_state, c_query`) places reasoning traces under `c_state`.

It is `part_of` [Agent Memory](../concepts/agent-memory.md) in the sense that reasoning traces within a session serve as working memory, and stored reflection traces (as in Reflexion) serve as [Episodic Memory](../concepts/episodic-memory.md) across attempts.

It is `part_of` [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) indirectly: RAG systems often use CoT to reason over retrieved context, and agentic RAG uses ReAct-style chains to decide *what* to retrieve.

[ReAct](../concepts/react.md) extends CoT by adding action steps. Where CoT produces `Thought → Answer`, ReAct produces `Thought → Action → Observation → Thought → Action → ...`. The reasoning mechanism is the same; ReAct adds the tool call/observe loop.

## Alternatives

**Direct prompting:** For simple tasks, a well-crafted direct prompt outperforms CoT by being faster and cheaper. Use when the task has no meaningful intermediate steps.

**PAL / code generation:** Generates executable code instead of natural language reasoning. Stronger for quantitative tasks because execution handles arithmetic reliably. Use when arithmetic correctness matters more than interpretability in natural language.

**[ReAct](../concepts/react.md):** Use when tasks require information from external sources mid-reasoning. ReAct adds tool calls into the chain at appropriate points.

**[DSPy](../projects/dspy.md):** Automates construction and optimization of prompting pipelines including CoT examples. Use when you want to optimize CoT for a specific task without manual example engineering.

**Reasoning-specialized model variants:** OpenAI o3, Anthropic Claude with extended thinking. Use when chain quality matters more than latency or cost, and you want training-time rather than prompting-time optimization. The reasoning is internal and partially optimized, not user-configurable.

**[Reflexion](../concepts/reflexion.md):** Use when your agent operates in a trial-and-error loop and you want it to learn from failures within a session without fine-tuning. Adds one LLM call per retry; provides 4-12pp improvement on tasks with reliable evaluation signals.

## Unresolved Questions

**Optimal chain length.** There is no principled guidance on how many steps a reasoning chain should contain for a given problem complexity. Too short and the model skips important steps; too long and the model fills space with low-value elaboration or introduces error. Practitioners tune this empirically.

**When does reasoning actually help vs. when does it just look like helping?** Some work suggests that on certain tasks, CoT provides surface-level plausibility to an answer the model would have given anyway, rather than genuinely altering the computational process. Distinguishing these cases is an open research question.

**Token cost at production scale.** The literature reports accuracy gains but rarely discusses total token cost per query at production volume. A system running 10M queries/day with 4x CoT overhead versus direct generation has substantially different infrastructure costs. This is rarely acknowledged in benchmark papers.

**Conflict resolution across self-consistency samples.** Self-consistency takes a majority vote, but some tasks have non-binary outcomes where majority voting is poorly defined. How to aggregate diverse chains for open-ended generation is not settled.


## Related

- [Context Engineering](../concepts/context-engineering.md) — part_of (0.7)
- [Agent Memory](../concepts/agent-memory.md) — part_of (0.5)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.5)
- [ReAct](../concepts/react.md) — extends (0.7)
