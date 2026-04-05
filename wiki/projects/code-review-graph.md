# Code Review Graph

> Local knowledge graph that builds a persistent structural map of your codebase using Tree-sitter, enabling AI assistants to read only affected files instead of scanning everything. Key differentiator: blast-radius analysis achieves 8.2x average token reduction across real repositories.

## What It Does

Code Review Graph parses your repository into an AST with Tree-sitter, stores functions, classes, imports, and their relationships (calls, inheritance, test coverage) as a graph in SQLite, and queries that graph at review time to compute the minimal set of files an AI assistant needs to read. When a file changes, the graph traces every caller, dependent, and test in the blast radius. Incremental updates re-parse only changed files in under 2 seconds. Exposes 22 MCP tools for AI assistants to query the graph, plus 5 workflow prompt templates (review, architecture, debug, onboard, pre-merge). Supports 19 languages plus Jupyter notebooks.

## Architecture

Python CLI and MCP server. Tree-sitter grammars parse source into AST nodes stored in SQLite as a property graph (nodes = functions/classes/imports, edges = calls/inheritance/test-coverage/imports). SHA-256 hash checks identify changed files for incremental updates. Git hooks fire on commit and file save. Optional vector embeddings via sentence-transformers, Google Gemini, or MiniMax for semantic search. Community detection via Leiden algorithm clusters related code. FTS5-powered hybrid search combines keyword and vector similarity. Auto-detects and configures all supported platforms (Claude Code, Cursor, Windsurf, Zed, Continue, OpenCode, Antigravity) with one `install` command.

## Key Numbers

- 4,176 GitHub stars, 381 forks
- 8.2x average token reduction (benchmarked across 6 open-source repos, 13 commits)
- Up to 49x reduction on monorepos (27,700+ files funneled to ~15)
- 100% recall on impact accuracy (never misses an affected file)
- 0.54 average F1 (conservative: over-predicts rather than misses)
- Incremental update: <2 seconds for 2,900-file project
- 19 languages supported
- MIT license

## Strengths

- Blast-radius analysis with 100% recall means no affected file is ever missed during code review
- Incremental updates via SHA-256 diffing keep the graph current without expensive full rebuilds
- Token benchmarks are reproducible with `code-review-graph eval --all` against real open-source repos

## Limitations

- Small single-file changes can produce graph context larger than the raw file (overhead from structural metadata)
- Flow detection has only 33% recall and works reliably only for Python repos with recognized framework patterns
- Search quality (MRR 0.35) is mediocre; keyword search ranking needs improvement, especially for module-pattern naming

## Alternatives

- [lossless-claw.md](lossless-claw.md) — use when the problem is conversation history compression rather than codebase navigation
- [napkin.md](napkin.md) — use when you want BM25 search over markdown knowledge rather than AST-level code analysis
- [arscontexta.md](arscontexta.md) — use when you need a knowledge system for domain expertise rather than code structure

## Sources

- [../../raw/repos/tirth8205-code-review-graph.md](../../raw/repos/tirth8205-code-review-graph.md) — "builds a structural map of your code with Tree-sitter, tracks changes incrementally, and gives your AI assistant precise context via MCP so it reads only what matters"
