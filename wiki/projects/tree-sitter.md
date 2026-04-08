---
entity_id: tree-sitter
type: project
bucket: agent-architecture
abstract: >-
  Tree-sitter is an incremental, error-tolerant parser generator that produces
  concrete syntax trees for 100+ languages; its key differentiator is
  sub-millisecond re-parsing of changed code regions without full file
  re-processing.
sources:
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - repos/safishamsi-graphify.md
  - repos/tirth8205-code-review-graph.md
  - deep/repos/tirth8205-code-review-graph.md
related:
  - claude-code
  - model-context-protocol
  - cursor
  - knowledge-graph
  - windsurf
  - windsurf
last_compiled: '2026-04-08T02:50:32.809Z'
---
# Tree-sitter

## What It Is

Tree-sitter is a parser generator and incremental parsing library originally written at GitHub by Max Brunsfeld. It takes language grammar definitions and compiles them into C parsers that produce concrete syntax trees (CSTs) — full parse trees that preserve every token including whitespace and comments, unlike abstract syntax trees which elide structural noise.

The library's defining property: when source code changes, it re-parses only the affected regions. Editing a function body doesn't re-parse the file's imports. This makes it practical for editor integrations where parsing runs on every keystroke.

Two repositories matter: `tree-sitter/tree-sitter` (the runtime and grammar authoring toolkit, ~20K GitHub stars) and the constellation of `tree-sitter/tree-sitter-{language}` grammar repos covering Python, JavaScript, TypeScript, Go, Rust, Java, C/C++, Ruby, and 100+ others. The `tree_sitter_language_pack` Python package bundles these grammars for programmatic use.

## Core Mechanism

### Grammar Compilation

Authors write grammars in JavaScript using Tree-sitter's DSL (`grammar.js`). The `tree-sitter generate` command compiles these to C source files — a `parser.c` and optional `scanner.c` for languages with context-sensitive tokens. The generated C is checked into the grammar repository. Consumers compile it into a shared library or link it statically.

The grammar DSL exposes rules for defining syntax nodes, named fields, and precedence relationships. For example, a Python function definition rule names its `name`, `parameters`, and `body` fields — these become queryable fields on parsed nodes.

### Incremental Parsing

The core algorithm is documented in `lib/src/parser.c`. Tree-sitter uses a GLR-derived algorithm that tracks multiple parse states in parallel to handle ambiguous grammars. After an initial parse, the library stores the old tree alongside the new source. When `ts_parser_parse` is called with edit ranges (via `ts_tree_edit`), the parser reuses subtrees whose byte ranges weren't touched. A change to line 47 of a 3,000-line file re-uses all syntax nodes outside that edit range.

The `Tree` struct exposes `ts_tree_get_changed_ranges`, which returns the minimal set of ranges that differ between old and new trees. Downstream tools (editors, language servers, code intelligence systems) use this to invalidate only affected state.

### Query System

Tree-sitter includes a pattern-matching query language written in S-expression syntax. Queries match node types, field names, and arbitrary nesting. For example:

```scheme
(function_definition
  name: (identifier) @function.name
  body: (block) @function.body)
```

The `ts_query` API compiles queries to a finite automaton. `ts_query_cursor_exec` runs a compiled query against a tree, returning captures. This is how editors implement syntax highlighting, code folding, and symbol extraction.

### Concrete vs Abstract Syntax Trees

Tree-sitter produces CSTs, not ASTs. Every token appears in the tree. Named nodes (those with grammar-assigned names like `function_definition`) are distinguished from anonymous nodes (punctuation, keywords). The `is_named` property on nodes reflects this. Most code intelligence tools walk named nodes and skip anonymous ones, approximating AST traversal while retaining the ability to reconstruct exact source from the tree.

### Error Recovery

Grammars declare `ERROR` nodes for sequences the parser can't match. Tree-sitter continues parsing after errors, wrapping unrecognized tokens in `ERROR` nodes. This means a file with syntax errors still produces a mostly-valid tree, which is why it works in editor contexts where files are frequently in intermediate invalid states.

## How Coding Agents Use It

The deep implementation analysis from code-review-graph illustrates the dominant pattern: build a structural knowledge graph from Tree-sitter ASTs, then query the graph rather than re-parsing files.

In `parser.py` of code-review-graph:

1. **Language detection** — file extension maps to grammar via `EXTENSION_TO_LANGUAGE`
2. **Grammar loading** — `tree_sitter_language_pack` loads the compiled grammar
3. **AST walk** — recursive walk pattern-matches on language-specific node type sets (`_CLASS_TYPES`, `_FUNCTION_TYPES`, `_IMPORT_TYPES`, `_CALL_TYPES`)
4. **Entity extraction** — each matched node yields a `NodeInfo` dataclass (name, file path, line range, parent, params, modifiers)
5. **Edge extraction** — call expressions within function bodies become `EdgeInfo` records

The code-review-graph author made a specific choice to use a recursive AST walk with explicit node type mappings rather than Tree-sitter's query language, citing robustness across grammar version changes. The tradeoff: more code per language, fewer surprises when grammars update.

Graphify ([source](../raw/repos/safishamsi-graphify.md)) combines Tree-sitter AST extraction with an LLM-powered concept extraction pass and stores results in a NetworkX graph. Its "AST via tree-sitter + call-graph pass" extracts structural facts (function definitions, call sites, imports), then Claude fills in semantic relationships the AST can't express.

[Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), and [Windsurf](../projects/windsurf.md) use Tree-sitter for syntax highlighting and code navigation. More relevantly for agent workflows, they consume Tree-sitter-backed tools (via [Model Context Protocol](../concepts/model-context-protocol.md)) that expose structural queries: callers-of, callees-of, inheritance chains, test coverage gaps.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| GitHub stars (tree-sitter/tree-sitter) | ~20K | Self-reported |
| Languages with maintained grammars | 100+ | Self-reported |
| Incremental re-parse latency (typical edit) | Sub-millisecond | Self-reported, plausible for in-process C parser |
| code-review-graph flow detection on 6K node graph | 95–130ms | Self-reported, reproducible via `eval --all` |
| code-review-graph search latency | 0.4–1.5ms | Self-reported, reproducible |

The latency numbers from code-review-graph are self-reported but include reproduction instructions (`code-review-graph eval --all`), which raises credibility. The core Tree-sitter latency claims are consistent with running a compiled C parser in-process; independently plausible though not independently benchmarked in these sources.

## Strengths

**Universal grammar coverage.** A single API works across 100+ languages with consistent node traversal. Code intelligence tools don't implement per-language parsers; they implement once against the Tree-sitter node API.

**Incremental correctness.** Re-parsing only changed regions is not an approximation — the algorithm guarantees the resulting tree matches what a full re-parse would produce. This matters for systems that build derived state (call graphs, type indexes) on top of parse results.

**Error tolerance.** Partial parses in the presence of syntax errors mean agents working with in-progress code still get useful structure. An LLM editing a function that temporarily has missing closing braces doesn't break the entire code graph.

**In-process C library.** No language server daemon required. Tree-sitter links as a C library with bindings for Python, Node.js, Rust, Go, and others. This eliminates the per-language server management overhead that LSP-based tools require.

**Separation of grammar and runtime.** Grammar authors publish compiled grammars; consumers pull them. Adding a new language is adding a grammar, not modifying the runtime.

## Critical Limitations

**Static structure only.** Tree-sitter sees what's in the source text. Dynamic dispatch — Python's `getattr()`, JavaScript's `obj[method]()`, dependency injection containers, metaclass-generated methods — produces no AST edges. Code intelligence systems built on Tree-sitter miss these paths. In code-review-graph's impact analysis, this means blast radius calculations can miss dependencies that only exist at runtime. The failure mode: a function appears to have zero callers in the graph but has dozens via dynamic dispatch; a change to it ships without review of its actual dependents.

**Infrastructure assumption: grammar freshness.** Tree-sitter grammar repos are community-maintained. When languages add syntax (TypeScript's `satisfies` operator, Python's structural pattern matching), the grammar must be updated before Tree-sitter understands the new construct. Using a stale grammar silently produces ERROR nodes for valid code, degrading code graph quality without explicit failure. Projects depending on `tree_sitter_language_pack` inherit whatever grammar versions were pinned at that package's last release.

## When NOT to Use It

**Type-aware analysis at scale.** Tree-sitter resolves syntax, not semantics. It can't tell you that `x.foo()` calls `MyClass.foo` specifically — that requires type inference. For agents that need precise type-level impact analysis (e.g., verifying a signature change doesn't break callers with incompatible types), a Language Server Protocol backend with full type resolution is more appropriate. Serena's LSP approach handles this; Tree-sitter-based tools don't.

**Dynamically-typed codebases with heavy metaprogramming.** Python codebases that generate classes via `type()`, Ruby codebases using `method_missing`, or JavaScript codebases with extensive Proxy usage will have significant portions of their call graph invisible to static AST analysis. A Tree-sitter-backed code graph of such a codebase gives confident-looking but structurally incomplete results.

**When you need query expressiveness over speed.** Tree-sitter's query language is pattern-based, not relational. Complex queries — "find all functions that call any method on objects of type X where X implements interface Y" — require walking the tree programmatically. For these analyses, CodeQL or Semgrep's analysis engines offer richer query semantics.

## Unresolved Questions

**Cross-language edge resolution.** When a Python module calls a C extension, or TypeScript imports a JavaScript module through a barrel export, Tree-sitter-based tools resolve these edges incompletely or not at all. Code-review-graph documents partial resolution for TypeScript path aliases via `tsconfig_resolver.py` but doesn't address the general cross-language case. The documentation doesn't explain how agents should reason about confidence in edges that cross language boundaries.

**Grammar version governance.** No centralized compatibility matrix exists between `tree_sitter_language_pack` versions and language grammar versions. A tool that worked correctly on Python 3.11 syntax may silently produce ERROR nodes for Python 3.12 match statements if the grammar wasn't updated. There's no documented mechanism for detecting this degradation in production.

**Scale ceiling for NetworkX-backed systems.** Tools like code-review-graph that load Tree-sitter-extracted graphs into NetworkX for BFS/community detection have an undocumented memory scaling ceiling. The code-review-graph documentation cites ~50K files as a soft limit before graph database migration becomes necessary, but the Tree-sitter parsing step itself has no documented node count limits.

## Alternatives

**Language Server Protocol (LSP)** — Use when type-aware analysis matters. LSP-backed tools (Serena, standard IDE integrations) run language-specific servers that understand types, generics, and overload resolution. Higher infrastructure overhead (one server process per language) and more complex lifecycle management, but accurate for the analyses Tree-sitter can't do. Choose LSP when your agents need to verify type compatibility across call sites.

**CodeQL / Semgrep** — Use when the analysis question is security or pattern-matching at the semantic level. These tools ingest Tree-sitter grammars internally but expose SQL-like (CodeQL) or YAML pattern (Semgrep) query interfaces with dataflow analysis. Significantly slower than Tree-sitter for code graph construction; not suitable for real-time or incremental use. Choose when you need "does tainted data flow from user input to SQL query" rather than "what functions call this function."

**ctags / universal-ctags** — Use for symbol indexing in resource-constrained environments. ctags produces flat symbol tables (function names, line numbers) without structural edges. Much simpler to deploy; lacks call graph construction. Choose when you only need jump-to-definition, not impact analysis.

**Rope (Python), rust-analyzer, typescript-compiler API** — Language-specific semantic analysis tools. Full type inference within a single language. Use when operating on a homogeneous codebase and needing type-level accuracy. Not portable across languages; unsuitable for polyglot repositories.

## Related Concepts and Projects

- [Knowledge Graph](../concepts/knowledge-graph.md) — Tree-sitter ASTs are the extraction layer; knowledge graphs are what code intelligence tools build from them
- [Model Context Protocol](../concepts/model-context-protocol.md) — Standard interface for exposing Tree-sitter-backed code intelligence to LLM agents
- [Claude Code](../projects/claude-code.md) — Uses Tree-sitter for syntax highlighting and code navigation; consumes Tree-sitter-backed MCP tools
- [Cursor](../projects/cursor.md) — Integrates Tree-sitter for code intelligence; accepts MCP servers exposing structural queries
- [Windsurf](../projects/windsurf.md) — Same pattern as Cursor
- [Context Engineering](../concepts/context-engineering.md) — Code graph construction via Tree-sitter is a form of context pre-computation that reduces token costs at query time
