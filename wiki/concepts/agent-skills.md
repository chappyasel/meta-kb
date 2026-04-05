---
entity_id: agent-skills
type: concept
bucket: agent-systems
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/steveruizok-some-of-you-aren-t-soldier-proofing-your-agent-ski.md
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - repos/gepa-ai-gepa.md
  - repos/anthropics-skills.md
  - repos/alirezarezvani-claude-skills.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/letta-ai-letta.md
  - repos/kepano-obsidian-skills.md
  - repos/othmanadi-planning-with-files.md
  - repos/memento-teams-memento-skills.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/yusufkaraaslan-skill-seekers.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - articles/agent-skills-overview.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md
  - repos/affaan-m-everything-claude-code.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/human-agent-society-coral.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/anthropics-skills.md
  - deep/repos/martian-engineering-lossless-claw.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - Claude Code
last_compiled: '2026-04-05T05:23:35.021Z'
---
# Agent Skills

## What They Are

An agent skill is a named, retrievable unit of procedural knowledge: instructions, examples, and optionally executable scripts that an agent loads at inference time to improve performance on a specific task. Skills sit outside model parameters. You don't retrain to add them; you write a file and register it.

The simplest form is a markdown document with YAML frontmatter. Anthropic's public skills repository [demonstrates this](../../raw/repos/anthropics-skills.md):

```markdown
---
name: my-skill-name
description: A clear description of what this skill does and when to use it
---

# My Skill Name
[Instructions Claude follows when this skill is active]
```

Two fields are required: `name` (a unique identifier) and `description` (which the agent uses to decide whether to invoke the skill). Everything else is freeform instruction text.

## Why Skills Matter

The core problem they solve: agents trained on general data perform poorly on specialized, organization-specific tasks. You can fix this by fine-tuning, by stuffing context with instructions, or by giving agents access to modular capability units they can pull in on demand. Skills are the third option.

Fine-tuning is expensive and brittle. Stuffed-context instructions don't scale across many task types. Skills split the difference: they add task-specific behavior without touching model weights, and they compose.

There's a deeper implication in how Anthropic frames it: skills shift the bottleneck from model parameters to an external registry that agents can inspect and modify. If that registry is writable, agents can accumulate capability over time without human intervention.

## How They Work: Three Implementations

### Static Skills (Anthropic's Model)

[Anthropic's skills repo](../../raw/repos/anthropics-skills.md) implements skills as versioned folder structures. Each skill is a directory containing a `SKILL.md` file. Claude loads the relevant skill based on the description field matching the user's task.

Claude Code exposes these via a plugin marketplace:
```
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
```

After installation, mentioning the relevant task triggers skill loading automatically. The agent reads the skill file, follows its instructions, and the skill's behavior persists for that session.

Skills in this model are static: a human writes them, commits them, and the agent executes them verbatim. Anthropic uses this pattern for production document capabilities (PDF, DOCX, XLSX, PPTX skills are live in Claude.ai for paid plans).

### Self-Evolving Skills (Memento-Skills)

[Memento-Skills](../../raw/repos/memento-teams-memento-skills.md) pushes further. The agent doesn't just read skills; it writes them back.

The architecture runs a read-write reflective loop:

1. A task arrives. The skill router checks the skill library for a matching executable skill.
2. If one exists, the agent runs it. If not, it generates a new one.
3. After execution, a reflection phase evaluates the outcome. Success increases the skill's utility score. Failure triggers optimization of the skill's underlying instructions.

This runs at deployment time with frozen model weights. The skill library (`M`) accumulates experience that would otherwise require retraining.

The v0.2.0 architecture splits what was a monolithic execution phase into dedicated modules: `runner`, `tool_handler`, `step_boundary`, `helpers`. A new `finalize` phase handles structured result summarization. A `core/protocol/` layer defines communication between components. A `tool_bridge/` layer with `args_processor` and `result_processor` handles tool invocation cleanly.

### Strategy-Based Skills (ACE / Kayba)

The [Agentic Context Engine](../../raw/repos/kayba-ai-agentic-context-engine.md) implements a related pattern under the name "Skillbook." Instead of full procedural instructions, it stores learned strategies: compact generalizations extracted from execution traces.

Three roles manage the loop:
- **Agent**: executes tasks, reads from Skillbook
- **Reflector**: analyzes traces, extracts what worked and what failed
- **SkillManager**: curates the Skillbook, adding, refining, and pruning entries

The Recursive Reflector is the distinguishing mechanism: rather than summarizing traces in a single LLM pass, it writes and executes Python code in a sandbox to search for patterns programmatically. This lets it identify non-obvious failure modes.

The pipeline composes as: `AgentStep → EvaluateStep → ReflectStep → UpdateStep → ApplyStep → DeduplicateStep`. Each step declares `requires` and `provides` contracts. The `deduplication` step uses embeddings to merge redundant strategies.

## Retrieval: The Routing Problem

All three implementations face the same core challenge: given a task, which skill(s) apply?

Anthropic's model uses the description field as a routing signal. The agent matches task semantics against skill descriptions. This works when descriptions are well-written; it breaks when skills have overlapping scopes or vague descriptions.

ACE routes by prepending all current Skillbook strategies to the agent's context. This avoids a routing decision but consumes tokens proportional to the number of learned strategies.

Memento-Skills uses a dedicated skill router component, though the routing algorithm isn't fully specified in public documentation.

None of the current implementations have published rigorous evaluations of routing accuracy as a standalone metric.

## Key Numbers

ACE reports on the Tau2 (Sierra Research airline benchmark) with Claude Haiku 4.5:

- **2x consistency** at pass^4 with 15 learned strategies, no reward signals
- **49% token reduction** in browser automation over a 10-run learning curve
- **$1.50** to translate 14,000 lines of Python to TypeScript with zero build errors

These are self-reported. The Tau2 benchmark is publicly available for independent verification, but the specific ACE results haven't been independently replicated as of this writing.

Memento-Skills (916 stars) and ACE (2,112 stars) are both small relative to Anthropic's skills repo (110,064 stars), which benefits from being the official Anthropic implementation.

## Genuine Strengths

**Composability.** Skills stack. An agent can load a PDF extraction skill and a company branding skill simultaneously. Fine-tuning doesn't compose this way.

**Versionability.** Skills are files. You get git history, pull requests, rollback. Model weights don't offer this.

**Deployment-time adaptation.** The self-evolving variants (ACE, Memento-Skills) accumulate capability from live interactions without retraining. This is the most practically significant property for long-running deployments.

**Human auditability.** Unlike learned representations in model weights, skills are readable text. A human can inspect why an agent behaves a certain way.

## Limitations

**Concrete failure mode**: Skill routing degrades with scale. When a skill library grows past a few dozen entries with overlapping scopes, description-based routing produces false positives. An agent loads the wrong skill, follows irrelevant instructions confidently, and produces plausible-sounding but incorrect outputs. There's no error signal unless you have explicit evaluation.

**Unspoken infrastructure assumption**: Write-back skill systems (Memento-Skills, ACE) assume the skill store is a reliable, consistent shared resource. In multi-agent or multi-instance deployments, concurrent writes to the same Skillbook introduce race conditions. Neither system's public documentation addresses this; ACE's architecture docs describe immutable context per step, but Skillbook updates across sessions aren't covered.

**Skill pollution**: Self-evolving systems can learn from anomalies. If the Reflector extracts a strategy from a lucky fluke or an unusual edge case, that strategy degrades future performance on normal inputs. ACE's SkillManager prunes strategies, but the pruning criteria aren't fully specified.

## When Not to Use Skills

**Don't use static skills** when your task distribution is broad and unpredictable. Skills require you to anticipate task categories in advance. For genuinely open-ended agents, skill coverage will always lag task variety.

**Don't use self-evolving skills** in safety-sensitive domains without a human review gate on Skillbook updates. An agent that can modify its own instructions is an agent that can degrade its own safety behaviors over time, especially if the Reflector learns from adversarial inputs.

**Don't use skills as a substitute for RAG** when the relevant knowledge is factual rather than procedural. Skills encode *how to do things*; they're poor containers for *what things are*. Loading a 500-line knowledge base into a skill file is an anti-pattern.

## Unresolved Questions

- How do multi-instance deployments coordinate Skillbook writes? Neither ACE nor Memento-Skills documents a locking or consensus mechanism.
- What's the cost ceiling for Memento-Skills' reflection loop in production? Reflection runs after every task; at high throughput, this adds LLM calls on every request.
- How does skill deduplication interact with legitimately divergent strategies for similar tasks? ACE uses embedding similarity, which may collapse genuinely distinct approaches.
- Anthropic's static skills don't document versioning semantics: what happens to agents mid-session if a skill file is updated?

## Alternatives

| Approach | Use When |
|----------|----------|
| **Fine-tuning** | Task is stable, you have thousands of examples, and inference latency matters more than update frequency |
| **RAG** | The relevant knowledge is factual and high-volume, not procedural |
| **System prompt engineering** | You have one task type and don't need modularity |
| **Static skills** (Anthropic model) | Task types are known in advance, human authorship is acceptable, you want auditability |
| **Self-evolving skills** (ACE, Memento) | Task distribution shifts over time, you want zero-retraining adaptation, you can tolerate non-deterministic skill evolution |

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [Claude Code](../projects/claude-code.md)
