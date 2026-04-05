---
entity_id: procedural-memory
type: concept
bucket: agent-memory
abstract: >-
  Procedural memory in LLM agents stores reusable workflows, skills, and how-to
  knowledge that agents execute to accomplish tasks — distinguished from
  episodic and semantic memory by encoding *how to act* rather than *what
  happened* or *what is true*.
sources:
  - repos/mirix-ai-mirix.md
  - repos/alirezarezvani-claude-skills.md
  - repos/caviraoss-openmemory.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - articles/agent-skills-overview.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - deep/repos/anthropics-skills.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/caviraoss-openmemory.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
related:
  - Claude Code
  - Anthropic
  - Claude
  - Cursor
  - Model Context Protocol
  - Episodic Memory
  - OpenAI Codex
  - Google Gemini
  - Semantic Memory
  - Agent Skills
  - skill.md
  - Vector Database
  - Cognitive Architecture
  - Git as Memory
  - Dynamic Cheatsheet
  - Agent Workflow Memory
last_compiled: '2026-04-05T20:31:41.115Z'
---
# Procedural Memory

## What It Is

Procedural memory is the category of agent memory that holds executable knowledge: step-by-step workflows, task-specific skills, and learned routines that an agent can invoke to accomplish goals. In human cognition, procedural memory governs skills like riding a bicycle — knowledge that operates through execution rather than verbal recall. In LLM agent systems, the concept is implemented as stored instruction sets, workflow templates, or learned policy patterns that agents retrieve and apply when facing familiar task types.

The defining characteristic is actionability. Where [Episodic Memory](../concepts/episodic-memory.md) records what happened and [Semantic Memory](../concepts/semantic-memory.md) records what is true, procedural memory records *how to do something*. A semantic memory says "the checkout button is in the upper right." A procedural memory says "to complete a purchase: add item to cart, navigate to checkout, enter payment details, confirm order."

Procedural memory occupies a distinct position in the [Cognitive Architecture](../concepts/cognitive-architecture.md) of agents because it encodes transferable behaviors. A well-formed procedural memory for "submitting a pull request" applies across many repositories, while an episodic memory of a specific PR is tied to that event. This transferability makes procedural memory a force multiplier: one learned workflow can improve performance on hundreds of future tasks.

## Why It Matters

The case for procedural memory rests on a concrete failure mode in LLM agents: they solve the same problems repeatedly from scratch. An agent asked to book a flight in January and again in March will re-derive the same sequence of search, filter, select, and confirm steps both times, making the same exploratory mistakes both times. Procedural memory breaks this pattern.

[Agent Workflow Memory (AWM)](../projects/agent-workflow-memory.md) demonstrated this empirically on WebArena, where a GPT-4 agent with induced workflow memory achieved 35.5% task success versus 23.5% without it — a 51% relative improvement — while using 5.9 steps per task versus 7.9. The efficiency gain matters as much as the accuracy gain: fewer steps mean lower cost and faster execution. Crucially, AWM's induced workflows outperformed *hand-crafted* workflows (SteP at 33.0%), suggesting that machine-induction of procedural knowledge can match or exceed expert human curation.

[Source](../raw/deep/repos/zorazrw-agent-workflow-memory.md)

## How It Works: Implementation Patterns

### Explicit Instruction Files (SKILL.md Pattern)

The most widely deployed implementation stores procedural knowledge as text files with standardized structure. [Anthropic's skills system](../projects/anthropic-skills.md) uses a `SKILL.md` format: a YAML frontmatter header (name and description) plus markdown instructions. The procedural content lives in the body — specific steps, decision logic, tool invocations, and reference pointers.

[Source](../raw/deep/repos/anthropics-skills.md)

The critical architectural insight is **three-level progressive disclosure**:

1. **Metadata tier** (~100 tokens, always resident): The `name` and `description` fields stay in context permanently. The agent reads these to decide whether a skill is relevant — this is the routing layer.
2. **Instruction tier** (loaded on trigger, ideally under 5,000 tokens): The full procedural content, loaded when the agent decides the skill is needed.
3. **Resource tier** (loaded on demand, no size limit): Reference docs, scripts, templates. The `claude-api` skill bundles 20+ reference files across 8 programming languages; none enter context unless that specific language is needed.

This tiering solves a real constraint. An agent system with 50 skills cannot afford to load all 50 into every context. Progressive disclosure means the routing decision costs ~dozen tokens per skill while execution only pays for one skill's full content.

The survey by Xu et al. validates this pattern as the field's consensus approach for instruction-based procedural memory, noting it enables agents to "know about" hundreds of skills without context pressure. [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

### Workflow Induction from Experience

A more dynamic approach infers procedural knowledge from execution traces rather than encoding it manually. AWM's `offline_induction.py` takes ground-truth annotated task examples, formats them into prompts, and asks GPT-4o to abstract recurring sub-routines into named workflows. The `online_induction.py` module does the same with the agent's own past trajectories, enabling self-improvement without labeled data.

[Source](../raw/deep/repos/zorazrw-agent-workflow-memory.md)

The abstraction step is essential: concrete values become typed placeholders (`{product-name}`, `{search-query}`, `{destination-city}`). Without abstraction, you get episode recording, not procedural memory — the agent memorizes "buy the red Nike shoes size 10" rather than "purchase a product: navigate to product page, select variant, add to cart, checkout."

AWM implements an online self-improvement loop in `webarena/pipeline.py`:

```python
for tid in task_ids:
    Popen(["python", "run.py", "--workflow_path", f"workflow/{website}.txt"])
    Popen(["python", "-m", "autoeval.evaluate_trajectory", ...])
    Popen(["python", "induce_prompt.py", "--result_dir", "results", ...])
```

Execute, evaluate, re-induce. Each cycle refines the workflow memory from fresh evidence. The "snowball effect" documented in the paper describes how simple workflows become building blocks for compound workflows — "log in" becomes a sub-step inside "purchase item" — enabling increasing procedural complexity from simple foundations.

### Sector-Based Storage with Differential Decay

[OpenMemory](../projects/openmemory.md) implements procedural memory as one of five cognitive sectors in its Hierarchical Sector Graph (HSG). The `procedural` sector in `src/memory/hsg.ts` matches memories with how-to patterns (`/\b(how\s+to|steps?\s+to|process\s+for)\b/`) and applies a decay rate of `lambda=0.008` — slower than episodic memories (0.015) but faster than semantic facts (0.005). The differential decay reflects a cognitive science assumption: procedural knowledge is more persistent than specific events but more perishable than general facts.

[Source](../raw/deep/repos/caviraoss-openmemory.md)

The cross-sector relationship matrix shows that procedural memories have strong affinity with semantic memories (0.8) and moderate affinity with episodic memories (0.6). When retrieving a procedural memory, the system boosts scores for related semantic facts that inform the procedure's execution.

### Sprint-as-DAG: Process-Level Procedural Memory

[gstack](../projects/gstack.md) encodes procedural knowledge at a higher level of abstraction — not individual task workflows but an entire software development sprint as an ordered pipeline of specialist roles. Each `SKILL.md` in gstack's 30+ skill catalog encodes one professional persona's procedure: the Staff Engineer's code review process, the QA Lead's browser testing workflow, the Release Engineer's ship sequence. The sprint structure (Think → Plan → Build → Review → Test → Ship → Reflect) chains these procedural memories into a DAG where each skill's outputs feed the next skill's inputs through shared filesystem artifacts.

[Source](../raw/deep/repos/garrytan-gstack.md)

The `{{PREAMBLE}}` template injected into every skill includes a "Search Before Building" protocol — a meta-procedure for how to approach any task. This is procedural memory applied recursively: a procedure that governs how to use procedures.

### Reinforcement Learning Into Model Weights

SAGE (Skill Augmented GRPO for self-Evolution) learns procedural skills through RL, using sequential rollout where earlier-learned skills become available for reuse in later training. Unlike instruction files, these skills exist in model weights and cannot be inspected or shared. Results on AppWorld: 72.0% task completion, 26% fewer interaction steps, 59% fewer tokens compared to baseline. The efficiency improvement is consistent with the AWM findings — procedural memory's primary benefit is reducing redundant exploration.

[Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

## Retrieval Mechanisms

How an agent connects a new task to a stored procedure varies significantly across implementations:

**Description-semantic matching**: The SKILL.md pattern routes by LLM interpretation of the skill's description field. The agent reads all metadata-tier descriptions and decides which skill (if any) applies. This is flexible but imprecise — the `claude-api` skill includes explicit "TRIGGER when: code imports `anthropic`" and "DO NOT TRIGGER when: code imports `openai`" specifications because pure semantic matching was insufficiently precise.

**Vector similarity retrieval**: AWM's `mind2web/memory.py` retrieves workflow exemplars by filtering to the current task's website, subdomain, or domain, then sampling within token budget constraints. This is domain-scoped rather than fully semantic, trading retrieval precision for simplicity.

**Composite scoring**: OpenMemory's search combines five weighted factors — vector similarity (0.35), token overlap (0.20), graph connectivity/waypoints (0.15), recency (0.10), tag matching (0.20). Procedural memories get a 1.1 weight boost in sector-specific retrieval. This is the most sophisticated retrieval model of the implementations reviewed, though the numerical weights appear hand-tuned rather than empirically derived.

**[Vector Database](../concepts/vector-database.md) backends**: Production deployments typically store procedural memory embeddings in vector databases for scalable approximate nearest-neighbor retrieval. OpenMemory supports pgvector and Valkey; the choice of backend determines throughput and latency characteristics at scale.

## Composition and Transfer

Procedural memory gains its leverage from composability — the ability to build complex procedures from simpler ones and to transfer procedures across task variants.

AWM's snowball effect is the clearest documented example: workflows composed from sub-workflows, with the agent's procedural memory growing in expressive power over time. Cross-template evaluation showed AWM maintained 33.2% success on task templates not seen during workflow induction, versus 23.2% for baselines — demonstrating genuine transfer, not memorization.

gstack's template system prevents a related failure mode: documentation drift, where procedural memory diverges from the actual capabilities it describes. The `SKILL.md.tmpl` system generates instruction content from source code metadata (`commands.ts`, `snapshot.ts`), ensuring that if a command does not exist in code, it cannot appear in the procedural memory.

## Practical Limitations

**Action rigidity under environmental variation**: AWM's documented failure mode. When booking flights, a stored procedure for selecting airports cannot adapt to popup dialogs showing unexpected airport combinations. Fixed sequential procedures break when environments present unexpected UI states. The agent struggles to identify when deviation from the workflow is warranted, sometimes achieving lower action F1 scores (57.3%) than a baseline without procedural memory (60.6%).

**Phase transition in large skill libraries**: Beyond some critical number of stored skills, routing accuracy degrades sharply — agents cannot reliably select the right skill. The survey literature identifies this as a fundamental scaling limit. Flat registries do not scale; hierarchical organization or meta-skill routing is needed but not yet standardized.

**Context window pressure**: Loading a skill's full instruction tier plus resources plus the current task observation can exhaust context budgets. AWM explicitly tracks token counts and drops exemplars to stay within model limits. The three-level progressive disclosure pattern manages this but cannot eliminate the tradeoff.

**Self-reinforcement of bad patterns**: Online workflow induction from agent trajectories risks encoding mistakes. If early task executions are poor, induced workflows reflect those poor strategies. AWM's WebArena implementation mitigates this by filtering to successful trajectories before induction, but the filter requires an auto-evaluation signal that may itself be imperfect.

**Offline-online workflow conflict**: AWM found that combining offline-induced workflows (from ground-truth examples) and online-induced workflows (from agent experience) *underperformed* either source individually. Workflows from different induction sources can conflict, degrading rather than improving performance.

**Security in shared ecosystems**: The Xu et al. survey analyzed 42,447 community-contributed skills and found 26.1% contain at least one vulnerability. Skills with executable scripts are 2.12× more vulnerable than instruction-only skills. A single industrialized actor was responsible for 54.1% of confirmed malicious cases. Any multi-contributor procedural memory ecosystem requires security gates before skills execute.

## When Not to Use Procedural Memory

**Highly novel task distributions**: Procedural memory helps when tasks are structurally similar to past experience. If each task has unique structure, the retrieval step adds latency without providing useful guidance.

**Rapidly changing environments**: Procedures encoded for one version of a web interface or API become incorrect when the interface changes. Procedural memories require maintenance overhead proportional to how often the underlying domain changes.

**Single-execution agents**: The value of procedural memory accumulates over repeated tasks. An agent that executes a task type once before being discarded gains nothing from procedural memory infrastructure.

**Small context budgets**: The three-level loading pattern helps, but any system that loads procedural memory is competing with task-specific context. For models with very short context windows (or very long task observations), the budget for stored procedures may be negligible.

## Unresolved Questions

**How to handle conflicting procedures**: When two stored workflows recommend different approaches to the same task, nothing in current implementations provides principled conflict resolution. The offline+online AWM finding suggests this is not trivial.

**Optimal granularity**: What unit of procedure is most reusable? AWM uses website-level workflows averaging 7.3 workflows per site. gstack uses role-level procedures (23+ specialist personas). The survey covers model-level RL-learned skills. No empirical comparison determines which granularity transfers best across task types.

**Externalizing learned skills**: RL-based approaches (SAGE, SEAgent) produce effective skills encoded in model weights, invisible to inspection or governance. Whether trained skills can be distilled into auditable instruction files — bridging learned and explicit procedural memory — is an open research problem.

**Decay calibration**: OpenMemory's sector-specific decay rates (procedural: λ=0.008) are stated as cognitively motivated but appear hand-tuned. Whether these rates actually improve agent performance over flat TTL-based expiration has not been independently measured.

## Alternatives and Selection Guidance

| Approach | When to use |
|---|---|
| **SKILL.md instruction files** ([Agent Skills](../projects/anthropic-skills.md)) | Human-curated procedures for well-defined task types; need transparency and portability; deploying across multiple agent runtimes |
| **Workflow induction** ([AWM](../projects/agent-workflow-memory.md)) | Web navigation agents; want self-improving procedures; have either labeled examples or a running agent accumulating trajectories |
| **RL-learned skills** (SAGE) | High-volume task repetition; acceptable opacity; optimizing for token efficiency; have infrastructure for RL training |
| **Git as Memory** ([Git as Memory](../concepts/git-as-memory.md)) | Software development agents; procedures that should version alongside code; team-level sharing requirements |
| **[Dynamic Cheatsheet](../concepts/dynamic-cheatsheet.md)** | Lightweight, session-specific procedural hints; no infrastructure; incremental improvement within a session |
| **[Episodic Memory](../concepts/episodic-memory.md)** alone | Task types differ enough that abstract procedures do not help; retrieval should return specific past examples rather than generalized workflows |

## Relationships to Adjacent Concepts

Procedural memory is one component of the broader agent memory taxonomy. In the OpenMemory HSG classification, it sits between episodic (fastest decay, event-specific) and semantic (slowest decay, factual). The sector adjacency matrix reflects this: procedural memories have 0.8 affinity with semantic memories and 0.6 with episodic, meaning procedure retrieval benefits from co-retrieval of related facts and past examples.

[Model Context Protocol (MCP)](../projects/model-context-protocol.md) and procedural memory are complementary rather than substitutes. MCP handles tool connectivity; procedural memory handles knowledge of *how to use* those tools effectively. A well-designed skill instructs the agent which MCP servers to call and how to interpret their outputs — procedural knowledge layered over tool access.

[Cognitive Architecture](../concepts/cognitive-architecture.md) research treats procedural memory as the "how to act" layer that binds working memory (context window), long-term memory (semantic/episodic stores), and motor output (tool calls). The AWM framing formalizes this: agent action = LM(query, base_memory + workflows, observation), where workflows are the procedural memory layer augmenting the base semantic memory.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.5)
- [Anthropic](../projects/anthropic.md) — implements (0.5)
- [Claude](../projects/claude.md) — implements (0.5)
- [Cursor](../projects/cursor.md) — implements (0.4)
- [Model Context Protocol](../concepts/mcp.md) — implements (0.5)
- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.6)
- [OpenAI Codex](../projects/codex.md) — implements (0.4)
- [Google Gemini](../projects/gemini.md) — implements (0.4)
- [Semantic Memory](../concepts/semantic-memory.md) — part_of (0.6)
- [Agent Skills](../concepts/agent-skills.md) — implements (0.7)
- [skill.md](../concepts/skill-md.md) — implements (0.8)
- [Vector Database](../concepts/vector-database.md) — implements (0.4)
- [Cognitive Architecture](../concepts/cognitive-architecture.md) — implements (0.7)
- [Git as Memory](../concepts/git-as-memory.md) — implements (0.5)
- [Dynamic Cheatsheet](../concepts/dynamic-cheatsheet.md) — implements (0.6)
- [Agent Workflow Memory](../projects/agent-workflow-memory.md) — implements (0.6)
