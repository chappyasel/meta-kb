---
entity_id: skill-composition
type: approach
bucket: agent-systems
sources:
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - repos/memodb-io-acontext.md
  - repos/gepa-ai-gepa.md
  - repos/affaan-m-everything-claude-code.md
related:
  - Claude
  - Execution Traces
  - Agent Skills
last_compiled: '2026-04-04T21:17:20.081Z'
---
# Skill Composition

## What It Is

Skill composition is the practice of breaking agent behavior into discrete, reusable atomic units ("skills") and combining them to address complex tasks. Rather than encoding all logic into a single monolithic prompt or agent, skills are modular building blocks—context-triggered automation, callable sub-procedures, or distilled knowledge fragments—that can be assembled, versioned, and reused across contexts.

The core insight is that agent capability should be *composable* rather than monolithic: a complex task decomposes into a sequence or graph of simpler, well-defined skills, each of which can be tested, edited, and improved independently.

## Why It Matters

Most agents fail because they try to solve everything in one shot with one giant context. Skill composition addresses several structural problems:

- **Context fragmentation**: Without explicit skill structure, each new task starts from scratch. Composed skills let agents reuse validated behavior without re-prompting from zero.
- **Debuggability**: When a composed workflow fails, you can isolate which skill failed rather than auditing an undifferentiated blob of reasoning.
- **Portability**: Skills defined as files or structured artifacts can move across frameworks, models, and projects.
- **Iterability**: Individual skills can be optimized independently without destabilizing the whole pipeline.

## How It Works

Skill composition typically involves three layers:

**1. Skill Definition**
Atomic skills are defined explicitly—often as markdown files, prompt templates, or structured code. In Claude Code projects, these live in a `skills/` directory and trigger on context signals. In systems like Acontext, skills are distilled from execution traces and stored as human-readable files rather than opaque vector embeddings. [Source](../../raw/repos/memodb-io-acontext.md)

**2. Skill Invocation**
Skills are triggered either explicitly (by an orchestrator calling a named skill) or contextually (by matching current task state to a skill's activation condition). The agent's job becomes: recognize the situation, select the relevant skills, sequence them appropriately.

**3. Skill Improvement**
Execution traces record how skills performed. Systems like GEPA read full traces to diagnose failures and mutate skill definitions—prompt text, code, configurations—without collapsing rich failure information to a scalar reward signal. This enables skill refinement with significantly fewer LLM evaluations than RL-based approaches. [Source](../../raw/repos/gepa-ai-gepa.md)

## Who Implements It

- **Acontext** treats agent memory as a skill layer—skills are distilled from execution traces, stored as structured files, and retrieved compositionally rather than via embedding similarity. Reframes memory as a skill composition problem rather than a retrieval problem. [Source](../../raw/repos/memodb-io-acontext.md)
- **Claude (via Claude Code)**: The `.claude/` folder pattern separates `rules/`, `commands/`, `skills/`, and `agents/` into distinct directories. Skills provide context-triggered automation; agents provide isolated subagent execution. This is treated as versioned infrastructure, not ad-hoc prompting. [Source](../../raw/tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md)
- **GEPA**: Optimizes agent architectures and skill definitions via reflective text evolution, directly targeting the skill composition layer as a text parameter to improve. [Source](../../raw/repos/gepa-ai-gepa.md)

## Concrete Example

A code review agent composed from skills might invoke:

1. `syntax-check` → validate code parses
2. `security-scan` → match known vulnerability patterns  
3. `style-lint` → check against project conventions
4. `summarize-findings` → produce human-readable output

Each skill can be written, tested, and improved independently. When security-scan produces false positives, you fix that skill in isolation. The orchestration logic (sequencing, branching) is separate from the skill logic.

## Strengths

- Reuse: Skills written once can apply across many tasks and projects
- Human-readable: Skill files can be audited, edited, and version-controlled
- Composable optimization: Each skill can be targeted for improvement independently
- Failure isolation: Debugging traces to a specific skill rather than entire agent runs

## Limitations

- **Interface coupling**: Skills must agree on input/output formats; compositional chains break when interfaces drift
- **Skill discovery**: With many skills, selecting the right one at runtime becomes its own retrieval or routing problem
- **Granularity tension**: Too-coarse skills lose reusability; too-fine skills create coordination overhead
- **Not a silver bullet for reasoning**: Skill composition handles *procedural* complexity well, but doesn't resolve fundamental LLM reasoning failures within a skill

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md) — the atomic units being composed
- [Execution Traces](../concepts/execution-traces.md) — the mechanism by which skill performance is captured and used for improvement
