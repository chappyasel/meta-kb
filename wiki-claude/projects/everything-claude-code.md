# Everything Claude Code

> The most-starred agent harness optimization system, providing 38 agents, 156 skills, persistent memory hooks, AgentShield security scanning, and multi-language rule architectures for Claude Code, Codex, and other AI agent harnesses.

## What It Does

Everything Claude Code (ECC) is a comprehensive performance optimization system for AI coding agents. It provides agents (specialized role configurations), skills (task-specific capabilities), rules (language-specific coding standards), hooks (lifecycle event handlers for memory persistence and continuous learning), and commands (slash-command workflows). Key capabilities include: automatic pattern extraction from sessions into reusable skills, memory hooks that save and load context across sessions, AgentShield for security scanning (1,282 tests, 102 rules), and multi-language rule architectures covering 12 language ecosystems. Works across Claude Code, Codex, Cowork, and OpenCode.

## Architecture

JavaScript/TypeScript core with a manifest-driven installation pipeline (`install-plan.js` and `install-apply.js`) for selective component installation. State tracked via SQLite store with query CLI. Hook system wraps agent lifecycle events (session start, stop, pre-commit) to trigger memory persistence, context loading, and pattern extraction. Skills follow the SKILL.md format. Rules are organized into `common/` plus language-specific directories (TypeScript, Python, Go, Java, PHP, Perl, Kotlin, C++, Rust). NanoClaw v2 provides model routing, skill hot-loading, and session management (branch, search, export, compact, metrics). AgentShield runs as an integrated security scanner via the `/security-scan` skill. GitHub Marketplace app available with free/pro/enterprise tiers.

## Key Numbers

- 136,116 GitHub stars, 20,075 forks
- 38 agents, 156 skills across 7 languages
- 12 language ecosystem rule sets
- AgentShield: 1,282 tests, 102 security rules
- 997 internal tests passing
- Anthropic Hackathon winner
- MIT license

## Strengths

- Persistent memory hooks that automatically save/load context across sessions solve the stateless-agent problem without requiring external memory infrastructure
- Continuous learning loops that extract patterns from sessions into reusable skills create compounding improvement over time
- AgentShield provides security scanning purpose-built for agent-generated code, addressing attack vectors specific to LLM outputs
- 12-language rule architecture means the system works across polyglot codebases, not just Python or TypeScript

## Limitations

- The sheer breadth (38 agents, 156 skills) makes it difficult to understand which components are production-quality versus aspirational
- Heavy reliance on hooks and lifecycle events creates tight coupling to specific harness implementations; cross-harness parity is a stated goal but behavior differences persist
- Self-reported star counts in the README (50K+) do not match the actual repository metrics (136K), suggesting rapid growth but also documentation lag
- No published benchmarks comparing ECC-enhanced agents against baseline agents on standardized tasks

## Alternatives

- [gstack](gstack.md) -- use when you want an opinionated sprint workflow with role-based specialists rather than a broad optimization system
- [Anthropic Skills](anthropic-skills.md) -- use when you want the official skill standard with simpler, modular capabilities

## Sources

- [affaan-m/everything-claude-code](../../raw/repos/affaan-m-everything-claude-code.md) -- "Not just configs. A complete system: skills, instincts, memory optimization, continuous learning, security scanning, and research-first development"
