---
entity_id: prompt-engineering
type: approach
bucket: context-engineering
abstract: >-
  Prompt engineering is the practice of crafting LLM inputs to elicit desired
  outputs; its key differentiator is that it shapes model behavior without
  changing model weights, making it the primary lever for controlling LLM
  systems at inference time.
sources:
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - articles/effective-context-engineering-for-ai-agents.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
related:
  - andrej-karpathy
  - autoresearch
  - claude-code
last_compiled: '2026-04-07T11:46:22.282Z'
---
# Prompt Engineering

## What It Is

Prompt engineering is the practice of designing, structuring, and optimizing the text inputs given to LLMs to reliably produce desired outputs. You change model behavior not by retraining but by changing what the model sees at inference time. Every deployed LLM system does prompt engineering, whether deliberately or by accident.

The term covers a wide surface: system prompt design, few-shot example selection, instruction formatting, output format specification, persona assignment, chain-of-thought elicitation, and the sequencing of context. In agent systems, it extends further into tool descriptions, error recovery instructions, and memory scaffolding.

[Andrej Karpathy](../concepts/andrej-karpathy.md) characterized the discipline as "the art and science of curating what will go into the limited context window." That framing points to why prompt engineering matters beyond simple chatbot interactions: the prompt is the primary control surface for systems where the LLM makes sequential decisions.

## Why It Matters

Three properties make prompt engineering the foundational technique for LLM-based systems:

**No weight updates required.** Changing model behavior through fine-tuning is expensive, slow, and risks degrading general capabilities. A prompt change deploys in seconds, costs nothing beyond inference, and is fully reversible. For most production applications, prompting reaches target performance faster than any alternative.

**Composable with everything else.** [RAG](../concepts/rag.md), [agent memory](../concepts/agent-memory.md), [tool use](../concepts/mcp.md), and [chain-of-thought](../concepts/chain-of-thought.md) all depend on prompt engineering. These techniques add information to the context; prompt engineering determines how the model should use that information. The two concerns are separable but deeply intertwined.

**Directly measurable.** Unlike architectural decisions that require retraining to evaluate, prompt changes can be A/B tested against fixed evaluation sets with fast turnaround. This makes prompt engineering the primary lever in an iterative improvement loop.

## How It Works: Core Mechanisms

### System Prompt Structure

The system prompt carries the primary behavioral specification. Research at [Anthropic](../projects/anthropic.md) converged on a structural principle: prompts should operate at the "right altitude" between two failure modes. Overly specific prompts hardcode brittle logic that breaks on edge cases. Overly vague prompts give the model insufficient grounding and produce inconsistent outputs. The target zone: specific enough to guide behavior, flexible enough to generalize.

Practical structure uses XML tags or Markdown headers to delimit sections (`<background_information>`, `<instructions>`, `## Tool guidance`, `## Output description`). The specific delimiters matter less than consistent demarcation; models learn to attend to structure.

The minimal information principle applies: a good system prompt contains the smallest set of content that fully specifies desired behavior. This is not the same as a short prompt. A 2,000-token system prompt can be minimal; a 400-token prompt can be bloated with redundant constraints that compete with each other.

### Few-Shot Examples

Examples communicate expected behavior more efficiently than exhaustive rule-listing. The standard framing is that examples are "pictures worth a thousand words" for an LLM. A small set of diverse, canonical examples outperforms a large set of edge-case-covering rules, because the model generalizes from examples rather than parsing conditionals.

Selection criteria: coverage of meaningfully different input types, not just varied surface forms. Five examples spanning three distinct task subtypes beats fifteen examples of the same subtype with different wording.

### Chain-of-Thought Elicitation

Adding "think step by step" or structuring prompts to elicit intermediate reasoning before a final answer reliably improves performance on multi-step tasks. The mechanism is that the model's intermediate tokens serve as working memory; externalizing reasoning allows the model to attend to prior steps when generating later ones. See [Chain-of-Thought](../concepts/chain-of-thought.md) for a full treatment.

### Output Format Specification

Specifying output structure reduces post-processing burden and improves consistency. JSON schema, Markdown templates, and explicit section headers all constrain the output space the model samples from. For structured data, this works particularly well with [DSPy](../projects/dspy.md)-style approaches that type-check outputs.

### Tool and Context Descriptions

In agent systems, tool descriptions are prompts. The model reads them to decide which tool to call and how. Poor tool descriptions are a leading cause of agent failures. Effective descriptions specify: what the tool does, when to use it versus alternatives, expected input format, and what the output means. A human engineer who cannot definitively say which tool applies in a given situation should not expect the agent to do better.

## The Shift to Context Engineering

[Context engineering](../concepts/context-engineering.md) is prompt engineering's successor framing for agent systems. Static prompt crafting addresses one-shot interactions well. Multi-turn agent loops generate an expanding universe of potentially relevant information that must be managed at each inference step.

The core constraint: LLM attention is finite. Longer contexts degrade retrieval precision through "context rot" — empirically validated degradation where a model's ability to recall specific information decreases as total context grows. This stems from the transformer architecture's O(n²) attention complexity: with n tokens, the model must represent n² pairwise relationships, and that budget stretches thin at scale.

Prompt engineering under context engineering means: at each inference step, what is the smallest high-signal set of tokens that maximizes the probability of the desired next action? This reframes prompting from a one-time authoring task to a continuous curation problem. [Claude Code](../projects/claude-code.md) implements this with CLAUDE.md files loaded up front and just-in-time file retrieval via grep and glob rather than pre-indexing full codebases.

## Automated Prompt Optimization

The [AutoResearch](../projects/autoresearch.md) pattern (Karpathy, 2025) extends prompt engineering into automated self-improvement. The loop:

1. Define success with binary eval assertions (yes/no, not 1-10 scores)
2. Establish a baseline pass rate on fixed test cases
3. Have a coding agent analyze failure patterns and generate prompt variants (one hypothesis per variant)
4. Evaluate each variant against the test set
5. Promote the winner, archive losers, repeat

Binary assertions beat LLM-as-judge scoring for optimization because they are deterministic, comparable across runs, and attributable. A pass rate shift from 55% to 73% is unambiguous. An LLM quality score shift from 6.2 to 6.8 is not.

Practical results: 30-50 automated cycles overnight with Claude Code pushes pass rates from 40-50% to 75-85% on specialized tasks. API cost runs $5-25 depending on model and cycle count.

The critical constraint: change one thing per cycle. Changing five things simultaneously and seeing improvement tells you nothing about which change mattered.

[DSPy](../projects/dspy.md) formalizes this further with gradient-based prompt optimization — treating prompts as parameters in a differentiable program and optimizing them against defined metrics.

## Key Techniques Reference

| Technique | When to Use | Notes |
|---|---|---|
| Zero-shot instruction | Simple, well-specified tasks | Baseline; start here |
| Few-shot examples | Complex formatting, nuanced judgment | 3-6 diverse examples beats 20 similar ones |
| Chain-of-thought | Multi-step reasoning, math, planning | Adds latency and tokens |
| XML/Markdown structure | Long prompts, multi-section instructions | Aids model attention |
| Role/persona assignment | Tone, expertise level, audience targeting | Works; mechanism unclear |
| Output schema specification | Structured data, downstream parsing | Near-mandatory for tool outputs |
| Negative examples | Teaching what to avoid | Use sparingly; can overweight the anti-pattern |

## Failure Modes

**Prompt brittleness.** Prompts optimized for one input distribution fail on distribution shift. A customer service prompt tuned on English queries may degrade on translated text, slang, or domain shifts. Testing on diverse inputs before deployment is the only reliable mitigation.

**Specification gaming.** Models find unintended paths to satisfying literal prompt constraints. "Do not include irrelevant information" doesn't prevent the model from deciding everything is relevant. Concrete examples of what "irrelevant" means outperforms abstract rules.

**Context pollution.** In long agent runs, accumulated context from early turns crowds out instructions. Error messages, failed tool outputs, and abandoned reasoning chains accumulate and degrade performance. This is the primary motivation for compaction strategies in agentic systems.

**Instruction conflict.** Long, detailed prompts accumulate contradictory constraints. "Be concise" and "always explain your reasoning" conflict; which wins depends on unpredictable model behavior. Pruning for minimal instruction sets reduces collision frequency.

**Eval-prompt circularity.** Using an LLM to evaluate prompt quality and then using those scores to optimize the prompt creates circular feedback that optimizes for the evaluator's biases, not real task performance. Binary, objective assertions on fixed test cases break this loop.

## Infrastructure Assumptions

Prompt engineering assumes **stable model behavior**. A prompt optimized for Claude 3.5 Sonnet may produce different outputs on Claude 3.7 or a fine-tuned variant of the same model. API providers change model behavior through capability updates, safety tuning, and system-level prompt additions that are invisible to users. Production systems need regression testing on prompt changes and model version changes.

The second unspoken assumption: **token cost is negligible**. Few-shot prompting, chain-of-thought, and rich system prompts all increase token count. At low volume this is invisible; at scale, a 3x token increase from added examples translates directly to 3x inference cost. Token efficiency becomes a design constraint, not an afterthought.

## When Not to Use Prompt Engineering Alone

Prompt engineering hits a ceiling on tasks requiring:

- **Consistent domain knowledge the base model lacks.** If the model doesn't know your internal product catalog, no amount of prompting will make it reliably cite correct SKUs. RAG or fine-tuning is necessary.
- **Strict output format compliance at scale.** Prompts reduce format violations; they don't eliminate them. Production systems requiring zero-error structured outputs need programmatic output validation and retry logic.
- **Long-horizon agent coherence.** A single prompt cannot maintain goal alignment across hundreds of tool calls. Context engineering, compaction, and structured note-taking are required additions.
- **Tasks where behavior must not drift across model versions.** If consistent, auditable behavior matters more than capability improvement, fine-tuning on a frozen model checkpoint beats prompt engineering on a moving API target.

## Unresolved Questions

**Optimal prompt length.** Empirical evidence points toward "minimal necessary information," but no principled method exists for finding that minimum. Current practice is manual iteration.

**Cross-model portability.** Prompts optimized for one model's attention patterns and training distribution often underperform on other models. The degree of non-portability is task-dependent and not reliably predictable without testing.

**Interaction effects in complex prompts.** How different prompt sections interact — whether adding an example helps or hurts another instruction — is not well understood. The AutoResearch loop empirically finds good configurations, but doesn't explain why they work.

**Prompt injection in agent systems.** When agents read external content (web pages, documents, emails), adversarial content can override system prompt instructions. No prompt-level defense is reliable; this is an open problem in agentic system security.

## Relationship to Adjacent Concepts

[Context Engineering](../concepts/context-engineering.md) is the broader discipline; prompt engineering is its foundational technique applied to static prompt authoring.

[Chain-of-Thought](../concepts/chain-of-thought.md) is a specific prompt engineering pattern for eliciting step-by-step reasoning.

[CLAUDE.md](../concepts/claude-md.md) is a file-based prompt engineering convention for agent systems — persistent instructions that load automatically into context.

[Skill Files](../concepts/skill-md.md) extend this pattern into modular, reusable prompt components for specific agent capabilities.

[DSPy](../projects/dspy.md) formalizes prompt optimization as a programming abstraction, replacing manual iteration with programmatic compilation against defined metrics.

[LLM-as-Judge](../concepts/llm-as-judge.md) is a prompt engineering technique for evaluation, though it introduces circular feedback risks when used in optimization loops.

[Progressive Disclosure](../concepts/progressive-disclosure.md) is a context management pattern that applies prompt engineering principles to information sequencing across agent turns.

## Sources

- [Effective Context Engineering for AI Agents](../raw/articles/effective-context-engineering-for-ai-agents.md) — Anthropic Applied AI team
- [Andrej Karpathy AutoResearch Tweet](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)
- [Karpathy AutoResearch Builder's Playbook](../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md)
- [Claude Code with AutoResearch](../raw/articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md)


## Related

- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.5)
- [AutoResearch](../projects/autoresearch.md) — implements (0.7)
- [Claude Code](../projects/claude-code.md) — part_of (0.5)
