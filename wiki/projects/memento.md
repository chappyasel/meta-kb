---
entity_id: memento
type: project
bucket: agent-memory
abstract: >-
  Memento is a dual-project family (research agent + skills framework) enabling
  LLM agents to improve from experience without weight updates, via case-based
  reasoning and a read-write skill evolution loop.
sources:
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/anthropics-skills.md
  - deep/repos/memento-teams-memento-skills.md
  - repos/agent-on-the-fly-memento.md
  - repos/memento-teams-memento-skills.md
  - tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md
related:
  - agent-skills
last_compiled: '2026-04-08T23:17:41.789Z'
---
# Memento

## What It Is

"Memento" names two related but distinct projects that share a core thesis: LLM agents can accumulate capability through external memory rather than model retraining.

**Memento (research agent)** ([Agent-on-the-Fly/Memento](../raw/repos/agent-on-the-fly-memento.md)) is an academic system with 2,375 stars implementing case-based reasoning (CBR) for continual learning. It frames agent improvement as memory-augmented reinforcement learning over a memory-augmented MDP. The model parameters stay frozen; all learning accumulates in a Case Bank of trajectories.

**Memento-Skills** ([memento-teams/memento-skills](../raw/deep/repos/memento-teams-memento-skills.md)) is a production framework with 916 stars that operationalizes the same thesis through an evolving skill library. Where the research project focuses on trajectory replay, the skills framework focuses on skill rewriting and the [Agent Skills](../concepts/agent-skills.md) ecosystem around agentskills.io.

Both share a homepage at memento.run. This card covers both, with emphasis on the skills framework since it has richer implementation documentation.

## Architectural Uniqueness

Most agent memory systems treat stored knowledge as read-only at inference time. Mem0, Zep, and Letta write memories but those memories are declarative facts, not executable capabilities. Memento-Skills makes the skill library itself mutable: after each task execution, a reflection phase can rewrite the skill that ran, adjust its utility score, or create an entirely new skill from failure analysis. The agent's tool repertoire changes during deployment without touching model weights.

This implements genuine [Continual Learning](../concepts/continual-learning.md) at the capability layer, not the parameter layer. The comparison the README draws is apt: pre-training and fine-tuning update θ; Memento updates M (external skill memory). The bottleneck shifts from compute budget to skill quality.

## Core Mechanism

### The Read-Execute-Reflect-Write Loop (Memento-Skills)

The `core/memento_s/phases/` directory implements a 4+1 stage pipeline:

1. **Intent Recognition**: Classifies the message as `DIRECT | INTERRUPT | CONFIRM | AGENTIC`
2. **Planning**: Decomposes into `PlanStep` objects with explicit `input_from` dependency edges, forming a DAG. The `validate_plan()` function checks no forward references or self-references exist.
3. **Execution**: A ReAct loop (max 30 turns) per skill. The `ToolBridge` in `tool_bridge/` handles argument validation and result normalization.
4. **Reflection**: A supervisor that emits one of five decisions: `CONTINUE | IN_PROGRESS | REPLAN | FINALIZE | ASK_USER`. Budget constraints cap this at 5 ReAct iterations per step and 2 replans per run; exhausted budgets force hard overrides to prevent infinite loops.
5. **Finalize**: Structured result summarization.

After reflection, the system writes back: successful skills get utility score increments; failed skills get prompt/code rewrites or replacement. This is the loop that makes the skill library mutable.

### Case-Based Reasoning (Research Agent)

The research Memento stores final-step tuples `(s_T, a_T, r_T)` in a Case Bank. A CBR-driven Planner retrieves relevant past cases when decomposing new tasks. Two retrieval modes exist: non-parametric (semantic similarity over stored cases) and parametric (a neural case-selection policy that learns which cases transfer well). The parametric variant requires PyTorch with CUDA.

A two-stage architecture separates concerns: a Meta-Planner using GPT-4.1 handles decomposition and case retrieval; an Executor using o3 runs individual subtasks via MCP tools. This lets different models handle different cognitive demands.

### Skill Retrieval

The `skill/retrieval/` module implements `MultiRecall`: parallel search across three strategies that run simultaneously, then merge results with local-first priority.

- `LocalFileRecall`: BM25 keyword search over SKILL.md files on disk
- `LocalDbRecall`: Semantic vector search via sqlite-vec embeddings
- `RemoteRecall`: HTTP search against the cloud skill catalogue

If a skill exists locally and in the cloud under the same name, the local version wins. This supports user customization but can block access to improved cloud versions.

### Loop and Saturation Detection

`loop_detector.py` implements four distinct behavioral patterns that abort runaway execution:

- **Observation chain**: Six consecutive "observation" tool calls with no effect actions triggers a RESEARCH LOOP warning
- **Low effect ratio**: In a 10-action sliding window, effect tools (file creation/modification) below 15% signals information hoarding
- **Diminishing returns**: Three consecutive observations finding ≤1 new entity each
- **Repeating sequence**: Exact 2-tool or 3-tool patterns (A-B-A-B or A-B-C-A-B-C) in the last 4-6 calls

`error_recovery.py` normalizes error fingerprints by replacing variable content (line numbers, paths, strings) with placeholders, enabling duplicate detection across different error instances. Eight named error patterns include `stateless_variable_loss`, `syntax_chinese_quotes`, and `infinite_retry_loop`.

### Skill Data Model

Skills are Pydantic models with:

```python
class Skill(BaseModel):
    execution_mode: Optional[ExecutionMode]  # KNOWLEDGE or PLAYBOOK
    version: int                              # Increments on rewrite
    utility_score: float                      # Updated after execution
    parameters: Optional[dict]               # OpenAI-compatible schema
    allowed_tools: list[str]                 # Tool whitelist
    required_keys: list[str]                 # Required API keys
```

`ExecutionMode` auto-infers from directory structure: if the skill folder contains files beyond SKILL.md, it is a `PLAYBOOK` (executable scripts); otherwise `KNOWLEDGE` (the SKILL.md text provides context). This matters because playbook scripts execute without entering the context window.

### Context Compaction

`compaction.py` implements two-level compression. Single messages exceeding a token threshold get LLM-summarized to 800 tokens. When total context exceeds threshold, all non-system messages merge into one summary that the LLM generates while explicitly preserving plan execution state from `AgentRunState`. A scratchpad stores the full record for retrieval later.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| Research agent stars | 2,375 | GitHub, self-reported |
| Skills framework stars | 916 | GitHub, self-reported |
| GAIA benchmark | "Competitive results" | Self-reported, no specific score cited |
| HLE benchmark | "Improves over rounds" | Self-reported |
| Built-in skills | 10 | Self-reported |
| Max ReAct turns per skill | 30 | Code |
| Max replans per run | 2 | Code |

The GAIA and HLE results appear in the README figures but no specific accuracy numbers are cited in the available documentation. Treat performance claims as self-reported and unverified against independent leaderboard entries.

## Strengths

**Mutable skill library**: The write-back loop is the most complete implementation of deployment-time capability evolution in the open-source ecosystem. Skills version, degrade, and improve based on execution outcomes.

**Safety depth**: Loop detection, saturation detection, eight named error recovery patterns, tool gating, and path validation compose into layered execution safety. Most skill frameworks provide none of this.

**Six deployment surfaces**: CLI, desktop GUI (Flet), Feishu, DingTalk, WeCom, and WeChat. AG-UI protocol compatibility enables integration with standard frontends.

**Hybrid skill retrieval**: BM25 plus semantic vector search catches both keyword-exact and semantically similar skills that pure embedding search would miss.

**[agentskills.io](../concepts/agent-skills.md) compliance**: Skills follow the same YAML frontmatter spec as Anthropic's reference implementation, enabling cross-ecosystem skill sharing.

## Critical Limitations

**Reflection quality bounded by the base model**: The reflection phase uses the same LLM to diagnose failures and rewrite skills. A model that cannot articulate why a skill failed cannot improve it. Self-evolution quality has a ceiling set by the LLM's analytical capability, not by the framework.

**Unspoken infrastructure assumption**: The cloud skill marketplace downloads and executes LLM-generated code in a local sandbox. The `tool_gate` and `path_validator` mitigate path traversal and tool misuse, but a skill containing adversarial instructions from the marketplace would pass these controls if the tool calls themselves are permitted. This is a supply chain risk that the documentation does not address.

**Concrete failure mode**: A skill that fails due to external factors (API rate limit, network timeout) has its utility score penalized as though the skill itself is defective. Repeated transient failures can cause the system to rewrite a perfectly good skill, replacing it with an LLM-generated alternative that may be worse. There is no mechanism to distinguish skill-caused failures from environment-caused failures.

## When NOT to Use It

**Don't use Memento-Skills** if you need auditable, stable skill behavior. The write-back loop can silently rewrite skills between runs. If your application requires that a skill behaves identically on Monday and Friday, the mutable skill store is a liability, not a feature.

**Don't use the research Memento** if you need low-latency responses. The parametric CBR variant requires PyTorch with CUDA, adds case retrieval overhead before planning, and uses GPT-4.1 for decomposition. For simple query-answer tasks, this architecture adds cost without benefit.

**Don't use either** if your team cannot read Chinese. Much of the codebase documentation, comments, and variable naming in Memento-Skills is in Chinese. The code structure is clear, but embedded documentation requires translation for non-Chinese-speaking contributors.

## Unresolved Questions

**Cost at scale**: The cloud skill marketplace has no published pricing. Downloading and executing cloud skills at volume introduces unknown costs and rate limits.

**Conflict resolution in multi-user deployments**: The skill store assumes a single agent instance owns the library. Multiple agents writing back to the same skill store simultaneously would create write conflicts. The documentation does not address this.

**Utility score calibration**: The utility score mechanism increments on success and decrements on failure, but the starting value, increment size, and decay function are not documented. There is no guidance on when a skill should be considered "learned" versus still evolving.

**Governance of evolved skills**: When the system rewrites a skill, there is no automated test suite validating the new version. The improvement relies entirely on LLM judgment. No mechanism exists for a human operator to review skill rewrites before they take effect.

## Alternatives

| System | Use when |
|--------|----------|
| [Mem0](../projects/mem0.md) | You need declarative memory (facts, preferences) not executable skills, with a managed API |
| [Letta](../projects/letta.md) | You want [MemGPT](../projects/memgpt.md)-style long-term memory with a production API surface |
| [Voyager](../projects/voyager.md) | You're building in Minecraft or need a reference implementation of skill accumulation via code generation |
| [Agent Workflow Memory](../projects/agent-workflow-memory.md) | You want workflow-level memory (reusable plans) rather than skill-level memory |
| [Anthropic Skills repo](../concepts/agent-skills.md) | You want static, auditable skills with marketplace distribution and no write-back mutation |
| [LangGraph](../projects/langgraph.md) | You need graph-structured agent workflows with production observability, not self-evolving capabilities |

Choose Memento-Skills when the task domain is broad and unpredictable, the agent will run long enough to accumulate meaningful experience (dozens to hundreds of tasks), and you can tolerate non-deterministic skill behavior in exchange for improving success rates over time.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md): The agentskills.io spec that Memento-Skills implements
- [Procedural Memory](../concepts/procedural-memory.md): The memory type that executable skills represent
- [Agent Memory](../concepts/agent-memory.md): The broader category Memento operates within
- [Continual Learning](../concepts/continual-learning.md): The learning paradigm Memento implements without weight updates
- [Self-Improving Agents](../concepts/self-improving-agents.md): The agent class Memento belongs to
- [ReAct](../concepts/react.md): The reasoning loop Memento-Skills uses in its execution phase
- [Reflexion](../concepts/reflexion.md): A related approach using verbal reflection for agent improvement
