---
entity_id: openai-codex
type: project
bucket: agent-systems
abstract: >-
  OpenAI's code generation model (2021) and cloud coding agent (2025): the
  original large-scale code model that powered GitHub Copilot, later reborn as a
  cloud-native parallel coding agent competing with Claude Code.
sources:
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/affaan-m-everything-claude-code.md
  - repos/human-agent-society-coral.md
  - repos/karpathy-autoresearch.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/caviraoss-openmemory.md
  - repos/kepano-obsidian-skills.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/othmanadi-planning-with-files.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - claude-code
  - cursor
  - gemini
  - andrej-karpathy
  - mcp
  - agent-skills
  - anthropic
  - autoresearch
  - windsurf
  - github-copilot
  - rag
last_compiled: '2026-04-06T02:00:15.530Z'
---
# OpenAI Codex

## What It Is

OpenAI Codex refers to two distinct but related products that share a name and lineage:

**Codex (2021, the model):** A GPT-3-derived model fine-tuned on 54 million GitHub repositories, released in August 2021. It powered GitHub Copilot's original inline completions and was accessible via API until March 2023, when OpenAI deprecated it in favor of GPT-3.5/GPT-4. This is the model [Andrej Karpathy](../concepts/andrej-karpathy.md) and others at OpenAI developed as a direct application of scaling laws to code.

**Codex (2025, the agent):** A cloud-hosted coding agent announced in May 2025, built on the `codex-1` model (a variant of o3 fine-tuned for software engineering tasks). This is the product competing directly with [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), and [Windsurf](../projects/windsurf.md). It runs tasks in isolated cloud sandboxes, supports parallel execution, and integrates with GitHub. This reference card focuses primarily on the 2025 agent product, with relevant context from the original model.

## Architecture: The 2021 Model

The original Codex model used standard transformer architecture with two sizes released in the API: `code-cushman-001` (12B parameters) and `code-davinci-002` (estimated 175B, same scale as GPT-3). Training data was filtered public GitHub code plus the GPT-3 pretraining corpus.

The key architectural decision was treating code generation as next-token prediction on raw source files, not as a structured synthesis problem. No special grammar enforcement, no AST-guided decoding. This generality let the model handle arbitrary languages, configuration files, and prose-code mixtures at the cost of occasional syntactically invalid output.

The HumanEval benchmark (introduced alongside Codex) measured pass@k: what fraction of programming problems does the model solve if you sample k completions? The original paper reported pass@1 of ~28.8% and pass@100 of ~72.3% on HumanEval. These numbers were self-reported by OpenAI; independent replications confirmed the general range.

## Architecture: The 2025 Agent

The 2025 Codex agent runs on `codex-1`, trained with reinforcement learning on real software engineering tasks (similar training methodology to the approach described for [SWE-Bench](../projects/swe-bench.md) evaluations). It operates through a cloud execution model: tasks are sent to a sandboxed container with internet access disabled, where the agent can read/write files, run tests, and execute shell commands.

Core mechanism:
- **Task submission:** Users describe tasks in natural language; the agent interprets them against the current repository state
- **Sandbox isolation:** Each task runs in a separate container preloaded with the repository, preventing cross-task interference
- **Parallel execution:** Multiple tasks can run simultaneously, unlike local agents that block on a single context
- **[AGENTS.md](../concepts/skill-md.md) format:** Repository-level instruction files teach the agent project conventions, test commands, and style requirements

The agent uses a [ReAct](../concepts/react.md)-style loop internally: read files, plan changes, execute code, verify with tests, iterate. The `codex-1` model is optimized for this loop specifically, with training that emphasizes running tests to verify changes rather than relying on static reasoning.

Cross-platform tooling like the Everything Claude Code collection treats Codex as a supported runtime, using `AGENTS.md` for instruction injection rather than hooks (the Codex runtime lacks hook execution support as of mid-2025). [Source](../raw/deep/repos/affaan-m-everything-claude-code.md)

## The Codex CLI

Separate from both products above: OpenAI released a local CLI tool also called "Codex" in 2025, positioning it as an open-source alternative to Claude Code's CLI. The CLI uses the same `codex-1` model via API but runs locally, similar in concept to [planning-with-files](../raw/deep/repos/othmanadi-planning-with-files.md) workflow patterns where persistent state lives on the filesystem.

The CLI supports an `AGENTS.md` file at the repository root for persistent instructions, analogous to Claude Code's `CLAUDE.md` ([claude.md](../concepts/claude-md.md)). Configuration includes approval policies: `suggest` (manual approval), `auto-edit` (auto-approve file edits), and `full-auto` (auto-approve everything including shell commands).

## Key Numbers

**Original model (2021):**
- HumanEval pass@1: ~28.8% (self-reported, widely replicated)
- HumanEval pass@100: ~72.3% (self-reported)
- Training data: 54M GitHub repositories, ~159GB of Python alone
- GitHub Copilot adoption: 1M+ developers within first year (GitHub-reported)

**2025 agent:**
- SWE-Bench Verified: OpenAI reported `codex-1` at ~72% (self-reported, as of May 2025 announcement)
- For context: Claude Sonnet 3.7 reported ~70.3% on the same benchmark (Anthropic-reported)
- Independent SWE-Bench results vary; the benchmark infrastructure is public but expensive to run at scale, so most reported numbers are self-reported

**Note on benchmark credibility:** SWE-Bench Verified scores above 50% are now common across frontier models and are all self-reported by model providers. The benchmark has known issues with test contamination and evaluator variance. Treat specific numbers as approximate comparisons rather than ground truth.

## Strengths

**Parallel cloud execution:** The 2025 agent's cloud-sandbox model lets teams run dozens of tasks simultaneously. For bulk operations (migrating an API, updating test suites, refactoring for a new dependency), parallelism compounds into meaningful time savings that local single-context agents cannot match.

**GitHub integration:** Native PR creation, branch management, and code review workflows. The agent can be triggered directly from GitHub issues, reducing context-switching for teams already in GitHub-centric workflows.

**Test-driven verification:** `codex-1`'s RL training emphasized running tests as a verification step, which produces measurably better results on tasks where the repository has comprehensive test coverage. The model will iteratively fix failing tests rather than generating plausible-looking code that it cannot verify.

**Model heritage:** The 2021 Codex model established the foundation for GitHub Copilot, which accumulated years of real-world usage data informing subsequent model iterations. This production feedback loop is a genuine differentiator from models trained primarily on static benchmarks.

## Critical Limitations

**Concrete failure mode:** Codex struggles with tasks requiring deep understanding of project-specific conventions that are not captured in `AGENTS.md`. When a repository has implicit architectural decisions (why certain modules are structured a particular way, historical reasons for technical debt), the agent generates code that is syntactically correct and passes tests but violates unstated conventions. Unlike [Claude Code](../projects/claude-code.md)'s `CLAUDE.md` ecosystem with its richer hook system and skill libraries, Codex's `AGENTS.md` is a flat instruction file with no lifecycle hooks or conditional logic.

**Unspoken infrastructure assumption:** Cloud sandbox execution requires trusting OpenAI with repository access. Enterprises with strict data residency requirements, air-gapped environments, or confidential codebases face a hard constraint: the 2025 Codex agent is cloud-only with no on-premises option. The CLI alternative sidesteps this for inference but still sends code to OpenAI's API.

## When NOT to Use It

**If your codebase is classified or regulated:** No self-hosted option. Financial services, defense contractors, and healthcare organizations with data handling restrictions should use locally-deployed models or local-execution agents ([Claude Code](../projects/claude-code.md) with Claude-on-prem, or open-source alternatives).

**If you need rich workflow automation:** Codex CLI lacks the hook system that competing tools built. The PreToolUse/PostToolUse/Stop hooks that enable automated quality gates, session persistence, and methodological guardrails (as described in the agentic research framework [Source](../raw/deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md)) are absent. For autonomous long-running research or complex multi-step workflows, Claude Code's hook ecosystem is more mature.

**If your task benefits from local file system as memory:** The [planning-with-files](../raw/deep/repos/othmanadi-planning-with-files.md) pattern and similar approaches that rely on persistent markdown files and lifecycle hooks to maintain state across long sessions do not translate directly to Codex's cloud execution model.

**If your team needs multi-LLM flexibility:** The Codex CLI is OpenAI-only. [LiteLLM](../projects/litellm.md)-based orchestration layers or frameworks like [LangGraph](../projects/langgraph.md) provide more vendor flexibility for teams hedging on model providers.

## Unresolved Questions

**Pricing at scale:** OpenAI has not published per-task pricing for the cloud Codex agent beyond initial API costs. Teams running hundreds of parallel tasks daily face unpredictable cost structures. The gateway pattern used by tools like CORAL ([Source](../raw/deep/repos/human-agent-society-coral.md)) for per-agent cost attribution doesn't translate cleanly to Codex's opaque cloud pricing.

**Context window behavior on large repositories:** The 2025 agent's handling of monorepos or repositories with millions of lines of code is not publicly documented. Whether it retrieves relevant context via [RAG](../concepts/rag.md), relies on the model's own file navigation, or uses both is unspecified. For the [agent memory](../concepts/agent-memory.md) implications, the distinction matters: a retrieval-based approach has different failure modes than pure model reasoning.

**Long-session state management:** The cloud sandbox exists for the duration of a single task. For extended autonomous operation (analogous to the 20+ hour sessions in the agentic research framework), how Codex maintains coherent state across task submissions is undocumented. This is a known limitation compared to local agents with explicit session persistence.

**Governance of training data from user submissions:** Whether code submitted to the cloud agent influences future model training is not clearly stated in current documentation. This matters for proprietary algorithms and competitive IP.

## Alternatives

**[Claude Code](../projects/claude-code.md):** Use when you need rich workflow automation (hooks, skills, agents), local execution with full filesystem access, or the broader skill ecosystem. Better for long autonomous sessions with complex state management.

**[Cursor](../projects/cursor.md):** Use when the primary workflow is IDE-integrated editing rather than autonomous task completion. Better for developers who want AI assistance inline with their normal editing flow.

**[Windsurf](../projects/windsurf.md):** Use when you want an IDE-native agentic experience with tighter editor integration than Cursor's model, particularly for developers preferring a distinct AI-first IDE.

**[GitHub Copilot](../projects/openai-codex.md):** For inline completions and chat within existing IDEs without switching tools, Copilot (which originally ran on the 2021 Codex model) remains the lowest-friction entry point for teams already in VS Code or JetBrains.

**[Gemini](../projects/gemini.md) with Gemini CLI:** Use when deep Google Workspace/Cloud integration matters, or for teams standardized on Google's tooling.

**Local CLI agents with open models:** For air-gapped environments or maximum data control, [Ollama](../projects/ollama.md) with a code-focused model (Qwen2.5-Coder, DeepSeek-Coder-V2) plus a local agent framework provides a self-hostable alternative with no data leaving the organization.

## Relationship to Broader Ecosystem

The 2021 Codex model's influence extends beyond its direct use. It established that code generation at scale follows the same scaling laws as language modeling, enabling GitHub Copilot's rapid adoption. This created the market and user expectations that the 2025 crop of coding agents now targets.

The [Agent Skills](../concepts/agent-skills.md) ecosystem's `AGENTS.md` support for Codex reflects the broader convergence on portable skill formats. The same SKILL.md files that work for Claude Code can be adapted for Codex, though with reduced functionality (no hooks, instruction-only format). The obsidian-skills pattern of encoding domain knowledge as structured markdown for agent consumption [Source](../raw/deep/repos/kepano-obsidian-skills.md) applies to Codex's `AGENTS.md` just as it does to `CLAUDE.md`.

[RAG](../concepts/rag.md) and [knowledge base](../concepts/knowledge-base.md) integration for code generation remains an open area: the 2025 Codex agent's approach to retrieving relevant context from large repositories is not publicly detailed, leaving teams to infer behavior from empirical testing.
