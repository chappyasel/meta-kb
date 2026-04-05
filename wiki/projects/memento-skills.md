# Memento Skills

> A deployment-time learning framework where agents autonomously design, refine, and evolve their own skills through a read-write reflection loop -- eliminating the need for retraining while building cumulative skill memory from live interactions.

## What It Does

Memento Skills lets you deploy an agent and let it learn, rewrite, and evolve its own capabilities. When a user submits a task, the agent uses a skill router to either retrieve an executable skill from its skill library or generate a new one from scratch. After execution, the system reflects on the outcome: successful actions increase the skill's utility score; failed actions trigger optimization of the underlying skill. This continuous read-write loop enables progressive capability expansion entirely without updating the LLM parameters.

## Architecture

The framework implements a four-stage pipeline with a dedicated finalize phase:

- **Skill Router**: Matches incoming tasks to existing skills or triggers new skill generation
- **Execution Pipeline**: Split into dedicated sub-modules (runner, tool_handler, step_boundary, helpers) for fine-grained control over multi-step reasoning
- **Reflection Loop**: Analyzes execution outcomes, writes back to the skill library -- reinforcing successful patterns and optimizing failed ones
- **Tool Bridge System**: Clean tool invocation layer with argument processing, result processing, and context management
- **Execution Policies**: Safety modules including tool gates, path validators, pre-execute checks, error recovery, and loop detection

The system supports 10 built-in skills, CLI and GUI interfaces, local sandbox execution, and integration with Chinese IM platforms (Feishu, DingTalk, WeCom, WeChat).

## Key Numbers

- **916 GitHub stars**, 84 forks
- Written in Python 3.12+, fully self-developed framework (no LangChain/LlamaIndex dependency)
- v0.2.0 represents a major architectural upgrade with bounded context redesign
- Supports open-source LLMs (Kimi, MiniMax, GLM)

## Strengths

- The "deployment-time learning" paradigm keeps model parameters frozen while accumulating experience in external skill memory, enabling continual adaptation at zero retraining cost
- Bounded context architecture and execution policies provide production-grade safety controls that most skill evolution systems lack

## Limitations

- Tightly integrated with Chinese IM platforms, which may limit adoption for English-first teams
- The skill evolution quality depends on the reflection module's accuracy -- poor reflections compound into degraded skills over time

## Alternatives

- [agentic-context-engine.md](agentic-context-engine.md) -- similar persistent learning loop but organized around a Skillbook of strategies rather than executable skill folders
- [voyager.md](voyager.md) -- skill library pattern in an embodied agent context (Minecraft) with different verification mechanisms

## Sources

- [memento-teams-memento-skills.md](../../raw/repos/memento-teams-memento-skills.md) -- "Deploy an agent. Let it learn, rewrite, and evolve its own skills... Deployment-time learning keeps parameters frozen and instead accumulates experience in an external skill memory, enabling continual adaptation from live interactions at zero retraining cost."
