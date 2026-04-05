---
url: 'https://github.com/tirth8205/code-review-graph'
type: repo
author: tirth8205
date: '2026-04-04'
tags: [knowledge-bases, context-engineering, agentic-skills]
key_insight: >-
  Code-review-graph builds a persistent, incrementally-updated structural knowledge
  graph of codebases using Tree-sitter ASTs stored in SQLite, then computes blast
  radius via BFS to give AI assistants the minimal set of files needed for code
  review — achieving 8.2x average token reduction with 100% recall on impact
  analysis across 6 real-world repos.
stars: 4200
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - CLAUDE.md
    - docs/architecture.md
    - code_review_graph/parser.py
    - code_review_graph/graph.py
    - code_review_graph/changes.py
    - code_review_graph/search.py
    - code_review_graph/flows.py
    - code_review_graph/incremental.py
    - code_review_graph/communities.py
    - code_review_graph/wiki.py
    - code_review_graph/main.py
    - code_review_graph/embeddings.py
    - evaluate/reports/summary.md
  analyzed_at: '2026-04-04'
  original_source: repos/tirth8205-code-review-graph.md
---

## Architecture Overview

Code-review-graph is a Python package (~3,700 lines of typed Python) that builds and maintains a persistent knowledge graph of codebases, designed to give AI coding assistants precise structural context via MCP (Model Context Protocol). The core insight, articulated by creator **Tirth Kanani** in his Medium article "I Built a Knowledge Graph That Cuts Claude Code's Token Usage by 49x": "Every time Claude Code reviews your code, it reads your entire codebase." On a FastAPI project with 3,000 files, Claude was consuming 5,500 tokens to review a minor change that should have cost 800. By maintaining a structural graph, the system computes the minimal set of files and functions relevant to any change.

The project gained rapid traction after launch, reaching GitHub Trending in mid-March 2026 and accumulating over 4,200 stars. It spawned two notable derivatives: **better-code-review-graph** (a fork by n24q02m with critical bug fixes, configurable ONNX/LiteLLM embeddings, and production CI/CD) and **Claudette** (a complete Go rewrite by Nicolas Martignole targeting single-binary deployment for medium-sized projects).

The architecture follows a three-tier design:

1. **Integration Layer** — MCP server and Claude Code hooks expose graph capabilities to AI tools (Claude Code, Cursor, Windsurf, Zed, Continue).

2. **Core Engine** — Tree-sitter parser extracts code entities; GraphStore orchestrates graph operations; analysis modules compute blast radius, flows, and communities.

3. **Storage Layer** — SQLite database with WAL mode stores nodes/edges; NetworkX provides in-memory caching for graph algorithms.

The full architecture consists of:

1. **Parser** (`parser.py`) — Multi-language Tree-sitter AST parser supporting 19 languages plus Jupyter/Databricks notebooks. Extracts structural nodes (File, Class, Function, Type, Test) and edges (CALLS, IMPORTS_FROM, INHERITS, IMPLEMENTS, CONTAINS, TESTED_BY, DEPENDS_ON).

2. **Graph Store** (`graph.py`) — SQLite-backed graph database using WAL mode. Schema includes `nodes` table (kind, name, qualified_name, file_path, line ranges, language, community_id), `edges` table (kind, source/target qualified names), `metadata` (key-value pairs), `flows` and `flow_memberships` (execution paths), `communities` (Leiden algorithm clusters), and `nodes_fts` (FTS5 virtual table for full-text search). Uses NetworkX for graph algorithm computations (cached, invalidated on writes).

3. **Incremental Engine** (`incremental.py`) — Git-based change detection. Runs `git diff --name-only` against base ref, queries graph for importing files, re-parses only changed + dependent files via SHA-256 hash comparison. A 2,900-file project re-indexes in under 2 seconds.

4. **Change Analysis** (`changes.py`) — Maps git diffs to affected functions/classes via line-range overlap, computes multi-factor risk scores (flow participation, community crossing, test coverage, security sensitivity, caller count), and produces priority-ordered review guidance.

5. **Search** (`search.py`) — Hybrid search engine combining FTS5 (BM25) and optional vector embeddings via Reciprocal Rank Fusion (RRF). Query-aware kind boosting (PascalCase boosts Class/Type; snake_case boosts Function; dotted paths boost qualified names).

6. **Flow Detection** (`flows.py`) — Entry point detection via three strategies (no incoming CALLS edges, framework decorator patterns for 8+ frameworks, conventional name patterns like `main`, `test_*`, `handle_*`). Forward BFS traces execution paths with criticality scoring.

7. **Communities** (`communities.py`) — Leiden algorithm or file-based grouping for community detection. Architecture overview generation with coupling warnings.

8. **Wiki Generation** (`wiki.py`) — Auto-generates markdown wiki from community structure with optional LLM-powered summaries (via Ollama).

9. **MCP Server** (`main.py`) — FastMCP server exposing 22 tools and 5 prompt templates over stdio transport. Tools cover building, querying, impact analysis, search, flows, communities, refactoring, wiki, and multi-repo operations.

10. **VS Code Extension** (`code-review-graph-vscode/`) — TypeScript extension that reads from `.code-review-graph/graph.db` directly, providing blast radius visualization, navigation, SCM decorations, cursor resolution, and review assistance within the editor.

## Core Mechanism

### Tree-sitter Parsing Pipeline

The parser (`parser.py`) is the foundation. For each source file:

1. **Language detection** — Extension-based mapping (`EXTENSION_TO_LANGUAGE`) covering 19 languages (Python, TypeScript, JavaScript, Go, Rust, Java, C#, Ruby, Kotlin, Swift, PHP, C/C++, Solidity, Vue, and more). Special handling for `.vue` (SFC with template/script/style), `.ipynb` (Jupyter cells), and `.xs` (Perl XS parsed as C).

2. **AST extraction** — Tree-sitter grammar loaded via `tree_sitter_language_pack`. The AST is walked recursively, pattern-matching on language-specific node types. Each language has mappings for class types (`_CLASS_TYPES`), function types (`_FUNCTION_TYPES`), import types (`_IMPORT_TYPES`), and call types (`_CALL_TYPES`).

3. **Node extraction** — For each matched AST node, extracts: kind (File/Class/Function/Type/Test), name, file_path, line_start/end, language, parent_name (enclosing class/module), params, return_type, modifiers, is_test flag. Test detection uses naming patterns (`test_*`, `*_test`, `*Test`, `*Spec`) and decorator patterns (`@pytest.mark`, `@Test`, `describe()`).

4. **Edge extraction** — Within function bodies, identifies call expressions and maps them to target qualified names. Import statements are parsed to extract module paths. Inheritance/implements relationships are extracted from class definitions.

5. **Cross-file resolution** — Import edges are resolved to actual file paths using the graph's qualified name system. TypeScript path aliases are resolved via `tsconfig_resolver.py` which reads `tsconfig.json` `paths` and `baseUrl`.

The parser produces `NodeInfo` and `EdgeInfo` dataclasses, which the graph store persists via `upsert_node()` and `upsert_edge()`.

Kanani's design decision to use a **recursive AST walk with pattern matching** rather than Tree-sitter's native query language was deliberate: "more robust than tree-sitter queries across grammar versions." The cost is more code per language (type mappings), but the benefit is reliable extraction that survives grammar updates.

### Qualified Names as Universal Identifiers

A key architecture decision highlighted by both the original project and its forks: fully qualified names (e.g., `auth.py::UserService.login`) serve as the unified identifier system. This enables:

- Unambiguous edge resolution across files without heuristic guessing
- Collision-free node identification even when multiple files define same-named entities
- Cross-language consistency in the graph schema

The better-code-review-graph fork specifically improved call target resolution: the `_resolve_call_targets` function resolves bare call targets to qualified names using same-file definitions, improving the accuracy of callers_of/callees_of queries.

### Blast Radius Algorithm

The blast radius computation is the primary value proposition. When files change:

1. **Diff parsing** — `parse_git_diff_ranges()` runs `git diff --unified=0` and extracts per-file changed line ranges from hunk headers (`@@ -old,count +new,count @@`).

2. **Node mapping** — `map_changes_to_nodes()` finds graph nodes whose line ranges overlap changed lines. Uses suffix matching to handle relative vs. absolute path differences.

3. **Impact expansion** — BFS from changed nodes through the graph, following both forward edges (what this node affects) and reverse edges (what depends on this node), up to `max_depth` hops (default 2). The two-hop default balances comprehensiveness with token efficiency.

4. **Risk scoring** — Each affected node gets a composite risk score (0.0-1.0) based on:
   - Flow participation: 0.05 per flow membership, capped at 0.25
   - Community crossing: 0.05 per caller from a different community, capped at 0.15
   - Test coverage: 0.30 if no TESTED_BY edges, 0.05 if tested
   - Security sensitivity: 0.20 if name matches security keywords (auth, password, token, etc.)
   - Caller count: callers/20, capped at 0.10

5. **Review context assembly** — The final output is a structured, token-efficient context containing: changed nodes with risk scores, blast radius graph, test coverage gaps, affected flows, and review guidance.

The philosophy behind the conservative approach: "better to flag too many files than miss a broken dependency." This translates to 100% recall (never misses an actually impacted file) at the cost of lower precision (0.38 average), yielding 0.54 average F1. For code review, false positives waste some tokens but false negatives miss bugs.

### Incremental Update Pipeline

The incremental engine is what makes the system practical for daily use:

1. **File collection** — `collect_all_files()` respects `.gitignore` and `.code-review-graphignore`. Default ignore patterns exclude node_modules, .venv, dist, build, .next, lockfiles, etc. (22 default patterns).

2. **Change detection** — `get_changed_files()` runs `git diff --name-only` against base ref (default HEAD).

3. **Dependency expansion** — `find_dependents()` queries the graph for files that import changed files.

4. **Hash-based skip** — Each file node stores a SHA-256 hash. Files whose hash hasn't changed are skipped entirely, even if git reports them as changed.

5. **Selective re-parse** — Only changed + dependent files are re-parsed. The graph store's `store_file_nodes_edges()` removes old nodes/edges for a file before inserting new ones. Atomic SQLite transactions ensure graph consistency during updates.

6. **Hook integration** — Three Claude Code hooks maintain the graph automatically:
   - **SessionStart** — Verifies graph health
   - **PostToolUse** (on Write, Edit, Bash) — Triggers incremental updates after file modifications
   - **PreCommit** — Runs change detection before commits

This event-driven approach eliminates idle resource consumption and ensures the graph stays synchronized with code changes without manual intervention.

### Hybrid Search (FTS5 + Embeddings + RRF)

The search system in `search.py` implements a sophisticated hybrid approach:

1. **FTS5 BM25** — Uses SQLite's FTS5 virtual table with Porter stemming and Unicode tokenization. Searches across name, qualified_name, file_path, and signature fields. Negates BM25 scores so higher = better.

2. **Vector embeddings** (optional) — Supports three backends: local sentence-transformers (all-MiniLM-L6-v2), Google Gemini embeddings, and MiniMax. Vectors stored in a separate SQLite table alongside the main graph. The better-code-review-graph fork adds dual-mode ONNX + LiteLLM embedding support.

3. **Reciprocal Rank Fusion** — Merges FTS5 and embedding results using RRF with k=60. The RRF score for each item is `sum(1/(k + rank + 1))` across all lists it appears in.

4. **Query-aware boosting** — `detect_query_kind_boost()` applies heuristics: PascalCase queries boost Class/Type by 1.5x; snake_case queries boost Function by 1.5x; dotted paths boost qualified name matches by 2.0x.

5. **Context-file boosting** — Results from files in the current working context get additional relevance weight.

### Execution Flow Detection

The flow system in `flows.py` provides call-chain analysis:

1. **Entry point detection** — Three strategies combined: functions with no incoming CALLS edges (true roots), framework decorator pattern matching (supports Flask, Express, Django, FastAPI, Spring, Celery, Click, and more), and conventional name patterns (main, test_*, on_*, handle_*).

2. **Forward BFS** — From each entry point, BFS follows CALLS edges up to max_depth=15 hops, building an ordered path of nodes.

3. **Criticality scoring** — Each flow scored on: path length (more hops = more critical), file spread (more files touched = higher risk), security keyword presence, and error handling density.

### Community Detection

Uses the Leiden algorithm (via igraph, optional dependency) for graph clustering, or falls back to file-based grouping. Communities enable:
- Architecture overview with coupling warnings (high inter-community edge density)
- Review scope: changes that cross community boundaries get higher risk scores
- Wiki generation: each community becomes a wiki page

## Design Tradeoffs

### Tree-sitter vs. Language-Specific Parsers

Tree-sitter provides universal AST access but at the cost of grammar accuracy variations across languages. The parser uses a recursive AST walk with pattern matching rather than Tree-sitter queries, which is "more robust than tree-sitter queries across grammar versions" (per docs). The tradeoff: more code per language (type mappings), but more reliable extraction.

Alternatives considered include **Language Server Protocol (LSP)**, which provides type-aware analysis for 30+ languages (as used by the Serena project) but requires running language-specific servers with higher overhead. Tree-sitter's zero-infrastructure, unified API won on simplicity.

### SQLite vs. Graph Database

Using SQLite with WAL mode instead of a proper graph database (Neo4j, etc.) means:
- **Pros**: Zero infrastructure, local-only, fast reads, standard tooling, single-file portability
- **Cons**: No native graph traversal (uses NetworkX for BFS/community detection), no built-in graph query language

The NetworkX cache (`_nxg_cache`) mitigates the traversal cost: the full graph is loaded into NetworkX once, invalidated on writes, and reused for all graph algorithm queries. The author notes this approach is sufficient up to ~50K files; for codebases exceeding that, migration to dedicated graph databases is contemplated for a future v2.0.

### 100% Recall vs. Precision

The blast radius analysis is deliberately conservative — it flags files that *might* be affected, producing 100% recall but only 0.54 average F1 (0.38 precision). The design philosophy is: "better to flag too many files than miss a broken dependency." For code review, false positives waste some tokens but false negatives miss bugs.

This is a principled choice: the system's value proposition is token reduction, not perfect precision. Even with false positives, the 8.2x average reduction means the conservative approach still delivers massive efficiency gains while guaranteeing safety (no missed impacts).

### Incremental vs. Full Rebuild

The hash-based incremental strategy means most updates are fast (~2 seconds for a 2,900-file project), but the initial full build takes ~10 seconds for a 500-file project. The tradeoff: initial indexing cost for ongoing low-latency updates. In practice, the initial build amortizes quickly since incremental updates handle the vast majority of daily work.

### Optional Embeddings

Embeddings are optional (`pip install code-review-graph[embeddings]`) because the FTS5 BM25 search works well for code (code entity names are typically descriptive). Adding embeddings helps with semantic queries ("find authentication logic") but requires additional dependencies and computation. The better-code-review-graph fork makes this more production-ready with ONNX runtime support for offline embedding generation.

### Compact Structural Summary vs. Full Source Code

Rather than delivering raw source files to the AI assistant, the system produces compact structural summaries: blast radius graphs, dependency chains, risk scores, test coverage gaps, and review guidance. Kanani's design philosophy: "Less noise means Claude focuses on what actually matters." The overhead is the structural metadata that enables multi-file analysis — it pays off on multi-file changes where the graph-based approach avoids reading thousands of irrelevant files.

## Failure Modes & Limitations

1. **Search quality (MRR 0.35)** — Keyword search finds the right result in the top-4 for most queries, but ranking needs improvement. Express module-pattern naming causes 0 hits for some queries. The better-code-review-graph fork addresses some search issues with improved qualified call resolution.

2. **Flow detection (33% recall)** — Only reliably detects entry points in Python repos where framework patterns are recognized. JavaScript and Go flow detection needs work — the framework decorator patterns are Python-centric.

3. **Small single-file changes** — For trivial edits, graph context (metadata, edges, review guidance) can exceed raw file size. The express benchmark shows 0.7x "reduction" — actually an increase. The overhead is the structural metadata that enables multi-file analysis — it pays off only on multi-file changes.

4. **Dynamic dispatch** — Tree-sitter parses static code structure. Dynamic dispatch (Python's `getattr()`, JavaScript's `obj[method]()`, dependency injection) creates edges that the parser can't see, potentially missing impact paths.

5. **Cross-language resolution** — While 19 languages are supported individually, cross-language edges (e.g., Python calling a C extension, TypeScript importing a JavaScript module) are only partially resolved.

6. **Memory for large monorepos** — NetworkX loads the full graph into memory. For very large monorepos (100K+ nodes), this could consume significant RAM. The cache helps with repeated queries but the initial load scales linearly. The 50K-file soft limit motivates potential graph database migration in v2.0.

7. **Community stability** — Leiden algorithm produces different community assignments on each run (non-deterministic). This means wiki pages and architecture overviews may change between rebuilds even if code hasn't changed.

8. **Installation friction** — Community reports indicate setup errors via the Claude Plugin Marketplace method. The `code-review-graph install` CLI auto-detects platforms (Claude Code, Cursor, Windsurf, Zed, Continue) and generates MCP configurations using `uvx` for portability, but edge cases exist.

## Integration Patterns

### MCP Server (Primary)

The FastMCP server (`main.py`) registers 22 tools and 5 prompts over stdio transport. AI assistants auto-discover tools after `code-review-graph install` configures the appropriate platform's MCP settings. Tools are stateless — each call opens the SQLite database, queries, and returns.

Key tools include:
- `build_or_update_graph_tool` — Constructs or incrementally updates the knowledge graph
- `get_review_context_tool` — Extracts changed files and their blast radius
- `get_impact_radius_tool` — Analyzes affected code entities
- `query_graph_tool` — Searches for specific nodes/relationships
- `semantic_search_nodes_tool` — Vector-based search (with optional embeddings)
- `get_architecture_overview_tool` — Generates system design summaries via community detection
- `detect_changes_tool` — Identifies modifications since last commit

### CLI

The CLI (`cli.py`) supports: install (auto-detect platforms), build, update, watch (continuous mode), status, visualize (D3.js HTML), wiki, detect-changes, register/unregister (multi-repo), repos, eval, serve.

### VS Code Extension

A separate TypeScript project (`code-review-graph-vscode/`) reads directly from the SQLite database (`.code-review-graph/graph.db`). Features: blast radius visualization, navigation (click function to see callers/callees), SCM decorations (file-level risk indicators), cursor resolution (resolve symbol at cursor position), and review assistant integration. This provides a visual complement to the MCP server's programmatic interface.

### Hook-Based Auto-Update

Three hooks maintain graph freshness automatically:
- **SessionStart** — Verifies graph health, triggers rebuild if needed
- **PostToolUse** (on Write, Edit, Bash) — Triggers incremental graph updates after file modifications
- **PreCommit** — Runs change detection before commits

This event-driven approach eliminates the need for manual `code-review-graph update` commands during normal development workflows.

### Multi-Repo Registry

Multiple repositories can be registered and searched across. Each repo has its own SQLite database, but `cross_repo_search_tool` queries all registered databases. This enables monorepo-like analysis across multiple related repositories.

### Configuration and Ignore Patterns

Custom ignore patterns (`.code-review-graphignore`) extend the 22 default patterns excluding dependencies, build artifacts, databases, and minified assets. Configuration files include `.mcp.json` (MCP server settings), `.claude/settings.json` (hooks), and `CLAUDE.md` (contextual instructions for AI assistants).

## Ecosystem and Community

### Fork Ecosystem

The project's rapid growth spawned significant community activity:

- **better-code-review-graph** (`n24q02m`) — Production-oriented fork with critical bug fixes, configurable dual-mode embeddings (ONNX + LiteLLM), improved qualified call resolution via `_resolve_call_targets`, and CI/CD pipeline. Available as a separate PyPI package.

- **Claudette** (`nicmarti/Claudette`) — Complete Go rewrite by Nicolas Martignole, targeting medium-sized Go/TypeScript/Python/JS projects. Trades some flexibility for single-binary deployment — no Python runtime, no pip, just a compiled binary. Demonstrates the architecture's portability across implementation languages.

- **code-graph-rag** — Adds vector search/RAG capabilities for natural language querying of the code graph.

### Competitive Landscape

Code-review-graph occupies a specific niche: structural code mapping for context reduction. Key comparisons:

- **Serena** — Uses Language Server Protocol instead of Tree-sitter; supports 30+ languages with type-aware analysis. Higher infrastructure overhead but more accurate type resolution.
- **Claude Code's built-in optimizations** — Prompt caching and auto-compaction provide 40-80% cost reduction but don't address irrelevant file reading. Code-review-graph is complementary, not competitive.
- **Tree-sitter MCP Server** (by Joshua M. Dotson) — Provides raw Tree-sitter AST access via MCP but without the graph construction, blast radius computation, or incremental update logic.

### v2.0 Roadmap

Planned enhancements include:
- **Surgical edit suggestions** — Using graph structure patterns to suggest precise code modifications
- **GitHub PR bot** — Automated reviews without requiring Claude Code dependency
- **Team synchronization** — Git-tracked database for shared graph state across team members
- **Graph database migration** — For codebases exceeding 50K files

## Benchmarks & Performance

### Token Efficiency — Code Review (Published)

| Repo | Commits | Avg Naive Tokens | Avg Graph Tokens | Reduction |
|------|--------:|-----------------:|----------------:|----------:|
| express | 2 | 693 | 983 | 0.7x |
| fastapi | 2 | 4,944 | 614 | 8.1x |
| flask | 2 | 44,751 | 4,252 | 9.1x |
| gin | 3 | 21,972 | 1,153 | 16.4x |
| httpx | 2 | 12,044 | 1,728 | 6.9x |
| nextjs | 2 | 9,882 | 1,249 | 8.0x |
| **Average** | **13** | | | **8.2x** |

### Token Efficiency — Live Coding Tasks (Published)

| Repo | Files | Token Reduction | Files Skipped |
|------|------:|----------------:|--------------:|
| httpx | 125 | 4.6x | 58 |
| FastAPI | 2,915 | 3.7x | 1,120 |
| Next.js | 27,732 | 49.1x | ~16,000 |

The monorepo case is particularly striking — a 27,732-file codebase reduced from 739,352 tokens to 15,049, with the system reading only ~15 relevant files.

### Review Quality (Published)

Review quality improved by 1.6 points (on 1-10 scale) from 7.2 to 8.8 across accuracy, completeness, bug-catching, and actionability. The reduction in noise enables better focus — less context pollution leads to more surgical, targeted analysis.

### Impact Accuracy

100% recall (never misses an actually impacted file) with 0.54 average F1 and 0.38 average precision. Conservative by design.

### Build Performance

| Repo | Files | Nodes | Edges | Flow Detection | Search Latency |
|------|------:|------:|------:|---------------:|---------------:|
| express | 141 | 1,910 | 17,553 | 106ms | 0.7ms |
| fastapi | 1,122 | 6,285 | 27,117 | 128ms | 1.5ms |
| flask | 83 | 1,446 | 7,974 | 95ms | 0.7ms |
| gin | 99 | 1,286 | 16,762 | 111ms | 0.5ms |
| httpx | 60 | 1,253 | 7,896 | 96ms | 0.4ms |

Sub-millisecond search latency. Flow detection under 130ms for 6K+ node graphs. Initial build ~10 seconds for 500 files; incremental re-indexing under 2 seconds for 2,900+ file projects.

## Implications for Meta-KB

Code-review-graph demonstrates that structural analysis (AST -> graph -> BFS) is a viable alternative to embedding-based retrieval for domains with explicit structure. The blast radius concept generalizes: in a knowledge base, "what does this claim affect?" is analogous to "what does this function call?"

The hybrid search approach (FTS5 + embeddings + RRF fusion) is directly applicable to meta-kb's retrieval layer. BM25 handles exact matches well; embeddings handle semantic similarity; RRF combines them without tuning weights. The query-aware boosting heuristics demonstrate that domain-specific search priors (PascalCase = class, snake_case = function) significantly improve retrieval quality.

The risk scoring model (flow participation, community crossing, test coverage, security sensitivity) could adapt to knowledge base quality assessment: claim centrality, topic crossing, evidence coverage, controversy sensitivity.

The incremental update pattern (hash-based change detection, dependency expansion, selective re-processing) is essential for any knowledge base that must stay current. Meta-kb's compilation pipeline could use similar hash-based invalidation to re-compile only wiki sections whose source material has changed.

The community detection pattern (Leiden algorithm clustering) could apply to meta-kb's topic organization: identifying natural clusters of related sources and using them as the basis for wiki section structure.

The review quality finding — that reducing noise improves analysis quality by 1.6 points on a 10-point scale — validates the broader principle that context precision matters as much as context volume. For meta-kb's compilation, this suggests that providing the LLM with precisely relevant sources rather than all available sources will produce better wiki pages.

The fork ecosystem (better-code-review-graph, Claudette) demonstrates that well-structured domain tools attract meaningful community contributions. Meta-kb's own architecture should be modular enough to invite similar extension.
