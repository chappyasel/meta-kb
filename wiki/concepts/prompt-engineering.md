---
entity_id: prompt-engineering
type: approach
bucket: context-engineering
abstract: >-
  Prompt engineering is the practice of designing natural language instructions
  and examples to elicit desired LLM behaviors; it evolved into the broader
  discipline of context engineering as multi-turn agents became the dominant
  deployment pattern.
sources:
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - repos/laurian-context-compression-experiments-2508.md
  - articles/effective-context-engineering-for-ai-agents.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
related:
  - andrej-karpathy
  - autoresearch
  - claude-code
last_compiled: '2026-04-06T02:05:28.169Z'
---
# Prompt Engineering

## What It Is

Prompt engineering is the practice of designing, structuring, and iterating on the natural language inputs given to a large language model to reliably produce desired outputs. At its narrowest, it means writing a good system prompt. At its broadest, it encompasses few-shot example selection, output format specification, chain-of-thought elicitation, and the structural layout of instructions.

[Andrej Karpathy](../concepts/andrej-karpathy.md) described it, along with [context engineering](../concepts/context-engineering.md), as "the art and science" of curating what enters an LLM's context window. The field emerged from applied NLP research in 2020–2021 and became mainstream practice by 2022, as practitioners discovered that the same model could behave radically differently depending on how instructions were phrased.

Prompt engineering is a precursor to and component of [context engineering](../concepts/context-engineering.md). Where prompt engineering focuses on *what to write*, context engineering focuses on *what to include* across the entire token budget of a multi-turn agent interaction.

## Core Techniques

### Zero-Shot Prompting

The model receives only instructions, no examples. Works well when the task is unambiguous and the model has sufficient prior exposure during training. Fails on narrow domain tasks where the output format or terminology diverges from training distribution.

### Few-Shot Prompting

Including examples of input-output pairs inside the prompt. Anthropic's guidance recommends against stuffing every edge case into a prompt; instead, curate a diverse set of canonical examples that illustrate expected behavior. For an LLM, examples function as compressed demonstrations that generalize better than exhaustive rule lists.

### [Chain-of-Thought](../concepts/chain-of-thought.md) Prompting

Adding "think step by step" or embedding reasoning traces in few-shot examples causes many models to produce intermediate reasoning before the final answer. This improves performance on multi-step arithmetic, logical deduction, and planning tasks. The technique was documented empirically in Wei et al. (2022) and has since been integrated into model training itself, making explicit elicitation less necessary on capable models.

### Instruction Formatting

Structure matters. XML tags (`<instructions>`, `<examples>`, `<context>`) and Markdown headers help models parse long system prompts by creating explicit delimiters. Anthropic's applied team recommends organized sections like `<background_information>`, `<instructions>`, and `## Tool guidance`. The relative importance of formatting has decreased as models grow more capable, but it remains useful for prompts exceeding a few hundred tokens.

### Role and Persona Assignment

Prefixing with "You are a senior software engineer" or "You are a precise medical coder" shifts the model's prior over what kinds of responses are appropriate. This technique is partially superseded by instruction-tuned models that have internalized professional personas, but it remains a low-cost signal for domain-specific tasks.

## How It Connects to System Prompts and [claude.md](../concepts/claude-md.md)

For persistent agents, the system prompt is the primary vehicle for prompt engineering. Files like [claude.md](../concepts/claude-md.md) and [skill.md](../concepts/skill-md.md) in projects like [Claude Code](../projects/claude-code.md) represent prompt engineering artifacts stored on disk and injected into context at runtime. This makes them versionable, auditable, and — crucially — automatable.

The [AutoResearch](../projects/autoresearch.md) project operationalizes this: the human iterates on a `.md` prompt file while an AI agent iterates on the code it governs. Each run is a complete experiment; better prompts accumulate via git commits. [Source](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)

## The Altitude Problem

Effective system prompts occupy a "right altitude" — specific enough to guide behavior, general enough to handle variation without becoming brittle. Two failure modes dominate in practice:

**Over-specification:** Hardcoded if-else logic written in natural language. "If the user asks about shipping, always respond with exactly three sentences starting with 'Thank you for your question.'" This creates fragility; the model either follows the rule mechanically in situations where it breaks down, or ignores it entirely.

**Under-specification:** Vague guidance that assumes shared context. "Be helpful and professional." The model fills gaps with its own priors, which may not match product requirements.

[Anthropic's applied team](../raw/articles/effective-context-engineering-for-ai-agents.md) recommends starting with the minimal prompt that works on the best available model, then adding specific instructions and examples targeting observed failure modes — not preemptively.

## Automated Prompt Optimization

Prompt engineering has increasingly moved from manual craft to automated optimization. Three approaches dominate:

**Genetic / evolutionary methods ([GEPA](../concepts/gepa.md)):** [DSPy's](../projects/dspy.md) GEPA optimizer treats prompts as candidates in a population, mutating and selecting based on a scoring function. In a documented production case, optimizing a context compression prompt for `gpt-4o-mini` (which had 0% success on difficult cases) using GEPA over 75 iterations raised success to 62% on those cases. [Source](../raw/repos/laurian-context-compression-experiments-2508.md)

**Gradient-based text optimization (TextGrad):** TextGrad applies gradient-style feedback in natural language: the optimizer reads model outputs, generates textual "gradients" describing what changed, and proposes updated prompts. Applied to the same context compression task, TextGrad produced 79% success — outperforming GEPA alone. A hybrid GEPA+TextGrad pipeline reached 100% on the test set. [Source](../raw/repos/laurian-context-compression-experiments-2508.md) (Self-reported; the test set is 296 documents, which is a narrow domain sample.)

**Binary eval assertion loops:** Define 3–6 yes/no checks on output properties ("Does the response include a concrete next step?"), run an agent in a loop to generate variants, measure pass rate, keep improvements. At ~18,000 tokens per cycle, a 30-cycle overnight run costs roughly $1.50–$4.50. Documented pass rate improvements from 40–50% baseline to 75–85% range over one overnight run. [Source](../raw/articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md) (Self-reported; no independent benchmark.)

All three approaches share the same structural requirement: you must define what "better" means numerically before the loop starts. If you cannot write a deterministic scoring function, none of these methods work.

## Relationship to Context Engineering

[Context engineering](../concepts/context-engineering.md) subsumes prompt engineering. A system prompt is one component of context; others include tool definitions, retrieved documents, message history, and agent-generated notes. As Anthropic frames it: "prompt engineering refers to methods for writing and organizing LLM instructions, while context engineering refers to strategies for curating and maintaining the optimal set of tokens during LLM inference." [Source](../raw/articles/effective-context-engineering-for-ai-agents.md)

The distinction matters most for agents. A chatbot's context is mostly its system prompt plus the conversation. An agent running over hours accumulates tool outputs, intermediate notes, and compacted summaries. Prompt engineering produces the static instructions; context engineering manages the dynamic state. [Progressive Disclosure](../concepts/progressive-disclosure.md), compaction, and structured note-taking are context engineering techniques that sit above prompt engineering.

## Practical Failure Modes

**Prompt brittleness:** A prompt optimized for a narrow test distribution fails on production inputs that differ slightly. The fix is test diversity before optimization, not prompt complexity.

**Eval-prompt overfitting:** Binary assertion loops can produce prompts that pass the eval script by gaming it — triggering the "empathy phrase" check by inserting a rote phrase regardless of context. Assertions must test outputs that actually correspond to quality, not surface proxies.

**Prompt injection:** Adversarial users can override instructions by embedding conflicting directives in their input. Long system prompts with many rules are more vulnerable because models struggle to maintain all constraints simultaneously under adversarial pressure.

**Context rot interaction:** Adding more prompt content has diminishing returns and eventually hurts performance. Models lose attention to early instructions as total context length grows. Every instruction added to a system prompt competes with tool outputs and retrieved content for the model's attention budget.

## When Not to Use Prompt Engineering Alone

Prompt engineering is the wrong primary tool when:

- The task requires consistent structured output at high volume. Fine-tuning or constrained decoding (e.g., grammar-constrained generation) is more reliable than prompt-based formatting instructions.
- The domain has specialized terminology the base model hasn't encountered. Few-shot examples help, but may not be sufficient; [RAG](../concepts/rag.md) or fine-tuning on domain data addresses the root cause.
- Behavior must be verifiably consistent across thousands of edge cases. Manual prompt iteration cannot explore the space adequately; automated optimization ([DSPy](../projects/dspy.md), [GEPA](../concepts/gepa.md)) becomes necessary.
- The agent operates over many turns. Static system prompt optimization doesn't address context accumulation, compaction, or tool design — the full scope of [context engineering](../concepts/context-engineering.md) applies.

## Key Relationships

- [Context Engineering](../concepts/context-engineering.md) — the broader discipline that contains prompt engineering
- [Chain-of-Thought](../concepts/chain-of-thought.md) — a specific prompting technique for eliciting reasoning traces
- [DSPy](../projects/dspy.md) — a framework for automated prompt optimization
- [GEPA](../concepts/gepa.md) — genetic algorithm approach to prompt search
- [AutoResearch](../projects/autoresearch.md) — Karpathy's project demonstrating automated prompt iteration loops
- [Claude Code](../projects/claude-code.md) — implements prompt engineering via `CLAUDE.md` and skill files at runtime
- [claude.md](../concepts/claude-md.md) — the persistent prompt artifact pattern used by Claude Code
- [skill.md](../concepts/skill-md.md) — modular prompt files for agent capabilities
- [Karpathy Loop](../concepts/karpathy-loop.md) — the iterative human-on-prompt, agent-on-code research pattern
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — context engineering technique for just-in-time information retrieval
