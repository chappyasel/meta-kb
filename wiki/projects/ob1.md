# Open Brain (OB1)

> The infrastructure layer for persistent AI memory -- one vector database, one AI gateway, one chat channel, and an open protocol that lets any AI tool (Claude, ChatGPT, Cursor, Claude Code) share the same persistent memory without middleware or SaaS chains.

## What It Does

Open Brain decouples persistent memory from AI providers. You build a single Supabase-backed vector database with semantic search, wire it to an MCP server, and every AI tool you use can read from and write to the same memory. It is not a notes app -- it is a database with vector search and an open protocol designed so that knowledge is stored once and queried across all current and future AI tools.

The project includes a structured learning path of 6 extensions (household knowledge base, home maintenance, family calendar, meal planning, professional CRM, job hunt pipeline) that compound on each other. Your CRM knows about captured thoughts. Your meal planner checks who is home this week. Extensions interconnect because the agent can see across the whole system.

## Architecture

Four core components:

- **Database**: Supabase with pgvector for vector search, row-level security for multi-user data isolation, content fingerprint deduplication
- **AI Gateway**: OpenAI-compatible gateway that routes to any LLM provider
- **Capture Channel**: Slack or Discord bot for quick-capture of thoughts with auto-embedding and classification
- **MCP Server**: Model Context Protocol server that exposes the memory layer to any compatible AI tool (Claude Code, Cursor, ChatGPT)

Community contributions include import recipes (ChatGPT, Perplexity, Obsidian, Twitter, Instagram, Google Activity, Gmail), dashboards (SvelteKit, Next.js), skill packs (research synthesis, meeting synthesis, competitive analysis), and a Kubernetes self-hosted deployment option.

## Key Numbers

- **1,151 GitHub stars**, 195 forks
- Written in TypeScript
- 6 extensions in the learning path
- 9 import recipes, 10 community recipes/tools, 8 skill packs, 2 dashboard templates
- ~45 minute setup, no coding experience needed

## Strengths

- Provider-agnostic by design: switching AI tools does not require rebuilding context or migrating data. One brain serves all current and future AI tools.
- The extension learning path teaches real database concepts (RLS, vector search, shared MCP) through practical use cases that compound

## Limitations

- Depends on Supabase for the database layer, creating a hosting dependency (though a community Kubernetes deployment removes this)
- The MCP protocol is still maturing; compatibility varies across AI tools and not all support the full read/write memory interface

## Alternatives

- [mem0.md](mem0.md) -- managed memory SDK with user/session/agent levels, but tied to its own API rather than an open protocol
- [724-office.md](724-office.md) -- full agent system with built-in three-layer memory, versus OB1's standalone memory infrastructure approach

## Sources

- [natebjones-projects-ob1.md](../../raw/repos/natebjones-projects-ob1.md) -- "A database with vector search and an open protocol -- built so that every AI tool you use shares the same persistent memory of you. Claude, ChatGPT, Cursor, Claude Code, whatever ships next month. One brain. All of them."
