# Memori

> SQL-native agent memory infrastructure that extracts structured facts from agent execution (not just conversation text), achieving 81.95% accuracy on LoCoMo while using only 4.97% of the full-context token footprint -- a 20x cost reduction.

## What It Does

Memori provides persistent, structured memory for AI agents. It intercepts LLM API calls (by wrapping the client), automatically extracts durable facts and preferences from conversations, and reinjects relevant context into future prompts. Memory is tracked at three levels: entity (user/person/thing), process (agent/program), and session (current interaction). Advanced Augmentation enriches these levels with attributes, events, facts, people, preferences, relationships, rules, and skills. The system is LLM-agnostic and framework-agnostic -- it wraps any supported LLM client and works with any datastore.

## Architecture

Python and TypeScript SDKs. The core pattern is LLM client wrapping: `Memori().llm.register(client)` intercepts completions, extracts memories in the background (zero latency impact), and augments future requests with relevant context. Storage is SQL-native (BYODB option available for Postgres, MySQL, etc.) rather than vector-only. Memory extraction uses structured schemas (entity/process/session attribution) rather than free-form text summarization. Available as Memori Cloud (managed API), BYODB (self-hosted with your database), MCP server, and OpenClaw plugin. Supports Anthropic, OpenAI, Bedrock, DeepSeek, Gemini, Grok in both sync/async and streamed/unstreamed modes.

## Key Numbers

- 13,011 GitHub stars, 1,551 forks
- 81.95% accuracy on LoCoMo benchmark
- 1,294 average tokens per query (4.97% of full-context footprint)
- 20x cost reduction vs. full-context prompting
- 67% fewer tokens than Zep on the same benchmark
- Outperforms Zep, LangMem, and Mem0 on LoCoMo
- Supports 6 LLM providers, 3 frameworks (Agno, LangChain, Pydantic AI)
- Apache 2.0 license

## Strengths

- SQL-native storage means memories are queryable, debuggable, and portable with standard database tools -- no opaque vector-only store
- Entity/process/session attribution creates genuinely structured memory rather than flat text summaries
- 4.97% token footprint with 81.95% accuracy is the best cost/accuracy trade-off documented on LoCoMo
- LLM-agnostic client wrapping means zero architecture changes to existing agent code

## Limitations

- Memory extraction quality is only as good as the background LLM call -- no user visibility into what gets extracted without checking the dashboard
- BYODB setup requires database provisioning and schema management, adding operational overhead
- No knowledge graph or multi-hop retrieval -- memory is structured but not associatively linked
- Newer project with less ecosystem maturity than established alternatives like Mem0

## Alternatives

- [supermemory.md](supermemory.md) -- use when you need temporal reasoning, contradiction handling, and automatic forgetting
- [hipporag.md](hipporag.md) -- use when you need multi-hop associative retrieval across documents via knowledge graphs
- [claude-mem.md](claude-mem.md) -- use when you only need Claude Code session persistence without structured entity memory

## Sources

- [Source](../../raw/repos/memorilabs-memori.md) -- "Memori is agent-native memory infrastructure. A SQL-native, LLM-agnostic layer that turns agent execution and interactions into structured, persistent state for production systems."
