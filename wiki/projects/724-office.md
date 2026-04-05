# 724 Office

> A self-evolving AI agent system built in ~3,500 lines of pure Python with zero framework dependencies -- 26 tools, three-layer memory, runtime tool creation, self-repair, and 24/7 production operation.

## What It Does

724 Office is a production AI agent that runs continuously, handling messaging, scheduling, file operations, web search, video processing, and memory management. Its distinguishing feature is the three-layer memory system that maintains coherent long-term context without framework overhead, plus a runtime tool creation loop where the agent can write, save, and load new Python tools during operation.

## Architecture

Eight Python files, three external dependencies (`croniter`, `lancedb`, `websocket-client`):

- **Three-Layer Memory**: Layer 1 (Session) stores the last 40 messages per session as JSON; overflow triggers Layer 2 (Compressed), where an LLM extracts structured facts with cosine similarity deduplication (threshold 0.92) stored in LanceDB; Layer 3 (Retrieval) embeds the user's message and injects top-K relevant memories into the system prompt
- **Tool Use Loop**: OpenAI-compatible function calling with automatic retry, up to 20 iterations per conversation
- **Runtime Tool Creation**: The `create_tool` function lets the agent write new Python tools at runtime and hot-load them without restart
- **Self-Repair**: Daily self-checks, session health diagnostics, error log analysis, and auto-notification on failure
- **MCP/Plugin System**: JSON-RPC over stdio/HTTP with namespace isolation and auto-reconnect
- **Multi-Tenant Router**: Docker-based auto-provisioning with one container per user

## Key Numbers

- **1,147 GitHub stars**, 157 forks
- ~3,500 lines of pure Python, 8 files, 26 built-in tools
- MIT licensed
- Designed for Jetson Orin Nano (8GB RAM, ARM64), RAM budget under 2GB
- WeChat Work integration with debounce, message splitting, and media handling

## Strengths

- Zero-framework design means every line is visible and debuggable -- no hidden abstractions from LangChain, LlamaIndex, or CrewAI
- The three-layer memory with compression and deduplication solves the unbounded context growth problem that breaks most long-running agents

## Limitations

- Tightly coupled to WeChat Work for messaging integration, limiting portability to other platforms
- The compression layer uses a single LLM call per eviction, which may lose nuance in complex multi-topic conversations

## Alternatives

- [ob1.md](ob1.md) -- persistent memory infrastructure with cross-agent sharing via MCP protocol, focusing on the memory layer rather than the full agent
- [memorybank.md](memorybank.md) -- Ebbinghaus-inspired selective forgetting as an alternative to LLM compression for memory management

## Sources

- [wangziqi06-724-office.md](../../raw/repos/wangziqi06-724-office.md) -- "Three-Layer Memory -- Session history + LLM-compressed long-term memory + LanceDB vector retrieval... The agent can write, save, and load new Python tools at runtime"
