# AI Research Skills

> 87 production-ready skills enabling AI agents to autonomously conduct AI research from idea to paper, covering the full ML lifecycle across 22 categories. Key differentiator: deep framework-specific expertise (Megatron, vLLM, TRL) rather than generic instructions.

## What It Does

AI Research Skills provides a comprehensive skills library organized into 22 categories spanning the entire AI research lifecycle. An autoresearch orchestration skill manages the full workflow using a two-loop architecture (inner optimization + outer synthesis), routing to domain skills as needed. Categories include model architecture (LitGPT, Mamba, NanoGPT, RWKV, TorchTitan), fine-tuning (Axolotl, LLaMA-Factory, PEFT, Unsloth), post-training (TRL, GRPO, OpenRLHF, SimPO, verl), distributed training (DeepSpeed, FSDP, Megatron-Core), inference (vLLM, TensorRT-LLM, llama.cpp, SGLang), mechanistic interpretability (TransformerLens, SAELens), and paper writing with LaTeX templates. Each skill contains real code examples, troubleshooting guides, and production workflows sourced from official repos and battle-tested patterns.

## Architecture

Skills follow the SKILL.md convention: structured markdown files with frontmatter, code examples, and reference documents. An npm-based interactive installer (`npx @orchestra-research/ai-research-skills`) auto-detects installed coding agents, installs skills to `~/.orchestra/skills/` with symlinks, and offers category-based or individual skill selection. Also available through the Claude Code plugin marketplace. Skills range from 75 to 726 lines with 1-12 reference files each. The autoresearch skill supports Claude Code `/loop` and OpenClaw heartbeat for continuous operation.

## Key Numbers

- 6,111 GitHub stars, 474 forks
- 87 skills across 22 categories
- Skill sizes range from 75 to 726 lines
- Coverage: 5 model architectures, 4 fine-tuning frameworks, 8 post-training methods, 6 distributed training tools, 4 inference engines, 7 multimodal tools
- MIT license

## Strengths

- Framework-specific depth is genuine; skills contain real debugging patterns from GitHub issues, not just API docs
- The autoresearch orchestration layer enables end-to-end autonomous research workflows
- Research-grade coverage of mechanistic interpretability tools (TransformerLens, SAELens, pyvene, nnsight) is rare in skill libraries

## Limitations

- Exclusively focused on AI/ML research; no coverage of application development, DevOps, or business domains
- Skills are static documents that do not update when upstream frameworks release new versions
- The two-loop autoresearch architecture is described but not implemented as executable code

## Alternatives

- [claude-skills.md](claude-skills.md) — use when the domain is engineering, product, or business rather than ML research
- [gepa.md](gepa.md) — use when you want to automatically optimize prompts and agent architectures rather than follow manual skill instructions
- [adas.md](adas.md) — use when the goal is discovering novel agent designs through meta-search

## Sources

- [../../raw/repos/orchestra-research-ai-research-skills.md](../../raw/repos/orchestra-research-ai-research-skills.md) — "the most comprehensive open-source skills library enabling AI agents to autonomously conduct AI research — from idea to paper"
