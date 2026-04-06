---
entity_id: aider
type: project
bucket: agent-systems
abstract: >-
  Aider is an open-source CLI-based AI pair programmer that edits code in your
  local git repository through natural language, differentiating itself via
  git-native workflows, broad model support, and a benchmark-driven development
  culture.
sources:
  - repos/alirezarezvani-claude-skills.md
  - repos/tirth8205-code-review-graph.md
  - repos/yusufkaraaslan-skill-seekers.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
related:
  - Cursor
  - Claude Code
  - Model Context Protocol
  - Windsurf
last_compiled: '2026-04-05T23:18:31.952Z'
---
# Aider

## What It Does

Aider runs in your terminal alongside your existing editor. You describe a change in plain English, and Aider asks the LLM to implement it, then writes the result directly to your local files and commits it to git. The session is conversational: you can iterate on the change, ask follow-up questions, or add more files to the context.

The key differentiator from GUI-based tools like [Cursor](../projects/cursor.md) or [Windsurf](../projects/windsurf.md) is that Aider integrates with your existing editor and workflow rather than replacing them. You keep your terminal, your keybindings, your git history.

## Architecture

### Edit Formats

Aider's central design decision is how to ask the LLM to express code changes. It supports several "edit formats," each a different way the model can specify what to write:

- **Diff**: unified diff format. Precise and token-efficient, but models sometimes produce malformed diffs.
- **Whole**: the model returns the entire file. Reliable but expensive on large files.
- **Udiff**: "unified diff with context." A middle ground.
- **Architect mode**: one model plans the change, a second (cheaper) model executes it. Separates reasoning from mechanical editing.

The choice of edit format is exposed as a configuration option and affects reliability substantially. The benchmark suite (`benchmark/`) exists largely to evaluate which format works best with which model.

### Repository Map

Aider builds a "repo map" — a compact summary of your codebase's structure — to give the LLM context about code outside the files you've explicitly added to the chat. The map uses [tree-sitter](https://tree-sitter.github.io/tree-sitter/) to parse code and extract function signatures, class definitions, and call relationships. The result is a ranked, token-budget-aware summary: files more relevant to the current task rank higher.

This is analogous to the blast-radius approach in [code-review-graph](../projects/code-review-graph.md), but lighter-weight. Aider's repo map prioritizes giving the LLM enough structural context to write correct cross-file changes without loading entire files.

### Git Integration

Every successful edit produces a git commit. The commit message is AI-generated based on the change. This is non-negotiable by default: Aider is built around the assumption that git is your safety net. If you don't like a change, `git diff HEAD~1` tells you what happened, and `git reset HEAD~1` undoes it.

Aider also reads your `.gitignore` to exclude irrelevant files and respects `.aiderignore` for additional exclusions.

### Model Support

Aider supports a wide range of providers: Anthropic (Claude), OpenAI (GPT-4o, o-series), Google (Gemini), DeepSeek, local models via Ollama, and anything accessible through an OpenAI-compatible API. The model choice affects which edit format Aider defaults to, based on its benchmark results.

### [Model Context Protocol](../concepts/model-context-protocol.md)

Aider does not natively implement MCP as of the knowledge cutoff, but it operates in a space where MCP-enabled tools (like [code-review-graph](../projects/code-review-graph.md)) can complement it. Aider's repo map is its own solution to the context-selection problem that MCP addresses more generally.

## Benchmarks

Aider maintains a public benchmark called SWE-bench Lite performance, tracked at [aider.chat/docs/leaderboards](https://aider.chat/docs/leaderboards/). The leaderboard measures what fraction of real GitHub issues a model+Aider combination can resolve automatically.

**Credibility assessment**: These numbers are self-reported and self-run by the Aider maintainer (Paul Gauthier). The methodology is public and reproducible — Aider publishes the benchmark scripts — but independent replication is limited. The Darwin Godel Machine paper does reference Aider as a baseline comparison point (Aider scored ~15% on the Polyglot benchmark, where DGM's best agent reached 30.7%), which provides one external data point. Treat the leaderboard numbers as directionally meaningful but not independently audited.

The benchmark infrastructure in `benchmark/` runs each model through a large set of coding exercises and tracks which edit format produces the fewest failures. This data drives Aider's default configuration per model.

## Strengths

**Git-native workflow**: Every change is committed, diffs are readable, and rollback is trivial. For developers already working in the terminal, this integrates with zero friction.

**Model-agnostic**: You can switch models mid-session or configure different models for different tasks (e.g., an expensive model for architecture, a cheap one for implementation). No vendor lock-in.

**Benchmark transparency**: Aider publishes how well it works, with reproducible methodology. Most competitors don't.

**Voice mode**: Aider supports dictating changes via microphone — useful for thinking through problems aloud.

**Broad language support**: Via tree-sitter, Aider parses most common languages for repo map construction.

## Limitations

**Concrete failure mode — large file context**: Aider's repo map helps, but if you add large files explicitly to the context, you're burning tokens fast. On a 10,000-line file, the "whole" edit format can exhaust a model's context window. The diff format helps but breaks on complex multi-location edits. There's no automatic chunking of large files.

**Unspoken infrastructure assumption**: Aider assumes you have a clean git repository. If your project has uncommitted changes, merge conflicts, or no git history, the workflow degrades. It won't refuse to run, but the safety net (git commits per change) requires a functional git setup.

**No persistent memory across sessions**: Each Aider session starts fresh. You can load a conversation history file, but Aider doesn't maintain an evolving memory of your codebase, preferences, or past decisions. [Claude Code](../projects/claude-code.md) handles this differently via `CLAUDE.md` files.

**Terminal-only**: No GUI. For developers accustomed to point-and-click interfaces, the learning curve is real. Aider provides a browser-based chat UI as an alternative, but it's secondary.

## When NOT to Use Aider

**Multi-file refactors in large codebases**: Aider works best when the relevant context fits comfortably in a model's context window. A rename that touches 200 files, or a cross-cutting architecture change, requires careful manual file curation. A purpose-built tool with structural graph awareness (like code-review-graph) handles dependency tracking better.

**Teams with non-technical stakeholders**: Aider's interface is entirely text and terminal. If your workflow involves non-developers reviewing or directing changes, Aider provides no collaboration surface.

**Environments where git isn't usable**: Monorepos with unusual git configurations, repositories with pre-commit hooks that break on AI-generated commits, or environments where git is unavailable entirely.

**When you need IDE integration**: Aider doesn't integrate with VS Code, JetBrains, or other IDEs natively. If your workflow depends on IDE features (debuggers, test runners, visual diff tools), Cursor or Windsurf are more natural fits.

## Unresolved Questions

**Governance and maintenance continuity**: Aider is primarily a solo project (Paul Gauthier). The project has significant community usage but limited organizational backing. What happens to maintenance if the primary contributor steps back is unclear.

**Cost at scale**: Aider doesn't expose cost tracking beyond the token count display. Teams using Aider across multiple developers lack built-in tooling to track API spend.

**Conflict resolution with existing code style**: Aider doesn't read or enforce linting configurations, code style guides, or type checker rules during generation. It commits whatever the model produces. Running formatters and linters after Aider edits is the user's responsibility.

**Architect mode model selection**: The architect/editor split is powerful but underdocumented. Which models work well together in this configuration, and what the cost/quality tradeoff looks like, requires trial and error.

## Alternatives

**[Cursor](../projects/cursor.md)**: Use when you want IDE integration and a GUI. Cursor embeds AI assistance into a VS Code fork; Aider leaves your editor alone. Cursor is better for developers who prefer visual tools; Aider for terminal-native developers.

**[Claude Code](../projects/claude-code.md)**: Use when you want deeper Anthropic integration, multi-file agentic task execution, and persistent project memory via `CLAUDE.md`. Claude Code is more agentic (it can run commands, browse the web, manage its own context); Aider is more interactive and conversational. Claude Code has vendor lock-in to Anthropic; Aider doesn't.

**[Windsurf](../projects/windsurf.md)**: Use when you want a Cursor-style experience with Codeium's model. Similar tradeoff to Cursor vs. Aider.

**Direct API usage**: Use when you need fine-grained control over every prompt and don't want the overhead of a tool. Aider adds value through repo map, edit format selection, and git integration; if you don't need those, the raw API is simpler.


## Related

- [Cursor](../projects/cursor.md) — competes_with (0.7)
- [Claude Code](../projects/claude-code.md) — competes_with (0.7)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.5)
- [Windsurf](../projects/windsurf.md) — competes_with (0.6)
