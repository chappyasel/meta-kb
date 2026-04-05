---
url: 'https://github.com/kayba-ai/agentic-context-engine'
type: repo
author: kayba-ai
date: '2026-04-04'
tags: [context-engineering, agentic-skills, self-improving, agent-memory]
key_insight: >-
  ACE implements a persistent skillbook that survives across sessions via a three-role
  feedback loop (Agent -> Reflector -> SkillManager), where skills are deduplicated
  by embedding similarity and rendered as XML strategies injected into agent prompts,
  creating a self-improving context layer that learns from execution traces.
stars: 2100
deep_research:
  method: source-code-analysis
  files_analyzed:
    - ace/core/skillbook.py
    - ace/core/context.py
    - ace/core/outputs.py
    - ace/implementations/skill_manager.py
    - ace/implementations/reflector.py
    - ace/implementations/skill_rendering.py
    - ace/steps/reflect.py
    - ace/deduplication/detector.py
    - pipeline/pipeline.py
    - ace/runners/ace.py
  analyzed_at: '2026-04-04'
  original_source: repos/kayba-ai-agentic-context-engine.md
---

## Architecture Overview

The Agentic Context Engine (ACE) is a Python framework built on a generic pipeline engine that implements a self-improving agent pattern through three specialized LLM roles and a persistent skill store called the Skillbook. The architecture separates into two layers: a generic `pipeline/` engine that handles step composition, concurrency, and cancellation, and the `ace/` layer that implements domain-specific roles and data structures on top of it.

The core execution loop follows this path:

```
AgentStep (execute task using skillbook strategies)
  -> EvaluateStep (compare output against ground truth)
  -> ReflectStep (analyze what went right/wrong)
  -> UpdateStep (SkillManager decides skillbook mutations)
  -> DeduplicateStep (merge similar skills via embedding similarity)
  -> PersistStep (save skillbook to disk)
```

Each step declares `requires` and `provides` frozensets that form a compile-time contract system. The `Pipeline` class (`pipeline/pipeline.py`) validates these contracts at construction time -- if step B requires field X and X is produced by a later step, a `PipelineOrderError` is raised immediately, not at runtime. This is a meaningful design choice: contract violations surface during pipeline assembly, not during a long-running training loop.

The pipeline supports an `async_boundary` marker: exactly one step per pipeline can set `async_boundary = True`, splitting execution into a synchronous foreground (agent execution, evaluation) and an asynchronous background (reflection, skill updates). The `ReflectStep` sets this by default with `max_workers = 3`, allowing reflection to happen in parallel across samples without blocking the agent execution loop.

## Core Mechanism: The Skillbook

The Skillbook (`ace/core/skillbook.py`) is the central persistence layer -- a thread-safe dictionary of `Skill` objects organized into named sections. Each skill has:

- `id`: Auto-generated as `{section_prefix}-{counter:05d}` (e.g., `general-00042`)
- `section`: Organizational category (e.g., "general", "error-handling", "formatting")
- `content`: The actual strategy text, written in natural language
- `justification` and `evidence`: Why this skill was added, with supporting data
- `sources`: List of `InsightSource` objects tracking provenance (epoch, trace_uid, sample_question)
- `embedding`: Optional float vector for deduplication
- `status`: `"active"` or `"invalid"` (soft-delete)

The Skillbook supports four mutation operations via `UpdateOperation`:

1. **ADD**: Create a new skill in a section
2. **UPDATE**: Modify an existing skill's content/justification/evidence
3. **REMOVE**: Hard-delete a skill from the book
4. **TAG**: Deprecated, now a no-op

Mutations are batched into `UpdateBatch` objects that include the SkillManager's reasoning alongside the operations. This is critical: every mutation carries an explanation of why it was made, which aids debugging and provides an audit trail.

Thread safety is implemented via `threading.RLock()` on every write path, enabling concurrent pipeline execution without skill corruption. The reentrant lock allows nested read operations within write operations, which is necessary for the `_apply_operation` method that reads the skillbook to check for existing skills before adding new ones.

### Serialization and Persistence

The Skillbook serializes to JSON via `to_dict()` / `from_dict()`, with optional embedding exclusion for compact serialization. The `PersistStep` in the pipeline writes the skillbook to disk after each epoch. The `loads()` / `dumps()` methods handle round-trip serialization, and `save_to_file()` / `load_from_file()` provide direct filesystem access.

A notable detail: `SimilarityDecision` objects are also persisted in the skillbook. When the deduplication system decides two skills should remain separate despite being similar, it records a `KEEP` decision with reasoning and the similarity score at decision time. This prevents the system from re-evaluating the same pair of skills in every epoch -- a subtle but important optimization for long-running learning loops.

## The Three-Role System

### 1. Agent Role

The Agent receives the current task and the skillbook rendered as prompt context. Skills are rendered in two formats:

**TOON format** (`Skillbook.as_prompt()`): Uses the `python-toon` library to encode skills as a compressed tab-delimited structure. This is the default rendering path.

**XML format** (`render_skills_xml()` in `ace/implementations/skill_rendering.py`): Renders each skill as an XML `<strategy>` element:

```xml
<strategy id="general-00042" section="general">
When a customer requests a flight change, verify the booking status first...
</strategy>
```

The XML renderer also supports **per-task skill retrieval** via `retrieve_top_k()`, which uses embedding similarity to select only the most relevant skills for a given query. This is the more interesting path -- rather than injecting all skills into every prompt, it does cosine similarity against the query and returns the top-k skills. The `SimilarityDetector` from the deduplication module is reused here for embedding computation.

The Agent produces an `AgentOutput` with structured fields: `reasoning` (step-by-step process), `final_answer`, `skill_ids` (which strategies it cited), and optional `trace_context` for integration traces. The explicit `skill_ids` field enables the Reflector to track which skills the agent actually used, creating a feedback signal for skill effectiveness.

### 2. Reflector Role

The Reflector (`ace/implementations/reflector.py`) is the analysis engine. It receives the agent's output, the original question, ground truth (if available), environment feedback, and a skillbook excerpt containing only the skills the agent cited. It uses PydanticAI with structured output validation to produce a `ReflectorOutput` containing:

- `reasoning`: Overall analysis of the outcome
- `error_identification`: What went wrong (if anything)
- `root_cause_analysis`: Why errors occurred
- `correct_approach`: What should have been done
- `key_insight`: The main lesson learned
- `extracted_learnings`: A list of `ExtractedLearning` objects, each with an `atomicity_score` (0-1), evidence, and justification
- `skill_tags`: Classifications of each cited skill as `helpful`, `harmful`, or `neutral`

The `ReflectStep` (`ace/steps/reflect.py`) handles two trace formats: structured dicts from the evaluate step (with known keys like `reasoning`, `answer`, `ground_truth`) and raw opaque traces from integrations (browser-use, Claude Code, LangChain). For raw traces, the Reflector receives the trace as-is via `**kwargs` and must make sense of it.

### 3. SkillManager Role

The SkillManager (`ace/implementations/skill_manager.py`) transforms reflections into concrete skillbook mutations. It receives the reflector's output, the current skillbook (rendered via `as_prompt()`), a question context string, and a progress summary. It produces a `SkillManagerOutput` containing an `UpdateBatch`.

The `SkillManagerOutput` model has a notable `_accept_flat_shape` validator that handles both nested (`{"update": {"reasoning": ..., "operations": [...]}}`) and flat (`{"reasoning": ..., "operations": [...]}`) shapes from the LLM. This defensive parsing is essential -- LLMs frequently produce slightly different JSON structures, and the validator normalizes them transparently.

## Design Tradeoffs

### Immutable Context vs. Mutable Skillbook

The `ACEStepContext` is a frozen dataclass (`@dataclass(frozen=True)`) that carries all step-to-step data. Steps use `ctx.replace()` to produce new context objects rather than mutating the existing one. However, the skillbook itself is mutable behind a lock. This creates an intentional asymmetry: pipeline data flow is immutable and traceable, but the skillbook is a shared mutable resource that persists across epochs.

The `SkillbookView` class bridges this gap: it wraps a `Skillbook` and exposes only read methods. Steps that only need to read skills (Agent, Reflector) receive a `SkillbookView`, while the SkillManager and Deduplication steps receive the real `Skillbook`. This is a capability-based security pattern applied to LLM infrastructure.

### Deduplication as a Separate Step

Rather than having the SkillManager handle deduplication inline, ACE uses a separate `DeduplicateStep` with its own `SimilarityDetector`. Skills are embedded using either LiteLLM (100+ providers) or sentence-transformers (local), and pairs above a similarity threshold are merged. The `SimilarityDecision` persistence mechanism prevents redundant re-evaluation.

This separation means the SkillManager can focus on what to learn without worrying about whether it's duplicating existing knowledge. The tradeoff is an extra LLM call (for embedding) and extra latency, but it keeps the roles cleanly separated.

### Single async_boundary Constraint

The pipeline enforces at most one `async_boundary` per pipeline and forbids boundaries inside Branch children. This simplifies the concurrency model dramatically: there's exactly one split point between foreground and background work, and you can reason about ordering guarantees without considering nested async contexts. The downside is less flexibility for complex pipelines, but the constraint prevents a common class of race conditions.

## Failure Modes & Limitations

### Skill Explosion

The Skillbook has no built-in capacity limit. Over many epochs, skills accumulate. The deduplication step helps, but near-similar-but-different skills can still proliferate. The `as_prompt()` rendering will eventually exceed context window limits. The `retrieve_top_k()` function mitigates this for per-task injection, but the SkillManager still receives the full skillbook text.

### Ground Truth Dependency

The evaluate/reflect loop works best with ground truth. When ground truth is unavailable, the Reflector relies on environment feedback, which may be noisy or absent. The framework supports this mode (`ground_truth` is Optional), but the quality of extracted learnings degrades significantly without a clear success/failure signal.

### Cold Start Problem

A new skillbook is empty. The first few epochs have no strategies to leverage, so the agent operates without guidance. The framework doesn't provide a mechanism for skill import or transfer from other skillbooks, though the `loads()` / `from_dict()` methods could be used manually for this purpose.

### TOON Dependency

The default `as_prompt()` rendering depends on the `python-toon` library for compression. If TOON encoding produces a format the target LLM doesn't parse well, the XML renderer is the fallback, but switching requires code changes rather than configuration.

## Integration Patterns

ACE provides runners for multiple frameworks:

- **ACELiteLLM**: Wraps any LiteLLM-supported model (100+ providers)
- **ACELangChain**: Wraps LangChain chains/agents
- **ACEBrowserUse**: Browser automation learning
- **ACEClaudeCode**: CLI-based coding task learning

The MCP (Model Context Protocol) integration (`ace/integrations/mcp/`) exposes the skillbook as MCP tools, allowing external agents to read, search, and update skills via the protocol. The `handlers.py` module implements tool handlers for `ace_get_skills`, `ace_search_skills`, `ace_add_skill`, and `ace_update_skill`.

The pipeline engine itself is framework-agnostic. New integrations need only implement a step that produces a trace (dict or object), and the existing ReflectStep handles the dispatch.

## Benchmarks & Performance

The repository includes a `benchmarks/` directory with TAU-bench configurations for Haiku, Sonnet, GPT-4.1, and GPT-4.1-mini. These YAML configs define task parameters and model settings for standardized evaluation.

The pipeline's concurrency model uses per-step-class `ThreadPoolExecutor` instances (`_get_class_executor()` in `pipeline/pipeline.py`). The executor is stored on the class itself (not the pipeline instance), so it's shared across all pipeline instances. This means `max_workers` on a step class controls global concurrency for that step type, regardless of how many pipelines are running.

The `run_async()` method uses `asyncio.Semaphore(workers)` for sample-level parallelism in the foreground, and background steps use per-class executors. This two-tier concurrency model allows high throughput for foreground agent execution while rate-limiting expensive background operations like reflection and skill management.

Token usage is tracked per role via PydanticAI's `usage()` API, with `input_tokens`, `output_tokens`, and `total_tokens` recorded in the `raw` field of each output type. This enables cost tracking across the three-role pipeline.

## Key Implementation Details

### InsightSource Provenance Tracking

Every skill carries a list of `InsightSource` objects that record where the skill came from: which epoch, which trace, which sample question, and which system generated it. The `_append_unique_sources()` function deduplicates sources by JSON-serializing them and comparing signatures. This creates a full audit trail: you can trace any skill back to the specific execution that generated it.

The `source_filter()` method on `Skillbook` enables querying skills by provenance: "show me all skills learned from epoch 3" or "show me skills generated from trace UID xyz". This is valuable for debugging skill regressions -- if a skill starts causing failures, you can trace it back to its origin.

### CLAUDE.md and Agent Configuration

ACE includes its own `.claude/` directory with Claude Code commands (`create-branch.md`, `list-branches.md`, etc.) and a multi-stage Kayba pipeline skill system. The `.claude/skills/kayba-pipeline/` contains 7 stages: API analysis, domain context, metrics, rubric, action plan, HITL (human-in-the-loop), and fixer. Each stage has its own `SKILL.md` that defines the skill's behavior.

This is meta-contextual: ACE uses the same skill pattern it implements to define its own development workflow. The CLAUDE.md file enforces pipeline-first development as a mandatory pattern, core code protection for `ace/core/` and `pipeline/` directories, and documentation synchronization.

### Recursive Reflector (RR)

The `RRStep` class (`ace/rr/runner.py`) implements a recursive multi-iteration reflection mode using a PydanticAI agent with three tools: `execute_code` (run code in a sandbox to analyze traces), `analyze` (invoke a sub-agent for focused analysis), and `batch_analyze` (analyze multiple trace items in parallel). The RR agent can explore traces programmatically, executing code to extract patterns and then reasoning about the results.

RRStep satisfies both `StepProtocol` (composable in any pipeline) and `ReflectorLike` (drop-in replacement for the simple Reflector). This dual interface means a runner can seamlessly upgrade from single-pass to recursive reflection by swapping `Reflector("gpt-4o")` for `RRStep("gpt-4o")` -- no pipeline changes needed.

The `TraceSandbox` provides a controlled execution environment for the RR agent's code execution tool, and `TraceContext` normalizes different trace formats into a uniform structure for analysis.

### Four-Layer Architecture

The design docs (`docs/design/ACE_ARCHITECTURE.md`) describe a clean four-layer separation:

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Protocols** | `ace/protocols/` | Interface contracts (AgentLike, ReflectorLike, SkillManagerLike) |
| **Roles** | `ace/implementations/` | Business logic with LLM calls (Agent, Reflector, SkillManager, RRStep) |
| **Steps** | `ace/steps/` | Context plumbing between pipeline data flow and role APIs |
| **Runners** | `ace/runners/` | Orchestration (epoch loops, sample iteration, pipeline composition) |

Protocols use structural typing (Python `Protocol`) rather than abstract base classes. A class satisfies a protocol if it has the right methods -- no inheritance needed. This means mocks satisfy protocols without ceremony, and users can pass any object with matching methods.

The runner hierarchy is composition-based, not inheritance-based: `ACERunner` encapsulates the epoch loop, while `Pipeline.run()` handles per-sample iteration, error isolation, and foreground/background split. Runners only override `run()` (public API) and `_build_context()` (input mapping).

### Eventual Consistency Model

The architecture docs explicitly acknowledge eventual consistency in the skillbook: "SkillbookView is a thin delegation wrapper, not a snapshot -- it reads from the live Skillbook at call time. When background learning is active, concurrent samples may observe partially-updated skillbook state." This is acceptable because: (1) the skillbook is LLM prompt context where a few missing or extra skills have negligible impact, (2) serializing reads would eliminate the concurrency benefit, and (3) write steps already run with `max_workers = 1`.

### `learning_tail()` Reusable Composition

Every integration assembles the same `[Reflect -> Update -> AttachInsightSources -> Apply]` suffix. The `learning_tail()` function returns this standard step list, with optional dedup and checkpoint steps. If the provided reflector already exposes `provides = {'reflections'}` (e.g., `RRStep`), it's inserted directly instead of being wrapped in `ReflectStep`. This composability pattern means new integrations only need to implement a "trace production" step -- the learning infrastructure is shared.

### Prompt Engineering

The Agent prompt (`ace/implementations/prompts.py`) is a detailed v2.1 template that includes: identity and metadata, a core mission statement, a four-step protocol (analyze strategies, consider reflection, process question, generate solution), and strict constraints. Notable elements include the "Specificity Constraints" section that prevents the agent from over-specifying tool choices, and explicit examples of good vs. bad responses.

The skillbook is injected into the agent prompt via `{skillbook}` placeholder, and recent reflection via `{reflection}`. The prompt instructs the agent to cite skill IDs inline (e.g., "Following [general-00042], I will...") to enable precise tracking of strategy effectiveness through the Reflector's analysis.
