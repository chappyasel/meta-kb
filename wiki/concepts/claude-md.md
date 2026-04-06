---
entity_id: claude-md
type: concept
bucket: context-engineering
abstract: >-
  claude.md: A Markdown file placed in a project root (or `.claude/` directory)
  that persists instructions, preferences, and codebase context across Claude
  agent sessions — differentiating from RAG by loading context statically into
  every prompt rather than retrieving it on demand.
sources:
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/jmilinovich-goal-md.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/snarktank-compound-product.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/jmilinovich-goal-md.md
related:
  - claude-code
  - claude
  - rag
last_compiled: '2026-04-06T02:04:56.929Z'
---
# claude.md

## What It Is

`claude.md` (sometimes written `CLAUDE.md`) is a Markdown file convention that Claude-based agents read at session start to load persistent instructions, project context, coding preferences, and behavioral constraints. Drop one into a repository root and Claude Code picks it up automatically on every invocation. No configuration required beyond creating the file.

The convention sits inside [Context Engineering](../concepts/context-engineering.md) at the intersection of two older patterns: README-style documentation for humans and system prompt injection for machines. A `claude.md` serves both. A developer reading it learns how the project works. Claude reading it learns how to behave inside that project.

[Claude Code](../projects/claude-code.md) made this convention load-bearing. It uses `claude.md` as the primary mechanism for repository-scoped agent configuration, treating the file as both a bootstrap document and a live instruction set that overrides default behaviors.

---

## How It Works

### Loading Mechanism

Claude Code scans for `claude.md` (case-insensitive) in:

1. The project root directory
2. `.claude/claude.md` (for cleaner repo organization)
3. Parent directories up the filesystem hierarchy (allowing monorepo inheritance)
4. A user-level `~/.claude/claude.md` for global preferences

All matched files get concatenated into the system prompt context before the first user message. This means content in `claude.md` is present for every request in the session, without the agent needing to fetch or search for it.

This is the key architectural difference from [Retrieval-Augmented Generation](../concepts/rag.md): RAG retrieves context in response to a query at runtime. `claude.md` loads context unconditionally at session start. The tradeoff is coverage versus cost — everything in `claude.md` counts toward the token budget on every call.

### The `@import` Pattern

Files can include other files using `@import` directives. A `claude.md` at the project root can pull in specialized sub-documents:

```markdown
@import .claude/architecture.md
@import .claude/testing-conventions.md
@import docs/api-reference.md
```

The [hipocampus](../projects/hipocampus.md) memory system exploits this directly: it places `memory/ROOT.md` (a compressed topic index), `SCRATCHPAD.md`, `WORKING.md`, and `TASK-QUEUE.md` as `@import` targets in `CLAUDE.md`, keeping ~3K tokens of persistent memory hot in every session. This is its "Layer 1 (Hot)" tier — content auto-loaded at zero retrieval cost.

### Scope Hierarchy

Multiple `claude.md` files compose across scopes:

- **Global** (`~/.claude/claude.md`): Universal preferences — coding style, response format, output verbosity
- **Repository** (project root): Stack-specific context, architecture decisions, dependency notes
- **Directory** (subdirectory `claude.md`): Component-specific guidance, overrides for that subtree

Lower-level files take precedence on conflicts. This mirrors how `.gitignore` and `.editorconfig` work — a familiar mental model for developers.

---

## What Goes Inside

A well-structured `claude.md` typically includes:

**Project context:** Tech stack, architectural patterns, third-party integrations that aren't obvious from the code. A file describing "we use Zod for all API boundary validation" prevents the agent from suggesting Yup or io-ts alternatives.

**Behavioral instructions:** How the agent should operate. "Always run `npm run typecheck` before proposing a PR." "Prefer functional approaches over class-based patterns." "Never modify `migrations/` directly."

**Codebase conventions:** Naming patterns, file organization rules, test requirements. Anything a senior developer would tell a contractor on day one.

**Known gotchas:** "The `auth/` module uses a custom session store — don't refactor it to use the standard Next.js pattern." Hard-won institutional knowledge that isn't in comments.

**Constraints:** Lines the agent must not cross. The `compound-product` system's approach — explicitly listing recently completed work to prevent the agent from re-solving solved problems — is a good example of a domain-specific constraint worth encoding.

---

## Relationship to Other File Conventions

`claude.md` is one member of a growing family of agent instruction files:

- [skill.md](../concepts/skill-md.md): Single-purpose capability definitions (how to generate a PRD, how to run the test suite). Referenced from `claude.md` but focused on a single skill.
- `AGENTS.md`: The Google/OpenAI convention for the same concept. Claude Code reads `AGENTS.md` as well as `claude.md`.
- `GOAL.md`: John Milinovich's convention (see [goal-md](../projects/goal-md.md)) for encoding a fitness function and improvement loop rather than behavioral instructions. A `GOAL.md` tells the agent *what to optimize*; a `claude.md` tells it *how to work*.
- `progress.txt`: Used by compound-product to persist cross-iteration learnings — what failed, what patterns emerged. Complements `claude.md` with session-specific state rather than stable project context.

The compound-product system's `AGENTS.md` file serves exactly the `claude.md` function: "Long-term codebase knowledge updated by the agent" accumulated across autonomous improvement cycles. The name changes, the mechanism is identical.

---

## Strengths

**Zero retrieval overhead.** Content in `claude.md` is present without a search query. The agent doesn't need to suspect relevant context exists before accessing it — it's already there. This addresses the "unknown unknowns" problem that hipocampus benchmarks against: RAG scores 2.8% on implicit recall questions; always-loaded context is structurally better at surfacing connections the agent didn't know to search for.

**Human-readable.** The file serves as documentation for developers and instruction set for agents simultaneously. No separate format to maintain.

**Prompt caching compatibility.** Stable `claude.md` content maximizes cache hit rates on Claude's prompt caching system. A 3K-token file that never changes costs ~300 effective tokens per call at 90% cache efficiency.

**Composable.** The scope hierarchy (global → repo → directory) and `@import` support let teams build modular context without duplicating content.

**No infrastructure.** Unlike vector databases, RAG pipelines, or memory servers, `claude.md` requires nothing beyond a text file.

---

## Critical Limitations

**Fixed token cost per call.** Everything in `claude.md` counts toward the context window on every request, whether relevant or not. A 10K-token `claude.md` in a large enterprise codebase adds real cost at scale. Teams that pad the file with "nice to have" context create bloat that degrades context window efficiency for operations that don't need it.

**No dynamic updating during session.** The file loads at session start. Changes made mid-session don't take effect until the next session. For agents that discover new patterns during a long autonomous run, this creates a gap: learning is lost unless explicitly written back to the file. The compound-product system handles this with `progress.txt` as a session-level accumulator, separate from the stable `claude.md`/`AGENTS.md`.

**Content staleness is silent.** There's no mechanism to detect when `claude.md` content becomes outdated. An architectural note about a deprecated pattern, or a constraint about a library that was replaced, silently misleads the agent. Hipocampus's `[?]` staleness markers on reference entries solve this within its own format, but nothing enforces this discipline on `claude.md` authors.

**Unspoken infrastructure assumption.** The file convention assumes Claude Code or a compatible runtime that implements the auto-load behavior. The same file dropped into a raw Anthropic API call does nothing unless the calling code explicitly reads and injects it. Teams building custom Claude integrations must implement the loading logic themselves — the convention carries no runtime.

---

## When Not to Use It

**When context is large and mostly irrelevant per query.** A 50K-token codebase summary in `claude.md` wastes context budget on every focused query. Use `@import` with scoped sub-documents, or move the bulk content to RAG and keep only a summary in `claude.md`.

**When you need cross-session memory that evolves.** `claude.md` is edited by humans, not agents. For memory that should update automatically as the agent learns — user preferences, discovered patterns, cross-session state — use a system like hipocampus that writes to `memory/ROOT.md` and compacts over time, with `claude.md` importing that file rather than containing the content directly.

**When multiple specialized agents need differentiated contexts.** A single `claude.md` serves all agents equally. If you're running an orchestration system where a planning agent, a coding agent, and a review agent need different instruction sets, per-role instruction files work better than one shared `claude.md`.

**For non-Claude runtimes.** The convention is Claude-specific. [Cursor](../projects/cursor.md) uses `.cursorrules`. Windsurf uses its own format. Cross-platform agent systems need a runtime-agnostic layer or per-platform files.

---

## Unresolved Questions

**No governance standard for what belongs.** There's no community consensus distinguishing "project context" (belongs in `claude.md`) from "behavioral instructions" (belongs in a skill file) from "architectural documentation" (belongs in `docs/`). Teams develop idiosyncratic files that range from 50 lines to 5,000 lines with no guidance on what to optimize for.

**Conflict resolution in inheritance is underspecified.** When a subdirectory `claude.md` contradicts the root `claude.md`, which wins is documented as "lower-level takes precedence," but the actual merging behavior for non-conflicting versus conflicting content isn't formally specified. Complex monorepos discover edge cases empirically.

**Agent write-back norms are unsettled.** Compound-product explicitly instructs agents to update `AGENTS.md` with discovered patterns. Hipocampus writes to `ROOT.md` and imports it from `CLAUDE.md`. But no standard protocol governs when an agent should propose changes to the `claude.md` file itself, creating inconsistency across teams.

**No size recommendations backed by measurement.** Hipocampus benchmarks ROOT.md at 3K vs 10K tokens and shows diminishing returns (17.3% → 21.0% recall improvement). No comparable measurement exists for general `claude.md` files. The "keep it short" advice is conventional wisdom, not empirically validated.

---

## Alternatives and Selection Guidance

**[Retrieval-Augmented Generation](../concepts/rag.md):** Retrieves context on demand from a vector database or search index. Use RAG when the relevant context varies significantly per query and the total knowledge base is too large to load statically. Use `claude.md` when the context is stable and broadly relevant across most queries in a session.

**[Episodic Memory](../concepts/episodic-memory.md) systems (hipocampus, Mem0, Letta):** Dynamic memory that updates across sessions, with search and compaction. Use these when you need memory that evolves as the agent works. Use `claude.md` as the static loading point that imports their outputs (e.g., `@import memory/ROOT.md`), not as a replacement.

**[Core Memory](../concepts/core-memory.md) in Letta:** Always-present memory blocks that update during execution. Conceptually similar to `claude.md` but implemented inside the agent runtime rather than as a file convention. Use core memory when you're building on Letta's infrastructure; use `claude.md` when you're working with Claude Code's file-based toolchain.

**`GOAL.md`:** Tells an agent what to optimize toward (fitness function, improvement loop, operating mode). Complementary to `claude.md`, not competitive. A project can have both — `claude.md` encoding how to work, `GOAL.md` encoding what to improve.

**[Prompt Engineering](../concepts/prompt-engineering.md) in the system prompt:** Inline instructions at the API call level. Use when deploying Claude in a product context where per-request instructions change. Use `claude.md` when you're in a development context where project-level conventions should apply to all developer interactions, not per-request logic.

---

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md)
- [Agent Memory](../concepts/agent-memory.md)
- [Procedural Memory](../concepts/procedural-memory.md)
- [skill.md](../concepts/skill-md.md)
- [Progressive Disclosure](../concepts/progressive-disclosure.md)
- [Claude Code](../projects/claude-code.md)
- [Claude](../projects/claude.md)
