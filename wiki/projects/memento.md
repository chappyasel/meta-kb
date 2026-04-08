---
entity_id: memento
type: project
bucket: agent-memory
abstract: >-
  Memento is a case-based reasoning agent framework that improves task
  performance without updating model weights, storing trajectories in a Case
  Bank and retrieving them to guide planning — distinguished by a
  memory-augmented MDP formulation and two-mode CBR inference (parametric and
  non-parametric).
sources:
  - repos/agent-on-the-fly-memento.md
  - repos/memento-teams-memento-skills.md
  - deep/repos/anthropics-skills.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - agent-skills
  - model-context-protocol
  - react
last_compiled: '2026-04-08T03:00:32.690Z'
---
# Memento

## What It Does

Memento is a continual-learning framework for LLM agents that sidesteps the cost of fine-tuning by treating experience as a retrievable external memory rather than gradient updates. When an agent completes or fails a task, Memento logs the final-step tuple (s_T, a_T, r_T) — state, action, reward — into a Case Bank. On subsequent tasks, a neural case-selection policy retrieves relevant past trajectories and injects them into the planning context, steering the agent toward solutions that have worked before and away from patterns that have failed.

The project exists in two closely related forms: the original **Memento** repository (2,375 stars, MIT license, `Agent-on-the-Fly/Memento`) focused on the CBR-over-MDP research contribution, and **Memento-Skills** (916 stars, `memento-teams/memento-skills`) which extends the same philosophy into a production agent framework with skill self-evolution, GUI, IM integrations, and a cloud skill marketplace. This card covers both, treating the former as the research core and the latter as the deployment extension.

## Core Mechanism

### Memory-Augmented MDP

The foundational contribution is reframing agent learning as online reinforcement learning over a memory-augmented Markov Decision Process. Model parameters θ stay frozen; all adaptation happens in external skill memory M. The formal claim: you can achieve continual learning by optimizing what goes into M and how you read from it, without touching the LLM itself. This inverts the typical RAG paradigm — rather than augmenting retrieval for static inference, it augments the agent's decision-making loop with case-based reasoning as a learned policy.

### Two-Stage Planner–Executor Loop

**Planner** (GPT-4.1 default): Decomposes the incoming query into executable subtasks using case retrieval. Retrieved cases appear in planning context as demonstrations of what to attempt and what to avoid.

**Executor** (o3 or local model via vLLM): Runs each subtask as an [Model Context Protocol](../concepts/model-context-protocol.md) client. Tool calls flow through a unified MCP interface covering web search (SearxNG), document processing (PDF, Office, audio, video), sandboxed code execution, and data analysis.

After execution, outcomes write back into the Case Bank — success cases raise retrieval priority, failure cases lower it or trigger skill rewriting in the Memento-Skills variant.

### Two CBR Inference Modes

**Non-parametric CBR** (released August 2025): Retrieval via embedding similarity over the case store. No learned retrieval policy — closest cases by vector distance inform planning context. Lower setup cost.

**Parametric CBR** (released October 2025): A neural case-selection policy trained to predict case utility given the current state. Requires PyTorch 2.0+ with CUDA. Higher setup cost but better selection on tasks where surface similarity is a poor proxy for case relevance.

### The Read-Execute-Reflect-Write Loop (Memento-Skills)

The Memento-Skills extension adds a full four-stage pipeline around skills as mutable entities:

1. **Read**: `SkillGateway.search()` runs `MultiRecall` — parallel BM25 (keyword), sqlite-vec (semantic), and remote cloud catalog — then reranks with local-first priority.
2. **Execute**: `SkillExecutor` runs a ReAct loop capped at 30 turns per skill. Three saturation detectors abort early: `LoopDetector` (max 6 consecutive observation tools, min 15% effect ratio in a 10-action window), `InfoSaturationDetector` (similarity_threshold=0.6, entity_overlap_threshold=0.7), `StatefulErrorPatternDetector` (8 predefined error signatures with normalized fingerprinting).
3. **Reflect**: A `ReflectionDecision` supervisor chooses among CONTINUE, IN_PROGRESS, REPLAN, FINALIZE, or ASK_USER. Per-step React budget is 5 iterations; global replan budget is 2. Budget exhaustion triggers forced decisions rather than infinite retries.
4. **Write**: Failed executions trigger skill utility score adjustment, prompt rewriting, or new skill creation. The revised skill writes back to the skill store.

Skills are Pydantic `Skill` models with fields for version counter, utility score, allowed_tools whitelist, required API keys, and auto-inferred `ExecutionMode`: KNOWLEDGE (SKILL.md provides instructions) or PLAYBOOK (directory contains executable scripts).

### Skill Retrieval Data Structure

```
SkillGateway
  └── MultiRecall
        ├── LocalFileRecall    (BM25 over SKILL.md files on disk)
        ├── LocalDbRecall      (sqlite-vec semantic embeddings)
        └── RemoteRecall       (HTTP API to cloud catalogue)
```

Local results override cloud results for the same skill name. Candidates rerank and top-k go to the planner. This is [Hybrid Search](../concepts/hybrid-search.md) applied specifically to capability retrieval rather than document retrieval.

### Context Compaction

`compaction.py` implements two-level compression. Message-level: single messages exceeding a token threshold get LLM-summarized to 800 tokens, prefixed with `[compressed from {role}]`. Conversation-level: total context overflow triggers serialization of all non-system messages into a single summary, with plan execution state (from `AgentRunState`) annotated as "MUST preserve" and scratchpad archival hinted at `$SCRATCHPAD`.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| Memento repo stars | 2,375 | Self-reported (GitHub badge) |
| Memento-Skills stars | 916 | Self-reported (GitHub badge) |
| Max ReAct turns per skill | 30 | Code (`SkillExecutor`) |
| Max reflections per step | 5 | Code |
| Max replans per run | 2 | Code |
| Loop detector window | 10 actions, min 15% effect ratio | Code |
| Error pattern signatures | 8 predefined | Code |
| Context compression target | 800 tokens | Code |
| Built-in skills | 10 | README badge |

Benchmark claims: "competitive results across GAIA, DeepResearcher, SimpleQA, and HLE" (README). The paper shows improvement curves over iterations and OOD generalization gains. All benchmark figures are **self-reported** from the project paper; no independent third-party validation is cited. The learning curves in `Figure/f1_iteration.jpg` and `Figure/f1_ood.jpg` are the primary evidence.

## Strengths

**Deployment-time learning without retraining.** The core value proposition is real: skill memory M evolves through live interactions at zero retraining cost. For teams that cannot afford fine-tuning cycles on every task distribution shift, this is a genuine alternative.

**Structured loop detection.** The `LoopDetector` and `StatefulErrorPatternDetector` implementations are unusually concrete — four distinct loop patterns, eight error signatures with normalized fingerprinting to detect duplicates across different error instances, throttled hint injection to prevent recovery spam. Most agent frameworks paper over these failure modes.

**Multi-provider flexibility.** LiteLLM backend supports Anthropic, OpenAI, OpenRouter, Ollama, Kimi, MiniMax, GLM. Local model execution via `agent_local_server.py` with vLLM means air-gapped deployment is possible.

**MCP-native tooling.** [Model Context Protocol](../concepts/model-context-protocol.md) as the tool interface means the executor inherits the growing MCP tool ecosystem without custom integration work.

**Agentskills.io spec compliance.** Memento-Skills skills follow the canonical SKILL.md format, making them installable in Claude Code and other agentskills.io-compatible runtimes.

## Critical Limitations

**Reflection quality is bounded by the base model's analytical ability.** The reflection phase uses the same LLM that just failed a task to diagnose why it failed and generate an improved skill. If the model cannot articulate the failure mode, the rewritten skill is no better than random variation. This is the ceiling the architecture cannot escape: self-evolution quality tracks base model capability, not task complexity.

**Unspoken infrastructure assumption**: The cloud skill marketplace (`RemoteRecall`, `SkillMarket`, download via GitHub) assumes outbound HTTP access and trust in remotely downloaded, LLM-generated skill code. The `tool_gate` and `path_validator` policies reduce but do not eliminate the risk that a cloud skill contains adversarial instructions. Air-gapped deployments need to disable remote recall entirely, which the documentation does not prominently flag.

## When NOT to Use Memento

**Don't use it when tasks are well-defined and stable.** If your agent runs the same narrow task class repeatedly and you can afford fine-tuning, parametric adaptation will outperform CBR — a trained policy generalizes better than retrieved cases when the training distribution matches deployment.

**Don't use it when you need auditable, deterministic behavior.** Skill rewriting means the agent's behavior can change between runs as the skill library evolves. Regulated or compliance-sensitive applications need frozen, versioned agent behavior. Memento's skill versioning tracks changes but does not prevent them.

**Don't use it when your task distribution has low case reuse.** CBR yields returns proportional to how often past cases apply to new tasks. If every task is novel (novel domains, novel tool combinations, novel output formats), the Case Bank stays sparse and retrieval provides little signal above a baseline agent.

**Don't use it for latency-sensitive pipelines.** The multi-recall skill retrieval (three parallel searches, reranking), 30-turn ReAct loops, and reflection phases add substantial overhead per task. The Memento-Skills README does not publish latency figures.

## Unresolved Questions

**Skill quality over time.** There is no automated test suite gating evolved skills. The system rewrites based on LLM judgment, not measured improvement. Whether evolved skill libraries actually improve over many iterations — or converge to local optima — is not demonstrated beyond the initial learning curves in the paper.

**Cost at scale.** The Case Bank grows with every task. There is no documented policy for case eviction, case deduplication, or utility-score decay over time. A deployment running thousands of tasks will accumulate a large, partially stale Case Bank. How retrieval quality degrades as the bank grows is not addressed.

**Conflict resolution in multi-agent or multi-user deployments.** Multiple agents writing to the same skill store simultaneously is not addressed. The architecture is designed for single-agent operation; the governance pattern for shared skill libraries is absent.

**Cloud marketplace trust model.** Who reviews skills in the cloud catalogue? What prevents a malicious skill from being uploaded and downloaded by other users? The `memento verify` command exists but its scope is not documented.

**Chinese-language codebase.** Much of the documentation, inline comments, and variable naming in Memento-Skills is in Chinese. This limits external contribution and audit surface for non-Chinese-speaking teams.

## Alternatives

| Project | Choose When |
|---------|------------|
| [Mem0](../projects/mem0.md) | You need managed memory with a clean API and don't need skill self-rewriting |
| [Letta](../projects/letta.md) / [MemGPT](../projects/memgpt.md) | You want a complete memory-augmented agent runtime with formal memory tier management (core, archival, recall) |
| [Agent Workflow Memory](../projects/agent-workflow-memory.md) | Your bottleneck is workflow reuse rather than case-level reasoning — AWM extracts reusable workflows, not cases |
| [Voyager](../projects/voyager.md) | You want skill accumulation in a game/simulation environment with executable code skills and no deployment overhead |
| [Reflexion](../concepts/reflexion.md) | Single-session reflection without persistent case storage — simpler, lower infrastructure cost |
| [DSPy](../projects/dspy.md) | Your improvement target is prompt optimization rather than trajectory memory |

**Use Memento when** your agent encounters repeated task patterns across sessions, you cannot retrain, and you need failure-driven skill improvement rather than just memory retrieval.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader category this implements
- [Episodic Memory](../concepts/episodic-memory.md) — the Case Bank is an episodic store of (state, action, reward) tuples
- [ReAct](../concepts/react.md) — the reasoning pattern used in the executor loop
- [Agent Skills](../concepts/agent-skills.md) — Memento-Skills extends this concept with mutable, evolvable skills
- [Self-Improving Agents](../concepts/self-improving-agents.md) — the broader research program this contributes to
- [Continual Learning](../concepts/continual-learning.md) — the learning paradigm the MDP formulation targets
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — CBR retrieval is structurally related but operates over trajectories rather than documents
- [Context Engineering](../concepts/context-engineering.md) — case injection is a form of dynamic context assembly

## Sources

- [Memento repo README](../raw/repos/agent-on-the-fly-memento.md)
- [Memento-Skills repo README](../raw/repos/memento-teams-memento-skills.md)
- [Memento-Skills deep analysis](../raw/deep/repos/memento-teams-memento-skills.md)
- [Context Engineering survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)
