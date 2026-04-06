---
entity_id: deepseek
type: project
bucket: agent-systems
abstract: >-
  DeepSeek is a Chinese AI lab and open-source model family producing
  high-capability LLMs at low training cost, best known for DeepSeek-R1 which
  matches frontier reasoning performance using GRPO-based RL without supervised
  fine-tuning warmup.
sources:
  - repos/modelscope-agentevolver.md
  - repos/evoagentx-evoagentx.md
  - repos/aiming-lab-agent0.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
related: []
last_compiled: '2026-04-06T02:16:51.676Z'
---
# DeepSeek

## What It Is

DeepSeek is a Chinese AI research company (founded 2023, backed by High-Flyer hedge fund) that develops and open-sources large language models. Its models span general chat, code, and long chain-of-thought reasoning. The lab gained international attention in early 2025 when DeepSeek-R1 matched or exceeded GPT-o1 on several reasoning benchmarks at a fraction of the reported training cost.

The model family includes:

- **DeepSeek-V3**: A 671B mixture-of-experts model (37B active parameters per forward pass), positioned as a general-purpose frontier model
- **DeepSeek-R1**: A reasoning-focused model trained entirely with reinforcement learning, producing explicit chain-of-thought traces before answering
- **DeepSeek-Coder / DeepSeek-Coder-V2**: Code-specialized variants
- **DeepSeek-R1-Zero**: An ablation of R1 trained with RL from a base model only, no SFT warmup, demonstrating that reasoning behaviors can emerge from RL alone

All weights are released under a permissive license (MIT for R1, custom for some variants) and available on Hugging Face. The API is priced well below OpenAI equivalents.

## Architectural Differentiators

### DeepSeek-V3 Architecture

V3 uses a mixture-of-experts transformer with Multi-Head Latent Attention (MLA), which compresses key-value caches by projecting into a low-dimensional latent space. This cuts inference memory substantially compared to standard multi-head attention at equivalent parameter counts. The MoE routing uses an auxiliary-loss-free load balancing strategy that penalizes overloaded experts through bias terms rather than adding a loss term, avoiding the gradient conflicts that degrade model quality in earlier MoE designs.

V3 also introduced Multi-Token Prediction (MTP) as a training auxiliary objective, predicting multiple future tokens in parallel. At inference, MTP modules can optionally serve as speculative decoding draft heads, improving throughput without changing output distribution.

### DeepSeek-R1 and GRPO

R1's training process is the architecturally notable part. Rather than the standard RLHF pipeline (SFT → reward model → PPO), DeepSeek applied [GRPO](../concepts/grpo.md) directly to a base model. GRPO (Group Relative Policy Optimization) estimates policy gradient advantages by comparing multiple rollouts within a batch rather than training a separate critic network. This cuts memory and compute versus PPO while achieving similar or better training stability on verifiable tasks.

R1-Zero, trained without any SFT data, spontaneously developed:
- Self-verification behavior (the model checks its own reasoning mid-chain)
- Extended thinking traces with explicit reconsideration steps
- Variable thinking length calibrated to problem difficulty

R1 then used a cold-start procedure: a small set of human-curated long chain-of-thought examples bootstrapped the model before RL, which stabilized early training and improved readability of the output reasoning traces.

The RL reward function used binary correctness signals (verifiable math, code execution results) plus a format reward enforcing the `<think>...</think>` structure. No learned reward model is in the loop for R1's primary training phase.

### Distilled Variants

DeepSeek released R1-distill models (Qwen-7B, Qwen-14B, Llama-8B, Llama-70B base architectures) fine-tuned on R1-generated chain-of-thought traces. These small models achieve reasoning performance well above their parameter count relative to standard instruction-tuned equivalents. The distillation finding is significant: reasoning capability transfers through behavioral cloning of long-chain outputs, without requiring the student to run RL itself.

## Key Numbers

| Model | Parameters | Context | Notable Benchmark |
|-------|------------|---------|-------------------|
| DeepSeek-V3 | 671B (37B active) | 128K tokens | MMLU 88.5%, HumanEval 96.3% (self-reported) |
| DeepSeek-R1 | 671B (37B active) | 128K tokens | AIME 2024 79.8%, MATH-500 97.3% (self-reported) |
| R1-Distill-Qwen-7B | 7B | 128K | AIME 55.5% (self-reported) |

All benchmarks above are self-reported by DeepSeek in their technical reports. Independent replication on AIME and MATH-500 by third parties has generally confirmed the R1 numbers within a few percentage points, though exact reproduction depends on generation parameters (temperature, thinking budget). The training cost claims ($5.6M for V3) have not been independently verified and likely exclude prior infrastructure investment.

## Influence on Agent Systems

DeepSeek's relevance to agent and knowledge base systems comes through several channels:

**GRPO adoption**: R1's RL training recipe using GRPO has been widely replicated. The mem-agent paper (a 4B model trained to manage markdown memory files) used GSPO, a direct descendant of GRPO, and explicitly cites R1 as the catalyst for the current wave of RL-trained tool-calling agents. Multiple agent training frameworks now default to GRPO variants.

**Reasoning traces as training data**: R1's distillation approach demonstrated that LLM-generated reasoning chains are high-quality training signal. This pattern has been adopted by systems training agents on synthetic trajectories, including self-improving agents that generate their own training data.

**Cost-effective inference at the frontier**: V3 and R1 changed the economic calculus for agent systems. Running frontier-class reasoning models at low cost per token makes multi-agent orchestration (where many model calls happen per task) economically viable at smaller scales.

**Open weights for local deployment**: Via [Ollama](../projects/ollama.md) and [vLLM](../projects/vllm.md), R1 distilled variants run locally. Agent systems with privacy requirements or offline constraints can use 7B-14B R1-distill models that retain substantial chain-of-thought capability.

## Strengths

**Coding and math reasoning**: R1 and V3 consistently rank near the top on code generation (HumanEval, LiveCodeBench) and math reasoning (AIME, MATH-500) benchmarks. For agent systems that execute code or do quantitative reasoning, these models are a practical first choice.

**Chain-of-thought transparency**: R1's thinking traces are visible and auditable. Agents built on R1 expose their intermediate reasoning, which aids debugging and the kind of iterative verification that research frameworks like the Agentic Researcher require.

**Distillation signal**: The R1-distill series provides strong small-model performance for constrained deployments. The SICA self-improving agent framework lists DeepSeek as a supported LLM provider alongside Anthropic and OpenAI.

**API cost**: DeepSeek's API runs roughly 10-30x cheaper per token than GPT-4 class models (as of mid-2025). For agent frameworks doing many LLM calls per task, this changes what's economically feasible.

## Critical Limitations

**Concrete failure mode — instruction following regression in extended reasoning**: R1's thinking-then-answering architecture creates a specific failure in multi-turn agentic contexts. The model can produce a correct answer inside `<think>` tags, then give a different (sometimes contradictory) answer in the final response. In tool-calling loops where the agent output is parsed and executed, this split between reasoning and action creates non-deterministic behavior that's difficult to catch without explicit validation.

**Unspoken infrastructure assumption**: The full V3 and R1 models require substantial GPU infrastructure (multiple H100s for inference at reasonable throughput). DeepSeek's API is the practical path for most users, but it routes through Chinese infrastructure. For agent systems handling sensitive data or operating in regulated environments, this is a non-trivial dependency that the model's open-source framing can obscure. The weights are open, but running 671B MoE at production throughput is not accessible to most teams.

## When NOT to Use DeepSeek

**Safety-critical or regulated deployments**: DeepSeek models have been shown to produce content that [Anthropic](../projects/anthropic.md) and [OpenAI](../projects/openai.md) refuse, particularly on politically sensitive topics related to China. Red-teaming results from independent researchers found systematic gaps in content refusals. If your agent system operates in consumer-facing or regulated contexts, the safety alignment properties of DeepSeek models are less well characterized than Claude or GPT-4 class models.

**Low-latency production systems**: R1's chain-of-thought generation is verbose by design. For agent loops requiring sub-second response times or high-frequency tool calls, the extended thinking traces add latency. R1 is optimized for quality of reasoning, not throughput.

**Multi-modal tasks**: DeepSeek's text models have no vision capability (as of mid-2025). Agent systems requiring image understanding, screenshot analysis, or document parsing with visual elements need a different base model.

**High-reliability multi-turn tool calling**: R1's training focused on single-turn reasoning tasks. For complex multi-turn agent workflows with structured tool call formats, models trained specifically for agentic interaction (Claude Sonnet, GPT-4o) have more predictable behavior.

## Unresolved Questions

**Governance and export controls**: The models are trained and released by a Chinese company. U.S. export control regulations around advanced AI models are evolving, and it is unclear what compliance requirements apply to enterprises incorporating DeepSeek weights into commercial products or fine-tuning pipelines.

**Reproducibility of training costs**: The $5.6M training cost figure for V3 covers only the final training run on H800 clusters, not the cost of prior experiments, infrastructure, or the base model development. Independent researchers cannot verify the total cost. The figure has been widely cited as evidence of efficiency but the accounting boundary is unstated.

**Context length reliability**: Both V3 and R1 claim 128K token context windows. Independent evaluations using needle-in-a-haystack and multi-hop retrieval tasks at long contexts show degradation beyond 32-64K tokens that is not reflected in official benchmarks. For [RAG](../concepts/rag.md) or [Context Engineering](../concepts/context-engineering.md) applications relying on long-context retrieval, this gap matters.

**Post-training alignment depth**: The R1 technical report describes the RL reward shaping in detail but is sparse on constitutional AI-style alignment, adversarial testing methodology, and red-team coverage. The depth of safety evaluation relative to Anthropic's or OpenAI's published work is unclear.

## Alternatives

**Use [Claude](../projects/claude.md) (Anthropic) when**: safety alignment, multi-turn agentic reliability, or multi-modal capability matters. Claude Sonnet is the current standard for complex agentic coding tasks like [Claude Code](../projects/claude-code.md) and [Cursor](../projects/cursor.md).

**Use [Gemini](../projects/gemini.md) when**: very long context (1M+ tokens) is the primary constraint. Gemini 1.5 Pro has a substantially larger verified effective context than DeepSeek.

**Use DeepSeek R1-distill (7B/14B) when**: you need chain-of-thought reasoning locally, have privacy requirements, or are building agent systems where per-token cost is a binding constraint. The distilled models via [Ollama](../projects/ollama.md) are the most accessible path to R1-class reasoning without API dependency.

**Use GPT-4o (OpenAI) when**: structured tool calling, function calling reliability, or vision + reasoning combinations are required. OpenAI's tool call format and reliability in multi-turn agentic settings is more thoroughly characterized.

## Related Concepts

- [GRPO](../concepts/grpo.md) — The RL training algorithm central to R1's training
- [Chain-of-Thought](../concepts/chain-of-thought.md) — The reasoning paradigm R1 exemplifies
- [Prompt Engineering](../concepts/prompt-engineering.md) — R1's thinking traces change how prompting interacts with model behavior
- [Self-Improving Agents](../concepts/self-improving-agents.md) — R1's RL-from-base-model approach is a direct antecedent to agent self-improvement via RL
