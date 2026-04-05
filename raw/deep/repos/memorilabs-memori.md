---
url: 'https://github.com/memorilabs/memori'
type: repo
author: memorilabs
date: '2026-04-04'
tags:
  - agent-memory
  - context-engineering
  - llm-middleware
  - semantic-triples
  - fact-extraction
  - recall-injection
  - multi-provider
  - sql-native
key_insight: >-
  Memori achieves 81.95% accuracy on LoCoMo with only 4.97% of the full-context
  token footprint by intercepting LLM calls at the SDK level, transparently
  extracting semantic triples and facts from conversations, and re-injecting
  relevant memories into system prompts -- a middleware pattern that makes memory
  invisible to application code while enabling entity-attributed, temporally-aware
  recall across any LLM provider.
stars: 13000
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - memori/llm/_base.py
    - memori/llm/pipelines/recall_injection.py
    - memori/llm/pipelines/post_invoke.py
    - memori/llm/pipelines/conversation_injection.py
    - memori/llm/invoke/invoke.py
    - memori/llm/adapters/openai/_adapter.py
    - memori/llm/adapters/anthropic/_adapter.py
    - memori/memory/recall.py
    - memori/memory/_struct.py
    - memori/memory/_writer.py
    - memori/memory/_manager.py
    - memori/memory/augmentation/_handler.py
    - memori/memory/augmentation/_augmentation.py
    - memori/embeddings/_chunking.py
    - memori-ts/src/engines/recall.ts
    - memori-ts/src/engines/persistence.ts
    - memori-ts/src/engines/augmentation.ts
  analyzed_at: '2026-04-04'
  original_source: repos/memorilabs-memori.md
---

## Architecture Overview

Memori is an LLM-agnostic memory middleware that intercepts LLM API calls via monkey-patching to transparently persist and recall conversational context. It ships as both a Python SDK (`pip install memori`) and TypeScript SDK (`npm install @memorilabs/memori`), with a cloud-hosted backend (Memori Cloud) and a self-hosted BYODB (Bring Your Own Database) option supporting PostgreSQL, MySQL, SQLite, MongoDB, Oracle, OceanBase, and CockroachDB.

The architecture has three primary layers:

**LLM Interception Layer:** The `BaseClient` class wraps LLM provider methods (e.g., `client.chat.completions.create`) with `Invoke` wrappers that hook into the request/response lifecycle. Registration is done via `mem.llm.register(client)`, which detects the provider (OpenAI, Anthropic, Google, Bedrock, xAI) and version, then monkey-patches the appropriate method with sync/async/streaming variants. The wrapper intercepts kwargs before the LLM call, injects recalled facts, then captures the response for persistence.

**Memory Processing Pipeline:** A two-phase pipeline runs on every LLM call:
1. **Pre-invoke (recall injection):** `inject_recalled_facts()` extracts the user query from kwargs, searches for relevant facts using the Recall engine, filters by relevance threshold, and injects them as a `<memori_context>` block into the system prompt (or appropriate message position for non-OpenAI providers).
2. **Post-invoke (persistence):** `handle_post_response()` formats the request/response payload into a structured conversation turn, writes it to storage via the Writer, and optionally triggers Advanced Augmentation for fact extraction.

**Storage Layer:** The Writer persists conversation turns through a driver abstraction supporting multiple databases via SQLAlchemy (BYODB) or DBAPI adapters. The storage model uses entity/process/session/conversation hierarchy: entities (users) have sessions, sessions have conversations, conversations have messages. The Cloud variant sends payloads to Memori's hosted API instead.

### Dual SDK Architecture

The Python and TypeScript SDKs share the same conceptual architecture but differ in implementation:

**Python SDK** (`memori/`): Production-focused with full BYODB support, SQLAlchemy integration, direct database drivers, and the complete augmentation pipeline. Uses monkey-patching of SDK methods with sync/async detection.

**TypeScript SDK** (`memori-ts/`): Cloud-first with three engines -- `PersistenceEngine` (stores conversations), `RecallEngine` (retrieves relevant memories), and `AugmentationEngine` (advanced memory processing). Uses method wrapping with the same register pattern. Includes OpenClaw plugin support via a separate `integrations/openclaw/` package.

## Core Mechanism

### LLM Method Interception

The interception pattern is the fundamental innovation. When you call `mem.llm.register(client)`, Memori:

1. Detects the provider type from the client object (OpenAI, Anthropic, Google, etc.)
2. Backs up the original method (e.g., `client.chat._completions_create = client.chat.completions.create`)
3. Wraps it with an `Invoke` class that handles the pre/post pipeline
4. The `_wrap_method` helper auto-detects async context and chooses the correct wrapper class (`Invoke`, `InvokeAsync`, `InvokeStream`, `InvokeAsyncStream`)

This means application code does not change at all -- `client.chat.completions.create(...)` transparently gains memory. The pattern works across direct SDK calls, LangChain wrappers, and Agno framework calls.

### Entity Attribution Model

Memori scopes all memory operations to an entity/process pair:
- **Entity**: A person, user, or thing that memories are about (e.g., `user_123`)
- **Process**: The agent, LLM interaction, or program generating memories (e.g., `support_agent`)

Without attribution, Memori cannot create memories. This is a deliberate design choice that prevents accidental cross-user memory contamination. The `mem.attribution(entity_id, process_id)` call sets the scope for all subsequent LLM calls.

### Fact Recall Pipeline

The recall pipeline in `recall_injection.py` operates as follows:

1. **Query extraction:** `extract_user_query(kwargs)` pulls the last user message from the kwargs, handling different message formats (OpenAI messages array, Anthropic system+messages, Google system_instruction, Responses API input/instructions).
2. **Fact search:** The `Recall` class searches for facts relevant to the query. For Cloud mode, this calls the Memori API. For BYODB, it uses the local storage driver with optional embeddings.
3. **Relevance filtering:** Facts are filtered by `recall_relevance_threshold` using `_score_for_recall_threshold()`, which extracts `rank_score` or `similarity` from the fact object.
4. **Context injection:** Relevant facts are formatted as a `<memori_context>` block with date-stamped entries, then injected into the system prompt position appropriate for the provider:
   - Anthropic/Bedrock: Appended to `kwargs["system"]`
   - Google: Injected via `inject_google_system_instruction()`
   - OpenAI Responses API: Appended to `kwargs["instructions"]`
   - OpenAI Chat: Prepended as system message or appended to existing system message

### Memory Structure: Semantic Triples

Memori structures extracted memories as semantic triples (subject-predicate-object), not just flat text. The `_struct.py` module defines:

- **Entity**: Contains `facts` (flat text strings), `fact_embeddings` (vector representations), and `semantic_triples` (structured subject/predicate/object with type annotations)
- **SemanticTriple**: `subject_name`, `subject_type`, `predicate`, `object_name`, `object_type` -- enabling graph-like querying of memory
- **Conversation**: Contains `summary` for conversation-level context
- **Process**: Contains `attributes` for process-level patterns

This triple structure enables queries like "what does user_123 prefer" (subject=user_123, predicate=prefers, object=?) rather than requiring keyword matching against flat text.

### Advanced Augmentation

The augmentation pipeline (`memory/augmentation/`) is a pluggable system for post-processing conversation turns. It runs after the Writer persists the raw conversation and can:
- Extract structured facts from conversation text
- Generate semantic triples from detected relationships
- Produce conversation summaries
- Update entity profiles with new information

The `_handler.py` dispatches augmentation through a manager that supports custom augmentation plugins registered via the configuration.

## Design Tradeoffs

### Monkey-patching vs explicit API
Memori chose transparent interception over an explicit memory API. The advantage is zero code changes for existing applications -- just register the client and memory works automatically. The disadvantage is fragility: every new SDK version from OpenAI, Anthropic, etc. could break the patching. The adapter pattern (`memori/llm/adapters/`) partially mitigates this by isolating provider-specific logic, but maintaining compatibility across 6+ providers and their async/streaming variants is a significant maintenance burden.

### Cloud vs BYODB tension
The dual deployment model creates API surface complexity. Cloud mode sends payloads to Memori's hosted service, while BYODB mode runs everything locally with SQLAlchemy drivers. The codebase has conditional paths throughout (`if invoke.config.cloud is True:` / `else:`) that increase testing surface and potential for divergent behavior.

### Relevance threshold as a single knob
The `recall_relevance_threshold` is the primary quality control for what gets injected. Too low and irrelevant context pollutes the prompt. Too high and relevant memories are missed. The threshold applies uniformly to all fact types, with no mechanism for type-specific thresholds (e.g., user preferences might warrant a lower threshold than project facts).

### Session-scoped conversations
Conversations are grouped by session with a configurable timeout. If the timeout is too short, related messages get split across conversations. If too long, unrelated topics get merged. The `session_timeout_minutes` config handles this, but optimal values vary by use case.

### Token cost of recall injection
Every LLM call triggers a recall search and potentially injects a `<memori_context>` block into the system prompt. For high-frequency, low-context calls (like code completions), this adds unnecessary latency and token cost. There is no mechanism to selectively disable recall for specific call types.

## Failure Modes & Limitations

### Provider compatibility fragility
The monkey-patching approach means any breaking change in an LLM provider's SDK (new method signatures, renamed attributes, protobuf format changes) can silently break memory. The `_uses_protobuf` flag and Google-specific format handling show this fragility in practice.

### No temporal reasoning
While facts carry `date_created` timestamps (displayed in recall as "Stated at {date}"), there is no mechanism for temporal reasoning -- no way to express "this was true in January but changed in March" or "this fact supersedes that one." Contradictory facts from different time periods coexist without resolution.

### Cloud dependency for advanced features
The most powerful features (semantic triple extraction, conversation summarization, entity graph) appear to be primarily available in Cloud mode. BYODB mode gets basic conversation storage and embedding-based recall, but the augmentation pipeline's full capabilities depend on the cloud backend.

### No forgetting mechanism
Unlike Supermemory, Memori has no explicit forgetting or memory expiration mechanism. Facts accumulate indefinitely, which could lead to recall pollution over time as the fact store grows. The relevance threshold provides some filtering, but old irrelevant facts still consume storage and search resources.

### Single-entity recall
Recall is scoped to a single entity at a time. There is no way to query memories across multiple entities or aggregate entity-process patterns. In multi-user applications, this means each user's memory is completely isolated.

## Integration Patterns

### Direct SDK wrapping (primary pattern)
```python
from memori import Memori
from openai import OpenAI
client = OpenAI()
mem = Memori().llm.register(client)
mem.attribution("user_123", "support_agent")
# All subsequent client.chat.completions.create() calls get memory
```

### OpenClaw plugin
The `@memorilabs/openclaw-memori` plugin hooks into OpenClaw's lifecycle, providing drop-in persistent memory for OpenClaw-based agents. It captures durable facts after each conversation and injects relevant context into future prompts.

### MCP server
Memori exposes an MCP endpoint at `api.memorilabs.ai/mcp/` for integration with Claude Code, Cursor, Codex, Warp, and other MCP-compatible tools. This bypasses the SDK entirely, using HTTP headers for authentication and entity attribution.

### LangChain integration
The adapter supports LangChain's `ChatOpenAI`, `ChatVertexAI`, `ChatBedrock`, `ChatGoogleGenerativeAI` wrappers. The monkey-patching works at the underlying SDK level, so LangChain calls transparently gain memory.

### Agno framework
Dedicated adapter support for Agno framework calls, handling Agno-specific message formats and provider detection.

## Benchmarks & Performance

**LoCoMo Benchmark Results:**
- Overall accuracy: 81.95%
- Average tokens per query: 1,294 (4.97% of full-context footprint)
- Outperforms Zep, LangMem, and Mem0 on accuracy
- 67% prompt size reduction vs Zep
- 20x+ context cost reduction vs full-context prompting

The benchmark validates Memori's core thesis: structured memory extraction from conversations can preserve reasoning quality while dramatically reducing token footprint. The 4.97% token usage is particularly notable -- it means Memori achieves near-full-context accuracy while using ~1/20th the tokens.

**Efficiency ratio:** At 81.95% accuracy with 1,294 tokens/query, Memori achieves roughly 0.063% accuracy per token -- among the highest efficiency ratios in the agent memory space. This matters for production deployments where per-call token costs compound across millions of interactions.

**Multi-provider support:** The benchmark was run with OpenAI models, but the architecture is provider-agnostic. The adapter layer supports OpenAI, Anthropic, Google, Bedrock, xAI, and framework wrappers (LangChain, Agno), meaning the same memory quality should transfer across providers (subject to model-specific recall quality differences).
