# Everything Claude Code

> The most-starred agent harness optimization system -- a complete performance stack of skills, instincts, memory persistence hooks, security scanning, and continuous learning for Claude Code and compatible agents.

## What It Does

Everything Claude Code (ECC) is a production-ready collection of agent configurations evolved over 10+ months of daily use. It provides skills (domain-specific capabilities), instincts (behavioral patterns), memory hooks (save/load context across sessions automatically), continuous learning (auto-extract reusable patterns from sessions), security scanning (AgentShield), and research-first development workflows. It works across Claude Code, Codex, Cowork, and other agent harnesses supporting the SKILL.md standard.

## Architecture

The system is organized around several layers:

- **Skills**: Domain-specific capabilities (pytorch-patterns, documentation-lookup, bun-runtime, nextjs-turbopack, mcp-server-patterns) across 12 language ecosystems
- **Agents**: Specialized reviewer/resolver agents (typescript-reviewer, java-build-resolver, kotlin-reviewer, etc.) for 10+ languages
- **Memory persistence**: Hooks that save and load context across sessions automatically, enabling agents to accumulate knowledge without manual prompt engineering
- **Continuous learning**: Auto-extracts patterns from completed sessions into reusable skills -- the agent gets better at your codebase over time
- **Security**: AgentShield scanning, sanitization, and CVE awareness
- **Install system**: Manifest-driven selective install (`install-plan.js`, `install-apply.js`) with SQLite state store tracking installed components

Built primarily in JavaScript/TypeScript with multi-language support. Uses the Agent Skills specification for cross-agent compatibility.

## Key Numbers

- **136,116 GitHub stars**, 20,075 forks
- 30+ contributors, 7 languages supported
- Anthropic Hackathon Winner
- 12 language ecosystem rulesets
- 10+ specialized agents
- v1.9.0 current release
- MIT license

## Strengths

- The continuous learning loop (sessions generate patterns that become skills) implements a practical self-improvement cycle that reduces token overhead over time
- Broadest language coverage of any agent harness optimization system, with dedicated reviewers and build resolvers per ecosystem

## Limitations

- The sheer size of the system (skills, agents, hooks, rules across 12 languages) can be overwhelming -- selective install helps but the learning curve is steep
- Tightly coupled to Claude Code's hook system; portability to non-SKILL.md agents requires adaptation

## Alternatives

- [anthropic-skills.md](anthropic-skills.md) -- use when you want the official, minimal skill standard without the full optimization stack
- [gstack.md](gstack.md) -- use when you want an opinionated role-based workflow (CEO, QA, designer) rather than a language-ecosystem approach
- [planning-with-files.md](planning-with-files.md) -- use when you want just the persistent planning pattern without the full harness

## Sources

- [affaan-m-everything-claude-code.md](../../raw/repos/affaan-m-everything-claude-code.md) -- "Not just configs. A complete system: skills, instincts, memory optimization, continuous learning, security scanning, and research-first development"
