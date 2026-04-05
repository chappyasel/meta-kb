---
entity_id: memori
type: project
bucket: agent-memory
sources:
  - repos/zhongwanjun-memorybank-siliconfriend.md
  - repos/memorilabs-memori.md
  - repos/supermemoryai-supermemory.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/memorilabs-memori.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T05:42:46.803Z'
---
# Memori

## What It Does

Memori is a memory infrastructure layer for AI agents that intercepts LLM calls, extracts structured facts from those interactions, and stores them in a SQL backend. The next time the same entity (user, process, session) makes a request, Memori injects relevant recalled context into the prompt automatically. You drop it in alongside your existing OpenAI or Anthropic client; your agent code stays unchanged.

The core pitch: agents forget between sessions, and stuffing full conversation history into every prompt gets expensive fast. Memori trades that token mass for a structured recall layer.

## Architecture

The SQL-native design sets Memori apart from vector-only approaches. Rather than encoding all memory as embeddings and doing approximate nearest-neighbor search, Memori extracts typed facts (attributes, events, preferences, relationships, rules, skills, people) and writes them as structured rows. Retrieval can therefore use SQL filtering alongside semantic search, giving precise lookups that pure embedding search struggles with.

Memory attribution works across three scopes: `entity` (a user or persistent object), `process` (the agent or application), and `session` (the current interaction batch). All three get tracked and enriched independently. The Advanced Augmentation pipeline runs asynchronously in the background, so enrichment adds no latency to the main LLM call.

The SDK intercepts at the LLM client level. In Python, `Memori().llm.register(client)` wraps an OpenAI or Anthropic client object. The TypeScript SDK does the same via `.llm.register(client)`. Streaming, async, and sync call patterns are all handled.

For teams who can't send data to Memori's cloud, BYODB (Bring Your Own Database) mode connects to a self-hosted datastore via the Memori CLI.

Integration surface is wide: Python and TypeScript SDKs, MCP server (one-line install for Claude Code, Cursor, Codex, Warp), and an OpenClaw plugin that hooks into OpenClaw's agent lifecycle without touching agent code.

## Key Numbers

**Stars:** 13,011 | **Forks:** 1,551

**LoCoMo benchmark:** 81.95% overall accuracy at 1,294 tokens average per query, which the project claims is 4.97% of a full-context footprint. Token reduction figures (67% vs. Zep, 20x vs. full-context) are self-reported by MemoriLabs. The LoCoMo benchmark itself is a published academic dataset (not proprietary), but the evaluation methodology and comparison setup come from MemoriLabs' own paper (arXiv 2603.19935). Independent replication has not been confirmed.

## Strengths

**Token efficiency in production.** For multi-turn agents where context accumulates across many sessions, SQL-structured recall genuinely reduces prompt size compared to passing raw conversation history. The attribution model (entity/process/session) maps cleanly onto real agent architectures.

**Low integration friction.** Wrapping an existing OpenAI client is two lines. MCP install is one command. This matters for teams prototyping quickly or adding memory to an existing codebase without rearchitecting.

**Typed memory categories.** Storing preferences, skills, relationships, and rules as discrete types (not just raw text chunks) makes retrieval more reliable for structured queries. "What are this user's preferences?" is a different query shape than semantic search over conversation blobs.

**Framework breadth.** LangChain, Pydantic AI, Agno, plus direct LLM support for Anthropic, OpenAI, Bedrock, Gemini, DeepSeek, Grok, and xAI.

## Critical Limitations

**Concrete failure mode:** Attribution is mandatory for memory to function. If you forget to call `mem.attribution(entity_id, process_id)` before LLM calls, Memori records nothing and recalls nothing silently. In multi-agent pipelines where different components make LLM calls, missing attribution on any component drops that memory entirely. There is no warning; it just doesn't work.

**Unspoken infrastructure assumption:** The background augmentation pipeline requires reliable network connectivity to Memori Cloud on every LLM call. In latency-sensitive or air-gapped environments, BYODB mode requires you to stand up and maintain a compatible datastore. The documentation describes BYODB as an option but does not detail which databases are supported, how schema migrations work across Memori versions, or what happens to augmentation pipelines when the self-hosted backend is unavailable.

## When NOT to Use Memori

Skip Memori if your agent interactions are stateless by design (each query independent, no user model needed). The memory extraction overhead on every LLM call adds unnecessary complexity.

Avoid it for air-gapped or strict data-residency environments until BYODB documentation matures. The cloud-first default means conversation content transits Memori's servers.

For research or academic workloads where you need to inspect or modify the memory store directly, the SQL layer is not exposed with a query interface in the public SDK. You get the dashboard and API, not raw table access.

If your team already runs a mature vector database with retrieval pipelines (Weaviate, Pinecone, Qdrant), integrating Memori adds a second memory backend with overlapping responsibilities. Consolidation is cleaner.

## Unresolved Questions

**Governance and data ownership:** The license file is listed as `NOASSERTION` in the repository metadata, though the README and source cite Apache 2.0. Which governs is unclear without reading the full license file.

**Cost at scale:** Memori Cloud pricing for high-volume production workloads is not documented in the public README. Rate limits exist (the CLI has a `quota` command), but what constitutes quota and what paid tiers look like is not specified publicly.

**Conflict resolution:** When two processes attribute conflicting facts to the same entity (e.g., one agent records "user prefers Python," another records "user prefers TypeScript"), the documentation does not explain how Memori resolves or surfaces the conflict. The Advanced Augmentation schema includes rules and preferences as typed categories, but the merge logic is undocumented.

**BYODB schema stability:** No documentation covers how the internal SQL schema evolves across Memori versions or whether BYODB users need to run migrations manually.

## Alternatives

**[Supermemory](https://github.com/supermemoryai/supermemory)** (20,994 stars, MIT): Claims #1 on LongMemEval, LoCoMo, and ConvoMem. Adds temporal reasoning and automatic forgetting (expired facts drop out). TypeScript-native, Cloudflare-hosted. Use Supermemory when you need contradiction handling and automatic expiry of stale facts, or when you're building on a TypeScript/edge stack.

**[MemoryBank-SiliconFriend](https://github.com/zhongwanjun/MemoryBank-SiliconFriend)** (419 stars, MIT): Research implementation using Ebbinghaus forgetting curve for memory decay. Not production infrastructure, but the right reference if you're building a companionship or long-horizon conversational agent and want to implement principled memory weighting from scratch.

**Mem0** (not covered in sources): Commonly cited alongside Memori in benchmarks. Use it if you want a more established open-source option with a larger community and published integrations.

**Raw RAG with your own vector DB:** Use this when your memory problem is document retrieval (static knowledge base, not user state). Memori and Supermemory both target agent/user memory; neither replaces a document search pipeline.

[Source](../../raw/repos/memorilabs-memori.md) | [Source](../../raw/repos/supermemoryai-supermemory.md) | [Source](../../raw/repos/zhongwanjun-memorybank-siliconfriend.md)
