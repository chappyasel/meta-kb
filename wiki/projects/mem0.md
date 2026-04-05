---
entity_id: mem0
type: project
bucket: agent-memory
sources:
  - repos/memorilabs-memori.md
  - repos/supermemoryai-supermemory.md
  - repos/thedotmack-claude-mem.md
  - repos/caviraoss-openmemory.md
  - repos/mem0ai-mem0.md
  - repos/affaan-m-everything-claude-code.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/letta-ai-letta.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:22:45.894Z'
---
# Mem0

## What It Does

Mem0 ("mem-zero") adds a persistent memory layer to AI applications. Instead of passing full conversation history into every prompt, it extracts facts from conversations, stores them, and retrieves relevant ones on demand. The result is agents and chatbots that remember user preferences, past interactions, and contextual details across sessions without consuming the entire context window.

The core architectural choice: memory management is decoupled from both the LLM and the storage backend. You can swap models or vector stores without rebuilding the memory pipeline.

## Core Mechanism

The `Memory` class (in `mem0/memory/`) handles three operations:

**Add** (`memory.add(messages, user_id=user_id)`): Passes conversation turns through an LLM extraction step to identify facts worth storing ("user prefers dark mode"), then writes those facts as vectors to the configured store. The default LLM is `gpt-4.1-nano-2025-04-14`.

**Search** (`memory.search(query, user_id=user_id, limit=3)`): Runs a semantic similarity search against stored facts for a given user, session, or agent scope. Returns ranked results that callers inject into their system prompts.

**Multi-level scoping**: Memories are tagged at three levels — user, session, and agent. A single fact can belong to all three, enabling per-user personalization independent of which agent or session surfaced it.

Vector storage is pluggable. The library supports Qdrant, Pinecone, Chroma, and others through a common interface. Each user's facts live in the same vector namespace, differentiated by metadata filters on user_id.

The extraction step uses an LLM to decide what's worth remembering, which means every `add()` call consumes tokens beyond what the application already spent on generation. This is a real cost that the documentation underemphasizes.

## Key Numbers

From the Mem0 research paper (self-reported, LOCOMO benchmark):
- **+26% accuracy** over OpenAI Memory
- **91% faster responses** than full-context approaches
- **90% fewer tokens** than full-context

These numbers come from Mem0's own paper (`arXiv:2504.19413`) and have not been independently validated. The LoCoMo benchmark results from competitor Memori (81.95% overall accuracy) rank above Mem0 on the same benchmark, which Mem0's README does not acknowledge. Supermemory claims the #1 position on LoCoMo, LongMemEval, and ConvoMem.

**Repository**: 51,880 stars, Apache-2.0 license, YC S24 backed.

## Strengths

**Broad backend support**: Works with most major vector stores and LLMs out of the box. Switching from Qdrant to Pinecone requires a config change, not code changes.

**Simple API surface**: `add()`, `search()`, `get()`, `delete()` cover most use cases. The quickstart example in the README is complete and functional — no hidden setup steps.

**Framework integrations**: LangGraph, CrewAI, and others have documented integration paths. MCP server support lets it plug into Claude Code, Cursor, and similar tools.

**Self-hostable**: The full open-source package runs without any Mem0 cloud dependency. Managed platform exists for teams that want it.

## Critical Limitations

**Concrete failure mode**: Memory extraction relies on an LLM call per `add()` invocation. In high-frequency agent loops where the agent calls tools repeatedly and logs each step, extraction costs accumulate fast. If the extraction LLM misclassifies a transient state ("I am currently processing step 3 of 10") as a durable fact, that noise pollutes future retrievals. There is no built-in deduplication or contradiction resolution — if a user updates a preference ("actually I prefer light mode now"), both the old and new facts coexist until you manually delete the stale one.

**Unspoken infrastructure assumption**: Mem0 expects a running vector database. In production, that means maintaining Qdrant or another store alongside your application. Cold start latency, replication, and backup are entirely your problem. The managed platform sidesteps this, but introduces vendor lock-in that the Apache-2.0 license otherwise avoids.

## When NOT to Use It

**Avoid Mem0 when your memory queries require temporal reasoning**. If your application needs to answer "what did the user say last week versus last month" or resolve contradictions ("user said X in January but Y in March"), Mem0 has no native mechanism for this. It stores facts as flat vectors with timestamps but does not reason over time ordering.

**Skip it if your agent runs in tight loops with many short turns**. Each `add()` call hits an LLM for extraction. An agent that takes 50 steps to complete a task generates 50 extraction calls on top of 50 task calls. At that ratio, the token savings from not passing full context may disappear.

**Do not use it for compliance-sensitive applications** without auditing the hosted platform's data handling. The self-hosted path avoids this, but requires running your own vector infrastructure at production scale.

## Unresolved Questions

**Conflict resolution is undocumented**. The README shows no mechanism for handling contradictory facts about the same user. Whether the extraction LLM detects conflicts or simply appends is unclear from public documentation.

**Cost at scale**: The managed platform pricing for high-volume production workloads is not public. For self-hosted deployments, the combined cost of extraction LLM calls plus vector store operations at millions of add/search operations per day is not benchmarked anywhere in the documentation.

**Governance**: Mem0 is YC-backed and commercially oriented. The open-source repository and the managed platform share a brand but have separate codebases. It is not documented how features developed for the platform flow back to the open-source package, or on what timeline.

**Extraction quality**: The paper benchmarks retrieval accuracy but not extraction precision — how often the extraction LLM correctly identifies what should be a memory versus noise. This matters more in production than retrieval accuracy, because bad extraction corrupts the memory store over time.

## Alternatives

**[Memori](https://github.com/MemoriLabs/Memori)**: SQL-native, extracts memory from agent actions (tool calls, not just text). Outperforms Mem0 on LoCoMo (81.95% vs Mem0's reported numbers). Use Memori when you need structured, queryable memory and your agents do more than converse.

**Supermemory**: Claims #1 on LongMemEval, LoCoMo, and ConvoMem (self-reported). Handles temporal reasoning and contradiction resolution natively. TypeScript-first. Use Supermemory when temporal fact management and automatic forgetting matter for your use case.

**Plain RAG**: If your memory needs are document retrieval rather than personal fact tracking, a standard vector search pipeline (Qdrant + embeddings) without a memory abstraction layer is simpler and cheaper. Mem0 adds value when you need per-user personalization across sessions, not just document retrieval.

**LangMem (LangGraph)**: Tightly integrated with the LangGraph ecosystem. Use it if you are already on LangGraph and want minimal additional dependencies.

Use Mem0 when you want a self-hostable, backend-agnostic memory layer with a clean API, an existing LangGraph or CrewAI integration, and your use case fits simple fact storage and retrieval without temporal reasoning.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.5)
