---
entity_id: ai-research-skills
type: project
bucket: agent-systems
sources:
  - repos/orchestra-research-ai-research-skills.md
related:
  - Agent Skills
  - Research Orchestration
last_compiled: '2026-04-04T21:23:28.371Z'
---
# AI Research Skills

## What It Is

AI Research Skills is an open-source library of packaged capabilities designed to give AI agents (Claude Code, Codex, Gemini, GPT-4/5, etc.) the domain-specific knowledge needed to conduct end-to-end AI research workflows. The goal is to move agents beyond generic retrieval patterns toward structured, expert-like research execution—covering the full arc from idea generation through experimentation to paper writing.

Maintained by Orchestra Research. MIT licensed.

## Key Numbers

| Metric | Value |
|--------|-------|
| GitHub Stars | 6,111 |
| Forks | 474 |
| Skills in library | 87 (production-ready) |
| Primary language | TeX |
| Last updated | April 2026 |

## What's Unique

Most LLM-based research tooling defaults to generic RAG over papers. This library takes a different approach: pre-packaging domain-specific expertise as discrete, reusable "skills" that an agent can invoke at the appropriate stage of a research workflow. The framing is less "search engine with LLM wrapper" and more "give the agent the same mental models a domain expert would apply."

Coverage spans practical AI engineering topics including GRPO, vLLM, Megatron, HuggingFace workflows, and model training pipelines—suggesting focus on ML research specifically rather than general scientific literature.

## Architecture Summary

Skills are defined in TeX (likely as structured prompt templates or knowledge documents), which agents consume as context or instructions. The library is model-agnostic by design—the same skill set is advertised for Claude Code, Codex, and Gemini. Integration with [Research Orchestration](../concepts/research-orchestration.md) systems allows skills to be selected and composed dynamically based on the current research subtask.

This implements the [Agent Skills](../concepts/agent-skills.md) pattern: discrete capability units that augment general-purpose agents with specialized knowledge without full fine-tuning.

## Strengths

- Broad coverage of modern ML engineering topics (vLLM, Megatron, GRPO)
- Model-agnostic design reduces vendor lock-in
- MIT license enables commercial use and modification
- Addresses a real gap: most agent frameworks are tool-heavy but knowledge-light

## Limitations

- **TeX as a format** is unusual and may create friction for programmatic integration; unclear how skills are actually loaded at runtime
- **6K stars is modest** for a library claiming comprehensive coverage—adoption signals are limited
- **ML/AI research focus** is narrow; not a general research agent solution
- **Autonomy claims** ("from idea to paper") are ambitious and largely unvalidated in published benchmarks
- Maintenance is tied to a single organization (Orchestra Research), raising long-term sustainability questions
- No published evals comparing skill-augmented agents against baselines

## Alternatives

- [OpenScholar](https://openreview.net/forum?id=openScholar) — retrieval-augmented scientific QA with citation grounding
- Elicit — commercial research synthesis tool
- ResearchAgent (various academic implementations) — agent frameworks for paper analysis
- Direct tool-use with Semantic Scholar / Arxiv APIs without prepackaged skills

## Honest Take

The core insight—that domain knowledge fragmentation is a real problem for research agents—is sound. Whether packaging that knowledge as 87 TeX skill files is the right mechanism is less clear. The library's value depends heavily on how skills are actually consumed at runtime, which the available documentation doesn't make transparent.

[Source](../../raw/repos/orchestra-research-ai-research-skills.md)


## Related

- [Agent Skills](../concepts/agent-skills.md) — implements (0.7)
- [Research Orchestration](../concepts/research-orchestration.md) — implements (0.7)
