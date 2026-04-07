---
entity_id: chain-of-thought
type: concept
bucket: context-engineering
abstract: >-
  Chain-of-Thought prompting instructs LLMs to produce explicit intermediate
  reasoning steps before answering, improving accuracy on multi-step tasks by
  allocating more computation to problem decomposition.
sources:
  - repos/aiming-lab-agent0.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - react
  - reflexion
  - agent-memory
  - task-decomposition
  - context-engineering
last_compiled: '2026-04-07T11:53:16.123Z'
---
# Chain-of-Thought (CoT)

## What It Is

Chain-of-Thought is a prompting technique where an LLM generates a sequence of intermediate reasoning steps before producing a final answer. Instead of mapping a question directly to an answer, the model produces a scratchpad — "let me work through this step by step" — that decomposes the problem into smaller inference moves. Wei et al. (2022) introduced the term in "Chain of thought prompting elicits reasoning in large language models," demonstrating that this technique substantially improved performance on arithmetic, commonsense, and symbolic reasoning benchmarks.

The core mechanism is forcing the model to allocate more computation to a problem. Transformers predict one token at a time. A model that jumps directly to an answer has one forward pass worth of computation available for the problem. A model that first generates a 200-token reasoning trace has 200 forward passes — each token can attend to all previous tokens and perform further transformation. CoT exploits this by making the model do its "thinking" in visible token space rather than implicitly inside a single decoding step.

## Why It Works: The Computational Account

Standard autoregressive generation produces each output token conditioned on the input and all previous output tokens. When CoT is applied, the model generates a reasoning chain R = (r₁, r₂, ..., rₙ) before the answer A. Each reasoning token rᵢ attends to the full context including all prior reasoning tokens, allowing the model to build on intermediate conclusions.

This gives CoT two distinct advantages:

**Error surface flattening.** Multi-step problems solved in a single decoding step require all the reasoning to happen inside the residual stream. A single incorrect "hidden" inference step silently contaminates the output. CoT externalizes each step, making it visible in the context for the model to condition subsequent reasoning on.

**Implicit verification.** The model's attention mechanism can catch contradictions between a stated reasoning step and the input, in a way that hidden computation cannot.

This also explains CoT's primary failure mode: the model can generate a plausible-sounding but factually wrong chain that leads confidently to the wrong answer. Generating text that "looks like reasoning" is not the same as performing correct reasoning.

## Core Variants

### Standard CoT (Few-Shot)
Provide 2–8 worked examples where each example includes the reasoning trace alongside the answer. Wei et al.'s original finding: this alone produces large accuracy gains on benchmarks like GSM8K (grade school math) and AquA (algebra word problems). The examples teach the model the expected reasoning format, problem decomposition style, and answer format simultaneously.

### Zero-Shot CoT
Append "Let's think step by step." to the prompt. Kojima et al. (2022) showed this single phrase suffices to elicit CoT behavior from large models without any worked examples. It works because modern models trained on reasoning-heavy corpora have already internalized CoT-like patterns; the phrase activates them. Zero-shot CoT is noisier than few-shot CoT but requires no example curation.

### Self-Consistency
Generate multiple independent reasoning chains (typically 10–40) with temperature > 0, then take the majority vote answer. Wang et al. (2022) showed this consistently improves on single-chain CoT by 2–10 percentage points on math and commonsense benchmarks. The intuition: if diverse reasoning paths converge on the same answer, that answer is more likely correct. Self-consistency does not require the individual chains to agree on intermediate steps — only on the final answer.

### Tree of Thoughts (ToT)
Yao et al. (2023) generalize CoT from a single linear chain to a tree of reasoning steps. The model generates multiple continuations at each step, evaluates them (via a separate prompt asking "is this reasoning path promising?"), and uses BFS or DFS to explore the tree. ToT enables backtracking, which standard CoT cannot do — once a reasoning step is generated, the model proceeds from it without revisiting. Effective for tasks with structured search spaces (puzzles, planning) but computationally expensive: a depth-5 BFS with branching factor 3 requires 3⁵ = 243 continuations.

### Graph of Thoughts (GoT)
Extends ToT by allowing arbitrary graph connections between reasoning nodes, enabling aggregation and merging of branches. More expressive than ToT but significantly harder to implement and control.

## Relationship to Other Agent Patterns

CoT underlies several more complex agent architectures:

**[ReAct](../concepts/react.md)** interleaves CoT reasoning traces with environment actions. The reasoning step (Thought) tells the model what to do next; the action step executes it; the observation feeds back into the next reasoning step. CoT is what makes the Thought step coherent rather than arbitrary.

**[Reflexion](../concepts/reflexion.md)** uses CoT as the mechanism for self-reflection. After a failed attempt, the model generates a CoT trace analyzing what went wrong and what to do differently. The Reflexion paper shows that self-reflection adds 12 percentage points beyond episodic memory alone on HotPotQA — the quality of CoT-style failure analysis is what drives improvement, not merely remembering that you failed. [Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

**[Task Decomposition](../concepts/task-decomposition.md)** frequently uses CoT as its decomposition mechanism. "What are the subgoals for achieving X?" with chain-of-thought produces more coherent subtask breakdowns than asking for a list directly.

**[Agent Memory](../concepts/agent-memory.md)** architectures store CoT traces as [Decision Traces](../concepts/decision-traces.md) — the reasoning chain becomes a record of why a decision was made, retrievable later for context.

**[Context Engineering](../concepts/context-engineering.md)** treats CoT as one component of the knowledge generation layer (c_know in the formal framework C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)). The survey framing: CoT is a way of generating reasoning context that the model uses to condition its final answer. [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

**[Retrieval-Augmented Generation](../concepts/rag.md)** pairs naturally with CoT: retrieve relevant documents, then use CoT to reason over them. Without CoT, models often retrieve correctly but fail to synthesize retrieved information. With CoT, the model can explicitly trace how retrieved facts combine into an answer.

**[DSPy](../projects/dspy.md)** treats CoT as an optimizable module. Its `dspy.ChainOfThought` module wraps the CoT pattern and allows automated prompt optimization over the reasoning format and examples.

## Capability Threshold

CoT is an emergent capability. Wei et al.'s original paper found that CoT produced no benefit on models below approximately 100B parameters; smaller models generated reasoning traces that were incoherent or counterproductive. This scaling threshold has shifted significantly since 2022 — instruction-tuned models like GPT-3.5, Claude, and Llama 3 8B now exhibit CoT-like behavior at much smaller scales because they were trained on reasoning-heavy data.

The pattern from [Reflexion](../concepts/reflexion.md) research confirms this dependency: StarChat-beta showed zero improvement from verbal self-reflection (which requires CoT-quality reasoning analysis), while GPT-3.5/4 showed substantial gains. Capability determines whether the model can produce coherent reasoning chains or merely plausible-looking but unreliable ones. [Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

## Benchmarks and Performance

Key results from the original Wei et al. paper and subsequent work (all self-reported unless noted):

| Task | Standard Prompting | Chain-of-Thought | Gain |
|------|-------------------|------------------|------|
| GSM8K (GPT-3 175B) | ~17% | ~48% | +31pp |
| AquA (PaLM 540B) | 26% | 35% | +9pp |
| StrategyQA (PaLM 540B) | 86% | 87% | +1pp |
| CommonsenseQA (PaLM 540B) | 79% | 80% | +1pp |

The gains are largest on arithmetic and symbolic reasoning. CoT helps less on commonsense benchmarks where the task doesn't decompose into sequential steps.

Self-consistency improves further: GSM8K with self-consistency (GPT-3 + CoT + majority vote over 40 samples) reaches ~74%, versus ~48% for single-chain CoT. These are self-reported figures from the original papers.

HotPotQA results from Reflexion research: CoT with ground-truth context reaches 61% base, rising to 75% with self-reflection — but this conflates CoT with the Reflexion mechanism, not CoT alone.

## Failure Modes

**Plausible but wrong chains.** The model can generate confident-sounding reasoning that is internally consistent but factually incorrect. A student can write "3 × 4 = 11, therefore the answer is 22" and the chain "looks like math." Nothing in the basic CoT mechanism catches this.

**Step-level hallucination in multi-hop tasks.** In reasoning chains requiring 5+ steps, errors in early steps compound. The model at step 4 conditions on the (incorrect) output of step 2, making further correction unlikely. Self-consistency partially mitigates this by averaging over multiple chains.

**Verbose reasoning that obscures the answer.** When CoT chains get long (50+ steps), models lose track of the original question. The final answer may technically be present somewhere in the generation but not in the expected position.

**Sensitivity to reasoning format.** Few-shot CoT examples encode a specific reasoning style. If the style doesn't match the task structure, performance can degrade versus zero-shot. Prompts that show mathematical reasoning may not transfer to causal reasoning tasks.

**No guarantee of faithfulness.** A model can produce a post-hoc rationalization that "explains" its answer without the answer being causally derived from the reasoning. Turpin et al. (2023) showed LLM reasoning traces are often unfaithful to the actual computation — the chain describes what the answer is, not why the model reached it. This matters for explainability applications but less for accuracy.

**Weaker models perform worse with CoT than without.** Models below a capability threshold produce chains that mislead rather than guide. Adding zero-shot CoT to an underpowered model on a task requiring genuine synthesis can hurt accuracy relative to direct prompting.

## When to Use CoT

Use CoT when:
- The task decomposes into sequential steps (arithmetic, multi-step logic, code tracing)
- Errors in individual steps are diagnosable from the chain
- Latency budget permits longer generation (CoT increases token count 3–10×)
- The model is large/capable enough to generate coherent chains

Skip CoT when:
- The task requires a single factual lookup (CoT adds tokens without benefit)
- Latency is critical (CoT approximately doubles generation time at minimum)
- You need guaranteed faithful explanations (CoT traces are not reliably causal)
- The model is small and untested for reasoning quality (may hurt vs. help)

Use self-consistency when you have budget for multiple calls and the task has a verifiable final answer. The 3–10× cost is worth paying for high-stakes reasoning tasks where errors are expensive.

## Implementation Patterns

**Minimal few-shot CoT prompt:**
```
Q: Roger has 5 tennis balls. He buys 2 more cans of 3 balls each. How many does he have?
A: Roger starts with 5 balls. 2 cans × 3 balls = 6 more balls. 5 + 6 = 11.
The answer is 11.

Q: [Your question here]
A:
```

**Zero-shot trigger phrases** (order by reliability, most to least):
1. "Let's think step by step."
2. "Please reason through this carefully."
3. "Break this into steps:"

**Self-consistency implementation sketch:**
```python
answers = []
for _ in range(n_samples):
    chain = llm.generate(prompt, temperature=0.7)
    answer = extract_final_answer(chain)
    answers.append(answer)
return Counter(answers).most_common(1)[0][0]
```

**[DSPy](../projects/dspy.md) integration:**
```python
cot = dspy.ChainOfThought("question -> answer")
```
DSPy handles prompt optimization and example selection automatically, removing the need for manual few-shot curation.

## Unresolved Questions

**Faithfulness vs. accuracy tradeoff.** CoT reliably improves accuracy on reasoning benchmarks. It does not reliably produce faithful explanations of model computation. No published technique fully bridges this gap. Users who want both accurate answers and explanations they can trust need to treat CoT traces as useful heuristics, not proofs.

**Optimal chain length.** There is no principled guidance on how many steps a CoT chain should have. Too short: insufficient decomposition. Too long: the model loses track. Practitioners set this by trial and error.

**Cross-task transfer of reasoning formats.** Few-shot CoT examples encode format and style. Whether math-focused examples help or hurt on code reasoning tasks is not well characterized. Using domain-matched examples improves performance but requires per-domain curation work.

**Interaction with [Prompt Optimization](../concepts/dspy-optimization.md).** Automated prompt optimizers (DSPy) improve few-shot example selection and phrasing but the optimal examples are often non-intuitive and not human-interpretable. The relationship between example quality and CoT reliability is underspecified.

## Alternatives

- **Direct prompting**: Use when the task is single-step or the model is small. Lower latency, no risk of misleading chains.
- **[ReAct](../concepts/react.md)**: Use when reasoning requires interleaving with external actions (search, code execution). CoT without grounding hallucinates facts; ReAct grounds reasoning in retrieved observations.
- **[Reflexion](../concepts/reflexion.md)**: Use when you have an evaluation signal and need iterative improvement. Reflexion requires CoT internally but adds the trial-error-reflection loop.
- **[Task Decomposition](../concepts/task-decomposition.md) with explicit subtasks**: Use when the problem structure is known in advance and can be hardcoded into a pipeline. More reliable than CoT-generated decomposition but less flexible.
- **Fine-tuning on reasoning traces**: Use when you have labeled CoT data and serve high-traffic production. A fine-tuned smaller model can match large-model CoT performance at lower cost and latency.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.4)
- [ReAct](../concepts/react.md) — extends (0.7)
- [Reflexion](../concepts/reflexion.md) — extends (0.6)
- [Agent Memory](../concepts/agent-memory.md) — part_of (0.5)
- [Task Decomposition](../concepts/task-decomposition.md) — part_of (0.7)
- [Context Engineering](../concepts/context-engineering.md) — part_of (0.6)
