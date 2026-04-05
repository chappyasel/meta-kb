# Letta

> Stateful agent platform (formerly MemGPT) where agents directly read and write persistent memory_blocks that survive across conversations, making memory a first-class action in the agent's tool space rather than an external service.

## What It Does

Letta gives agents labeled memory blocks (e.g., "human", "persona", custom blocks) that the agent can read and modify as tool calls during conversation. Instead of an external system deciding what to remember, the agent itself chooses what to store, update, and retrieve. This makes memory an action the agent takes, not a side effect. Available as a CLI tool (Letta Code) for terminal-based agent sessions and as a hosted API with Python and TypeScript SDKs for embedding stateful agents into applications.

## Architecture

Python server exposing a full agents API. Each agent has a set of `memory_blocks` defined at creation time -- key-value pairs with labels like "human" and "persona" that persist across all message exchanges. The agent accesses these blocks through built-in tools alongside user-defined tools (web_search, fetch_webpage, etc.). Supports skills and subagents for composition. Model-agnostic: recommends Opus 4.5 and GPT-5.2 but works with any provider. The Letta Code CLI runs agents locally on your machine with file system access. The platform version (app.letta.com) provides hosted infrastructure with API key authentication.

## Key Numbers

- 21,873 GitHub stars, 2,312 forks
- Formerly MemGPT (rebranded)
- Apache-2.0 license
- SDKs in Python and TypeScript
- Model leaderboard at leaderboard.letta.com

## Strengths

- Memory-as-action-space is architecturally distinct: the agent decides what to remember, giving it agency over its own learning rather than relying on external extraction heuristics
- Cross-session persistence is built into the core abstraction, not bolted on
- Dual deployment modes (local CLI and hosted API) serve both individual developers and production teams
- Skill and subagent composition enables complex multi-agent workflows with shared memory

## Limitations

- Agent-managed memory means the agent can write bad memories or forget to update them; no external validation layer
- Memory blocks are flat key-value pairs, not structured graphs; complex relational knowledge requires manual block design
- The MemGPT rebrand creates confusion in documentation and community references

## Alternatives

- [Mem0](mem0.md) -- use when you want an external system to automatically extract and manage memories rather than relying on the agent itself
- [Graphiti](graphiti.md) -- use when you need temporal knowledge graphs with validity windows and episode provenance

## Sources

- [letta-ai/letta](../../raw/repos/letta-ai-letta.md) -- "Build AI with advanced memory that can learn and self-improve over time"
