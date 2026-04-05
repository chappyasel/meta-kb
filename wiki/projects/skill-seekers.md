# Skill Seekers

> Universal preprocessing layer that converts 17 source types (docs sites, GitHub repos, PDFs, videos, notebooks, wikis) into structured knowledge assets exportable to 16 AI platforms. Key differentiator: one ingestion pipeline, every target format.

## What It Does

Skill Seekers ingests documentation websites, GitHub repositories, local codebases, PDFs, videos (YouTube + local), Jupyter notebooks, Word/EPUB/AsciiDoc documents, OpenAPI specs, PowerPoint presentations, RSS feeds, man pages, Confluence wikis, Notion pages, and Slack/Discord exports. It performs deep AST parsing, pattern detection, API extraction, and conflict detection between documented APIs and actual code. Output is packaged into Claude Skills (ZIP + YAML), Gemini Skills, OpenAI/Custom GPT packages, LangChain Documents, LlamaIndex TextNodes, Haystack Documents, and vector-DB-ready formats (Pinecone, Chroma, FAISS, Qdrant). A single `skill-seekers create` command handles ingestion; `skill-seekers package --target <platform>` handles export.

## Architecture

Python CLI with MCP server integration. Source-specific scrapers (web, GitHub, PDF, video) feed into a unified categorization and chunking layer. GitHub analysis uses AST parsing for Python, JavaScript, TypeScript, Java, C++, and Go. Conflict detection compares documentation claims against code reality, producing side-by-side warnings. AI enhancement (Claude, Gemini, or local LLM) generates 500+ line SKILL.md files with examples, patterns, and guides. The project is split across 6 repositories: core CLI, website, community configs, GitHub Action, Claude Code plugin, and Homebrew tap.

## Key Numbers

- 12,269 GitHub stars, 1,234 forks
- 17 source types supported
- 16 export platforms
- 2,540+ tests passing
- 24+ framework presets (React, Django, FastAPI, Godot, etc.)
- Claims 99% faster than manual data prep (days to 15-45 minutes)

## Strengths

- Conflict detection between docs and code catches drift that silently degrades RAG quality
- Video extraction with GPU-aware OCR and Vision API fallback handles tutorials that exist only as screencasts
- Multi-source merging produces a single source of truth from documentation + code + PDFs

## Limitations

- Quality of generated SKILL.md depends heavily on the enhancement LLM; no built-in quality verification beyond conflict detection
- Heavy dependency footprint for full feature set (video processing, OCR, GPU support)
- No incremental update mechanism; re-scraping from scratch when sources change

## Alternatives

- [claude-skills.md](claude-skills.md) — use when you want hand-authored, curated skills rather than auto-generated ones
- [arscontexta.md](arscontexta.md) — use when the goal is a personalized knowledge system derived from conversation, not documentation
- [napkin.md](napkin.md) — use when you want a lightweight local-first vault without preprocessing infrastructure

## Sources

- [../../raw/repos/yusufkaraaslan-skill-seekers.md](../../raw/repos/yusufkaraaslan-skill-seekers.md) — "the data layer for AI systems...turns documentation sites, GitHub repos, PDFs, videos, notebooks, wikis, and 10+ more source types into structured knowledge assets"
