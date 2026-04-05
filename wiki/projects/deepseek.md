---
entity_id: deepseek
type: project
bucket: agent-systems
abstract: >-
  DeepSeek is a Chinese AI lab's family of open-weight LLMs (V3, R1, Coder
  series) notable for strong reasoning/coding at low training cost, widely used
  as a backbone in agent frameworks and coding tools.
sources:
  - repos/evoagentx-evoagentx.md
  - repos/maximerobeyns-self-improving-coding-agent.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
related:
  - OpenAI
  - Google Gemini
last_compiled: '2026-04-05T20:35:43.890Z'
---
# DeepSeek

## What It Is

DeepSeek is a family of large language models developed by DeepSeek AI, a Chinese research lab. The model family spans general-purpose chat models (DeepSeek-V3), reasoning-specialized models (DeepSeek-R1), and coding-focused variants (DeepSeek-Coder series). The models are released with open weights under licenses permitting commercial use, distinguishing them from fully closed competitors.

The R1 series uses chain-of-thought reasoning with explicit "thinking" tokens, making the reasoning process visible before a final answer. V3 uses a mixture-of-experts (MoE) architecture, activating only a subset of parameters per forward pass to keep inference costs lower than dense models of equivalent parameter count.

DeepSeek attracted significant attention in early 2025 when DeepSeek-R1 matched or approached frontier reasoning benchmarks at a fraction of the reported training cost of comparable US models. That cost figure (widely cited as ~$6M) is self-reported and unverified by independent auditors.

## Architecture and Key Variants

**DeepSeek-V3**: 671B total parameters, ~37B activated per token via MoE routing. Trained on 14.8T tokens. Outperforms prior open-weight models on coding and math benchmarks. Uses Multi-head Latent Attention (MLA) to reduce KV cache memory during inference.

**DeepSeek-R1**: A reasoning model trained with reinforcement learning (GRPO, not PPO) rather than supervised fine-tuning on chain-of-thought data. Produces extended reasoning traces before answering. Competitive with OpenAI o1 on AIME 2024 and MATH benchmarks. R1-Zero (trained with pure RL, no SFT cold start) showed emergent reasoning behaviors, though its outputs were verbose and inconsistent without the SFT warm-up that R1 uses.

**DeepSeek-Coder / Coder-V2**: Variants fine-tuned specifically on code. Coder-V2 is a 236B MoE model with 21B active parameters, strong on HumanEval and LiveCodeBench. Used as a backend in several agent frameworks including the SICA self-improving coding agent ([Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md)) and EvoAgentX ([Source](../raw/repos/evoagentx-evoagentx.md)).

**DeepSeek-R1-Distill series**: Smaller dense models (1.5B, 7B, 8B, 14B, 32B, 70B) distilled from R1's reasoning traces. The 7B and 14B distills perform competitively with much larger models on math tasks. These are the most commonly deployed variants in resource-constrained settings.

## Role in Agent Systems

DeepSeek models appear as interchangeable LLM backends in multi-agent frameworks. In SICA, the `src/llm/` module supports DeepSeek direct inference (V3, R1) via `DEEPSEEK_API_KEY`, as well as DeepSeek models hosted on Fireworks AI via `FIREWORKS_AI_API_KEY`. EvoAgentX integrates DeepSeek through LiteLLM, SiliconFlow, and OpenRouter adapter paths.

This plug-in positioning reflects DeepSeek's practical role: not a framework or orchestration layer, but a model that agent builders swap in for cost or capability reasons. The V3 and R1 models are particularly common choices when teams want near-frontier reasoning without OpenAI pricing.

## Key Numbers

| Metric | Value | Source Credibility |
|---|---|---|
| DeepSeek-R1 AIME 2024 | 79.8% pass@1 | Self-reported; matches independent community evals |
| DeepSeek-R1 MATH-500 | 97.3% | Self-reported |
| DeepSeek-V3 training cost | ~$5.6M | Self-reported; no third-party audit |
| DeepSeek-V3 training tokens | 14.8T | Self-reported |
| R1 vs o1 on Codeforces | 96.3 vs 96.6 percentile | Self-reported; close enough that noise dominates |

Independent evaluations on LMSYS Chatbot Arena and community benchmarks broadly confirm the ranking claims, though exact numbers vary. The training cost figure has not been independently verified and excludes infrastructure amortization.

## Strengths

**Reasoning tasks with visible chain-of-thought**: R1's explicit thinking tokens let users inspect and validate reasoning steps, which matters in agent pipelines that need to catch errors mid-chain.

**Cost efficiency at inference**: MoE architecture means V3 costs less per token than dense models of comparable quality. Providers like Fireworks, Together, and DeepSeek's own API offer V3/R1 at significantly lower rates than GPT-4o or Claude 3.5 Sonnet.

**Open weights**: Teams can self-host, fine-tune, or inspect weights. This matters for compliance, latency control, and avoiding vendor lock-in.

**Strong coding performance**: Coder-V2 and V3 both score well on HumanEval, SWE-Bench, and LiveCodeBench. In SICA's benchmark suite, DeepSeek appears alongside Claude and GPT-4o as a viable backbone for the coding agent.

## Critical Limitations

**Censorship on politically sensitive topics**: DeepSeek models trained on the standard Chinese data pipeline refuse or deflect questions about Tiananmen Square, Taiwan sovereignty, and related topics. This is a hard constraint in the base models and cannot be prompt-engineered away without fine-tuning on open weights.

**Infrastructure assumption**: Using DeepSeek's own API requires routing traffic through servers in China, which creates data residency concerns for regulated industries. Self-hosting V3 (671B) requires multi-node GPU infrastructure that most teams lack. The practical assumption for most users is that they route through third-party providers (Fireworks, Together, OpenRouter), adding a dependency layer.

## When NOT to Use It

**Regulated industries with data residency requirements**: If data cannot leave a specific jurisdiction, DeepSeek's API is off-limits and self-hosting V3 requires substantial infrastructure.

**Applications requiring content neutrality on geopolitical topics**: The censorship baked into base models makes them unsuitable for journalism tools, political research applications, or any product where topic refusal would be a defect.

**Latency-sensitive production workloads needing SLAs**: DeepSeek's own API has had availability issues during high-demand periods. Third-party provider SLAs vary. For guaranteed uptime, Claude or GPT-4o through their native APIs are more reliable.

**Tasks requiring the absolute frontier**: On non-coding, non-math reasoning tasks, GPT-4o and Claude 3.5/3.7 Sonnet still show consistent edges. DeepSeek R1 is competitive on structured tasks but can be inconsistent on open-ended complex reasoning.

## Unresolved Questions

**Actual training cost breakdown**: The $5.6M figure excludes prior research compute, infrastructure amortization, and failed runs. No methodology for that estimate has been published.

**Weight licensing edge cases**: The DeepSeek model license permits commercial use but restricts training other models using DeepSeek outputs as labels. Exactly how this interacts with distillation or RLHF on DeepSeek-generated data is ambiguous.

**Governance and model updates**: DeepSeek does not publish a model card changelog or deprecation schedule. API versions can change without notice.

**Reasoning trace length control**: R1's thinking tokens can run very long (thousands of tokens) on complex problems, inflating costs in agent loops that call the model many times. There is no reliable mechanism to cap thinking length without affecting answer quality.

## Alternatives

**OpenAI o3/o4-mini**: Use when you need the strongest available reasoning and cost is secondary. Independently validated on competition math. No open weights.

**Claude 3.5/3.7 Sonnet (Anthropic)**: Use when you need strong instruction-following, long context, and reliable API availability. Better on open-ended tasks. No open weights.

**Qwen2.5 / QwQ**: Use when you need open weights with strong multilingual support and want to avoid DeepSeek's content restrictions. QwQ-32B is competitive with R1 on math reasoning at a smaller parameter count.

**Llama 3.3 70B**: Use when you need open weights that are fully self-hostable on accessible hardware (single A100 node) and don't need frontier reasoning.

**DeepSeek-R1-Distill-14B or 32B**: Use when you need R1-class reasoning on hardware you control and can tolerate some quality degradation versus the full model.

## Related Concepts and Projects

- [Self-Improving Coding Agent (SICA)](../projects/maximerobeyns-self-improving-coding-agent.md): Uses DeepSeek V3/R1 as one of several swappable LLM backends
- [EvoAgentX](../projects/evoagentx-evoagentx.md): Integrates DeepSeek through LiteLLM/SiliconFlow/OpenRouter
- [OpenAI](../projects/openai.md): Primary reasoning benchmark competitor
- [Google Gemini](../projects/google-gemini.md): Competes on coding and multimodal tasks
