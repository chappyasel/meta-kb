# Acontext

> Open-source skill memory layer that automatically captures learnings from agent runs and stores them as human-readable, editable, portable markdown skill files. Key differentiator: memory is structured as skill files you can read, edit, and share -- not opaque vectors.

## What It Does

Acontext watches agent sessions and, when tasks complete or fail, triggers a distillation step where an LLM infers what worked, what failed, and user preferences from the conversation and execution trace. A Skill Agent then decides whether to update an existing skill file or create a new one, writing according to a user-defined `SKILL.md` schema. On subsequent runs, agents recall skills through progressive disclosure tools (`get_skill`, `get_skill_file`) rather than embedding-based search. Skills are plain markdown files usable with LangGraph, Claude, Vercel AI SDK, or anything that reads files. They can be exported as ZIP, reused across agents and LLMs, and version-controlled with git.

## Architecture

Client-server model. Backend runs as Docker containers: FastAPI API server, PostgreSQL, S3, Redis, RabbitMQ. Python and TypeScript SDKs communicate via REST. Learning spaces group related sessions; distillation runs in the background automatically. The system also provides a virtual persistent filesystem (Disk), isolated code execution (Sandbox) with mountable skills, and agent tools for LLM function calling. Self-hostable via `acontext server up` or cloud-hosted at acontext.io. Dashboard at localhost:3000 for managing skills and sessions.

## Key Numbers

- 3,264 GitHub stars, 307 forks
- Python (PyPI) and TypeScript (npm) SDKs
- Apache-2.0 license
- Integrates with Claude Code, OpenClaw, Vercel AI SDK, Agno, smolagents, OpenAI Agent SDK
- Self-hostable or cloud-hosted

## Strengths

- Skill-as-memory inverts the RAG paradigm: retrieval is by agent reasoning and tool use, not semantic top-k, eliminating irrelevant context pollution
- Plain markdown files mean skills are inspectable, debuggable, and portable across any framework without migration
- Progressive disclosure (list_skills -> get_skill -> get_skill_file) controls token budget naturally

## Limitations

- Requires a full backend stack (PostgreSQL, Redis, RabbitMQ, S3) for self-hosting, which is heavy for individual developers
- Learning quality depends on the LLM doing distillation; extraction from long sessions with mixed outcomes can be noisy
- No built-in mechanism for skill deprecation or conflict resolution when multiple sessions produce contradictory learnings

## Alternatives

- [napkin.md](napkin.md) — use when you want local-first file-based memory without any server infrastructure
- [autocontext.md](autocontext.md) — use when you want validated playbook distillation with multi-agent analysis loops
- [memento.md](memento.md) — use when the goal is case-based reasoning over trajectories rather than skill file accumulation

## Sources

- [../../raw/repos/memodb-io-acontext.md](../../raw/repos/memodb-io-acontext.md) — "automatically captures learnings from agent runs and stores them as agent skill files — files you can read, edit, and share across agents, LLMs, and frameworks"
