---
url: 'https://github.com/letta-ai/letta'
type: repo
author: letta-ai
date: '2026-04-04'
tags:
  - agent-memory
  - stateful-agents
  - memory-blocks
  - context-engineering
  - self-improving
  - agent-systems
key_insight: >-
  Letta's core innovation is treating memory as editable text blocks injected directly
  into the LLM system prompt, giving agents explicit tools to read and write their own
  context window. Unlike mem0's vector-search or Graphiti's knowledge graph, Letta's
  memory is literally part of the prompt that the agent can self-modify via tool calls
  like core_memory_replace and rethink_memory. This makes memory management a first-class
  agent capability rather than an external system, but bounds memory by character limits
  rather than information-theoretic relevance.
stars: 21900
deep_research:
  method: source-code-analysis
  files_analyzed:
    - letta/agents/letta_agent.py
    - letta/agents/base_agent.py
    - letta/schemas/memory.py
    - letta/schemas/block.py
    - letta/functions/function_sets/base.py
    - letta/services/summarizer/summarizer.py
    - letta/groups/sleeptime_multi_agent.py
    - letta/constants.py
  analyzed_at: '2026-04-04'
  original_source: repos/letta-ai-letta.md
---

## Architecture Overview

Letta (formerly MemGPT) is a full agent platform, not just a memory library. The codebase is a large Python application (~200+ source files) organized around several key subsystems:

1. **Agent Layer** (`letta/agents/`) -- Multiple agent implementations: `LettaAgent` (main), `VoiceAgent`, `VoiceSleeptimeAgent`, `EphemeralAgent`, `EphemeralSummaryAgent`, plus versioned iterations (v2, v3). All extend `BaseAgent`.

2. **Memory System** (`letta/schemas/memory.py`, `letta/schemas/block.py`) -- The `Memory` class contains `Block` objects that represent editable sections of the LLM context window. Blocks have labels (e.g., "human", "persona"), values (text content), character limits, and metadata.

3. **Tool System** (`letta/functions/`) -- Built-in tool functions the agent can call to modify its own memory: `core_memory_append`, `core_memory_replace`, `rethink_memory`, `memory()` (multi-command), `archival_memory_insert`, `archival_memory_search`, `conversation_search`.

4. **Summarization System** (`letta/services/summarizer/`) -- Handles context window overflow via two modes: `STATIC_MESSAGE_BUFFER` (evict oldest messages, background summarize) and `PARTIAL_EVICT_MESSAGE_BUFFER` (recursive summarization of evicted messages).

5. **Multi-Agent Groups** (`letta/groups/`) -- `SleeptimeMultiAgent`, `DynamicMultiAgent`, `RoundRobinMultiAgent`, `SupervisorMultiAgent` -- orchestration patterns for multiple agents.

6. **Server Layer** -- FastAPI REST API server, LLM client adapters, OpenTelemetry tracing, and service managers (AgentManager, BlockManager, MessageManager, PassageManager).

### The MemGPT Operating System Analogy

The foundational insight from the MemGPT paper (arXiv:2310.08560) frames LLMs as operating systems rather than applications. Just as an OS manages the illusion of vast memory through paging between RAM and disk, MemGPT teaches the LLM to "manage its own memory" by moving data between a limited context window (RAM) and external storage (disk). The paper describes "virtual context management" that creates "an illusion of extended virtual memory" through hierarchical memory management.

The Letta blog expands on this: "Context windows as a constrained memory resource" with storage tiers analogous to computer RAM and disk. Agents autonomously move data between in-context core memory and external archival/recall storage, creating "an illusion of unlimited memory while working within fixed context limits."

This OS analogy is not just a metaphor -- it directly shaped the architecture. The system uses "interrupts to manage control flow between itself and the user," where tool calls serve as system calls and the agent loop functions as the process scheduler.

### Three-Tier Memory Architecture

The official documentation and blog posts describe three distinct memory tiers, each serving a different purpose in the agent's cognitive architecture:

**Core Memory (In-Context Blocks)** -- Persistent knowledge the agent maintains within its active context window. These are the editable blocks that comprise the agent's "working memory." Core memory consists of labeled sections (human, persona, knowledge) that are compiled directly into the system prompt. The agent can read and modify these blocks using dedicated tools.

**Recall Memory (Conversational History)** -- Complete interaction histories preserved to disk, accessible through search and retrieval even when not actively in the context window. Letta automatically persists recall memory, distinguishing it from frameworks that require manual persistence. Every agent maintains "a single perpetual thread, which represents a continuous sequence of messages," providing conversational continuity across sessions.

**Archival Memory (External Knowledge)** -- Explicitly formulated knowledge stored in external databases. Unlike raw conversation history, archival memory represents processed information in vector databases with specialized query tools. The agent must explicitly call `archival_memory_search` to pull data back into context -- there is no automatic promotion.

The documentation emphasizes a critical distinction: "While retrieval (or RAG) is a tool for agent memory, it is not 'memory' in of itself." RAG merely connects systems to data without enabling learning or adaptation. Letta's memory system enables agents to learn because they can write to their own core memory, not just read from an external store.

Data flow for a message to `LettaAgent.step()`:
```
input_messages -> prepare_in_context_messages (load history + system prompt)
  -> rebuild_memory (refresh blocks from DB, compile into system prompt)
  -> LLM call with tools (core_memory_replace, archival_memory_search, etc.)
  -> if tool call: execute tool -> update block/archival -> loop
  -> if send_message: return response to user
  -> summarize if context window approaching limit
```

## Core Mechanism

### Memory Blocks as Editable Context

The fundamental insight of Letta (inherited from the MemGPT paper) is that memory should be part of the LLM prompt that the agent explicitly controls. The `Memory` class (schemas/memory.py) holds a list of `Block` objects:

```python
class Memory(BaseModel):
    blocks: List[Block]  # Editable memory sections
    file_blocks: List[FileBlock]  # File-backed memory
    git_enabled: bool  # Whether to use git-backed structured memory
```

Each `Block` (schemas/block.py) is:
```python
class Block(BaseBlock):
    value: str           # The actual text content
    limit: int           # Character limit (default CORE_MEMORY_BLOCK_CHAR_LIMIT)
    label: str           # e.g., "human", "persona", "conversation_summary"
    description: str     # Description shown in context window
    read_only: bool      # Whether agent can modify it
```

The Letta blog on memory blocks explains that blocks are "the fundamental abstraction for context window management." Each block is individually persisted in the database with a unique `block_id`, enabling:
- Direct API access for developers to modify context components externally
- Persistence across agent sessions without explicit save calls
- Integration with the Agent Development Environment (ADE) for visual inspection
- Cross-agent sharing of memory blocks

The `Memory.compile()` method renders all blocks into XML-structured text that gets injected into the system prompt. The rendering includes metadata (character counts, limits) so the agent is aware of its own memory constraints:

```xml
<memory_blocks>
<human>
<description>Notes about the user</description>
<metadata>
- chars_current=142
- chars_limit=5000
</metadata>
<value>
The user's name is Alice. She prefers dark mode.
</value>
</human>
<persona>
<description>Agent personality and behavior</description>
<metadata>
- chars_current=89
- chars_limit=5000
</metadata>
<value>
I am a helpful assistant that remembers user preferences.
</value>
</persona>
</memory_blocks>
```

The compilation is customizable via Jinja templating -- the context window is "compiled from existing DB state, including current block values" at each LLM invocation. Since block values are strings, developers can store complex data structures (lists, dictionaries, structured notes) by serializing them into string format.

### Self-Modifying Memory Tools

The agent is given tools to modify its own memory blocks. These are defined in `functions/function_sets/base.py`:

**`core_memory_replace(label, old_content, new_content)`** -- Exact string replacement within a block. If `old_content` is not found, raises ValueError. This forces the agent to be precise about what it's changing -- a deliberate design choice that prevents accidental overwrites.

**`core_memory_append(label, content)`** -- Appends content to a block with a newline separator. Simple but prone to block fragmentation over time.

**`rethink_memory(new_memory, target_block_label)`** -- Wholesale rewrite of a block. The agent provides the entire new block content. If the target block doesn't exist, it's created. This is the "nuclear option" that addresses the fragmentation problem by allowing complete reorganization.

**`memory(command, path, ...)`** -- A multi-command tool with sub-operations: create, str_replace, insert (at line number), delete, rename. This is for the newer "git-backed memory" mode, which treats memory blocks like files in a repository.

**`archival_memory_insert(content, tags)`** -- Stores content in long-term vector-searchable archival memory (passage-based storage). This is the agent's way of moving information from working memory to "disk."

**`archival_memory_search(query, tags, tag_match_mode, top_k)`** -- Semantic similarity search over archival memory with optional tag filtering and date range. This is the agent's way of paging information back from "disk" to "RAM."

**`conversation_search(query, roles, limit, start_date, end_date)`** -- Hybrid search over conversation history (recall memory) with role and date filtering. Enables the agent to re-examine past conversations.

These tools are defined as Python functions with `agent_state` parameter but raise `NotImplementedError` -- they're intercepted by the tool execution system before actual invocation. The function signatures and docstrings serve as the tool schema that gets sent to the LLM.

The documentation emphasizes a key design principle: the agent actively rewrites its own memory blocks using tool calling, enabling "context rewriting, allowing agents to improve their context window over time by consolidating important information." This is what makes Letta agents genuinely self-improving -- they don't just store facts, they reorganize and refine their own knowledge representation over time.

### Context Window Management

The `_rebuild_memory_async` method in `BaseAgent` (base_agent.py) is called before each LLM interaction to ensure the system prompt reflects current memory state:

1. Refresh blocks from database (`agent_manager.refresh_memory_async`)
2. Compile memory blocks into string (`agent_state.memory.compile()`)
3. Compare with current system message
4. If changed: update the system message in the database and return updated messages
5. If unchanged: return existing messages (optimization)

The `PromptGenerator.get_system_message_from_compiled_memory()` assembles the full system prompt from: base system prompt (read-only instructions) + compiled memory blocks (editable) + metadata (message count, archival memory size, timestamps, information about externally stored memories) + recent messages (immediate context) + historical message summaries (for continuity without token bloat).

The documentation describes this as automatic context composition: the system "composes context windows from read-only system prompts, editable memory blocks, metadata about externally stored memories, recent messages, and historical message summaries." Developers focus on agent capabilities while Letta manages memory and context automatically.

### Summarization

When the context window approaches its limit (triggered at 90% of `context_window` via `SUMMARIZATION_TRIGGER_MULTIPLIER = 0.9`), the `Summarizer` class handles message eviction:

**STATIC_MESSAGE_BUFFER mode**: Maintains a fixed buffer of recent messages (default limit: configurable). When exceeded, older messages are evicted. If an `EphemeralSummaryAgent` is available, evicted messages are summarized in a background task and the summary is written to a dedicated `conversation_summary` block.

**PARTIAL_EVICT_MESSAGE_BUFFER mode**: Evicts a percentage of messages (default 30%) and creates a recursive summary that replaces the evicted portion. The summary is inserted as a user message at index 1 (after system prompt). This preserves more context than static eviction.

The summarization agent is a separate `EphemeralSummaryAgent` that writes summaries to a target block, effectively compressing conversation history into persistent memory. The documentation describes this as "intelligent eviction strategies" that "remove older content after recursive summarization, preserving essential details while managing window constraints."

### Sleeptime Agents and Asynchronous Memory Consolidation

The `SleeptimeMultiAgent` pattern (groups/sleeptime_multi_agent.py) implements background processing agents -- one of Letta's most distinctive features. The Letta blog on sleep-time compute describes this as enabling "AI systems that don't just think reactively when prompted, but proactively deepen their understanding during what we call 'sleep time.'"

The architecture uses a dual-agent model:

**Primary Agent**: Handles real-time user interactions with abilities to send messages, call custom tools, and search external memory (recall and archival). Crucially, the primary agent lacks tools for editing core in-context memory -- it focuses on conversation.

**Sleep-Time Agent**: Manages memory consolidation asynchronously, with exclusive access to modify both its own and the primary agent's in-context memory blocks. This agent transforms "raw context" into "learned context" by:
- Continuously reorganizing information from the primary agent's memory
- Consolidating previous interactions before new user engagement
- Generating "clean, concise, and detailed memories" rather than incremental, potentially messy updates
- Processing uploaded documents in background "anytime fashion," allowing primary agents to access findings without waiting for completion

The triggering mechanism:
1. Main agent handles user messages in real-time
2. After every N messages (configured via `sleeptime_agent_frequency`), a background task is spawned
3. The sleeptime agent receives a transcript of recent messages
4. It processes them independently, updating memory blocks and extracting facts
5. Results are written back to shared state via the block system

Configuration parameters include:
- **Model Selection**: Primary and sleep agents can use independent models. Stronger models are recommended for sleep-time due to lower latency constraints.
- **Execution Frequency**: Configurable trigger intervals affecting token usage and memory refinement depth.

The documentation positions this as going "beyond MemGPT's synchronous approach" by introducing asynchronous memory refinement: "Non-blocking Operations allow memory management separate from conversation, enabling Proactive Memory Refinement during idle periods rather than lazy updates during interactions." This improves both response latency (the primary agent is never blocked by memory operations) and memory quality (the sleep-time agent can spend more compute on organization).

### Multi-Agent Communication and Orchestration

The Letta documentation describes five coordination patterns with three built-in communication mechanisms:

**Communication tools:**
1. **Asynchronous Messaging**: `send_message_to_agent_async` enables fire-and-forget messaging between agents with immediate return and separate reply handling.
2. **Synchronous Messaging**: `send_message_to_agent_and_wait_for_reply` blocks until the target agent responds, supporting request/response interactions.
3. **Broadcast Messaging**: `send_message_to_agents_matching_all_tags` distributes messages to agent groups matching specified tags, collecting all responses synchronously.

**Orchestration patterns:**
- **Supervisor-worker**: Tag-based routing under centralized coordination. A supervisor agent routes tasks to specialized workers.
- **Parallel execution**: Multiple agents analyzing identical tasks from different perspectives, with results aggregated.
- **Round-robin**: Sequential task distribution across agent pools for load balancing.
- **Producer-reviewer**: Iterative refinement cycles with feedback -- one agent produces, another reviews, cycling until quality is met.
- **Hierarchical teams**: Multi-layer structures (executives, managers, workers) for complex organizational tasks.

**Shared memory blocks** enable state persistence across agents -- a critical mechanism beyond messaging. Multiple agents can access and modify identical memory blocks, enabling collaborative knowledge building. This is the foundation of the sleeptime pattern: the sleep-time agent modifies the primary agent's memory blocks asynchronously.

### Context Constitution and Context Repositories

Recent Letta blog posts describe two advanced memory concepts that extend the base block architecture:

**Context Constitution**: A formalization of the rules and principles that govern how an agent's context window is composed. Rather than ad-hoc prompt engineering, the context constitution defines structured policies about what information appears in the agent's context, how it is prioritized, and when it should be updated or evicted.

**Context Repositories**: A git-backed memory system where memory blocks are treated as files in a repository with version history. This enables structured memory operations (create, str_replace, insert at line number, delete, rename) via the `memory()` multi-command tool. The git backing provides versioning, diffing, and rollback capabilities for memory state -- addressing the fragmentation problem that plagues simple append-based memory.

### Continual Learning in Token Space

The Letta blog describes their approach to agent learning as "continual learning in token space." Traditional machine learning updates model weights; Letta agents learn by modifying the tokens in their context window. This is fundamentally different from fine-tuning or RLHF:

- **No gradient updates**: Learning happens entirely through text manipulation
- **Immediate effect**: Memory changes take effect on the very next LLM call
- **Reversible**: Bad memories can be overwritten or deleted (unlike weight updates)
- **Inspectable**: The agent's entire "learned state" is visible as text blocks that developers and users can read and modify
- **Bounded**: Learning is constrained by block character limits, not by any measure of information content or importance

The sleep-time compute pattern extends this: instead of learning only during active conversation, agents can consolidate and refine their memories during idle periods, analogous to how biological memory consolidation occurs during sleep.

## Design Tradeoffs

**Memory-in-prompt vs. external memory system**: Letta chose to make memory literally part of the prompt that the agent can see and edit. This gives the agent full awareness of its memory state and explicit control over modifications. The documentation frames this as solving "context pollution" -- unlike RAG approaches that inject potentially irrelevant retrieved information, Letta's core memory contains only what the agent has explicitly chosen to remember. The tradeoff is that memory is bounded by character limits (not information content) and takes up context window space.

**Character limits vs. token limits**: Blocks use character limits (default `CORE_MEMORY_BLOCK_CHAR_LIMIT`), not token limits. This is simpler but less precise -- a block at 5000 characters might consume vastly different token counts depending on content density. The context window overflow check uses a multiplier (`SUMMARIZATION_TRIGGER_MULTIPLIER = 0.9`) as a safety margin. The documentation acknowledges no global budget across all blocks -- each block has its own limit, but an agent with many blocks could still overflow the context window.

**Agent-as-memory-manager vs. automatic extraction**: Unlike mem0 (automatic fact extraction) or Graphiti (automatic entity/edge extraction), Letta delegates ALL memory management to the agent itself. The agent decides what to remember, what to forget, and how to organize its blocks. This means memory quality depends entirely on the agent's prompt and reasoning capability. The documentation argues this is a feature, not a bug: "the future of agent memory lies not in any single technique but in the thoughtful combination of multiple approaches."

**Full platform vs. memory library**: Letta is not just a memory system -- it's a complete agent platform with REST API, multi-agent orchestration, tool execution, MCP support, and deployment infrastructure. This makes it more capable but far heavier than mem0 or Graphiti for memory-only use cases. The documentation positions this as intentional: memory is not a feature to be bolted on but the central architectural principle around which the entire agent system is designed.

**Exact string replacement vs. semantic dedup**: `core_memory_replace` requires exact string matching. If the agent misremembers the exact text in its block, the replacement fails. `rethink_memory` sidesteps this by rewriting the entire block, but then the agent must regenerate all existing content. The documentation describes this as encouraging careful memory management rather than sloppy overwrites.

**Background summarization vs. synchronous compaction**: The static buffer mode runs summarization in a background fire-and-forget task, meaning the summary is not available until after the current turn. The partial evict mode is synchronous but blocks the response. The sleeptime pattern addresses this by moving all memory consolidation to a dedicated background agent, achieving both non-blocking operation and high-quality memory management.

**Stateful by default vs. stateless-with-memory**: The documentation makes a strong philosophical argument: traditional LLM frameworks assume statelessness and bolt on memory as an afterthought, leading to "context pollution" and inability to learn. Letta inverts this by making statefulness the default. Every agent maintains persistent memory blocks, a continuous message thread, and archival storage. The tradeoff is higher per-agent resource consumption and more complex lifecycle management.

**Model agnosticism**: The documentation emphasizes that "Letta is fully model-agnostic" with recommended models ranked on a leaderboard. This means the memory tools must work across different models' tool-calling capabilities, which constrains the tool interface to the lowest common denominator of supported models.

## Failure Modes & Limitations

**Context window overflow race condition**: Summarization triggers at 90% of context window. If a single tool call returns a very large result, the context can exceed 100% before summarization kicks in. The code catches `ContextWindowExceededError` and attempts recovery, but this is a reactive rather than preventive measure.

**Memory block fragmentation**: Repeated `core_memory_append` calls create increasingly long blocks. Without explicit reorganization (via `rethink_memory`), blocks accumulate stale information. The agent must proactively maintain its own memory quality -- the documentation calls this "context rewriting" and positions it as a capability rather than a burden, but weak models may fail to maintain block hygiene.

**Summarization quality is LLM-dependent**: The `EphemeralSummaryAgent` produces summaries using an LLM. Information loss during summarization is unavoidable and uncontrolled -- the system cannot guarantee what information is retained. The documentation acknowledges this by recommending stronger models for sleep-time agents.

**No structural memory representation**: All memory is unstructured text in blocks. There are no entities, relationships, or facts -- just strings. For applications requiring structured queries ("What is Alice's relationship to Bob?"), the agent must parse its own block text every time. This is a fundamental limitation compared to Graphiti's knowledge graph approach.

**Character limit enforcement is per-block, not global**: Each block has its own limit, but there's no global budget across all blocks. An agent with many blocks could still overflow the context window even with each block under its individual limit.

**Archival memory search is separate from core memory**: The agent must explicitly call `archival_memory_search` to retrieve from long-term storage. There's no automatic promotion of relevant archival memories into the context window. The agent must manage this retrieval proactively -- if it forgets to search, relevant information stays on "disk."

**Sleeptime agent thread model**: Background sleeptime tasks run in daemon threads with their own event loops (`asyncio.new_event_loop()`). If the main process exits while background tasks are running, work may be lost. There's no graceful shutdown coordination.

**Single perpetual thread assumption**: Every agent maintains one continuous message thread. For applications requiring branching conversations or parallel contexts, this model is limiting. The thread grows monotonically, with summarization as the only compaction mechanism.

**No structured knowledge representation**: Compared to Graphiti's entity-relationship graph, Letta stores all knowledge as unstructured text strings. The agent cannot query "what entities are connected to Alice" without parsing its own block text. For applications requiring relational reasoning across many entities, the text-block approach becomes increasingly unwieldy as the knowledge base grows.

**Memory quality depends on model quality**: Since the agent manages its own memory through tool calls, memory quality is directly proportional to the LLM's reasoning ability. Weaker models may fail to recognize when information should be updated, may create redundant entries, or may overwrite important information when reorganizing blocks. The documentation recommends stronger models for sleep-time agents specifically because memory consolidation requires higher-quality reasoning.

**Context pollution from block metadata**: Each block in the compiled system prompt includes metadata (character count, limit, description) that consumes tokens but provides no direct value to the conversation. For agents with many blocks, this overhead can be significant -- 5 blocks with metadata headers might consume 200+ tokens of the context window just for structural information.

**Read-only blocks cannot be updated by the agent**: Blocks marked as `read_only=True` can only be modified by developers via the API. This is useful for system-level instructions but creates a two-class memory system where some knowledge is mutable and some is not. If the agent needs to annotate or respond to read-only information, it must use a separate writable block, leading to potential inconsistency between the read-only source and the agent's annotations.

## Integration Patterns

**LLM Providers** (17+ listed in PROVIDER_ORDER): Letta's own inference endpoint, OpenAI, Anthropic, Ollama, Google AI, Google Vertex, Azure, Groq, Together, vLLM, AWS Bedrock, DeepSeek, xAI, LM Studio, ZAI, OpenRouter. Provider adapters handle differences in streaming, tool calling, and structured output. The documentation recommends Opus 4.5 and GPT-5.2 based on their model leaderboard, noting that model quality significantly impacts memory management quality.

**Storage**: PostgreSQL-backed (via SQLAlchemy ORM in `letta/orm/`). Messages, blocks, agents, passages (archival memory), and all metadata stored in Postgres. Embedding-based search for archival and conversation search.

**Deployment**: FastAPI REST server, Docker support, OpenTelemetry tracing, Redis for data source connectors. The server exposes a full REST API for managing agents, sending messages, and retrieving memory state. Also available as a CLI tool (`npm install -g @letta-ai/letta-code`) requiring Node.js 18+.

**SDKs**: Both Python (`pip install letta-client`) and TypeScript (`npm install @letta-ai/letta-client`) with equivalent functionality.

**Typical integration**:
```python
from letta_client import Letta

client = Letta(token="your-api-key")

agent_state = client.agents.create(
    model="openai/gpt-4.1",
    memory_blocks=[
        {"label": "human", "value": "The user's name is Alice.", "limit": 5000},
        {"label": "persona", "value": "I am a helpful assistant that remembers preferences.", "limit": 5000},
    ],
    tools=["web_search", "fetch_webpage"],
)

response = client.agents.messages.create(
    agent_id=agent_state.id,
    input="I prefer dark mode for everything.",
)
# The agent may autonomously call core_memory_replace to update the "human" block
# Response includes both reasoning_message (internal thought) and assistant_message
```

**Shared memory blocks for multi-agent**:
```python
# Create a shared knowledge block
knowledge_block = client.blocks.create(
    label="shared_knowledge",
    value="Project context goes here.",
    limit=10000,
)

# Multiple agents can reference the same block
agent_a = client.agents.create(
    model="openai/gpt-4.1",
    memory_blocks=[
        {"label": "persona", "value": "I am the researcher."},
        knowledge_block,  # Shared block
    ],
)

agent_b = client.agents.create(
    model="openai/gpt-4.1",
    memory_blocks=[
        {"label": "persona", "value": "I am the reviewer."},
        knowledge_block,  # Same shared block
    ],
)
# Both agents read and write to the same knowledge block
```

**MCP Integration**: Letta supports Model Context Protocol servers for tool discovery, with MCP tools tagged by server name. This allows agents to discover and use tools from external MCP servers.

**Multi-Agent patterns**: Groups support round-robin, dynamic routing, supervisor, sleeptime, and producer-reviewer patterns. The sleeptime pattern is the most distinctive, enabling background memory consolidation without blocking user interactions.

**Letta Code**: A memory-first coding agent available as a CLI tool, with pre-built skills and subagents for "advanced memory and continual learning." Supports the Letta Code SDK for building applications on top of stateful computer use agents.

## Benchmarks & Performance

There are no benchmark scripts in the repository. The codebase is production-focused with extensive observability (OpenTelemetry tracing, metric registries) rather than research benchmarks.

The original MemGPT paper (arXiv:2310.08560) demonstrated effectiveness in two domains:
- **Document analysis**: Processing documents substantially exceeding the LLM's context capacity via virtual context management
- **Multi-session chat**: Creating conversational agents capable of persistence, reflection, and dynamic evolution across extended interactions

The Zep paper's DMR benchmark provides an independent comparison point: MemGPT achieved 93.4% accuracy (vs Zep/Graphiti's 94.8% and full-context baseline of 94.4%), demonstrating that the self-editing memory approach is competitive with knowledge graph approaches on simple fact retrieval but may trail on complex temporal reasoning tasks.

**Performance characteristics from code:**

- **LLM calls per step**: Minimum 1 (single LLM call), but typically 2-5+ because the agent loops: each tool call triggers another LLM call until the agent calls `send_message`. Memory operations (read/write blocks) are zero-cost in terms of external API calls -- they're just string operations on Python objects.
- **Maximum steps per request**: Default `DEFAULT_MAX_STEPS = 50`. Each step is one LLM call + optional tool execution.
- **Context window management**: Default context window is 128K tokens. Summarization triggers at 90% usage.
- **Message buffer**: Configurable via `message_buffer_limit` (no hardcoded default in visible config). `message_buffer_min` controls how many recent messages survive eviction.
- **Archival memory**: Uses embedding-based passage storage with configurable chunk size (default 300 chars) and embedding dimension (default 1024).

The Letta approach has fundamentally different performance characteristics than mem0 or Graphiti. The cost comes from the agent loop: every memory modification requires a full LLM call because the agent must reason about what to change. A single user message might trigger 3-5 LLM calls as the agent reads context, updates memory, searches archival storage, and formulates a response. However, the sleeptime pattern mitigates this by offloading expensive memory consolidation to background agents, keeping the primary interaction path fast.

The "self-improving" claim is accurate in a meaningful sense: the agent can modify its own persona, user notes, and knowledge blocks across conversations, and the sleeptime agent can perform deeper consolidation during idle periods. But this improvement is bounded by the agent's ability to manage text blocks -- there's no learning algorithm, no gradient update, just an LLM editing strings in its own prompt. The documentation positions this as "continual learning in token space" -- the agent learns by modifying the tokens it sees, not by updating model weights.
