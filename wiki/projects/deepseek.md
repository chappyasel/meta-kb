---
entity_id: deepseek
type: project
bucket: agent-systems
abstract: >-
  DeepSeek is a Chinese AI lab (founded 2023) producing open-weight LLMs
  including DeepSeek-R1, which matches GPT-4-class reasoning at a fraction of
  training cost using GRPO-based RL.
sources:
  - repos/modelscope-agentevolver.md
  - repos/evoagentx-evoagentx.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
related:
  - openai
last_compiled: '2026-04-07T11:55:14.557Z'
---
# DeepSeek

## What It Is

DeepSeek is a Chinese AI research company founded in 2023 by High-Flyer, a quantitative hedge fund. It produces open-weight large language models with a specific focus on cost-efficient training and strong reasoning. The company attracted global attention in early 2025 when DeepSeek-R1 demonstrated reasoning performance competitive with OpenAI's o1 while reportedly costing under $6M to train — a figure that, if accurate, fundamentally challenged assumptions about the capital requirements for frontier AI.

DeepSeek releases model weights openly (under licenses that permit research and commercial use with some restrictions) and publishes detailed technical reports. This combination of frontier-competitive performance, open weights, and transparent methodology makes it the most significant non-Western player in the LLM space relevant to agent builders.

## Model Lineup

**DeepSeek-V3** (December 2024): A 671B Mixture-of-Experts model with 37B active parameters per forward pass. Uses Multi-head Latent Attention (MLA) to compress KV cache and an auxiliary-loss-free load balancing strategy. Training cost reported as approximately $5.5M on H800 GPUs. Competitive with GPT-4o and Claude 3.5 Sonnet on coding and math benchmarks. Self-reported benchmarks; independent evaluations on LMSys Chatbot Arena corroborate competitive positioning, though exact parity claims require caution.

**DeepSeek-R1** (January 2025): A reasoning model trained via [Reinforcement Learning](../concepts/reinforcement-learning.md) using [GRPO](../concepts/grpo.md) (Group Relative Policy Optimization) rather than PPO. The key architectural claim: reasoning capability emerged primarily from RL with verifiable rewards (math correctness, code execution), without requiring supervised fine-tuning on human-labeled chain-of-thought data. DeepSeek-R1-Zero (the pure-RL variant, no SFT) spontaneously developed self-verification and extended [Chain-of-Thought](../concepts/chain-of-thought.md) reasoning. R1 adds a cold-start SFT phase before RL to improve readability. Performance on AIME 2024: 79.8% (pass@1), matching OpenAI o1-1217 at 79.2%. These are self-reported; AIME is a public benchmark so independent replication is straightforward.

**DeepSeek-R1 Distilled Models**: Smaller models (1.5B, 7B, 8B, 14B, 32B, 70B) fine-tuned from Qwen2.5 and Llama-3 base models on R1's reasoning traces. The 32B distilled model reportedly outperforms OpenAI's o1-mini. These are the practically deployable versions for most agent use cases.

**DeepSeek-V2** (May 2024): Earlier MoE model that introduced MLA and DeepSeekMoE architecture. Primarily historically significant as the precursor establishing the efficiency techniques V3 built on.

## Architectural Innovations

**Multi-head Latent Attention (MLA)**: Compresses the KV cache by projecting keys and values into a low-dimensional latent space. Reduces KV cache memory by ~93% compared to standard MHA while maintaining comparable performance. Critical for inference efficiency and longer context handling.

**DeepSeekMoE**: Fine-grained expert segmentation with shared experts. V3 uses 256 routed experts with top-8 routing, plus 1 shared expert always active. The auxiliary-loss-free load balancing uses a bias term per expert updated based on routing frequency, avoiding the accuracy penalty of traditional auxiliary losses.

**GRPO for Reasoning**: Instead of PPO (which requires a separate value model), GRPO estimates baselines from group sampling. For a given problem, sample G responses, score each with a verifiable reward function (correct/incorrect for math), use the group mean as baseline for advantage estimation. Eliminates the value model entirely, reducing memory and compute. See [GRPO](../concepts/grpo.md) for the full mechanism.

**FP8 Training**: V3 trained with FP8 mixed precision, a technical contribution the paper documents in detail. Custom CUDA kernels handle the precision loss at scale.

## Relevance to Agent and Knowledge Base Systems

DeepSeek models are integrated as the underlying LLM in numerous agent frameworks. Several source documents mention DeepSeek as a supported provider:

- **SICA** (self-improving coding agent): Lists DeepSeek in `src/llm/` multi-provider abstraction alongside Anthropic, OpenAI, Google, and Fireworks. Used for cross-model self-improvement experiments.
- **EvoAgentX**: Supports DeepSeek through [LiteLLM](../projects/litellm.md) integration, explicitly named alongside Claude and Kimi models.
- **AgentEvolver**: Reinforcement learning training framework; architecture compatible with DeepSeek models, particularly relevant given shared GRPO methodology.

For knowledge base builders, DeepSeek-R1's strong reasoning makes it particularly suited for [Chain-of-Thought](../concepts/chain-of-thought.md) decomposition, multi-hop retrieval synthesis, and [Agentic RAG](../concepts/agentic-rag.md) pipelines that require the model to reason about retrieved evidence before answering.

## Key Numbers

| Model | Parameters | Active Params | Training Cost | AIME 2024 | MATH-500 | SWE-bench Verified |
|-------|-----------|---------------|---------------|-----------|----------|-------------------|
| DeepSeek-V3 | 671B | 37B | ~$5.5M (self-reported) | 39.2% | 90.2% | 42.0% |
| DeepSeek-R1 | 671B | 37B | Not disclosed separately | 79.8% | 97.3% | 49.2% |
| R1-Distill-32B | 32B | 32B (dense) | Minimal (distillation) | 72.6% | 94.3% | — |
| R1-Distill-7B | 7B | 7B (dense) | Minimal | 55.5% | 92.8% | — |

**Credibility note**: Training cost figures are self-reported and have not been independently verified. The $5.5M figure for V3 attracted significant skepticism; critics note it excludes pre-training runs, ablation experiments, and infrastructure costs. Benchmark numbers for AIME and MATH are on public datasets and have been independently reproduced. SWE-bench Verified figures are from the official leaderboard, which uses independent evaluation infrastructure.

## Strengths

**Reasoning at open-weight**: R1 is the only openly available model competitive with proprietary reasoning models (o1, o3) on hard math and code. For agent systems that need strong reasoning without API dependency or cost, this is the primary value proposition.

**Distilled models punch above their weight**: R1-Distill-7B outperforms many models twice its size on reasoning tasks. This matters for local deployment via [Ollama](../projects/ollama.md) or [vLLM](../projects/vllm.md) in agent pipelines where latency and cost per call dominate.

**Transparent methodology**: DeepSeek publishes detailed technical reports (not just model cards). The GRPO paper explains training methodology in sufficient detail for reproduction. Anthropic, Google, and OpenAI do not publish comparable training details for their frontier models.

**Cost efficiency at inference**: MLA's KV cache compression reduces inference memory by roughly 10x compared to equivalent dense models. For long-context agent workflows (extended [Chain-of-Thought](../concepts/chain-of-thought.md), large [Context Window](../concepts/context-window.md) operations), this directly reduces serving cost.

## Critical Limitations

**Concrete failure mode — instruction following degrades under long reasoning**: R1's extended thinking mode generates very long internal CoT chains. When the CoT is long and the final answer instruction is at the end, instruction following reliability drops compared to non-reasoning models. System prompts that work reliably with GPT-4o or Claude need adjustment for R1; structured output requirements in particular cause failures at higher rates.

**Unspoken infrastructure assumption**: The open weights assume you have the infrastructure to serve them. R1 full (671B MoE) requires at minimum 4×A100-80GB for inference at reasonable throughput, or 8×H100s for comfortable deployment. The distilled models are more accessible, but the headline performance numbers are for the full model. Most teams using "DeepSeek" in production are actually using the API, which reintroduces the availability and cost concerns that open weights were supposed to solve.

**Geopolitical and compliance risk**: DeepSeek is a Chinese company subject to Chinese law. Enterprise customers in regulated industries (finance, defense, healthcare) face compliance questions about data sent to DeepSeek's API. The open weights partially mitigate this (self-hosting avoids data leaving your infrastructure), but the weights themselves are subject to export control questions that remain unresolved. The DeepSeek app was banned in several countries' government contexts shortly after launch.

**Censorship on sensitive topics**: R1 and V3 decline to discuss topics the Chinese government classifies as sensitive (Tiananmen, Taiwan, Xinjiang). For most technical agent use cases this is irrelevant, but for knowledge base systems that need to handle broad domains this is a hard constraint.

## When NOT to Use It

**You need guaranteed uptime with an SLA**: DeepSeek's API experienced repeated outages during the January 2025 launch period. For production agent systems, use [OpenRouter](../projects/openrouter.md) as a fallback router or route to [OpenAI](../projects/openai.md) / [Anthropic](../projects/anthropic.md) for reliability requirements.

**Your workload involves structured output at scale**: JSON mode and function calling reliability with R1 is lower than with GPT-4o or Claude 3.5 Sonnet. If your agent pipeline depends on reliable structured outputs (tool calls, schema-constrained responses), R1's tendency to reason extensively before outputting structure causes parse failures.

**You're in a compliance-sensitive environment**: Any regulated data that cannot leave your jurisdiction should not go to DeepSeek's API. Self-hosting the distilled models is viable but requires non-trivial GPU infrastructure.

**Your task doesn't require reasoning**: R1 adds inference latency from the thinking tokens. For straightforward retrieval-augmented generation, summarization, or extraction tasks, V3 or even smaller models will be faster and cheaper with comparable quality.

## Unresolved Questions

**Actual training cost**: The $5.5M figure for V3 has not been audited. High-Flyer's GPU cluster costs, prior failed training runs, research infrastructure, and team salaries are all excluded from the published number. The figure is better understood as "compute cost for the final training run" than "cost to build DeepSeek-V3."

**RL recipe generalizability**: The R1 paper shows GRPO with verifiable rewards works for math and code. The distilled models extend this to language tasks via supervised learning from R1's outputs. Whether pure RL (without distillation) generalizes to open-ended reasoning tasks without verifiable rewards remains an open research question.

**Long-term open weight commitment**: DeepSeek has released weights openly so far, but there is no contractual commitment to continue doing so. [OpenAI](../projects/openai.md) made similar open commitments early in its history. Dependency on DeepSeek's open-weight releases for production systems carries governance risk.

**Model safety**: DeepSeek's safety evaluation methodology is not published in comparable detail to Anthropic's or OpenAI's. Red-teaming results are self-reported. Independent safety evaluations have found R1 more susceptible to jailbreaks than Claude 3.5 or GPT-4o.

## Alternatives with Selection Guidance

**Use [OpenAI](../projects/openai.md) GPT-4o** when you need reliable structured outputs, function calling, and production SLAs. Higher cost, better reliability.

**Use [Anthropic](../projects/anthropic.md) Claude 3.5/3.7 Sonnet** when you need strong instruction following and safety properties in a non-reasoning context, or when extended thinking with better instruction compliance matters.

**Use DeepSeek-R1 (API)** when reasoning quality is the primary concern, cost matters, and you can tolerate occasional availability issues or structured output failures.

**Use DeepSeek-R1-Distill-32B (self-hosted via [vLLM](../projects/vllm.md))** when you need reasoning capability, have GPU infrastructure, need data sovereignty, and can accept lower throughput than the full model.

**Use DeepSeek-R1-Distill-7B (via [Ollama](../projects/ollama.md))** for local development, offline agent prototyping, or cost-sensitive production with modest reasoning requirements.

## Related

- [GRPO](../concepts/grpo.md) — The training algorithm central to R1's reasoning capability
- [Chain-of-Thought](../concepts/chain-of-thought.md) — The reasoning pattern R1 extends via RL
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — Training paradigm for R1
- [vLLM](../projects/vllm.md) — Primary serving framework for self-hosted DeepSeek
- [Ollama](../projects/ollama.md) — Local deployment of distilled variants
- [LiteLLM](../projects/litellm.md) — Unified API access including DeepSeek
- [OpenRouter](../projects/openrouter.md) — Routing layer for DeepSeek with fallback
- [OpenAI](../projects/openai.md) — Primary competitive reference point
