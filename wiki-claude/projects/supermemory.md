# Supermemory

> Production memory engine that ranks #1 on all three major AI memory benchmarks (LongMemEval, LoCoMo, ConvoMem), differentiating itself through automatic fact extraction with temporal reasoning, contradiction handling, and automatic forgetting -- capabilities most memory systems lack entirely.

## What It Does

Supermemory provides a unified memory and context layer for AI applications. It automatically extracts facts from conversations, builds and maintains user profiles, handles knowledge updates and contradictions, forgets expired information, and delivers relevant context at query time. It combines RAG document retrieval with personalized memory in a single query (hybrid search), so agents get both knowledge base results and user-specific context together. Connectors auto-sync from Google Drive, Gmail, Notion, OneDrive, and GitHub. Multi-modal extractors handle PDFs, images (OCR), videos (transcription), and code (AST-aware chunking).

## Architecture

TypeScript codebase built on Cloudflare Workers, Cloudflare KV, PostgreSQL (via Drizzle ORM), Remix, and Tailwind. The core is a unified memory ontology where all information -- facts, preferences, documents -- lives in a single structured representation. The memory engine runs a pipeline: ingest content, extract facts, track temporal changes, resolve contradictions, and expire stale information. User profiles are split into static facts (stable preferences) and dynamic context (recent activity), served in ~50ms. Search supports three modes: hybrid (RAG + memory), memories-only, and documents-only. Available as npm/PyPI packages, REST API, MCP server, and plugins for Claude Code, OpenCode, and OpenClaw.

## Key Numbers

- 20,994 GitHub stars, 1,914 forks
- #1 on LongMemEval (81.6%), LoCoMo, and ConvoMem
- User profile retrieval: ~50ms
- Integrations: Vercel AI SDK, LangChain, LangGraph, OpenAI Agents SDK, Mastra, Agno, n8n
- MIT license

## Strengths

- Only memory system that holds #1 across all three major benchmarks simultaneously
- Temporal reasoning and contradiction handling are built-in, not afterthoughts -- "I moved to SF" automatically supersedes "I live in NYC"
- Automatic forgetting prevents memory bloat from temporary facts ("I have an exam tomorrow" expires after the date)
- Single API call returns both RAG results and personalized memory, eliminating the need to orchestrate separate systems

## Limitations

- Hosted service dependency for production use -- self-hosting options are not prominently documented
- Cloudflare-specific infrastructure stack limits deployment flexibility for teams on other clouds
- No published latency numbers for memory extraction pipeline, only for profile retrieval

## Alternatives

- [memori.md](memori.md) -- use when you need SQL-native memory with lower token costs and BYODB flexibility
- [hipporag.md](hipporag.md) -- use when multi-hop associative reasoning across documents matters more than user profiling
- [claude-mem.md](claude-mem.md) -- use when you only need Claude Code session persistence without a full memory API

## Sources

- [Source](../../raw/repos/supermemoryai-supermemory.md) -- "Memory engine and app that is extremely fast, scalable. The Memory API for the AI era."
