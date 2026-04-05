---
entity_id: prompt-engineering
type: approach
bucket: context-engineering
sources:
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - repos/laurian-context-compression-experiments-2508.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Claude Code
last_compiled: '2026-04-05T05:27:28.756Z'
---
# Prompt Engineering

## What It Is

Prompt engineering is the practice of crafting inputs to language models to elicit specific outputs. At its simplest, this means writing clear instructions. At its most sophisticated, it involves structured templates, few-shot examples, chain-of-thought scaffolding, XML delimiters, and systematic iteration against evaluation sets.

The term emerged when most LLM applications were one-shot tasks: classify this text, summarize this document, answer this question. Writing a good prompt was the central engineering challenge.

That framing has eroded. As [Anthropic's applied AI team describes](../../raw/articles/effective-context-engineering-for-ai-agents.md), prompt engineering has become a subset of [context engineering](../concepts/context-engineering.md), which addresses the broader question of what tokens to present to the model at each inference step across multi-turn agent loops. The prompt is still important, but it is one input to a larger curation problem.

## Core Techniques

**Zero-shot prompting**: Instructions only, no examples. Works for well-defined tasks with capable models. Breaks on edge cases where the model lacks implicit knowledge of your requirements.

**Few-shot prompting**: Embedding examples in the prompt. Anthropic's guidance treats examples as "pictures worth a thousand words" and recommends a small set of diverse, canonical cases rather than exhaustive edge case coverage. Stuffing a prompt with every edge case degrades the model's ability to generalize and consumes context budget.

**Chain-of-thought**: Asking the model to reason step-by-step before producing a final answer. Improves accuracy on multi-step reasoning tasks. Adds tokens to every response, which matters at scale.

**Structured formatting**: XML tags (`<instructions>`, `<background_information>`, `<examples>`), Markdown headers, and clear section delimiters. These help the model parse intent. Anthropic recommends this organization while noting that formatting specifics matter less as models improve.

**System prompt calibration**: Finding the right level of specificity. Too prescriptive produces brittle behavior when inputs vary from the anticipated pattern. Too vague produces inconsistent outputs. The target is specific enough to guide reliably, general enough to handle variation through heuristics rather than hardcoded rules.

## How Prompt Optimization Works

Beyond manual iteration, two automated approaches have gained traction for optimizing prompts against measurable outcomes:

**Genetic algorithms (DSPy GEPA)**: Treats the prompt as a population member, evolves variants through mutation and selection against a scoring function. In a [documented production case](../../raw/repos/laurian-context-compression-experiments-2508.md), a context compression prompt for an agentic RAG system achieved 0% success on `gpt-4o-mini` with the original hand-written prompt. After 75 iterations of GEPA optimization, the success rate reached 62%. The algorithm produces fascinatingly specific variants, adding domain-specific heuristics that a human author wouldn't have included.

**Gradient-based optimization (TextGrad)**: Uses text-based gradient descent, passing natural language feedback to iteratively refine the prompt. On the same dataset, TextGrad reached 79% success from the same 0% baseline. Running TextGrad on the GEPA-optimized prompt as a starting point reached 100% on the 296-document test set (all documents produced some extraction, though coverage quality varied).

These numbers come from a single practitioner's production system and have not been independently validated at scale. The direction of improvement is credible; the specific percentages depend heavily on dataset characteristics.

**The agent-as-optimizer pattern**: Karpathy's [autoresearch project](../../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md) demonstrates a related pattern where a human iterates on a prompt (`.md` file) while an AI agent iterates on code (`.py` file). The human's prompt becomes the primary engineering artifact, encoding research strategy rather than implementation. Each training run takes five minutes; the agent accumulates git commits as it finds better hyperparameters. The bottleneck shifts from human iteration speed to prompt quality.

## Relationship to Context Engineering

[Context engineering](../concepts/context-engineering.md) reframes prompt engineering along two dimensions:

First, scope. A prompt is static text written before inference. Context includes the prompt plus tool definitions, retrieval results, message history, MCP state, and anything else that lands in the window. Each of these requires curation decisions.

Second, time. One-shot tasks require one curation decision. Agents running in loops require continuous decisions about what to retain, compress, or discard as the task evolves. A prompt written well for turn one may be counterproductive by turn twenty if the model has accumulated redundant tool outputs that dilute the attention budget.

The [context rot](../concepts/context-rot.md) phenomenon, where model recall degrades as token count increases due to the n² attention relationship in transformers, means that adding more context is not monotonically helpful. Good prompt engineering minimizes token count while preserving signal, which is also good context engineering. The difference is that context engineering addresses what happens to that context as it evolves over an agent's lifetime.

## Where Prompt Engineering Remains Primary

For single-turn tasks, prompt engineering is still the dominant concern. Classification pipelines, document summarization, code generation in a single pass, structured data extraction: these use cases present a clear input and expect a structured output. The model has no history to manage, no tools to misuse, no accumulating state.

Even in agentic systems, the system prompt remains a critical artifact. Anthropic recommends starting with "a minimal prompt on the best model available" and adding instructions based on observed failure modes rather than anticipating every case upfront. This iterative discipline is prompt engineering practice.

Few-shot examples remain valuable across all settings. The recommendation to curate canonical examples rather than enumerate edge cases applies whether you're building a one-shot pipeline or a multi-turn agent.

## Concrete Failure Modes

**Overfitting the prompt to a test set**: Prompt optimization against a fixed evaluation set, whether manual or automated, can overfit to that set's characteristics. The GEPA-optimized prompt in the RAG case embedded domain-specific heuristics that were redacted for privacy, suggesting the optimizer learned idiosyncrasies of that particular document collection. Performance on out-of-distribution queries may not hold.

**Prompt brittleness under model updates**: A prompt tuned for one model version can degrade when the underlying model changes. Anthropic acknowledges this implicitly by noting that formatting specifics matter less as models improve. Teams that hard-code elaborate formatting conventions often face rework after model updates.

**Altitude miscalibration**: Prompts that hardcode brittle if-else logic fail when inputs vary. Prompts that are too abstract fail to constrain behavior. Both failure modes are common. The right prompt sets heuristics the model can apply to novel inputs, not rules that only cover anticipated inputs.

## When Prompt Engineering Is the Wrong Frame

If your system maintains state across multiple inference calls, prompt engineering alone cannot solve reliability problems. The message history, tool results, and accumulated context affect model behavior as much as the system prompt does. Treating context management as a separate engineering concern, not as an afterthought to the "real" prompt work, becomes necessary.

If your task requires long-horizon coherence, techniques like compaction, structured note-taking, and sub-agent architectures address problems that no amount of system prompt crafting can fix. A well-written system prompt cannot compensate for a 100k-token message history that dilutes model attention.

## Unresolved Questions

Automated prompt optimization raises evaluation questions that practitioners rarely address publicly. What prevents optimized prompts from overfitting? How do you validate that a 79% success rate on a 296-document holdout generalizes to the 1,700-document production set? The context compression experiments show the optimization direction but do not address distribution shift.

There is also limited public evidence on how prompt optimization interacts with model updates. If TextGrad produces a prompt optimized for `gpt-4o-mini` at a particular version, what happens when the model updates? This concern applies to hand-written prompts too, but automated optimization encodes model-specific quirks more systematically.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md)
- Few-Shot Prompting
- [Context Window](context-window-management.md)
- [RAG (Retrieval-Augmented Generation)](../concepts/rag.md)
