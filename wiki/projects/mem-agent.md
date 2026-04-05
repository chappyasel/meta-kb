# mem-agent

> A 4B LLM agent trained with GSPO to manage an Obsidian-inspired markdown memory system through Python tools, enabling dynamic memory that evolves during conversation rather than static RAG retrievals -- scoring 75% on its custom benchmark, second only to Qwen3-235B.

## What It Does

mem-agent is a 4B parameter LLM specifically trained with reinforcement learning (GSPO) to manage a persistent markdown-based memory system. Inspired by Obsidian's note-taking model, the agent uses Python tool calls to create, read, update, and delete markdown files organized in a hierarchical structure with cross-references via wiki-style links. The agent handles three core tasks: retrieval (finding relevant information from memory), update (modifying memory with new information), and clarification (asking users when queries are ambiguous or contradict existing memory). Released with model weights, training code, a data generation pipeline, and an MCP server for integration with Claude Code and Cursor.

## Architecture

- **Scaffold**: Obsidian-inspired markdown filesystem with `user.md` (root profile), `entities/` directory for linked entity files, and wiki-style `[[path/to/file.md]]` links
- **Tools**: File operations (create, read, update, delete, check), directory operations (create, list), and utilities (get_size, go_to_link) -- all called via Python code blocks
- **Agent loop**: `<think>` (reasoning) -> `<python>` (actions) -> environment feedback -> `<reply>` (final answer). The `<think>` tag aligns with Qwen3 thinking format
- **Training**: GSPO (Group Score Policy Optimization) with synthetically generated graph-based training data covering retrieval, update, and clarification tasks
- **Deployment**: Standalone model, plus mem-agent-mcp (Model Context Protocol server) for integration with Claude Code, Cursor, and other MCP-compatible tools

## Key Numbers

- Model: driaforall/mem-agent on HuggingFace (4B parameters, based on Qwen3)
- **75% on md-memory-bench** (hand-crafted benchmark), second only to Qwen3-235B-A22B-Thinking
- Benchmark: md-memory-bench with retrieval, update, and clarification tasks
- Published: HuggingFace blog, October 2025
- Code: github.com/firstbatchxyz/mem-agent

## Strengths

- Training a small (4B) model specifically for memory management via RL is a compelling approach -- the resulting agent outperforms much larger models on memory-specific tasks, suggesting memory management is a learnable skill rather than an emergent capability
- The Obsidian-inspired markdown scaffold is human-readable and inspectable, and the MCP server makes integration with existing tools straightforward

## Limitations

- The 4B model size limits general reasoning capability, so the agent may struggle with complex queries that require both memory management and sophisticated reasoning
- The markdown memory format with strict path conventions (e.g., `[[entities/dria.md]]` not `[[dria]]`) is brittle and requires the agent to learn exact formatting, which may not generalize to other memory layouts

## Alternatives

- [mem-alpha.md](mem-alpha.md) -- use when you want RL-trained memory with a three-tier (episodic/semantic/core) architecture rather than flat markdown files
- [claude-memory-engine.md](claude-memory-engine.md) -- use when you want markdown-based memory for Claude Code specifically, with correction loops and reflection cycles
- [memorilabs-memori.md](memorilabs-memori.md) -- use when you want transparent LLM client wrapping rather than a dedicated memory-trained model

## Sources

- [hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md](../../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md) -- "mem-agent, a 4B LLM agent trained with GSPO on a scaffold that uses Python tools and markdown files to equip an LLM with memory... scores 75% on the benchmark, second only to Qwen3-235B-A22B-Thinking"
