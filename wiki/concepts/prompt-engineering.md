---
entity_id: prompt-engineering
type: approach
bucket: context-engineering
abstract: >-
  Prompt engineering is the craft of writing LLM instructions to control model
  behavior; it evolved from one-shot text tasks toward agent orchestration,
  where context curation across multi-turn loops now matters more than any
  single prompt's wording.
sources:
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - repos/evoagentx-evoagentx.md
  - repos/laurian-context-compression-experiments-2508.md
  - articles/effective-context-engineering-for-ai-agents.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
related:
  - Claude Code
  - Andrej Karpathy
  - AutoResearch
  - Context Engineering
  - DSPy
last_compiled: '2026-04-05T20:27:29.065Z'
---
# Prompt Engineering

## What It Is

Prompt engineering is the practice of crafting natural language instructions to steer LLM behavior toward a desired output. At its narrowest, it means choosing words carefully in a single system prompt. At its broadest, it includes structuring few-shot examples, formatting XML or Markdown sections, calibrating instruction specificity, and deciding what information to include or exclude from the context window.

The practice emerged from early NLP research showing that model outputs are sensitive to phrasing. Before fine-tuning and RLHF became standard, prompting was the primary lever practitioners had over model behavior. It remains central today, but the scope has shifted. Most non-trivial LLM applications now involve multiple inference turns, tool calls, retrieved documents, and accumulated state — conditions where a single well-crafted prompt is necessary but not sufficient.

[Context Engineering](../concepts/context-engineering.md) is the term that has emerged to describe this expanded problem space: curating the entire token budget at each inference step, not just writing the initial instruction.

## Why It Still Matters

Despite the expansion toward context engineering, prompt quality remains the foundation. A poorly written system prompt degrades agent behavior regardless of how well the surrounding context is managed. A well-written prompt reduces the surface area for failure modes elsewhere.

The [Anthropic Applied AI team](../articles/effective-context-engineering-for-ai-agents.md) describes the "right altitude" problem: prompts that hardcode brittle if-else logic fail when conditions deviate; prompts that are vague fail because they assume shared context the model doesn't have. Effective prompts land between these — specific enough to guide behavior, flexible enough to handle variation.

Concrete structural recommendations from production experience include:

- Organize into distinct sections (`<background_information>`, `<instructions>`, `## Tool guidance`, `## Output description`)
- Use XML tags or Markdown headers as delimiters
- Start minimal — test the leanest prompt that could work on the best available model, then add only what failure modes demand
- Examples ("few-shot prompting") carry more weight than lengthy rule lists; a canonical set of 3–5 diverse examples often outperforms 20 edge-case rules

## How It Works: Core Techniques

**Zero-shot prompting** gives the model a task with no examples, relying on instruction clarity and the model's pretraining. Works for well-defined tasks where the model's training distribution already covers the target behavior.

**Few-shot prompting** includes input-output pairs before the actual request. Effective because examples implicitly communicate format, tone, length, and edge-case handling that prose instructions often miss.

**Chain-of-thought prompting** instructs the model to reason step-by-step before producing a final answer. Improves performance on multi-step reasoning tasks. Can be elicited with "Let's think step by step" or by including reasoning traces in few-shot examples.

**Role prompting** frames the model as a persona ("You are a senior software engineer") to activate relevant behavior patterns from training. Efficacy varies by task; works best when the role maps to a clear behavioral cluster in the training data.

**Instruction formatting** — XML tags, Markdown headers, numbered lists — helps models parse complex system prompts. The importance of exact formatting is declining as models improve, but structured prompts still reduce ambiguity in complex multi-section instructions.

## Prompt Optimization: From Manual to Automated

Manual prompt iteration is slow. The typical cycle — write, test, observe failure, revise — becomes a bottleneck when prompts need to generalize across hundreds of input variations.

Two automated approaches have emerged:

**Gradient-based optimization with TextGrad** treats the prompt as a differentiable parameter and applies text-based "gradients" — natural language feedback from an LLM judge — to iteratively revise the prompt toward higher scores. In a documented production experiment with context compression for RAG, TextGrad starting from a hand-written prompt and optimizing against 296 failure cases improved `gpt-4o-mini` extraction success from 0% to 79% over 8 iterations. [Source](../repos/laurian-context-compression-experiments-2508.md)

**Genetic algorithms with DSPy GEPA** runs a population of prompt variants across generations, using Pareto-front selection to balance multiple objectives. The same context compression experiment ran GEPA for 75 iterations (~1 hour) and reached 44.7% validation accuracy, translating to 62% test success on the full 296-document set. Starting from the GEPA-optimized prompt, running TextGrad as a second pass pushed success to 100% — though "100%" here means the prompt always extracts *something*, not that it always extracts the right content. [Source](../repos/laurian-context-compression-experiments-2508.md)

The numbers above are self-reported from a private production dataset with redacted domain details. Independent replication would require the same document-query pairs, which are not public.

**The Karpathy Loop** generalizes this pattern beyond ML. [Andrej Karpathy](../people/andrej-karpathy.md)'s [autoresearch](../projects/autoresearch.md) project structures the loop as: read current file, change one thing, test against a fixed scoring rubric, keep if score improves, repeat. Applied to prompt files (`.md`) with an agent iterating the code (`.py`), the human's job reduces to defining what "better" means. The repo hit 42,000 GitHub stars in its first week. [Source](../tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)

The critical prerequisite for any automated loop: a deterministic, numeric score. Binary assertions — yes/no checks on output properties — work better than LLM-scored rubrics because they're stable across runs and directly comparable between prompt versions. A 30-50 cycle overnight run can typically move a prompt from 40–50% pass rate to 75–85% on a representative test set, at a cost of $1.50–$4.50 in API calls. [Source](../articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md) (self-reported, not independently validated.)

## Relationship to Context Engineering

Prompt engineering treats the system prompt as the primary artifact. Context engineering treats the system prompt as one component in a broader token budget that also includes tools, retrieved documents, conversation history, and agent state.

From the Anthropic framing: "Prompt engineering refers to methods for writing and organizing LLM instructions for optimal outcomes... Context engineering refers to the set of strategies for curating and maintaining the optimal set of tokens during LLM inference, including all the other information that may land there outside of the prompts." [Source](../articles/effective-context-engineering-for-ai-agents.md)

In practice, the two are intertwined. The system prompt must work alongside dynamically injected context, not in isolation. Prompts that work well in single-turn settings can fail in multi-turn agent loops where accumulated tool outputs, prior reasoning traces, and injected documents consume the attention budget.

## Failure Modes

**Over-specification**: Hardcoding logic in prompts that should live in code. "If the user mentions a refund, say X; if they mention shipping, say Y" creates brittle conditional structures that break on any input outside the enumerated cases.

**Under-specification**: Vague prompts that assume the model shares context it doesn't have. "Be helpful and professional" gives no actionable signal.

**Test set homogeneity**: Optimizing prompts against a narrow test set produces pass rates that don't generalize. A prompt reaching 85% on 20 near-identical inputs may fail on the 21st input from a different sub-category. Diversity of test cases matters more than quantity.

**Changing multiple things per iteration**: When manual or automated iteration modifies several prompt elements simultaneously, pass rate changes become unattributable. Isolating one change per cycle is the only way to understand causality.

**Context rot**: As agent loops accumulate tokens, model recall degrades on earlier context. A perfectly crafted system prompt at position 0 becomes harder to follow as the context window fills. This is an architectural constraint of transformers — n² attention relationships get stretched thin — not a prompt quality issue, but it means prompt engineering for agents must account for eventual degradation.

## When Prompt Engineering Is Insufficient

Prompt engineering alone is insufficient when:

- The task requires consistent behavior across thousands of diverse inputs with no tolerance for variance (fine-tuning or structured outputs are more reliable)
- The required behavior is genuinely novel — outside the model's training distribution — such that no combination of instructions and examples produces it
- The application runs in multi-turn agent loops where context management, compaction, and tool design dominate overall quality
- Reproducibility requirements demand output determinism (prompts shift behavior probabilistically, not deterministically)

## Implementations and Extensions

**[DSPy](../projects/dspy.md)** formalizes prompt optimization as a compilation problem. Rather than hand-writing prompts, developers write programs using LLM-backed modules, and DSPy's optimizers (including GEPA) automatically generate and refine prompts and few-shot examples against a metric.

**[Claude Code](../projects/claude-code.md)** uses prompt engineering at the meta level: the CLAUDE.md file and `AGENT_INSTRUCTIONS.md` patterns give the agent behavioral directives, while the agent itself applies prompt engineering to sub-tasks.

**[AutoResearch](../projects/autoresearch.md)** frames the agent's operating instructions (the `.md` prompt file) as the primary optimization target, with the agent autonomously running experiments to improve it.

## Unresolved Questions

**Stability over model versions**: Prompts optimized for one model version often degrade after updates. There is no standard practice for version-pinning prompts or detecting regression after model updates.

**Optimal test set construction**: How many test cases are needed, and how should they be sampled, to produce pass rates that generalize? The "30-50 cycle overnight run" advice is practitioner rule-of-thumb, not empirically validated across task types.

**Attribution across context**: When an agent fails, attributing the failure to prompt quality versus context management versus tool design versus model capability is unsolved. Most organizations lack instrumentation to distinguish these.

**Long-term prompt decay**: Prompts optimized for today's distribution of inputs may degrade as user behavior or data distributions shift. Continuous re-evaluation pipelines are rarely built despite being straightforward to construct.

## Alternatives and Selection Guidance

- Use **fine-tuning** when you need consistent behavior across thousands of examples and have sufficient labeled data. Prompt engineering is faster to iterate but less reliable at scale.
- Use **DSPy** when you want to formalize prompt optimization as a programmatic pipeline with reproducible metrics rather than ad-hoc iteration.
- Use **structured outputs / constrained decoding** when you need format guarantees that prompts can only approximate probabilistically.
- Use **[context engineering](../concepts/context-engineering.md) techniques** (compaction, note-taking, sub-agent architectures) when the bottleneck is multi-turn coherence rather than single-turn output quality.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.4)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — implements (0.5)
- [AutoResearch](../projects/autoresearch.md) — implements (0.5)
- [Context Engineering](../concepts/context-engineering.md) — supersedes (0.7)
- [DSPy](../projects/dspy.md) — extends (0.8)
