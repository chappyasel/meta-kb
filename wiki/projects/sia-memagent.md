# SIA-MemAgent

> An RL-optimized long-context processing framework from ByteDance/Tsinghua that achieves near-lossless extrapolation to 3.5M tokens by treating long-context processing as a multi-turn workflow problem, trained end-to-end with reinforcement learning from verifiable rewards.

## What It Does

MemAgent (from ByteDance/Tsinghua SIA lab) processes arbitrarily long inputs within fixed context windows by breaking the task into a multi-turn agent workflow. Rather than modifying the underlying model architecture, the system wraps an existing LLM with a memory agent that reads through long documents in chunks, maintains running memory of important information, and answers questions by synthesizing across all chunks. The agent is trained end-to-end with RL (extending the DAPO algorithm for multi-turn context-independent conversations) to learn when to store, update, or discard information from its working memory.

## Architecture

- **Multi-turn conversation framework**: Long documents are split into segments; the agent processes each segment as a separate "conversation turn," maintaining a memory notepad across turns
- **RL training**: Reinforcement Learning from Verifiable Rewards (RLVR), extending DAPO to support end-to-end optimization of agent workflows with multi-turn context-independent conversations
- **Linear time complexity**: Resources scale linearly with text length, breaking the quadratic attention bottleneck
- **Released models**: RL-MemAgent-14B and RL-MemAgent-7B, deployable via vLLM or online LLM services
- **Training context**: Trained on 8K context with 32K text, extrapolates to 3.5M tokens

## Key Numbers

- 975 GitHub stars, 68 forks
- Python, Apache 2.0 license
- **14B model**: <5.5% performance degradation on 3.5M token tasks (near-lossless extrapolation)
- **7B model**: 11% decline at longest contexts
- **95%+ accuracy** on 512K RULER test
- Paper: arxiv 2507.02259

## Strengths

- The multi-turn workflow approach means any existing LLM can be retrofitted with long-context capabilities without retraining base model weights, making it highly practical for production deployment
- Near-lossless performance at 3.5M tokens (3.5x typical context windows) is a breakthrough result, and the linear time complexity makes it computationally feasible

## Limitations

- The multi-turn processing adds latency compared to native long-context models, as each chunk requires a separate inference pass through the agent
- Performance is tied to the quality of the agent's learned memory management strategy -- if the agent fails to store critical information from an early chunk, it cannot recover

## Alternatives

- [mem-alpha.md](mem-alpha.md) -- use when you want RL-learned memory construction focused on memory type selection (episodic/semantic/core) rather than long-context extrapolation
- [mem-agent.md](mem-agent.md) -- use when you want a smaller trained memory agent (4B) with a markdown-based memory scaffold for conversational contexts
- [general-agentic-memory.md](general-agentic-memory.md) -- use when you need hierarchical memory for agent trajectories without RL training

## Sources

- [bytedtsinghua-sia-memagent.md](../../raw/repos/bytedtsinghua-sia-memagent.md) -- "MemAgent... directly optimizes long-context tasks through end-to-end Reinforcement Learning without altering the underlying model architecture... extrapolate from 8K context trained on 32K text to a 3.5M QA task with performance loss < 5%"
