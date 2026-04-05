---
entity_id: chain-of-thought
type: approach
bucket: context-engineering
abstract: >-
  Chain-of-thought prompting elicits step-by-step reasoning from LLMs by
  inserting explicit reasoning traces into prompts or context, improving
  accuracy on multi-step tasks by giving the model a structured scratchpad
  before answering.
sources:
  - repos/aiming-lab-agent0.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Context Engineering
  - ReAct
last_compiled: '2026-04-05T20:35:37.849Z'
---
# Chain-of-Thought Prompting

## What It Is

Chain-of-thought (CoT) prompting inserts intermediate reasoning steps into an LLM's context before the final answer. Rather than asking a model to jump directly from question to answer, CoT asks it to "show its work." The insight is that the model's own generated text becomes part of its input context for subsequent tokens, so laying out reasoning steps explicitly improves the quality of the final answer.

The technique exists on a spectrum: few-shot CoT (Wei et al., 2022) provides worked examples with reasoning chains; zero-shot CoT ("Let's think step by step") elicits chains without examples; and structured CoT variants impose specific formats like numbered steps, XML tags, or code-style pseudocode. Within [Context Engineering](../concepts/context-engineering.md), CoT is one of the most fundamental context assembly strategies, occupying the `c_instr` and `c_know` slots in the formal model C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query) [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md).

## Why It Works: The Mechanism

CoT exploits autoregressive generation. Each generated token conditions all subsequent tokens, so tokens representing intermediate reasoning steps become context that steers the final answer token distribution. When a model writes "Step 1: convert 3 hours to minutes = 180 minutes," that text is now in the context window when it generates the answer. The scratchpad reduces the cognitive distance between question and answer.

This is not purely a prompting trick. Research distinguishes between:

- **Chain-of-thought reasoning**: Generating explicit natural language intermediate steps
- **Tree-of-thought reasoning**: Branching across multiple reasoning paths and selecting among them
- **Graph-of-thought reasoning**: Modeling dependencies between reasoning steps as a graph rather than a linear sequence

The survey taxonomy from [Mei et al.](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) positions these as progressively more sophisticated context retrieval and generation strategies, with CoT as the foundational case.

**Self-consistency** extends basic CoT by sampling multiple reasoning chains and selecting the most common final answer. This treats CoT generation as stochastic and aggregates over the uncertainty, typically improving accuracy 5-10 percentage points on arithmetic and commonsense benchmarks.

## Relationship to Other Techniques

### ReAct

[ReAct](../concepts/react.md) interleaves CoT-style reasoning with tool calls. The pattern alternates: Thought (natural language reasoning), Action (tool invocation), Observation (tool result), then repeat. The reasoning trace in ReAct is a direct application of CoT within an action loop. Without the reasoning steps, the model cannot plan which tool to call next; the chain grounds tool selection in explicit intermediate conclusions.

### Reflexion

[Reflexion](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md) extends CoT into a multi-trial feedback loop. The actor can use CoT or ReAct for each attempt. After failure, a self-reflection model generates verbal analysis of what went wrong. That analysis is stored in episodic memory and prepended to the next attempt's context. The critical ablation result: adding episodic memory alone (just remembering past attempts) improved HotPotQA accuracy from 61% to 63%; adding self-reflection (a CoT-style analysis of failures) raised it to 75%. The quality of the reasoning chain in the reflection step, not just the fact of remembering failures, drives performance.

### Long Chain-of-Thought

Long CoT (o1, o3, DeepSeek-R1, Qwen-QwQ) trains models to generate extended internal reasoning chains, sometimes thousands of tokens, before answering. The [Mei et al. survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) lists this under "contextual self-refinement." The distinction from standard CoT: long CoT models are trained specifically to reason this way, not just prompted. This makes the reasoning chain less controllable but more capable on hard logical and mathematical tasks.

## Implementation Details

**Few-shot CoT format**: Worked examples with reasoning annotated before the answer, typically 3-8 examples. Example positioning matters: examples at the end of the prompt (closest to the query) generally outperform examples at the start, because recency affects attention patterns in transformer architectures.

**Zero-shot CoT trigger phrases**: "Let's think step by step" is the canonical phrase. Variants like "Think carefully" or "Work through this step by step" perform similarly on most capable models. On weaker models, the specific phrasing matters more.

**Structured CoT**: Imposing format (numbered steps, XML tags like `<reasoning>...</reasoning>`, code blocks) makes chain content easier to parse programmatically and can improve consistency. Many production systems use structured CoT to extract intermediate results or to route based on reasoning content.

**CoT in system prompts**: Placing CoT instructions in the system prompt rather than the user turn shifts when the reasoning behavior is triggered. For agents handling diverse user requests, a system prompt directive like "Before answering, work through the problem step by step" applies CoT universally.

**Temperature during CoT generation**: CoT benefits from moderate temperature (0.3-0.7) to allow exploration while maintaining coherence. Self-consistency explicitly requires temperature > 0 to generate diverse chains.

## When CoT Helps

CoT provides the clearest gains on tasks where the answer depends on multiple sequential steps: arithmetic, logical deduction, multi-hop question answering, code debugging, and planning. For single-step factual retrieval ("What year was the Treaty of Westphalia signed?"), CoT adds no accuracy benefit and wastes tokens.

The [Mei et al. survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) identifies a critical asymmetry: LLMs are far better at understanding complex contexts than generating equally sophisticated outputs. CoT partially compensates for generation limitations by breaking output production into smaller steps, each easier to generate correctly.

Agent0's self-evolution results [Source](../raw/repos/aiming-lab-agent0.md) show CoT working in concert with tool use: the executor agent reasons through mathematical problems using chains before invoking computation tools, yielding +18% on mathematical benchmarks over the base model. The reasoning chain coordinates tool selection.

## Failure Modes

**Plausible but wrong chains**: Models generate grammatically and structurally sound reasoning chains that reach incorrect conclusions. The chain looks valid but contains a subtle error at step 3 that propagates. This is worse than direct answering in one respect: the flawed chain occupies context and primes the model toward its wrong conclusion, making correction harder.

**Sycophantic reasoning**: When user context or earlier conversation implies a particular answer, models sometimes construct post-hoc reasoning chains justifying that answer rather than reasoning toward the correct one. The chain is reverse-engineered from the desired conclusion.

**Verbosity without accuracy**: On tasks requiring creative exploration rather than incremental refinement, extensive reasoning chains do not help. The Reflexion paper's WebShop failure illustrates this: the agent generated detailed reflections but could not improve because the task required diverse search strategies, not careful step-by-step refinement. More chain does not equal better performance when the bottleneck is exploration breadth.

**Capability dependency**: Chain-of-thought is an emergent behavior. Weaker models do not reliably benefit from CoT prompting and can perform worse when forced to generate reasoning steps they are not capable of. The Reflexion ablation showed StarChat-beta gaining nothing from verbal self-reflection (0.26 baseline, 0.26 with Reflexion). The mechanism only works above a capability threshold, roughly GPT-3.5 class models and above.

**Context budget consumption**: Chains consume tokens. For multi-step agents operating in constrained context windows, extensive CoT leaves less room for retrieved knowledge, tool results, and conversation history. The optimization problem C = A(...) subject to |C| <= L_max applies directly: CoT occupies context budget that could hold other information.

## When NOT to Use CoT

Avoid CoT when:

- The task is single-step retrieval or classification with no intermediate reasoning required
- You are operating near the context window limit and cannot afford the token overhead
- The model is below the capability threshold where chains remain coherent (generally sub-3B parameter models without specific training)
- Latency is the primary constraint and the task does not require multi-step reasoning
- The task requires creative exploration rather than systematic refinement: CoT steers the model along a single reasoning path, which reduces diversity

## Unresolved Questions

**Verification**: How do you detect when a generated reasoning chain is wrong without executing the conclusion? For code, you can run tests. For natural language reasoning, you have no automatic verifier. Systems typically ignore chain correctness and only evaluate final answers.

**Chain length calibration**: No principled method exists for determining how long a reasoning chain should be for a given task. Too short and complex reasoning is compressed into unreliable steps; too long and the model generates padding that dilutes signal.

**Training vs. prompting**: As models trained on long CoT data (o1, R1) become standard, the distinction between "prompting for reasoning" and "model capability" blurs. Whether to prompt for CoT or rely on trained reasoning behavior is increasingly a model-selection question rather than a prompting question.

**Faithfulness**: Whether generated reasoning chains reflect the model's actual computational process or are post-hoc narratives remains debated. Mechanistic interpretability work suggests chains are partly confabulated, raising questions about how much to trust intermediate steps.

## Alternatives and Selection Guidance

**Use direct prompting** when the task is single-step and the model has sufficient parametric knowledge. Adding CoT overhead is waste.

**Use self-consistency** (multiple CoT samples + majority vote) when accuracy matters more than latency and cost, particularly for mathematical or logical tasks.

**Use ReAct** when the task requires external information or tool calls. CoT alone cannot access real-time data; ReAct integrates the reasoning chain with tool invocation.

**Use Reflexion** when the task is iterative and has an automatic evaluator (code execution, search result quality). Chain-of-thought within a self-reflection loop provides multi-trial improvement without model fine-tuning.

**Use long CoT models** (o3, R1) for hard reasoning tasks where maximal accuracy justifies high latency and cost. These models have trained reasoning behavior that typically outperforms prompted CoT on the same base.

**Use tree-of-thought or graph-of-thought** when the problem has multiple plausible solution paths and you want to explore branches before committing. CoT's linear structure cannot backtrack.

## Connections

- [Context Engineering](../concepts/context-engineering.md): CoT is a core context assembly strategy occupying instruction and reasoning slots
- [ReAct](../concepts/react.md): Interleaves CoT reasoning with tool actions; CoT is the reasoning component
- [Reflexion](../concepts/reflexion.md): Uses CoT-style analysis for self-reflection in multi-trial agent loops


## Related

- [Context Engineering](../concepts/context-engineering.md) — implements (0.7)
- [ReAct](../concepts/react.md) — part_of (0.6)
