---
entity_id: claude
type: project
bucket: agent-systems
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - repos/memodb-io-acontext.md
  - repos/aiming-lab-simplemem.md
  - repos/natebjones-projects-ob1.md
  - repos/supermemoryai-supermemory.md
  - repos/anthropics-skills.md
  - repos/thedotmack-claude-mem.md
  - repos/caviraoss-openmemory.md
  - repos/jmilinovich-goal-md.md
  - repos/kayba-ai-agentic-context-engine.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/vectifyai-pageindex.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/anthropics-skills.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - Claude Code
  - OpenAI
last_compiled: '2026-04-05T05:23:21.008Z'
---
# Claude

## What It Is

Claude is Anthropic's family of large language models, available in multiple capability tiers. The current lineup includes Claude Opus (highest capability), Claude Sonnet (balanced), and Claude Haiku (fastest, cheapest). Claude powers [Claude Code](../projects/claude-code.md), Claude.ai, and serves as the underlying model for a wide range of third-party agent frameworks.

Anthropic positions Claude around "Constitutional AI" training, a method where the model is trained to follow a set of principles rather than relying solely on RLHF from human raters. The practical effect is a model that declines more requests than competitors and tends toward longer, more cautious responses.

## Architectural Specifics

Anthropic publishes almost no architecture details. What is confirmed or strongly evidenced:

- **Context window**: 200K tokens across the main Claude 3+ models
- **Extended thinking**: Claude 3.7 Sonnet introduced a visible chain-of-thought mode where the model produces reasoning tokens before its final response. Token budgets for thinking are configurable via API (`thinking.budget_tokens`).
- **Skills system**: Anthropic's public [`anthropics/skills`](https://github.com/anthropics/skills) repository (110K stars as of early 2026) formalizes a composable capability pattern: YAML-frontmattered Markdown files (`SKILL.md`) that Claude loads dynamically. The frontmatter requires only `name` and `description`; the body contains instructions Claude follows when the skill is active. These load via the Claude Code plugin system (`/plugin install`) or directly via the API's skills endpoint.
- **Tool use / function calling**: Claude supports parallel tool calls and returns structured JSON for tool outputs. The API exposes `tool_choice` for forcing specific tool invocations.
- **Multimodal**: Vision input is supported across Sonnet and Opus tiers; Haiku has reduced multimodal capability.

## Key Numbers

| Metric | Value | Credibility |
|--------|-------|-------------|
| Skills repo stars | 110,064 | GitHub-reported |
| Claude Code adoption | Not published | — |
| Context window | 200K tokens | Anthropic-published |
| Extended thinking max budget | Configurable, up to model limit | Anthropic docs |
| SWE-bench Verified (Claude 3.7 Sonnet) | 70.3% | Self-reported by Anthropic |

The SWE-bench number is self-reported. Independent replication of Anthropic's benchmark methodology is ongoing in the research community but has not produced a definitive third-party audit of this specific number.

## Strengths

**Long-document reasoning**: The 200K context window is genuinely usable, not just a marketing number. Claude handles full codebases, long legal documents, and extended conversations without the severe degradation seen in earlier long-context models.

**Instruction following in agentic loops**: Claude's tool-use reliability is strong enough that frameworks like Acontext ([Source](../../raw/repos/memodb-io-acontext.md)) and GOAL.md ([Source](../../raw/repos/jmilinovich-goal-md.md)) explicitly target Claude as a primary execution backend for autonomous agent loops. The model maintains task coherence across many tool calls in a way that matters for multi-step automation.

**Skills / structured capability loading**: The `anthropics/skills` pattern ([Source](../../raw/repos/anthropics-skills.md)) gives teams a clean, versionable way to add domain-specific behavior without touching system prompts or fine-tuning. Skills are plain Markdown, which means they're greppable, diffable, and auditable.

**Extended thinking for hard reasoning**: The visible chain-of-thought mode in Claude 3.7 Sonnet meaningfully improves performance on math, logic, and multi-step coding problems. Unlike opaque scratchpads in some models, the reasoning tokens are exposed via API.

## Critical Limitations

**Concrete failure mode — refusal instability across contexts**: Claude's Constitutional AI training produces inconsistent refusal behavior. The same request phrased differently, or embedded in a longer conversation, may be refused in one context and answered in another. This is not predictable from the content alone. Teams building production agents that route user requests through Claude encounter this as silent failures: the model returns a refusal message rather than an error code, so automated pipelines need explicit detection logic. There is no published threshold or ruleset that explains the boundary.

**Unspoken infrastructure assumption**: Claude API access assumes low-latency network connectivity to Anthropic's endpoints. There is no on-premises or self-hosted Claude option. Air-gapped environments, regulated industries with data residency requirements, and applications needing sub-50ms first-token latency cannot use Claude regardless of budget. The skills system, Claude Code, and all agent integrations inherit this constraint.

## When NOT to Use Claude

- **Data residency requirements**: No VPC deployment, no on-prem. If your data cannot leave your network, Claude is not an option.
- **Predictable refusal behavior at scale**: If your application needs deterministic responses to a fixed prompt set (content moderation pipelines, automated triage), Claude's variable refusal behavior creates operational unpredictability that models with simpler RLHF tuning handle more consistently.
- **Cost-sensitive high-volume inference**: At high token volumes, Haiku is competitive but Opus and Sonnet are expensive. Open-weight models (Llama, Mistral) running on owned hardware are cheaper at scale once infrastructure costs amortize.
- **Tooling that requires OpenAI-compatible endpoints**: Claude's API schema differs from the OpenAI standard. Frameworks that hardcode the OpenAI client require a compatibility shim. Some shims drop features like extended thinking.

## Unresolved Questions

**Model update cadence and backward compatibility**: Anthropic has changed model behavior in place (same API name, different behavior) without clear versioning guarantees. Production systems that depend on specific output formats or refusal thresholds have no stable contract.

**Extended thinking token costs at scale**: Thinking tokens count toward billing but the ratio of thinking tokens to output tokens is not fixed or user-controllable beyond setting a budget ceiling. At high volume, actual costs can differ substantially from estimates based on output tokens alone.

**Skill conflict resolution**: The `anthropics/skills` spec does not define behavior when two loaded skills give contradictory instructions. The documentation says Claude "follows" the active skill but does not specify priority ordering when multiple skills are active simultaneously.

**Constitutional AI training data and principle versioning**: The principles governing Claude's behavior are not versioned or publicly auditable in a way that would let operators predict how model updates change refusal or response patterns.

## Alternatives

| Use case | Alternative | Why |
|----------|-------------|-----|
| On-premises deployment | Llama 3 / Mistral via Ollama or vLLM | Self-hosted, no data egress |
| OpenAI-compatible tooling ecosystem | GPT-4o | Drop-in API compatibility |
| Lowest-cost high-volume inference | Gemini Flash / Haiku | Price competition at the fast tier |
| Consistent, auditable refusal behavior | Fine-tuned open-weight model | Full control over RLHF |
| Agent loops requiring max coding ability | Claude 3.7 Sonnet with extended thinking | Claude is competitive here; no strong alternative as of early 2026 |

## Related

- [Claude Code](../projects/claude-code.md)
- [Agent Skills standard](../concepts/agent-skills.md)
