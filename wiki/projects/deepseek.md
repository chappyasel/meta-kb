---
entity_id: deepseek
type: project
bucket: agent-systems
sources:
  - repos/infiniflow-ragflow.md
  - repos/yusufkaraaslan-skill-seekers.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/repos/mem0ai-mem0.md
related:
  - OpenAI
last_compiled: '2026-04-05T05:36:38.755Z'
---
# DeepSeek

## What It Is

DeepSeek is a Chinese AI research lab (founded 2023, headquartered in Hangzhou) and the family of open-weight language models it releases publicly. The company is backed by the quantitative hedge fund High-Flyer Capital Management and operates with a research-first mandate. Its models span general chat, coding, and reasoning, and have drawn sustained attention for delivering benchmark performance competitive with closed models from OpenAI and Anthropic at a fraction of the reported training cost.

The January 2025 release of DeepSeek-R1 triggered significant market reaction, contributing to a roughly $600B single-day drop in Nvidia's market capitalization, because it demonstrated strong reasoning capabilities reportedly trained for under $6M in compute — a claim that challenged assumptions about the capital requirements for frontier AI.

## Model Family

**DeepSeek-V3** (December 2024) — A 671B parameter Mixture-of-Experts model with 37B active parameters per forward pass. Uses Multi-Head Latent Attention (MLA) to compress the KV cache and an auxiliary-loss-free load balancing strategy for MoE routing. Context window: 128K tokens. The MLA mechanism is architecturally notable: rather than caching full key-value heads, it caches a low-rank compressed latent representation, substantially cutting memory bandwidth requirements during inference.

**DeepSeek-R1** (January 2025) — A reasoning model trained using large-scale reinforcement learning (specifically GRPO, Group Relative Policy Optimization) without supervised fine-tuning in the initial RL phase. The training recipe: start from a base model, apply RL with verifiable reward signals (correctness on math/code, format compliance), then distill reasoning chains into smaller models. The approach produces chain-of-thought reasoning without requiring human-annotated reasoning traces, which is what made it cheap to train relative to o1-style models. Six distilled variants were released simultaneously, ranging from 1.5B to 70B parameters, built on Qwen and Llama architectures.

**DeepSeek-Coder-V2** — A coding-specialized MoE variant (236B total, 21B active) that benchmarked competitively with GPT-4o on HumanEval and LiveCodeBench at release. Supports 338 programming languages per the technical report.

**DeepSeek-V2** (May 2024) — Introduced MLA and the DeepSeekMoE architecture publicly. 236B parameters, 21B active. This was the technical paper that established the architectural ideas V3 later scaled.

## Architecture: What's Genuinely Different

**Multi-Head Latent Attention (MLA):** Standard multi-head attention caches K and V matrices for each head at each layer, scaling linearly with sequence length and number of heads. MLA instead projects down to a low-rank latent vector per token and recovers approximate K/V during decoding. The technical report claims roughly 93% KV cache reduction versus standard MHA. The tradeoff is slightly more compute per token during decoding in exchange for dramatically reduced memory bandwidth pressure — meaningful for long-context inference at scale.

**Auxiliary-Loss-Free MoE Load Balancing:** Earlier MoE models (including DeepSeek-V2) penalized unbalanced expert routing through auxiliary losses added to the training objective. These losses create tension with the primary language modeling objective. DeepSeek-V3 replaces this with a bias-based routing mechanism: each expert maintains a per-token routing bias that adjusts dynamically to steer load toward underutilized experts without touching the gradient signal from the primary loss. The claimed result is better model quality at equivalent compute budgets.

**RL-Driven Reasoning (R1):** The R1 training paper is the main methodological contribution. GRPO works by sampling multiple completions per prompt, scoring them against a reward model or verifiable ground truth, and updating the policy using the relative ranking of completions within each group — avoiding the need for a separate value network. The paper shows that base models subjected to RL with only format and correctness rewards spontaneously develop extended chain-of-thought reasoning, including self-verification behaviors. The distilled versions (R1-Distill-Qwen-7B, etc.) bake these reasoning patterns into smaller models via standard supervised fine-tuning on R1's outputs.

## Key Numbers

| Model | Parameters (Total/Active) | Context | Notable Benchmark |
|---|---|---|---|
| DeepSeek-V3 | 671B / 37B | 128K | MMLU 88.5, HumanEval 82.6 |
| DeepSeek-R1 | 671B / 37B | 128K | AIME 2024 79.8%, MATH-500 97.3% |
| R1-Distill-Qwen-7B | 7B / 7B | 128K | AIME 55.5% |
| DeepSeek-Coder-V2 | 236B / 21B | 128K | HumanEval 90.2 |

Benchmark numbers above are **self-reported** in DeepSeek technical reports. Independent evaluations (e.g., LMSYS Chatbot Arena, Epoch AI compute analysis) broadly confirm strong relative performance but note that the $6M training cost figure for R1 is difficult to verify — it excludes earlier experimental runs, infrastructure amortization, and the cost of the pre-trained base model. Researchers at Epoch AI estimated true training costs are likely 3–5x higher when accounting for these factors.

## Strengths

**Coding and math:** DeepSeek-Coder-V2 and R1 consistently rank near the top of open-weight models on LiveCodeBench, HumanEval, and competition math benchmarks. For agentic coding tasks, R1-distilled models outperform same-size alternatives by a significant margin.

**Inference efficiency:** The MLA architecture makes V3 and R1 cheaper to serve per token than equivalently capable dense models. Operators running these models on H100s report noticeably lower memory bandwidth pressure at long context lengths compared to Llama-3 70B at similar quality levels.

**Open weights:** Full model weights are released under a permissive license (MIT for most models), enabling local deployment, fine-tuning, and embedding into products without API dependency. This is the primary differentiator from o1 and GPT-4o.

**Distillation pipeline:** The R1 distillation approach gives developers access to capable small reasoning models (7B, 14B) that punch above their weight on structured reasoning tasks, useful for resource-constrained deployments.

## Critical Limitations

**Concrete failure mode — context faithfulness on long inputs:** DeepSeek-V3 and R1 show degraded instruction following when relevant information appears in the middle of long contexts (the "lost in the middle" problem). In RAG pipelines where retrieved chunks number in the dozens and key information lands in positions 8–15 of a 20-chunk context, the models tend to rely on the first and last chunks and hallucinate or ignore the middle. This is not unique to DeepSeek, but the gap is more pronounced compared to GPT-4o at equivalent context lengths, based on evaluations shared in the open-source community.

**Unspoken infrastructure assumption — export control exposure:** Running V3 or R1 at scale requires H100 or equivalent GPUs. DeepSeek reportedly trained V3 on H800 clusters (the export-controlled variant Nvidia ships to China, with reduced NVLink bandwidth). Operators in the US and Europe can use H100s freely, but the model's architecture was optimized around H800 interconnect constraints. This means some of the load-balancing and communication design choices reflect hardware limitations that US operators don't share — the models may not be optimally tuned for the hardware most Western operators run.

Additionally, DeepSeek's API service is hosted in China. Organizations with data residency requirements, export compliance obligations, or concerns about Chinese data access cannot use the API and must self-host — which requires substantial GPU infrastructure. The weights are large (V3 full precision: ~1.3TB).

## When NOT to Use DeepSeek

**Regulated industries requiring data residency:** If you cannot send data to Chinese-hosted infrastructure and lack the GPU cluster to self-host a 671B MoE model, you're stuck.

**Tasks requiring strong multilingual performance outside Chinese/English:** DeepSeek models are trained with a heavy Chinese and English corpus weighting. Performance on lower-resource languages (Thai, Vietnamese, Swahili) is meaningfully worse than on GPT-4o, and this gap is not well-documented in official benchmarks.

**Production systems needing SLA guarantees:** DeepSeek's API has experienced significant availability issues during demand spikes (most notably in January 2025 after R1's release). The company does not publish uptime SLAs. If you need 99.9% availability, self-hosting or a third-party host (Fireworks, Together AI, AWS Bedrock) is necessary.

**Adversarial robustness requirements:** R1's RL training with minimal safety fine-tuning in early phases left the base reasoning model more susceptible to jailbreaks than comparable closed models. The final released versions include safety tuning, but red-teaming results shared by independent researchers show higher jailbreak success rates than GPT-4o or Claude 3.5 Sonnet on certain categories of harmful prompts.

## Unresolved Questions

**Governance and ownership structure:** The relationship between DeepSeek and High-Flyer Capital Management is not fully transparent. DeepSeek has not published a model card addressing bias, safety evaluations, or intended use restrictions in the way Anthropic or Meta's model cards do.

**Training data provenance:** DeepSeek's technical reports describe training data composition at a high level but do not disclose specific sources. There are open questions about whether publicly available code repositories with restrictive licenses are included, which matters for commercial deployments.

**Cost claims at scale:** The $6M figure is now widely questioned. The number refers to final pre-training compute for V3 on 2,048 H800s over ~55 days, but excludes: prior failed experiments, infrastructure costs, team salaries, and the base model DeepSeek-V2 that V3 builds on. Epoch AI's analysis suggests the full-stack cost is higher by a factor of several.

**Long-term model availability:** Unlike Llama or Mistral, DeepSeek does not have a Western corporate entity, foundation, or governance structure committing to long-term model maintenance. Weight availability depends on continued goodwill from a Chinese company.

## Alternatives

| Use Case | Alternative | Why |
|---|---|---|
| API access with SLA | GPT-4o or Claude 3.5 Sonnet | Uptime guarantees, clearer data handling |
| Open-weight reasoning, no China exposure | Llama-3.3-70B-Instruct or Qwen-2.5 | Similar weight class, different provenance |
| Small reasoning model | Qwen-2.5-7B-Instruct | Comparable on math/code, smaller footprint |
| Coding specifically, self-hosted | DeepSeek-Coder-V2-Instruct | Purpose-built, strong on HumanEval |
| RAG pipelines at scale | Mistral-Small or Gemma-3 | Better middle-context faithfulness |

Use DeepSeek when: you need strong math/coding performance, can self-host or accept API availability risk, the Chinese infrastructure exposure is acceptable, and cost-per-token matters. Use an alternative when any of those conditions don't hold.


## Related

- [OpenAI](../projects/openai.md) — competes_with (0.8)
