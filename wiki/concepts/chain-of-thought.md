---
entity_id: chain-of-thought
type: approach
bucket: context-engineering
sources:
  - repos/microsoft-llmlingua.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - deep/repos/microsoft-llmlingua.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T05:33:12.451Z'
---
# Chain-of-Thought Prompting

## What It Is

Chain-of-thought (CoT) is a prompting approach where you instruct an LLM to generate intermediate reasoning steps before producing a final answer. Instead of asking a model to jump straight to a conclusion, you prompt it to "think step by step," producing a sequence of natural-language reasoning traces that the model writes before committing to an answer.

The core paper is Wei et al. (2022), "Chain of Thought Prompting Elicits Reasoning in Large Language Models" (NeurIPS 2022). The finding was counterintuitive at the time: simply asking models to show their work dramatically improved performance on arithmetic, symbolic, and commonsense reasoning tasks, and this improvement emerged most strongly in models above roughly 100B parameters.

## Why It Matters

Before CoT, LLMs handled multi-step problems by pattern-matching the question directly to a likely answer. This works for tasks where surface-level patterns correlate with correct answers but fails when a problem requires several dependent reasoning steps. CoT gives the model scratch space: it commits to a chain of intermediate claims, each constraining what follows, before it reaches the final answer token.

The mechanism matters for two practical reasons. First, intermediate steps concentrate the model's "test-time compute" on the problem structure rather than on generating a fluent answer. Second, the chain of reasoning is inspectable. When a model fails, you can often see exactly where its reasoning broke down, which is not possible with direct-answer prompting.

[Source](../../raw/articles/lil-log-llm-powered-autonomous-agents.md)

## How It Works

### Basic Prompting Variants

**Zero-shot CoT**: Add "Let's think step by step" to the prompt. No examples required. Kojima et al. (2022) demonstrated this works across a range of tasks without any few-shot demonstrations.

**Few-shot CoT**: Provide 2-8 examples, each with a question followed by a written-out reasoning chain and then the final answer. The model learns the expected format and reasoning style from these exemplars. Wei et al.'s original experiments used this approach on the GSM8K math benchmark and other multi-step reasoning datasets.

**Task-specific instructions**: Prompts like "Write a story outline first" or "List the steps needed to solve XYZ" are domain-specific variants that serve the same decomposition purpose without invoking the generic "step by step" framing.

### What the Model Is Actually Doing

The model generates tokens left-to-right, and each token in the reasoning chain is conditioned on all prior tokens. When the model writes "First, I need to calculate the total cost..." it is constraining the probability distribution over subsequent tokens toward answers consistent with that intermediate claim. The reasoning chain functions as a soft constraint propagator across multiple generation steps.

This is why CoT helps more on problems with a clear sequential structure (arithmetic, logical deduction, multi-hop retrieval) than on tasks where the answer doesn't depend on intermediate steps.

### The Format

A CoT-prompted exchange looks like:

```
Q: A store has 12 boxes of pens, each with 8 pens. They sell 40 pens. How many remain?

A: Let's think step by step.
Total pens = 12 × 8 = 96.
Remaining = 96 - 40 = 56.
The answer is 56.
```

The reasoning chain is part of the model's output, not a separate computation. This means it consumes output tokens and adds latency.

## Extensions and Variants

### Tree of Thoughts

Yao et al. (2023) extended CoT by generating multiple candidate reasoning paths at each step rather than committing to one. The resulting tree is explored via BFS or DFS, with each node evaluated by a classifier (or by majority vote across samples). This addresses a key failure mode of linear CoT: a single wrong step early in the chain propagates forward with no recovery mechanism.

Tree of Thoughts trades computational cost for robustness. For a problem with depth D and branching factor B, you run B^D reasoning paths instead of one. Practical implementations prune aggressively to stay tractable.

### ReAct: Reasoning with Action

ReAct (Yao et al., 2023) interleaves CoT reasoning traces with environment actions (API calls, search queries, tool use). The loop is:

```
Thought: I need to look up the population of France.
Action: Search("France population 2024")
Observation: 68 million
Thought: So the answer is approximately 68 million.
Action: Finish("68 million")
```

This matters for knowledge-intensive tasks where the model's weights don't contain current or specialized information. ReAct outperforms action-only baselines on HotpotQA and AlfWorld, demonstrating that the reasoning trace improves decision-making even when external tools are available.

[Source](../../raw/articles/lil-log-llm-powered-autonomous-agents.md)

### Reflexion

Reflexion (Shinn & Labash, 2023) adds a self-reflection loop on top of CoT. After a failed trajectory, the model generates a verbal reflection on what went wrong, stores it in working memory, and uses it as context for the next attempt. This allows iterative improvement across trials without gradient updates.

### Chain of Hindsight

CoH (Liu et al., 2023) applies CoT-style reasoning to fine-tuning rather than inference. The model is trained on sequences of past outputs annotated with feedback, ordered by quality. At inference, it produces better outputs by conditioning on the trend visible in the training sequences. This is a fine-tuning analogue of CoT rather than a prompting technique.

## Practical Implementation

### When CoT Improves Performance

CoT helps most on:
- Multi-step arithmetic and symbolic math
- Logical deduction with several premises
- Multi-hop question answering (finding intermediate facts to reach a final answer)
- Planning tasks where steps must be ordered

CoT helps least on:
- Single-step factual recall
- Classification tasks with no compositional structure
- Tasks where the correct answer is not derivable from the question text

### Prompt Engineering Details

The quality of few-shot exemplars matters substantially. Exemplars with clear, accurate reasoning chains outperform those with correct final answers but sloppy intermediate steps. The model learns both the format and the style of reasoning from the examples.

For zero-shot CoT, the phrase "Let's think step by step" outperforms alternatives like "Think carefully" or "Show your work." This specificity matters because the model has seen "step by step" reasoning formats frequently in training data.

### CoT in Agentic Pipelines

CoT has become the default reasoning substrate for LLM-powered agents. In frameworks like LangChain and systems like HuggingGPT, the "thought" step before each action is a CoT trace. The model uses its reasoning chain to decide which tool to call, what arguments to pass, and whether the result satisfies the task.

The LLMLingua prompt compression system (Microsoft, EMNLP 2023) includes explicit support for compressing CoT prompts via `examples/CoT.ipynb`. When few-shot CoT exemplars get long, LLMLingua's perplexity-based token filtering can reduce their size by up to 20x while preserving the reasoning structure. This matters operationally: a standard 8-shot GSM8K prompt with full reasoning chains can exceed 1,500 tokens.

[Source](../../raw/repos/microsoft-llmlingua.md)

## Failure Modes

### Error Propagation

A single incorrect step early in the chain skews every subsequent step toward a wrong conclusion. The model doesn't "notice" internal contradictions because token generation doesn't involve backtracking. The Tree of Thoughts extension directly addresses this, but at significant computational cost.

A concrete example: if a model incorrectly computes "12 × 8 = 88" in step one, the remainder of the chain will be internally consistent with 88 and produce a wrong but coherent-looking answer.

### Faithfulness vs. Plausibility

The generated reasoning chain is not a transcript of the model's internal computation. It is a plausible-sounding explanation generated by the same left-to-right token prediction process as everything else. Turpin et al. (2023) showed that CoT reasoning can be systematically biased by irrelevant features in the prompt (e.g., an answer choice being labeled with a star), while the generated reasoning makes no mention of that bias. The chain reads as if the model reasoned correctly while the actual influence was sycophantic.

This means CoT chains are not reliable for auditing model decisions. They are better understood as structured outputs that improve accuracy than as windows into reasoning.

### Emergent Scaling Dependence

CoT gains are minimal or absent on smaller models (below roughly 10-100B parameters, depending on task complexity). Prompting a 7B model to "think step by step" on hard arithmetic may produce steps that look like reasoning but don't improve accuracy. Teams deploying smaller fine-tuned models should benchmark CoT gains empirically rather than assuming they transfer from larger model results.

### Length and Cost

Generating a reasoning chain adds output tokens. On tasks requiring long chains (multiple pages of mathematical derivation, complex multi-step plans), CoT can multiply output token costs by 2-10x. Compressing few-shot exemplars helps with input costs, but output token costs scale with chain length regardless.

## Interaction with Other Techniques

**CoT + RAG**: Retrieved context chunks become input to a CoT reasoning process. The model reasons over retrieved passages step-by-step before producing an answer. LongLLMLingua's question-conditioned compression is designed specifically for this pattern: it preserves tokens in retrieved documents that are informative relative to the question, reducing context size while keeping what the CoT chain will actually use.

**CoT + Self-consistency**: Wang et al. (2022) showed that sampling multiple CoT chains and taking a majority vote over final answers improves accuracy substantially. This works because individual chains can fail in different places, and the correct answer tends to be reached by multiple independent paths. Self-consistency multiplies inference cost by the number of samples.

**CoT + Tool Use**: ReAct is the primary pattern here. The reasoning trace selects and parameterizes tool calls, and tool outputs become observations that update the next reasoning step.

## What the Documentation Often Omits

**Task-specific prompt sensitivity**: The exact phrasing of the CoT trigger phrase, the selection of few-shot exemplars, and the format of the reasoning chain all affect outcomes. There is no standard set of exemplars that transfers across domains. Teams often spend significant effort curating exemplars for each task type.

**The faithfulness problem in production**: Deployed systems that use CoT chains for decision-making or auditing often assume the chains are explanations of the model's actual behavior. They are not. The discrepancy between stated reasoning and actual prediction determinants is especially pronounced in high-stakes settings where the prompt contains contextual cues (framing, ordering, authority signals) that the model responds to without reflecting in its chain.

**Degradation under compression**: When CoT exemplars are compressed (e.g., via LLMLingua), the quality of the remaining reasoning chain matters for few-shot transfer. Aggressive compression that removes syntactically peripheral but semantically load-bearing tokens can degrade the reasoning quality the model learns from the examples, even while maintaining surface-level answer accuracy on the compression benchmark.

## Benchmarks and Evidence

The Wei et al. (2022) paper reported large gains on GSM8K, MATH, AQuA-RAT, and other benchmarks using PaLM 540B and GPT-3 175B. These results are peer-reviewed and independently replicated across multiple research groups.

Gains vary substantially by model, task, and prompt design. Numbers from any single paper should be treated as approximate guides rather than deployment predictions. Self-consistency results (Wang et al., 2022) show further gains but require explicit benchmarking at your specific sample count and model.

## Selection Guidance

Use CoT when your task has multiple dependent steps and you're using a model large enough to benefit (roughly 13B+ for most tasks, though fine-tuned smaller models can learn CoT-style reasoning for specific domains).

Use Tree of Thoughts when single-chain failure is costly and you can afford higher compute, particularly for planning and combinatorial search problems.

Use ReAct when the model needs external information mid-reasoning, not just at the start.

Use direct prompting when the task is single-step, the model is small, or latency constraints make output token overhead unacceptable.

Use self-consistency when accuracy matters more than latency and you can budget multiple samples per query.
