---
url: 'https://github.com/kepano/obsidian-skills'
type: repo
author: kepano
date: '2026-04-04'
tags: [knowledge-bases, agentic-skills, context-engineering]
key_insight: >-
  Demonstrates the emerging pattern of encoding domain-specific knowledge as declarative markdown skill files that teach LLM agents how to work with proprietary formats -- turning documentation into executable agent capabilities without writing code.
stars: 19300
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - .claude-plugin/plugin.json
    - .claude-plugin/marketplace.json
    - skills/obsidian-markdown/SKILL.md
    - skills/obsidian-bases/SKILL.md
    - skills/json-canvas/SKILL.md
    - skills/obsidian-cli/SKILL.md
    - skills/defuddle/SKILL.md
    - skills/obsidian-markdown/references/PROPERTIES.md
    - skills/obsidian-markdown/references/EMBEDS.md
    - skills/obsidian-markdown/references/CALLOUTS.md
    - skills/obsidian-bases/references/FUNCTIONS_REFERENCE.md
    - skills/json-canvas/references/EXAMPLES.md
  analyzed_at: '2026-04-04'
  original_source: repos/kepano-obsidian-skills.md
---

## Architecture Overview

Obsidian-skills is a collection of five agent skills authored by Steph Ango (CEO of Obsidian) that teach LLM coding agents how to correctly create and edit files in Obsidian's proprietary formats. The repo contains zero executable code. Every single file is markdown. The "architecture" is purely a directory structure convention that follows the Agent Skills specification (agentskills.io), an open standard published by Anthropic in December 2025 that multiple AI coding tools have converged on: Claude Code, Codex CLI, OpenCode, Cursor, Gemini CLI, and GitHub Copilot.

This repo is significant not just for its Obsidian-specific content, but because it represents a new paradigm: tool vendors creating official skill packages that teach AI how to use their products. Instead of cramming an "Ask AI" button into the UI like many SaaS apps, Obsidian released structured documentation that makes the entire platform agent-accessible. The industry is moving away from creating dozens of specialized agents toward a single, general-purpose agent runtime that loads different libraries of skills on demand.

The repo structure follows the Agent Skills specification precisely:

```
skills/
  obsidian-markdown/
    SKILL.md              # Primary skill definition
    references/
      CALLOUTS.md         # Exhaustive callout type reference
      EMBEDS.md           # Embed syntax reference
      PROPERTIES.md       # Frontmatter property types
  obsidian-bases/
    SKILL.md              # Bases (database views) skill
    references/
      FUNCTIONS_REFERENCE.md  # Complete function API
  json-canvas/
    SKILL.md              # Canvas file format skill
    references/
      EXAMPLES.md         # Full canvas JSON examples
  obsidian-cli/
    SKILL.md              # CLI interaction skill
  defuddle/
    SKILL.md              # Web content extraction skill
.claude-plugin/
  plugin.json             # Plugin metadata for Claude Code marketplace
  marketplace.json        # Marketplace registry entry
```

### The Agent Skills Specification

The SKILL.md format is the open standard that makes this repo portable across runtimes. The specification defines:

**Required YAML frontmatter fields:**
- `name`: Max 64 characters, lowercase letters/numbers/hyphens only, must match parent directory name
- `description`: Max 1024 characters, describes what the skill does AND when to use it (this is the trigger condition)

**Optional fields:**
- `license`: License name or reference to bundled file
- `compatibility`: Max 500 characters for environment requirements (intended product, system packages, network access)
- `metadata`: Arbitrary key-value mapping (author, version, etc.)
- `allowed-tools`: Space-delimited list of pre-approved tools (experimental)

**Directory structure:**
```
skill-name/
  SKILL.md          # Required: metadata + instructions
  scripts/          # Optional: executable code
  references/       # Optional: documentation loaded on demand
  assets/           # Optional: templates, resources
```

**Progressive disclosure design (built into the spec):**
1. Metadata (~100 tokens): `name` and `description` loaded at startup for ALL skills
2. Instructions (< 5000 tokens recommended): Full SKILL.md body loaded when skill is activated
3. Resources (as needed): Files in `scripts/`, `references/`, `assets/` loaded only when required

The spec recommends keeping SKILL.md under 500 lines and moving detailed reference material to separate files, which obsidian-skills follows precisely.

Each SKILL.md follows a consistent pattern: YAML frontmatter with `name` and `description` fields, followed by structured documentation that serves as an LLM-consumable reference. The `description` field is critical -- it acts as a trigger condition, telling the agent when to activate this skill.

The `.claude-plugin/` directory enables distribution via the Claude Code marketplace system, allowing one-command installation: `/plugin marketplace add kepano/obsidian-skills`.

## Core Mechanism

The fundamental mechanism is **documentation-as-capability**: by providing comprehensive, structured documentation in a format that agents can ingest into their context window, the agent gains the ability to correctly produce files in formats it was never specifically trained on. This works because:

1. **YAML frontmatter triggers**: Each skill's `description` field contains natural-language trigger conditions. The agent runtime matches user intent against these descriptions to decide which skills to load into context. Activation occurs based on file extensions (`.md`, `.base`, `.canvas`) or keyword recognition ("wikilinks," "callouts," "frontmatter").

2. **Hierarchical reference loading**: Skills are split into a primary SKILL.md (loaded first, contains the most critical patterns) and optional `references/` subdirectory files (loaded on demand for deeper detail). This manages token budgets -- the agent does not load the full 497-line FUNCTIONS_REFERENCE.md unless it specifically needs formula details.

3. **Workflow-structured documentation**: Each SKILL.md opens with a numbered workflow (e.g., "1. Add frontmatter, 2. Write content, 3. Link related notes...") that gives the agent a step-by-step procedure, not just reference material. LLMs perform better when given procedural instructions rather than flat reference docs.

4. **Example-driven encoding**: The json-canvas skill includes complete, valid JSON examples for every common use case. The obsidian-bases skill includes full YAML examples for task trackers, reading lists, and daily note indexes. These examples serve as few-shot demonstrations baked into the skill definition.

5. **Anti-pattern documentation**: Both the bases and canvas skills include explicit troubleshooting sections documenting common errors and their fixes. This negative-example approach prevents the LLM from making predictable mistakes.

6. **File-centric interoperability**: Skills operate through direct file manipulation -- agents write valid syntax to `.md`, `.base`, and `.canvas` files. Obsidian's built-in file watchers detect changes and update the UI in real-time. This design avoids fragile API dependencies, allowing agents to work even when Obsidian is not running.

The five skills cover complementary domains:

### Obsidian Markdown

The obsidian-markdown skill covers Obsidian Flavored Markdown, which composes multiple layers:
- **CommonMark**: Core paragraph and heading structure
- **GitHub Flavored Markdown**: Tables, task lists, strikethrough
- **LaTeX**: Mathematical notation via `$...$` and `$$...$$` delimiters
- **Obsidian extensions**: Wikilinks (`[[Note]]`), embeds (`![[Note]]`), callouts (`> [!type]`), block references, properties (YAML frontmatter), comments (`%%`), highlighting (`==text==`), Mermaid diagrams

The references/ directory provides exhaustive documentation of callout types, embed syntax (transcluding notes, headings, blocks, images, PDFs, and search results), and property types (text, list, number, checkbox, date, datetime, aliases, cssclasses, tags).

Bidirectional linking via wikilinks is a core architectural concept: every `[[link]]` creates a searchable relationship in both directions, enabling agents to build interconnected knowledge graphs purely through file syntax.

### Obsidian Bases

The obsidian-bases skill documents the `.base` file format -- Obsidian's database-like view system for notes. Bases is a core plugin that creates database-like views where you can view, edit, sort, and filter files and their properties. All data in Obsidian Bases is stored in local markdown files and their YAML frontmatter properties, making it fully compatible with the file-first architecture.

**View types:**
- Table: Display files as rows with columns showing properties
- List: Display files as a bulleted or numbered list
- Cards: Display files as a grid, creating gallery-like views with images

**The formula language** is surprisingly rich, documented across 170+ lines in FUNCTIONS_REFERENCE.md:
- **Global functions**: `date()`, `duration()`, `now()`, `today()`, `if()`, `min()`, `max()`, `number()`, `link()`, `list()`, `file()`, `image()`, `icon()`, `html()`, `escapeHTML()`
- **Date type**: Fields (year, month, day, hour, minute, second, millisecond) plus `format()`, `relative()`, `time()`, `date()`, `isEmpty()`
- **Duration type**: Fields (days, hours, minutes, seconds, milliseconds) -- critically, Duration does NOT support `.round()` directly; you must access a numeric field first
- **String type**: 12 methods including `contains()`, `containsAll()`, `containsAny()`, `startsWith()`, `endsWith()`, `lower()`, `title()`, `trim()`, `replace()`, `repeat()`, `reverse()`, `slice()`, `split()`
- **List type**: Higher-order functions including `filter()`, `map()`, `reduce()` with `value`, `index`, `acc` variables -- effectively a mini functional programming language
- **File type**: Graph-aware functions like `hasLink()`, `hasTag()`, `hasProperty()`, `inFolder()`, `asLink()`
- **RegExp type**: `matches()` for pattern matching within filters

15 built-in summary formulas (Average, Min, Max, Sum, Range, Median, Stddev, Earliest, Latest, Checked, Unchecked, Empty, Filled, Unique) plus custom summary formulas via the `summaries` section.

The Duration type gotcha is documented three times across the skill because it is the most common source of LLM-generated errors. The pattern `(now() - file.ctime).round(0)` looks correct but fails because Duration does not support `.round()` -- the correct form is `(now() - file.ctime).days.round(0)`. This repetition-for-emphasis is a deliberate documentation strategy for LLM consumption.

### JSON Canvas

The json-canvas skill encodes the full JSON Canvas Spec 1.0 (jsoncanvas.org), an open file format for infinite canvas data created for Obsidian but designed for universal adoption under MIT license. The format provides longevity, readability, interoperability, and extensibility to data created with infinite canvas apps.

Key specification details:
- **Node types**: text, file, link, group -- each with specific required/optional fields
- **Edge structure**: id, fromNode, fromSide (top/right/bottom/left), fromEnd (none/arrow), toNode, toSide, toEnd, with optional labels
- **Z-ordering**: Array order determines z-index (first = bottom, last = top)
- **ID generation**: 16-character lowercase hexadecimal strings (64-bit random)
- **Canvas color system**: Preset colors "1"-"6" (intentionally undefined -- applications choose their own brand colors) plus arbitrary hex
- **Coordinate system**: x increases right, y increases down, position is top-left corner, canvas extends infinitely

The EXAMPLES.md provides four complete canvas documents covering a simple mind map (3 nodes, 2 edges), a kanban-style project board (3 groups, 3 text nodes, no edges), a research canvas (text + file + link nodes, labeled edges), and a flowchart (6 nodes, 6 edges with conditional branching).

An 8-point validation checklist at the end of the skill ensures output correctness: unique IDs, valid node references for edges, required fields present, proper color formats, etc. JSON Canvas also has an MCP server available for integration with Claude and other MCP-compatible agents.

### Obsidian CLI

The obsidian-cli skill bridges documentation into tool execution, teaching the agent to interact with a running Obsidian instance via WebSocket-based commands:

- **File targeting**: `file=<name>` (wikilink-style resolution) vs `path=<path>` (exact vault path)
- **Vault targeting**: `vault=<name>` for multi-vault setups
- **Common operations**: read, create, append, search, daily note access, property management, task listing, tag browsing, backlink navigation
- **Plugin development workflow**: reload plugin, check for errors, screenshot for visual verification, DOM inspection, console log checking, CSS inspection, mobile emulation
- **JavaScript evaluation**: `obsidian eval code="app.vault.getFiles().length"` enables arbitrary code execution in the Obsidian context

The plugin development section defines a 4-step develop/test cycle (reload, check errors, verify visually, check console) that an agent can execute autonomously, effectively making the agent a plugin developer's assistant.

### Defuddle

The defuddle skill teaches agents to use the Defuddle web content extraction tool (`defuddle parse <url> --md`), which takes a URL or HTML, finds the main content, and returns cleaned HTML or Markdown. Created by Steph Ango for the Obsidian Web Clipper browser extension, Defuddle runs in any environment.

Key capabilities:
- Removes navigation, ads, sidebars, headers, footers, and non-essential elements
- Standardizes complex elements (math, code, footnotes) into clean semantic HTML
- Maintains an Extractor Registry with dedicated extractors for known sites (vs. heuristics for generic pages)
- Full math and Markdown conversion support

This is a context-engineering pattern: reducing token waste by preprocessing external content through specialized extraction rather than raw web fetching. The skill explicitly states to use it instead of WebFetch for URLs, as it produces cleaner, more token-efficient output.

## Design Tradeoffs

**Pure markdown vs. code-based skills.** The repo contains no TypeScript, Python, or any executable code. Every skill is a static markdown document. This maximizes portability (works with any agent that can read files) but sacrifices dynamic capabilities. A code-based skill could validate canvas JSON before writing, check that all edge references resolve to existing node IDs, or verify that wikilinked notes exist. The markdown-only approach relies entirely on the LLM's ability to follow validation checklists described in prose.

**Trigger precision vs. token cost.** The skill descriptions are broad. The obsidian-markdown skill triggers on "working with .md files in Obsidian" -- but many .md files are not Obsidian-flavored. This means the skill may load unnecessarily, consuming context tokens. A more precise trigger system would use file extension detection plus content analysis, but the Agent Skills spec currently only supports natural-language description matching.

**Flat skill registry vs. hierarchical composition.** Each skill is independent with no mechanism for inter-skill dependencies. The obsidian-bases skill cannot invoke the obsidian-markdown skill when it needs to generate markdown content within a base view. Skills cannot declare dependencies on other skills. The agent must independently discover that it needs multiple skills loaded for complex tasks.

**Reference splitting strategy.** The obsidian-bases skill puts the complete functions reference (170+ lines) in a separate file, saving tokens for basic operations but requiring a second file read for formula-heavy tasks. The obsidian-markdown skill splits into three reference files (callouts, embeds, properties) -- a finer-grained split enabling more targeted loading. This aligns with the Agent Skills spec's progressive disclosure design.

**Validation via prose vs. schema enforcement.** The json-canvas skill includes an 8-point validation checklist relying on the LLM to self-check. A JSON Schema or Zod schema could enforce correctness at write time but would require code execution infrastructure that a pure-markdown skill cannot provide.

**Specification-by-example vs. formal grammar.** The EXAMPLES.md file contains four complete canvas JSON documents serving as both documentation and test fixtures. This "specification by example" pattern is more LLM-friendly than formal grammar specifications -- if the agent produces output structurally similar to the examples, it is likely correct.

## Failure Modes & Limitations

**Context window saturation.** If all five skills are loaded simultaneously, they consume substantial context. The obsidian-bases SKILL.md alone is 497 lines; FUNCTIONS_REFERENCE.md adds 174 lines. Total for all skills: approximately 20K tokens. Significant but manageable in modern 200K+ context windows. For agents with smaller windows, loading multiple skills may crowd out actual document content.

**No runtime validation.** Since skills are documentation, there is no feedback loop when the agent produces invalid output. The agent might generate a canvas with duplicate node IDs or a base with undefined formulas, and the skill has no mechanism to catch this before the file is written. The user discovers errors only when Obsidian fails to render the file.

**Version drift.** Obsidian's features evolve rapidly. The skills encode syntax details (callout types, formula function API) that can become outdated. There is no automated mechanism to detect or update stale skill documentation. The version field in plugin.json (1.0.1) must be manually bumped.

**No contextual vault awareness.** The skills do not know what notes already exist in the user's vault. The obsidian-markdown skill teaches wikilinks (`[[Note Name]]`), but the agent cannot verify that the linked note exists. The bases skill teaches filter syntax (`file.hasTag("book")`), but cannot verify that notes with that tag exist. The obsidian-cli skill partially addresses this by enabling the agent to query the running Obsidian instance.

**Single-agent assumption.** The skills assume a single agent interacting with a single vault. There is no consideration for concurrent editing, multi-agent workflows, or vault synchronization.

**Description matching limitations.** The Agent Skills spec relies on natural-language description matching for skill activation. This is inherently fuzzy -- the system may activate irrelevant skills or miss relevant ones based on how well the description matches the user's intent. More precise triggering would require structured conditions or tool-use declarations.

## Integration Patterns

### Agent Skills Ecosystem

The repo demonstrates the emerging standard for skill distribution and consumption:

**Marketplace distribution.** The `.claude-plugin/` directory shows the pattern for skill distribution: a plugin.json manifest with name/version/description/author/keywords, and a marketplace.json mapping plugin names to source directories. This enables `npx skills add` one-line installation.

**Multi-agent-runtime compatibility.** Installation documented for multiple runtimes:
- **Claude Code**: Skills in `/.claude/` at vault root, with marketplace install via `/plugin marketplace add`
- **Codex CLI**: `skills/` directory deploys to `~/.codex/skills/` following standard agent path conventions
- **OpenCode**: Full repo clones to `~/.opencode/skills/obsidian-skills/`, auto-discovers all SKILL.md files
- **VS Code Copilot**: GitHub Copilot supports the same SKILL.md format
- **Generic Agent Skills**: Any skills-compatible runtime via `npx skills add`

This broad adoption across major AI platforms (Anthropic, OpenAI, Microsoft, Google) demonstrates genuine convergence toward a universal skill format.

**Validation tooling.** The `skills-ref` reference library at agentskills/agentskills enables `skills-ref validate ./my-skill` to check frontmatter validity and naming conventions.

### CLI Integration via Skill

The obsidian-cli skill bridges documentation-skills and tool-use by teaching the agent about `obsidian` CLI commands. The agent executes `obsidian read file="My Note"` via its Bash tool, using the skill documentation to construct the correct command. This effectively gives the agent tool access to a running Obsidian instance without any custom tool implementation.

### Defuddle as Token Optimization

The defuddle skill teaches agents to preprocess external content through specialized extraction rather than raw web fetching. This is a context-engineering pattern applicable to any knowledge base: reducing token waste before content enters the agent's context window.

### File-Watcher Architecture

Skills operate through direct file manipulation rather than APIs. Agents write to `.md`, `.base`, and `.canvas` files; Obsidian's file watchers detect changes and update the UI in real-time. The obsidian-cli skill provides an alternative WebSocket pathway for interactive operations. This design is resilient: file-based operations work even when Obsidian is not running.

## Deep Dive: The Broader Skills Ecosystem

### Industry Convergence on SKILL.md

Obsidian-skills, alongside Anthropic's official skills repo and the agentskills.io specification, is establishing the de facto standard for how domain knowledge gets packaged for LLM agents. The pattern of YAML-frontmatter SKILL.md files with references/ subdirectories is being adopted by dozens of other skill repositories.

The convergence is significant because it means:
- Skills written once work across Claude Code, Codex, Copilot, Gemini CLI, and OpenCode
- Tool vendors can create official skill packages instead of maintaining separate integrations per AI platform
- Users can build custom skill libraries that are portable across agents
- The skill format itself is a knowledge representation standard, not tied to any specific runtime

### Documentation-as-Capability Pattern

The most significant contribution of obsidian-skills is not the Obsidian-specific content, but the pattern it demonstrates: complex, proprietary file formats can be made agent-accessible through carefully structured markdown documentation alone, without any executable code. This has broad implications:

1. **Any proprietary format** (CRM schemas, ERP configurations, domain-specific file formats) can be encoded as a skill
2. **Skill creation requires domain expertise, not programming** -- making it accessible to non-developers
3. **Skills are version-controllable, diffable, and reviewable** -- standard software engineering practices apply
4. **The token budget is the constraint** -- skills must be concise enough to fit in context windows alongside actual work

### Progressive Disclosure in Practice

The obsidian-skills repo demonstrates the spec's three-level progressive disclosure in practice:
- Level 1: All five skill descriptions are loaded at startup (~500 tokens total)
- Level 2: When a skill activates, its SKILL.md loads (~2-6K tokens per skill)
- Level 3: Reference files load only when deep detail is needed (~1-3K per file)

This means the common case (working with markdown) costs ~2.5K tokens, while the rare case (building a complex base with custom formulas) costs ~6K tokens. The system never pays the full ~20K token cost unless all skills and all references are active simultaneously.

## Comparative Analysis

**vs. napkin's template system**: Napkin also uses structured markdown to encode knowledge for agents, but its templates define vault structure (directories, frontmatter schemas) rather than file format specifications. Obsidian-skills teaches agents how to produce correct output syntax; napkin's templates teach agents how to organize knowledge. The two are complementary: an agent could use obsidian-skills to write correctly-formatted Obsidian files and napkin's templates to organize them into a coherent knowledge structure.

**vs. MCP tools**: MCP (Model Context Protocol) tools provide programmatic access to services via function calls. Skills provide knowledge via documentation. The obsidian-cli skill bridges both: it teaches the agent to construct CLI commands (a form of documentation-as-capability) that execute like MCP tool calls. The JSON Canvas MCP server demonstrates the alternative: exposing canvas operations as typed functions rather than documentation. Skills are more portable (any agent can read markdown); MCP tools are more reliable (typed schemas enforce correctness).

**vs. RAGFlow's agent system**: RAGFlow provides a visual canvas for building agent workflows with typed components. Obsidian-skills provides static documentation that agents consume. RAGFlow's approach is infrastructure-heavy but enforces correctness through typed component interfaces. Obsidian-skills is zero-infrastructure but relies on LLM comprehension for correctness. Both approaches enable agents to work with complex systems, but through fundamentally different mechanisms.

**vs. custom system prompts**: Before the Agent Skills spec, domain knowledge was typically encoded in system prompts or CLAUDE.md files. Skills formalize this pattern with a portable specification: standardized naming, description-based triggers, progressive disclosure, and marketplace distribution. The key improvement is that skills are discoverable and composable -- an agent can load exactly the skills it needs rather than always loading a monolithic system prompt.

## Benchmarks & Performance

No formal benchmarks exist for this repo. However, evaluation along several dimensions:

**Adoption metrics.** 19.3K stars indicates strong community interest. Authored by Obsidian's CEO, giving it official status and ensuring accuracy.

**Coverage completeness.** Five skills cover the main Obsidian file formats (.md, .base, .canvas) plus two utility tools (CLI, defuddle). Notable gaps: no skill for Obsidian themes/CSS, no skill for community plugin development (beyond basic dev commands in obsidian-cli), no skill for the Obsidian URI scheme.

**Token efficiency.** Per-skill costs: obsidian-markdown (~3K tokens with references), obsidian-bases (~6K with reference), json-canvas (~6K with examples), obsidian-cli (~2K), defuddle (~1K). Total all skills: ~20K tokens. Manageable in 200K+ context windows.

**Skill format influence.** This repo serves as a reference implementation for the "skill as structured documentation" paradigm. The pattern is being adopted by tool vendors across the industry: instead of building custom AI integrations, create a SKILL.md that teaches any compatible agent how to use your product.

## Implications for Meta-KB

Obsidian-skills provides several insights directly relevant to meta-kb:

1. **Skills as knowledge encoding** -- The SKILL.md pattern demonstrates that complex domain knowledge can be encoded as structured markdown, loaded on demand, and consumed by LLM agents. Meta-kb's wiki articles could be structured as skills: each topic page with frontmatter triggers and progressive disclosure of concepts.

2. **Reference splitting for token efficiency** -- The pattern of a primary document (overview, key patterns) with references/ for detailed content is directly applicable to meta-kb's wiki structure. Topic pages should contain essential knowledge upfront, with deep-dive content in separate files.

3. **Anti-pattern documentation** -- The bases skill's approach of documenting common LLM mistakes (Duration gotcha documented three times) is a powerful pattern for any knowledge base that will be consumed by LLMs. Meta-kb should document common misconceptions about its topics, not just correct information.

4. **The convergence signal** -- The Agent Skills spec's adoption across Anthropic, OpenAI, Microsoft, and Google indicates that structured markdown knowledge bases are becoming the standard interface between humans and AI agents. This validates meta-kb's core premise: markdown knowledge bases are not just for human consumption.

5. **File-first architecture** -- Obsidian's file-first design (all data in local markdown, no proprietary database) aligns with meta-kb's local-first approach. Both demonstrate that file-based knowledge systems are fully compatible with LLM agent consumption.
