# Memori

> Agent-native memory infrastructure with a SQL-native, LLM-agnostic architecture that turns agent execution and interactions into structured, persistent state -- extracting memory from what agents do, not just what they say.

## What It Does

Memori intercepts LLM API calls (via SDK wrappers for OpenAI, Anthropic, Gemini, etc.), extracts structured memories from conversations and agent actions in the background, and recalls relevant context in future interactions automatically. The key differentiator is extraction from agent behavior (actions, tool calls, execution patterns) in addition to conversational text. Memories are tracked at entity (user), process (agent), and session levels, with Advanced Augmentation extracting attributes, events, facts, people, preferences, relationships, rules, and skills.

## Architecture

Memori wraps LLM clients transparently:

```typescript
const mem = new Memori().llm.register(client).attribution('user_123', 'agent');
// All subsequent LLM calls through `client` are automatically instrumented
```

- **Attribution model**: Entity (person/thing) + Process (agent/program) + Session (current interaction). Memories are scoped and retrieved along these dimensions.
- **SQL-native storage**: Structured memory in SQL (not just vector embeddings), enabling precise queries and relational joins across memory types
- **Background processing**: Memory extraction and augmentation happen asynchronously, incurring no latency on the LLM call path
- **Deployment**: Memori Cloud (managed, zero-config), BYODB (bring your own database), MCP server for Claude Code/Cursor/Codex integration, OpenClaw plugin

Supports Python and TypeScript SDKs, with framework integrations for LangChain, Pydantic AI, and Agno. Compatible with 6+ LLM providers (OpenAI, Anthropic, Gemini, Grok, DeepSeek, Bedrock) in both sync and async modes.

## Key Numbers

- **13,011 GitHub stars**, 1,551 forks
- **81.95% overall accuracy** on LoCoMo benchmark
- **1,294 average tokens per query** (4.97% of full-context footprint)
- **67% smaller prompts** vs Zep, **20x less context cost** vs full-context prompting
- Outperforms Zep, LangMem, and Mem0 on LoCoMo
- Python and TypeScript SDKs, MCP server, OpenClaw plugin

## Strengths

- SQL-native storage enables precise, structured queries over memories rather than relying solely on vector similarity -- critical for production systems that need deterministic recall
- Transparent LLM client wrapping means zero code changes to existing agent architectures; memory is added by registering the client, not restructuring the application

## Limitations

- The transparent wrapping approach means Memori sees only what passes through the LLM client -- agent actions via external tools or APIs that bypass the wrapped client are invisible
- License assertion is missing from the repo metadata, though the README states Apache 2.0 -- verify before production use

## Alternatives

- [mem0.md](mem0.md) -- use when you want explicit `add/search` memory control rather than transparent LLM client instrumentation
- [supermemory.md](supermemory.md) -- use when you need the full context stack (memory + RAG + connectors + profiles) in one system
- [graphiti.md](graphiti.md) -- use when you need temporal knowledge graphs with validity windows and provenance tracking

## Sources

- [memorilabs-memori.md](../../raw/repos/memorilabs-memori.md) -- "Memory from what agents do, not just what they say... SQL-native, LLM-agnostic layer that turns agent execution and interactions into structured, persistent state"
