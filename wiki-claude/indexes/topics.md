# Topics Index

Key concepts covered in this knowledge base, with links to concept cards and relevant synthesis articles.

## Core Concepts

| Concept | Card | Primary Article |
|---------|------|----------------|
| The Karpathy Pattern (LLM-Compiled Wiki) | [Card](../concepts/karpathy-pattern.md) | [Knowledge Bases](../knowledge-bases.md) |
| Episodic vs Semantic Memory | [Card](../concepts/episodic-semantic-memory.md) | [Agent Memory](../agent-memory.md) |
| Progressive Disclosure | [Card](../concepts/progressive-disclosure.md) | [Context Engineering](../context-engineering.md) |
| The Autoresearch Loop | [Card](../concepts/autoresearch-loop.md) | [Self-Improving](../self-improving.md) |
| Context Rot | [Card](../concepts/context-rot.md) | [Context Engineering](../context-engineering.md) |
| Reward Hacking | [Card](../concepts/reward-hacking.md) | [Self-Improving](../self-improving.md) |
| Temporal Knowledge Graphs | [Card](../concepts/temporal-knowledge-graphs.md) | [Agent Memory](../agent-memory.md) |

## Additional Topics

These topics are covered in synthesis articles but don't have dedicated concept cards.

### Knowledge Bases
- **GraphRAG** — Graph-based knowledge indexing with community summaries for corpus-level questions. See [Knowledge Bases](../knowledge-bases.md).
- **Reasoning-Based Retrieval** — Using LLM reasoning instead of vector similarity for document retrieval. See [Knowledge Bases](../knowledge-bases.md).
- **RAG Failure Modes** — Retrieval thrash, tool storms, context bloat in agentic RAG. See [Knowledge Bases](../knowledge-bases.md).

### Agent Memory
- **Multi-Level Memory Abstraction** — User/session/agent memory layers decoupled from LLM choice. See [Agent Memory](../agent-memory.md).
- **Memory Evolution** — Systems that evolve both memory content and memory architecture. See [Agent Memory](../agent-memory.md).
- **Hierarchical Context Management** — Compaction trees, DAG summarization, tiered loading. See [Agent Memory](../agent-memory.md).
- **Forgetting Curves** — Ebbinghaus-inspired selective memory decay for bounded growth. See [Agent Memory](../agent-memory.md).

### Context Engineering
- **CLAUDE.md Standard** — Markdown-based instruction files for coding agents. See [Context Engineering](../context-engineering.md).
- **Instruction Layering** — Separating rules, hooks, skills, and agents into distinct mechanisms. See [Context Engineering](../context-engineering.md).
- **Context Compression** — Selective token removal, prompt compression, task-aware pruning. See [Context Engineering](../context-engineering.md).
- **Evolving Contexts** — Treating context as living playbooks updated through execution feedback. See [Context Engineering](../context-engineering.md).
- **Context Graphs** — Graph structures encoding organizational judgment and decision traces. See [Context Engineering](../context-engineering.md).

### Agent Systems
- **SKILL.md Standard** — YAML-frontmattered markdown format for modular agent skills. See [Agent Systems](../agent-systems.md).
- **Skill Composition** — Chaining and orchestrating multiple skills for complex workflows. See [Agent Systems](../agent-systems.md).
- **Skill Security** — Governance frameworks, vulnerability detection, trust models. See [Agent Systems](../agent-systems.md).
- **CLI-Native Architecture** — Building products for agent consumption via terminal interfaces. See [Agent Systems](../agent-systems.md).
- **Role-Based Skill Composition** — Specialist agent roles (CEO, designer, QA) in sprint workflows. See [Agent Systems](../agent-systems.md).

### Self-Improving Systems
- **Autoresearch as Reward Function Design** — Evaluation criteria as reward functions with constraint modeling. See [Self-Improving](../self-improving.md).
- **Meta-Improvement** — Agents improving how they improve (HyperAgents/DGM-H). See [Self-Improving](../self-improving.md).
- **Algorithmic Circuit Breakers** — Safety containment for continuous self-improvement. See [Self-Improving](../self-improving.md).
- **Deployment-Time Skill Evolution** — Agents creating/refining skills at runtime without retraining. See [Self-Improving](../self-improving.md).
