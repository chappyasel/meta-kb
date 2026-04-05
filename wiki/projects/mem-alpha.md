# Mem-alpha

> An RL framework that trains LLM agents to learn optimal memory construction strategies through reinforcement learning rather than fixed memory patterns, enabling dynamic decisions about when to encode information into episodic, semantic, or core memory.

## What It Does

Mem-alpha (styled "Mem-a") trains agents to effectively manage complex memory systems through interaction and feedback. Instead of prescribing fixed rules for what goes into which memory tier, the agent learns through RL to dynamically decide when to encode information into episodic memory, semantic memory, or core memory based on task feedback. The system trains on 30K-token contexts but generalizes to 400K+ tokens (13x the training length), demonstrating that learned memory strategies transfer across scale. Released model weights (Memalpha-4B on HuggingFace), training code, and evaluation datasets make the approach reproducible.

## Architecture

- **Memory system**: Three-tier architecture with core, episodic, and semantic memory components, managed through a memory server
- **Training**: RL framework using GRPO with compression reward (beta=0.05) and content reward (gamma=0.1) to optimize memory construction
- **Evaluation**: Benchmarked against MemoryAgentBench and custom Memalpha datasets, compared to long-context baselines, RAG baselines, MemAgent, and MEM1
- **Base model**: Qwen3-4B, trained with the Memalpha training pipeline

The training loop involves the agent interacting with a memory server, constructing memories from conversations, then being evaluated on downstream question-answering tasks that test how well the memory was constructed.

## Key Numbers

- 193 GitHub stars, 17 forks
- Python, Apache 2.0 license (inferred from HuggingFace model card)
- Trained on 30K tokens, generalizes to **400K+ tokens** (13x training length)
- Model weights: Memalpha-4B on HuggingFace
- Paper: arxiv 2509.25911

## Strengths

- The RL-learned memory construction approach is genuinely novel -- rather than hand-designing memory rules, the agent discovers optimal strategies through training, which can adapt to different task distributions
- Strong generalization from 30K to 400K+ tokens suggests the learned memory strategies capture transferable principles rather than overfitting to specific context lengths

## Limitations

- Requires significant compute for RL training (4-node training scripts suggest multi-GPU requirements), making it less accessible than rule-based memory systems
- The 4B parameter model may not be sufficient for complex memory reasoning in production settings, though it serves as a proof of concept for the RL-trained approach

## Alternatives

- [sia-memagent.md](sia-memagent.md) -- use when you need RL-optimized long-context processing at larger scale (7B/14B) with extrapolation to 3.5M tokens
- [mem-agent.md](mem-agent.md) -- use when you want a smaller RL-trained memory agent with an Obsidian-inspired markdown scaffold
- [nemori.md](nemori.md) -- use when you want episodic memory without RL training overhead, using event segmentation theory instead

## Sources

- [wangyu-ustc-mem-alpha.md](../../raw/repos/wangyu-ustc-mem-alpha.md) -- "Mem-a: Learning Memory Construction via Reinforcement Learning... Trained on 30k tokens, generalizes to 400k+ tokens (13x training length)"
