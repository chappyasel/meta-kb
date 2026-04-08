---
url: 'https://github.com/Memento-Teams/Memento-Skills'
type: repo
author: Memento-Teams
date: '2026-04-04'
tags:
  - agent-systems
  - agentic-skills
  - self-improving
  - agent-memory
  - skill-composition
key_insight: >-
  Memento-Skills implements genuine deployment-time self-evolution where the
  agent's skill library is not a static registry but a mutable knowledge base
  that grows through a Read-Execute-Reflect-Write loop -- the reflection phase
  can rewrite skill code, adjust prompts, create entirely new skills from
  failure patterns, and update utility scores, making it the most complete
  implementation of case-based reasoning for LLM agents where model parameters
  theta remain frozen and all adaptation happens in external skill memory M.
stars: 916
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - core/memento_s/agent.py
    - core/memento_s/phases/reflection.py
    - core/memento_s/phases/planning.py
    - core/memento_s/phases/intent.py
    - core/memento_s/phases/execution/runner.py
    - core/memento_s/phases/execution/step_boundary.py
    - core/memento_s/finalize.py
    - core/memento_s/tools.py
    - core/memento_s/schemas.py
    - core/skill/schema.py
    - core/skill/gateway.py
    - core/skill/execution/executor.py
    - core/skill/execution/loop_detector.py
    - core/skill/execution/error_recovery.py
    - core/skill/execution/content_analyzer.py
    - core/skill/retrieval/multi_recall.py
    - core/skill/retrieval/local_file_recall.py
    - core/skill/retrieval/local_db_recall.py
    - core/skill/retrieval/remote_recall.py
    - core/skill/store/skill_store.py
    - core/skill/store/vector_storage.py
    - core/skill/builder/skill_builder.py
    - core/skill/loader/skill_loader.py
    - core/skill/market.py
    - core/context/manager.py
    - core/context/compaction.py
    - core/context/scratchpad.py
    - core/protocol/pipeline.py
    - core/protocol/events.py
    - middleware/llm/llm_client.py
    - middleware/config/config_manager.py
    - middleware/sandbox/base.py
    - middleware/storage/models.py
  analyzed_at: '2026-04-04'
  original_source: repos/memento-teams-memento-skills.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 8
  signal_quality: 8
  composite: 8.4
  reason: >-
    Implements a complete Read-Execute-Reflect-Write self-improving skill loop
    with mutable skill memory, hybrid retrieval, and versioned skill
    evolution—directly relevant to Agent Architecture, Self-Improving Systems,
    and Knowledge Substrate pillars with detailed architectural documentation.
---

## Architecture Overview

Memento-Skills is a fully self-developed agent framework organized around skills as first-class, evolvable units of capability. Unlike skill registries that treat skills as static instruction files (anthropics/skills, gstack, ECC), Memento-Skills treats skills as mutable entities with version histories, utility scores, and the capacity to be rewritten by the agent itself during execution.

The system operates on a 4+1 stage pipeline:

```
User message
  → Intent Recognition     (DIRECT | INTERRUPT | CONFIRM | AGENTIC)
  → Planning               (decompose into PlanSteps with skill assignments)
  → Execution              (multi-step ReAct loop per skill, with tool bridge)
  → Reflection             (evaluate outcomes, decide: continue/replan/finalize/ask_user)
  → Finalize               (structured result summarization)
```

The architecture uses Bounded Context design with three distinct domains:

**Core domain** (`core/`):
- `memento_s/`: Agent orchestrator (4-stage ReAct + Finalize)
  - `phases/`: Intent, Planning, Execution (runner, tool_handler, step_boundary), Reflection
  - `tools.py`: Tool routing and dispatch
- `skill/`: Skill framework
  - `builder/`: Programmatic skill creation
  - `loader/`: Skill discovery and loading
  - `retrieval/`: BM25 + vector hybrid retrieval (multi_recall)
  - `execution/`: Sandbox execution + tool_bridge + policies
  - `store/`: DB / file / vector storage backends
  - `market.py`: Cloud skill marketplace
  - `gateway.py`: Unified skill gateway (the single external interface)
- `context/`: Context management with compaction and scratchpad
- `protocol/`: Communication protocols (AG-UI compatible events)

**Middleware** (`middleware/`):
- `config/`: Three-layer configuration (System/User/Runtime)
- `llm/`: Multi-provider LLM client (litellm)
- `storage/`: SQLite + SQLAlchemy + vector storage
- `sandbox/`: uv-based isolated execution
- `im/`: IM platform gateway (Feishu, DingTalk, WeCom, WeChat)

**Interface** (`gui/`, `cli/`): Flet desktop GUI, Typer CLI

## Core Mechanism

### The Read-Execute-Reflect-Write Loop

This is the central innovation. Unlike gstack's static SKILL.md files or ECC's curated skill library, Memento-Skills implements a genuine feedback loop where skills evolve:

**Read**: When a task arrives, the SkillGateway retrieves candidate skills using MultiRecall -- a parallel search across three recall strategies:
- `LocalFileRecall`: BM25 keyword search over SKILL.md files on disk
- `LocalDbRecall`: Semantic vector search using sqlite-vec embeddings
- `RemoteRecall`: Cloud catalogue search via HTTP API

Results are merged with local-first priority: if the same skill exists locally and remotely, the local version wins. Candidates are reranked and the top-k are presented to the planner.

**Execute**: The SkillExecutor runs each skill in a controlled ReAct loop (max 30 turns). The execution layer includes multiple safety mechanisms:
- `LoopDetector`: Detects repetitive action patterns (max_observation_chain=6, min_effect_ratio=0.15)
- `StatefulErrorPatternDetector`: Tracks error patterns across tool calls
- `InfoSaturationDetector`: Detects when additional tool calls add no new information (similarity_threshold=0.6, entity_overlap_threshold=0.7)
- Repeated action detection: same action signature more than max_repeated_actions times aborts

Each skill can be either `knowledge` mode (SKILL.md provides context, agent uses built-in tools) or `playbook` mode (skill directory contains executable scripts). The execution mode is automatically inferred from directory structure.

**Reflect**: After each step, the Reflection phase acts as a Supervisor:
```python
class ReflectionDecision(StrEnum):
    CONTINUE = "continue"      # Move to next step
    IN_PROGRESS = "in_progress" # Same step needs more ReAct iterations
    REPLAN = "replan"          # Step failed, need new plan
    FINALIZE = "finalize"      # All done, summarize
    ASK_USER = "ask_user"      # Need human input
```

The reflection operates under budget constraints: per-step React budget (max 5 iterations) and global Replan budget (max 2 replans). When budgets are exhausted, hard constraint overrides force the decision forward (IN_PROGRESS -> CONTINUE, REPLAN -> CONTINUE). This prevents infinite retry loops.

The `_looks_like_error()` heuristic detects error-dominated outputs by checking for "error", "traceback", "exception" prefixes or `{"ok": false}` JSON structures.

**Write**: When execution fails or quality drops, the system can:
- Update the skill's utility score (success increases it, failure decreases it)
- Optimize the skill's prompts and code based on failure analysis
- Create an entirely new skill when no existing capability is adequate
- Write the improved skill back to the skill store

### The Skill Data Model

Skills are Pydantic models with rich metadata:

```python
class Skill(BaseModel):
    name: str                           # Skill identifier
    description: str                    # Capability description
    content: str                        # SKILL.md content
    dependencies: list[str]             # Package requirements
    version: int                        # Version counter
    files: dict[str, str]               # Skill files
    references: dict[str, str]          # References (agentskills.io spec)
    source_dir: Optional[str]           # Filesystem path
    execution_mode: Optional[ExecutionMode]  # KNOWLEDGE or PLAYBOOK
    entry_script: Optional[str]         # Playbook default entry
    required_keys: list[str]            # Required API keys
    parameters: Optional[dict]          # OpenAI/Anthropic-compatible schema
    allowed_tools: list[str]            # Tool whitelist
```

The `ExecutionMode` distinction is crucial: `KNOWLEDGE` skills provide context (the SKILL.md is instructions), while `PLAYBOOK` skills contain executable scripts. The mode is auto-inferred: if the skill directory contains files beyond SKILL.md, it is a playbook.

### The SkillGateway Contract

SkillGateway is the single external interface to the entire skill system. It provides three layers:

1. **Directory layer** (`discover`, `search`): Find skills by strategy (LOCAL_ONLY or MULTI_RECALL) or query
2. **Runtime layer** (`execute`): Execute a skill with pre-execution gates, policy checks, and result processing
3. **Governance layer** (manifests, error codes, status tracking): Structured responses with SkillStatus, SkillErrorCode, and diagnostics

The execute path includes a pre-execution gate that checks:
- Required API keys are present
- Policy rules are satisfied
- Input parameters are valid

### The Planning Phase

The planner decomposes tasks into PlanSteps:

```python
class PlanStep(BaseModel):
    step_id: int
    action: str                   # What to do
    expected_output: str          # Success criteria
    skill_name: Optional[str]     # Assigned skill
    skill_request: str            # Pre-filled request for the skill
    input_from: list[int]         # Data flow from previous steps
    requires_user_input: bool
```

The `input_from` field creates an explicit data flow DAG between steps. The `validate_plan()` function ensures all skill names exist and all input_from references are valid (no forward references, no self-references).

### Context Management

The ContextManager implements bounded context assembly with:
- **Compaction**: Progressive summarization when context exceeds thresholds
- **Scratchpad**: Persistent scratch space for inter-step state
- **Block-based organization**: Each user turn starts a new block; events (plan, tool calls, results) are appended to the active block
- **Embedding-based retrieval**: Historical conversations can be retrieved via semantic similarity
- **LRU session caching**: SessionBundle objects (session_ctx + context_mgr) are cached with LRU eviction

### The Tool Bridge

The ToolBridge system provides structured tool invocation:
- `runner.py`: Executes tool calls in the sandbox
- `bridge.py`: Maps abstract tool names to concrete implementations
- `context.py`: Provides execution context (workspace, permissions)
- `args_processor.py`: Validates and transforms tool arguments
- `result_processor.py`: Processes and normalizes tool outputs

### Execution Policies

Fine-grained safety controls via policy modules:
- `tool_gate.py`: Tool-level access control (whitelist/blacklist)
- `path_validator.py`: Filesystem path security (prevent traversal)
- `pre_execute.py`: Pre-execution admission control
- `recovery.py`: Error recovery strategies

## Design Tradeoffs

### Self-Developed Framework vs Library Integration

Memento-Skills builds its own orchestration, skill routing, execution, reflection, storage, CLI, and GUI stack rather than using LangChain, CrewAI, or similar frameworks. This gives complete control over the self-evolution loop but means maintaining a large codebase (200+ Python files) and losing ecosystem integrations.

### Multi-Provider LLM vs Single-Model Optimization

Using litellm for multi-provider support (Anthropic, OpenAI, OpenRouter, Ollama, Kimi, MiniMax, GLM) maximizes deployment flexibility but means the system cannot exploit model-specific features deeply. The skill-evolution loop's quality depends on whichever model the user configures.

### Case-Based Reasoning vs Parametric Learning

The fundamental thesis is that skill evolution through external memory M is more practical than fine-tuning model parameters theta. This is correct for deployment scenarios where you cannot retrain, but the quality of evolved skills is bounded by the base model's ability to analyze failures and write improved code. The system cannot learn patterns that the model cannot articulate.

### Hybrid Retrieval vs Pure Semantic Search

Using BM25 + semantic vector hybrid search for skill retrieval provides better recall than either alone. The local-first reranking policy means local skills always override cloud skills of the same name, which is correct for user customization but can prevent access to improved cloud versions.

### Playbook vs Knowledge Mode

Auto-inferring execution mode from directory structure (has other files = playbook) is simple but can misclassify skills. A skill with a README file alongside SKILL.md would be classified as a playbook even if the README is documentation, not executable code.

## Failure Modes & Limitations

**Reflection quality bounded by LLM capability**: The reflection phase uses the same LLM to evaluate execution results and generate improvement plans. If the model cannot diagnose why a skill failed, it cannot improve it. This creates a ceiling on self-evolution quality that tracks the base model's analytical capability.

**Utility score is a weak signal**: Incrementing/decrementing a utility score based on success/failure does not capture why a skill succeeded or failed. A skill might fail due to external factors (API rate limit, network error) but have its utility score penalized.

**No formal verification of evolved skills**: When the system rewrites a skill, there is no automated test suite to verify the new version is actually better. The improvement is based on the LLM's judgment, not empirical measurement.

**ReAct budget can mask capability gaps**: The hard budget overrides (IN_PROGRESS -> CONTINUE after 5 iterations, REPLAN -> CONTINUE after 2 replans) prevent infinite loops but also prevent the system from spending more time on genuinely hard problems. The budgets are fixed, not task-complexity-adaptive.

**Cloud skill marketplace is a trust surface**: Skills downloaded from the cloud catalogue execute in a local sandbox, but the skill code is LLM-generated and could contain adversarial instructions. The `tool_gate` and `path_validator` policies mitigate this but do not eliminate the risk.

**Chinese-first documentation**: Much of the codebase's documentation, comments, and variable naming is in Chinese, which limits accessibility for non-Chinese-speaking contributors. The code itself is well-structured but the embedded documentation requires translation.

## Integration Patterns

### Deployment Surfaces

Memento-Skills provides 6 deployment surfaces:
- CLI: `memento agent` (interactive or `-m "..."` for single message)
- Desktop GUI: `memento-gui` (Flet-based with session management)
- Feishu bridge: `memento feishu` (WebSocket long-connection)
- DingTalk, WeCom, WeChat: IM Gateway integration
- Skill verification: `memento verify` (download, review, execute)
- Local sandbox: `uv`-based isolated execution

### AG-UI Protocol Compatibility

The `core/protocol/` module implements AG-UI compatible event emission:
- `RunEmitter`: Emits structured events (run_started, step_started, plan_generated, text_delta, etc.)
- `AGUIProtocolAdapter`: Adapts internal events to AG-UI wire format
- `ToolTranscriptSink`: Persists tool call transcripts to the database

This enables integration with AG-UI compatible frontends and monitoring tools.

### Skill Authoring

Skills follow the agentskills.io spec with YAML frontmatter:
```
skill-name/
  SKILL.md          # Instructions (required)
  scripts/          # Executable code (makes it a playbook)
  references/       # Context documents
```

The SkillBuilder validates names (1-64 chars, lowercase + hyphens) and descriptions (1-1024 chars) per the agentskills.io spec, then organizes files into the canonical structure.

### Cloud Skill Market

The SkillGateway includes a cloud marketplace flow:
1. Search cloud catalogue via RemoteRecall
2. Get GitHub URL via `/api/v1/download` endpoint
3. Download via DownloadManager (GitHub-specific downloader)
4. Add to local SkillStore
5. Reload from filesystem for consistency

### Configuration System

Three-layer configuration with auto-migration:
```
System Config (system_config.json)   # Read-only defaults, shipped with code
User Config   (~/memento_s/config.json) # Read-write, user customizations
Runtime Config                        # Merged at startup, used at runtime
```

Fields marked with `x-managed-by: user` are protected from auto-migration across version upgrades.

## Benchmarks & Performance

The paper (arXiv:2603.18743) evaluates on two benchmarks:

**HLE (Humanity's Last Exam)**: Expert-level reasoning across diverse academic disciplines. Performance improves over multiple self-evolution rounds as the skill library grows from atomic skills into learned composite skills.

**GAIA (General AI Assistants)**: Multi-step reasoning with web browsing, file handling, and tool use. Shows progressive improvement in task success rate correlating with skill library growth.

Key findings:
- The skill library grows organically through task experience
- Learned skills cluster into semantically meaningful groups
- Performance improvement tracks with library growth, not just library size
- The system learns better skills through task failure, not just accumulation

**Execution Safety**:
- LoopDetector: max_observation_chain=6, min_effect_ratio=0.15, window_size=10
- InfoSaturationDetector: similarity_threshold=0.6, entity_overlap_threshold=0.7, min_results=3
- Max ReAct turns per skill: 30
- Max React iterations per step: 5
- Max replans per run: 2
- 97 test files covering skills, config, context, tools, and security

## Detailed Loop Detection Architecture

The `LoopDetector` class implements four distinct loop detection patterns, all behavior-based rather than tool-name-specific:

**Pattern 1: Observation Chain**. Counts trailing consecutive "observation" category tool calls. Threshold: 6. Message: "You've used N consecutive observation tools without creating or modifying anything. This is a RESEARCH LOOP."

**Pattern 2: Low Effect Ratio**. In a sliding window of 10 actions, checks if "effect" tools (file creation/modification) fall below 15% of total. Detects agents that are gathering information faster than using it.

**Pattern 3: Diminishing Returns**. Tracks `new_entities` count per observation tool. If the last 3 observations each found <=1 new entity, signals an information saturation loop.

**Pattern 4: Repeating Sequence**. Checks for exact 2-tool or 3-tool repeating patterns (A-B-A-B or A-B-C-A-B-C) in the last 4-6 tool calls.

Each detection returns a structured dict with type, severity, message, and pattern-specific metadata. The ToolCallRecord dataclass tracks tool_name, category (observation/effect/mixed), turn number, new_entities discovered, and created_artifacts.

## Error Recovery System

The `StatefulErrorPatternDetector` implements 8 predefined error patterns with signature matching and recovery hint injection:

- **stateless_variable_loss**: Detects NameError across sandbox calls (threshold: 2). Recovery: use single calls or context_manager_tool.
- **syntax_chinese_quotes**: Detects Chinese quote characters causing SyntaxError (threshold: 1).
- **module_not_found**: Detects missing Python modules (threshold: 2).
- **file_not_found**: Detects path errors (threshold: 2).
- **permission_denied**: Detects access violations (threshold: 1).
- **infinite_retry_loop**: Behavior-based detection via action history analysis (threshold: 3). Checks for repeated identical action signatures or alternating A-B-A-B patterns.
- **bash_pipe_escape**: Detects shell syntax errors from improper escaping (threshold: 2).
- **import_failure**: Detects circular imports or missing exports (threshold: 2).

The `get_error_fingerprint()` method normalizes error messages by replacing variable content (line numbers, paths, variable names, strings, numbers) with placeholders, enabling duplicate detection across different error instances.

Hint injection is throttled via `should_inject_recovery_hint()` with a minimum of 2 turns between hints to prevent hint spam.

## Context Compaction System

The `compaction.py` module implements two-level compression:

**Message-level compression** (`compress_message`): When a single message exceeds a token threshold, an LLM summarizes it to `summary_tokens` (default: 800). The compressed message is prefixed with `[compressed from {role}]` to signal the transformation.

**Conversation-level compaction** (`compact_messages`): When total context exceeds the threshold, all non-system messages are merged into a single summary. The system:
1. Serializes all messages into a structured text format with role tags and tool call details
2. Includes plan execution status (from AgentRunState) in the summarization prompt with "MUST preserve" annotation
3. Preserves TOOL_RESULT content "as completely as possible"
4. If scratchpad is enabled, hints that full records are archived at $SCRATCHPAD
5. Returns compacted messages with new token count

This is a key architectural difference from gstack's approach: gstack uses persistent filesystem artifacts to survive compaction (plans, reviews, checkpoints), while Memento-Skills uses LLM-based summarization with scratchpad archival. The gstack approach preserves exact content; the Memento-Skills approach compresses but risks information loss.
