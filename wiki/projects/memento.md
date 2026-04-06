---
entity_id: memento
type: project
bucket: agent-memory
abstract: >-
  Memento is a two-project ecosystem for persistent agent memory: a case-based
  reasoning framework (2.4k stars) that improves agent performance without
  fine-tuning, and Memento-Skills (916 stars) that extends this into a
  self-evolving skill library where agents rewrite their own capabilities at
  runtime.
sources:
  - repos/agent-on-the-fly-memento.md
  - repos/memento-teams-memento-skills.md
  - deep/repos/anthropics-skills.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Agent Skills
last_compiled: '2026-04-05T23:17:01.204Z'
---
# Memento

## What It Is

Memento is two related but distinct projects sharing a name and research lineage. The original **Memento** (Agent-on-the-Fly/Memento, 2,375 stars) is a memory-augmented agent framework that achieves continual learning without updating model weights, using case-based reasoning over stored trajectories. **Memento-Skills** (memento-teams/memento-skills, 916 stars) extends this approach into a full agent runtime where skills are mutable entities that the agent can rewrite during execution.

Both projects implement the same core thesis: model parameters `θ` stay frozen, and all adaptation accumulates in external memory `M`. The difference is scope. Memento stores trajectories and retrieves them to steer planning. Memento-Skills goes further, treating skills as a living knowledge base that grows through a Read-Execute-Reflect-Write loop.

## Architecture: Memento (Core)

The original Memento uses a **Planner-Executor** architecture with a Case Bank at its center.

**Case Bank**: Stores final-step tuples `(s_T, a_T, r_T)` from past executions. Both successful and failed trajectories are stored. The case-selection policy is a neural retriever that finds the most relevant cases for a new task, enabling value-based retrieval rather than keyword matching.

**Meta-Planner**: Decomposes high-level queries into subtasks using GPT-4.1. Retrieves cases from the Case Bank to inform decomposition. This is case-based reasoning applied to planning, not just execution.

**Executor**: Runs individual subtasks via MCP tools, writes outcomes back to the Case Bank. Supports vLLM for local model deployment via `client/agent_local_server.py`.

**Two retrieval modes**:
- Non-parametric CBR: Direct embedding-based case retrieval (open-sourced August 2025)
- Parametric CBR: Neural case-selection policy trained on experience replay (open-sourced October 2025, requires PyTorch 2.0+ with CUDA)

**Tool layer**: SearxNG web search, SerpAPI, multi-format document processing (PDF, Office, images, video via FFmpeg), sandboxed Python execution, and Excel/math tools, all exposed through a unified MCP interface.

## Architecture: Memento-Skills

Memento-Skills is the more architecturally ambitious project. It implements a full 4+1 stage pipeline:

```
Intent Recognition → Planning → Execution → Reflection → Finalize
```

The codebase uses Bounded Context design with three domains: `core/` (agent orchestrator + skill framework), `middleware/` (config, LLM client via litellm, storage, sandbox, IM gateways), and interface layers (Flet GUI, Typer CLI).

### The Read-Execute-Reflect-Write Loop

**Read** (`skill/retrieval/`): `MultiRecall` runs three parallel retrieval strategies: `LocalFileRecall` (BM25 keyword search over SKILL.md files), `LocalDbRecall` (sqlite-vec semantic search), and `RemoteRecall` (cloud marketplace HTTP API). Local skills always override cloud skills of the same name.

**Execute** (`skill/execution/`): A controlled ReAct loop with a hard ceiling of 30 turns per skill. Three distinct safety mechanisms run concurrently:
- `LoopDetector`: Four pattern detectors covering observation chains (threshold: 6 consecutive observation tools), low effect ratio (below 15% in a 10-action window), diminishing returns (≤1 new entity in last 3 observations), and repeating 2-3 tool sequences
- `StatefulErrorPatternDetector`: 8 predefined error patterns including `stateless_variable_loss`, `syntax_chinese_quotes`, `module_not_found`, and `infinite_retry_loop`. Error fingerprinting normalizes messages by replacing variable content (paths, line numbers, strings) with placeholders to detect duplicate errors across different instances
- `InfoSaturationDetector`: Similarity threshold 0.6, entity overlap threshold 0.7

**Reflect** (`phases/`): The Reflection phase acts as a supervisor with five decisions: `CONTINUE`, `IN_PROGRESS`, `REPLAN`, `FINALIZE`, `ASK_USER`. Budget constraints are hard: 5 React iterations per step, 2 replans per run. When budgets exhaust, overrides force the decision forward to prevent infinite retry loops.

**Write**: On failure, the system can update utility scores, rewrite skill prompts and code, or create new skills. There is no automated test suite for evolved skills; quality depends entirely on the LLM's failure analysis.

### Skill Data Model

Skills are Pydantic models with `ExecutionMode` (`KNOWLEDGE` or `PLAYBOOK`), auto-inferred from directory structure: if a skill directory contains files beyond SKILL.md, it becomes a playbook. Key fields include `utility_score`, `version`, `dependencies`, `required_keys`, `allowed_tools`, and `parameters` in OpenAI/Anthropic-compatible schema format.

The `SkillGateway` is the single external interface, providing directory operations (`discover`, `search`), runtime execution with pre-execution gates (API key checks, policy validation), and governance (SkillStatus, SkillErrorCode, structured diagnostics).

### Planning Phase

`PlanStep` objects include an `input_from: list[int]` field that creates an explicit data flow DAG between steps. `validate_plan()` enforces no forward references and no self-references before execution begins.

### Context Management

`compaction.py` implements two-level compression: per-message compression when a single message exceeds a token threshold (target: 800 tokens), and full conversation compaction that merges all non-system messages into an LLM-generated summary. Plan execution status from `AgentRunState` is annotated "MUST preserve" in the summarization prompt. Unlike gstack's filesystem checkpointing approach, Memento-Skills uses LLM summarization, which risks information loss under compression.

## Key Numbers

**Memento** (core): 2,375 stars, 276 forks. Benchmarks on GAIA (validation and test sets), HLE, SimpleQA, and DeepResearcher. Performance curves show improvement across memory iteration rounds on both in-distribution and OOD datasets. Self-reported by the authors; independent validation not confirmed.

**Memento-Skills**: 916 stars, 84 forks. Paper (arXiv:2603.18743) evaluates on HLE and GAIA, showing skill library growth correlates with task success rate improvement. Self-reported.

## Strengths

**No retraining required**: Both projects deliver genuine capability improvement without touching model weights. For teams that cannot afford fine-tuning pipelines, this is the primary practical advantage.

**Deployment-time adaptation**: Memento-Skills can improve from live production interactions. When the agent encounters a failure pattern it cannot handle, it writes a new skill and that skill is available for the next similar task.

**Safety architecture in execution**: The loop detection and error pattern systems in Memento-Skills are well-engineered. The `get_error_fingerprint()` normalization approach handles the common problem of detecting semantically identical errors that differ in surface form.

**Multi-surface deployment**: Memento-Skills ships CLI, desktop GUI (Flet), and IM bridges for Feishu, DingTalk, WeCom, and WeChat. Rare for a research-originated project.

## Critical Limitations

**Failure mode: reflection quality ceiling**. The system uses the same LLM to execute tasks, detect failures, analyze root causes, and rewrite skills. If the model cannot articulate why a skill failed, the rewrite will be low-quality or counterproductive. No automated regression testing exists for evolved skills; a skill rewrite could silently degrade performance on cases the failure analysis did not consider.

**Unspoken infrastructure assumption**: Memento-Skills' cloud skill marketplace downloads and executes LLM-generated code in a local sandbox. The `tool_gate` and `path_validator` policies provide some defense, but the trust model assumes the cloud catalogue is not adversarial. Teams in regulated environments or with strict supply chain requirements need to audit this surface before using cloud skills.

## When Not to Use It

**Latency-sensitive production systems**: The ReAct loop (up to 30 turns per skill), multi-recall retrieval across three parallel strategies, and reflection phase add substantial overhead. The hard budget overrides (5 iterations, 2 replans) prevent worst-case infinite loops but still permit significant per-request latency.

**Teams needing reproducibility guarantees**: Because skills can rewrite themselves at runtime, the same query can produce different behavior before and after a skill evolution event. Debugging is harder when the system's behavior changes between runs. The utility score signal is also noisy: a skill can fail due to transient external factors (rate limits, network errors) and receive a penalty that triggers unnecessary rewrites.

**Non-Chinese-speaking teams without documentation tolerance**: The codebase has Chinese-language comments, variable names, and embedded documentation throughout. The code structure is sound, but contributors will need translation tooling for the deeper implementation layers.

## Unresolved Questions

**Governance of evolved skills**: The documentation does not specify who owns a skill that the agent rewrites. If a skill is downloaded from the cloud marketplace and then modified locally, what happens when the cloud version updates? The local-first reranking policy means local versions always win, but there is no version reconciliation mechanism.

**Cost at scale**: The full Read-Execute-Reflect-Write loop across 30-turn ReAct, parallel multi-recall retrieval, and LLM-based reflection phases costs significantly more per query than a direct LLM call. No cost analysis is published. The parametric CBR mode in the core Memento project requires PyTorch + CUDA, adding infrastructure cost beyond API usage.

**Skill evolution stability**: No published analysis of skill library stability over hundreds or thousands of evolution cycles. Do utility scores converge? Do skills become overfitted to recent failures? Do rewrite chains produce increasingly brittle code?

## Alternatives

| System | Choose when |
|--------|-------------|
| [Anthropic Agent Skills](../projects/anthropics-skills.md) | You want static, curated, production-tested skills with a standard spec (agentskills.io) and no runtime evolution risk. Simpler, more predictable. |
| Standard RAG pipeline | Your use case is knowledge retrieval rather than procedural skill execution. Memento adds case-based reasoning overhead you do not need. |
| MemGPT / Letta | You need conversational long-term memory across sessions without the execution infrastructure. |
| Fine-tuning | You have labeled data, compute budget, and stable task distribution. Memento's no-fine-tuning approach trades quality ceiling for deployment flexibility. |

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [Agent Skills](../concepts/agent-skills.md)

## Sources

- [Memento (core) README](../raw/repos/agent-on-the-fly-memento.md)
- [Memento-Skills README](../raw/repos/memento-teams-memento-skills.md)
- [Memento-Skills Deep Analysis](../raw/deep/repos/memento-teams-memento-skills.md)
- [Context Engineering Survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)
