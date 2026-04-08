---
entity_id: gpt-4
type: project
bucket: agent-architecture
abstract: >-
  GPT-4 is OpenAI's flagship LLM family (GPT-4, GPT-4o, GPT-4o-mini, GPT-5),
  widely used as the backbone reasoning engine for agent systems; its key
  differentiator is capability breadth across coding, reasoning, and tool use at
  commercial API scale.
sources:
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/microsoft-llmlingua.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - repos/orchestra-research-ai-research-skills.md
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
related:
  - gpt-4o
  - episodic-memory
  - claude
  - model-context-protocol
  - react
  - reflexion
  - grpo
  - reinforcement-learning
  - claude-code
last_compiled: '2026-04-08T23:06:00.196Z'
---
# GPT-4

## What It Is

GPT-4 is the family of large language models from [OpenAI](../projects/openai.md) that serves as the dominant backbone for agent systems in production. The family spans several generations and variants: GPT-4 (the original), GPT-4o (omni, multimodal), GPT-4o-mini (smaller, cheaper), and GPT-5 (the current frontier model as of 2025). These models power a substantial fraction of real-world agent deployments, from coding assistants to multi-step reasoning pipelines.

For agent infrastructure specifically, GPT-4 class models matter for three reasons. First, many agent frameworks ([Reflexion](../concepts/reflexion.md), [ReAct](../concepts/react.md), [Voyager](../projects/voyager.md)) were developed and validated against GPT-4, meaning their effectiveness is partially a property of the model, not just the architecture. Second, [OpenAI's Agents SDK](../projects/openai-agents-sdk.md) and [Model Context Protocol](../concepts/model-context-protocol.md) are designed around GPT-4 class APIs. Third, capabilities like long context, function calling, and structured output are table stakes for agent work, and GPT-4 class models implement these reliably.

## Architecture: What's Known

OpenAI publishes no architecture details for GPT-4. The model family is closed-source. What the community has inferred or confirmed from OpenAI's public communications:

**GPT-4 (original):** Transformer-based language model trained with RLHF. Suspected to use mixture-of-experts architecture based on third-party analysis, though OpenAI has neither confirmed nor denied this. Context window of 8K tokens (standard) or 32K (extended). Strong reasoning, significantly stronger than GPT-3.5 on benchmarks requiring multi-step logic.

**GPT-4o:** "Omni" model accepting text, audio, and images natively rather than via separate modality towers. Faster and cheaper than GPT-4. Context window of 128K tokens. This is the model most agent frameworks target by default as of 2024-2025.

**GPT-4o-mini:** Smaller distilled model optimized for cost. Dramatically cheaper per token than GPT-4o. Sufficient for many agent subtasks but weaker on complex multi-step reasoning. The A-MEM paper demonstrates a concrete tradeoff: GPT-4o-mini achieves 45.85 F1 on multi-hop tasks (vs. 9.09 F1 for GPT-4o at baseline), but GPT-4o with proper memory scaffolding reaches 39.41 F1 — showing that model choice interacts with system architecture in non-obvious ways.

**GPT-5:** OpenAI's current frontier model. Claims significant improvements on reasoning benchmarks. The GEPA framework reports GPT-5 used as the reflection LLM, with AIME 2025 results of GPT-4.1 Mini improving from 46.67% to 60.00% through GEPA-based prompt optimization.

## Role in Agent Infrastructure

GPT-4 class models appear throughout the agent infrastructure knowledge base as the assumed backbone. Several patterns recur:

**Reasoning and self-reflection.** [Reflexion](../concepts/reflexion.md) achieves 91% pass@1 on HumanEval using GPT-4 as both actor and self-reflection model — meaningfully above GPT-4's unscaffolded 80.1%. The self-reflection mechanism is an emergent capability: StarChat-beta shows zero improvement under the same framework (0.26 vs. 0.26), confirming that verbal self-improvement is not a general property but a capability specific to models above some threshold.

**Skill generation.** [Voyager](../projects/voyager.md) explicitly requires GPT-4 for code generation. Replacing GPT-4 with GPT-3.5 produces 5.7x fewer unique items discovered — the largest single-factor degradation in the ablation study. GPT-4's code generation quality is the binding constraint, not the curriculum or verification mechanisms.

**Memory and context.** [A-MEM](../concepts/episodic-memory.md) evaluates both GPT-4o and GPT-4o-mini, finding that the models achieve different performance profiles. GPT-4o-mini improves 149% on multi-hop with A-MEM's memory scaffolding; GPT-4o improves 334%. Smaller models benefit more from memory scaffolding because structured organization compensates for weaker native reasoning.

**Optimization.** [GEPA](../concepts/gepa.md) uses GPT-5 as the reflection LLM and GPT-4.1 Mini as the task model, achieving 35x faster convergence than GRPO by letting the reflection model read execution traces rather than optimizing against scalar rewards.

**Document navigation.** PageIndex uses GPT-4o for document indexing and a stronger model for retrieval reasoning, achieving 98.7% on FinanceBench by treating retrieval as a reasoning problem.

## Key Numbers

The numbers below come from papers and are largely self-reported by OpenAI or measured against their own benchmarks. Independent third-party evaluation is limited.

| Metric | Value | Source |
|--------|-------|--------|
| HumanEval pass@1 (GPT-4, unscaffolded) | 80.1% | OpenAI technical report — self-reported |
| HumanEval pass@1 (Reflexion + GPT-4) | 91.0% | Shinn et al. 2023 — academic paper |
| Voyager unique items vs GPT-3.5 | 5.7x more | Wang et al. 2023 — self-reported |
| AIME 2025 (GPT-4.1 Mini + GEPA) | 60.0% (+13.3pp) | GEPA paper — ICLR 2026 oral |
| FinanceBench (PageIndex + GPT-4o) | 98.7% | VectifyAI — self-reported |

Note: OpenAI's benchmark reporting methodology has faced criticism for selection bias. Third-party replication of GPT-4 results frequently shows smaller improvements than OpenAI reports, particularly on reasoning tasks where prompt engineering accounts for a large fraction of the claimed gains.

## Strengths

**Function calling and structured output.** GPT-4o's native JSON mode and function calling implementation is reliable enough that most agent frameworks treat it as the default target. Structured output is critical for tool use, memory management, and multi-agent coordination.

**Long context.** 128K token context in GPT-4o enables agent workflows that load substantial amounts of retrieved context, conversation history, or code. This matters for [context engineering](../concepts/context-engineering.md) patterns that front-load relevant information rather than relying on retrieval.

**Coding ability.** GPT-4 class models are strong enough at code generation that entire agent architectures (Voyager's skill library, GEPA's coding agent skills) are built around the assumption that the model can write correct, executable code on the first attempt most of the time.

**Self-reflection capability.** As established by Reflexion and confirmed across multiple papers, GPT-4 class models can analyze their own failures and generate useful corrective guidance. This is the foundation of most self-improving agent patterns.

**API reliability.** As a commercial API, GPT-4 has better uptime and versioning guarantees than most open-source alternatives. For production agent deployments, this matters more than benchmark scores.

## Limitations

**Concrete failure mode — adversarial vulnerability amplified by memory scaffolding.** A-MEM shows GPT-4o-mini with memory scaffolding performs 28% worse on adversarial tasks than the baseline. The enriched semantic representations and bidirectional links that help multi-hop reasoning actively hurt when the query is designed to mislead. More context, better organized, makes the model more susceptible to leading questions. This failure mode likely generalizes: any memory or context enrichment system that increases the salience of misleading signals will degrade adversarial robustness.

**Unspoken infrastructure assumption — capability ceiling creates framework lock-in.** Many agent frameworks calibrate to GPT-4 capability levels. Reflexion's verbal self-reflection mechanism breaks entirely on weaker models. Voyager's skill generation requires GPT-4 code quality. This means that deploying these frameworks with cheaper models (GPT-4o-mini, open-source alternatives) requires re-validating the entire architecture, not just swapping the model. The published benchmarks for these frameworks do not transfer to cheaper model tiers.

**Temporal reasoning.** Multiple memory systems (A-MEM, Zep) identify temporal reasoning as a weak point. A-MEM achieves only +1% F1 improvement on temporal tasks with GPT-4o-mini, vs. 149% improvement on multi-hop. This is not purely a memory architecture problem — it reflects the model's difficulty with precise temporal ordering and duration reasoning.

**Closed weights.** No fine-tuning on private data without using OpenAI's fine-tuning API, which has limitations on data volume, cost, and what can be customized. For agent systems requiring domain-specific behavior baked into weights (medical, legal, specialized code), closed weights are a hard constraint.

**Cost at scale.** GPT-4o is 15x more expensive per token than GPT-3.5. For agent workflows that make dozens of LLM calls per task (GEPA, A-MEM, Voyager), costs accumulate quickly. The GEPA paper reports Databricks achieved 90x cost reduction by replacing Claude Opus with open-source models plus GEPA optimization — signaling that GPT-4 class models are not always cost-competitive for agent workflows where the framework can compensate.

## When NOT to Use It

**When you need fine-grained control over model behavior.** If your agent requires domain-specific reasoning baked into the model (not just the prompt), you cannot fine-tune GPT-4o to the degree that open-weight models allow. Use Qwen, Llama, or Mistral variants with LoRA/full fine-tuning instead.

**When inference cost is the binding constraint.** For high-volume agent workflows (hundreds of LLM calls per user session), GPT-4o costs are prohibitive. GPT-4o-mini handles many subtasks adequately and costs dramatically less. For even higher volume, self-hosted open-source models via [vLLM](../projects/vllm.md) or [Ollama](../projects/ollama.md) become the practical choice.

**When you need deterministic, auditable outputs.** GPT-4's outputs vary between calls even at temperature=0 (due to non-deterministic hardware execution). For compliance-sensitive workflows requiring reproducibility, this is a problem without a clean solution.

**When the task is simple enough for smaller models.** The Reflexion ablation shows that self-reflection adds 12pp on reasoning tasks — but only above a capability threshold. For tasks where GPT-4o-mini or even GPT-3.5-class models are adequate, the added cost of GPT-4o buys minimal benefit.

**When you are building against an open ecosystem.** If your agent infrastructure requires local deployment, air-gapped environments, or open licensing, GPT-4 is not an option. [Claude](../projects/claude.md) is similarly closed. Qwen or Llama 3 variants are the alternatives.

## Unresolved Questions

**What actually changed between GPT-4 and GPT-4o?** The capability improvements are documented but the architectural changes are not. Whether GPT-4o uses the same underlying model with post-training improvements, or a substantially different architecture, is unknown. This matters because agent frameworks tuned to GPT-4 behavior may not transfer cleanly to GPT-4o.

**How does GPT-5 change the agent architecture landscape?** GEPA's results using GPT-5 as the reflection LLM suggest meaningfully stronger self-analysis capabilities. If GPT-5 makes Reflexion-style verbal self-reflection substantially more reliable, the optimal agent architecture changes. No systematic evaluation of GPT-5 under agent frameworks exists yet.

**What is the real cost of GPT-4 class models in production agent systems?** Published benchmarks show per-task costs but not system-level economics at scale. The GEPA Databricks case (90x cost reduction) suggests that model costs dominate in many agent workflows, but OpenAI does not publish usage data that would let outsiders estimate typical agent deployment costs.

**How does GPT-4's safety tuning interact with agent autonomy?** GPT-4 includes RLHF-based safety training that can cause refusals mid-task in agentic contexts (e.g., refusing to execute certain code, declining to make certain API calls). The rate of such refusals in production agent workflows, and their impact on task completion, is not published.

## Alternatives

**[Claude](../projects/claude.md) (Anthropic).** Comparable capability tier. Stronger on instruction following and long-context tasks per multiple third-party evaluations. Claude 3.5 Sonnet is [Claude Code](../projects/claude-code.md)'s backbone. Preferred when you need very long context with reliable extraction or when instruction following precision matters more than raw throughput.

**[Gemini](../projects/gemini.md) (Google).** Competitive on multimodal tasks. Gemini 1.5 Pro has a 1M token context window that exceeds GPT-4o. Preferred for workflows processing very long documents or requiring tight Google ecosystem integration.

**Qwen ([Qwen](../projects/qwen.md)) / Llama.** Open-weight models that enable self-hosting, fine-tuning, and cost control. A-MEM's results show Qwen2.5-3b achieves 787% improvement on multi-hop tasks with memory scaffolding — a smaller model can exceed GPT-4-class baselines when the right scaffolding compensates. Use when cost, data privacy, or fine-tuning requirements constrain the choice.

**Selection guidance:**
- Use GPT-4o when you need a reliable, well-tested API baseline and cost is secondary
- Use GPT-4o-mini when you need GPT-4 family compatibility with lower cost, accepting capability degradation on complex reasoning
- Use Claude when instruction following and long-context reliability are the primary requirements
- Use open-weight models (Qwen, Llama) when cost at scale, fine-tuning, or data sovereignty drives the decision

## Related Concepts and Projects

- [GPT-4o](../projects/gpt-4o.md) — the current primary variant, supersedes original GPT-4 for most agent use
- [ReAct](../concepts/react.md) — reasoning + acting framework validated against GPT-4
- [Reflexion](../concepts/reflexion.md) — verbal self-improvement framework; effectiveness depends on GPT-4 class capability
- [GRPO](../concepts/grpo.md) — RL training method; GEPA positions itself as 35x more sample-efficient than GRPO
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — training paradigm underlying GPT-4's RLHF alignment
- [Chain-of-Thought](../concepts/chain-of-thought.md) — prompting technique that GPT-4 executes reliably; weaker models often fail
- [OpenAI Agents SDK](../projects/openai-agents-sdk.md) — official framework built around GPT-4 class APIs
- [Model Context Protocol](../concepts/model-context-protocol.md) — tool integration standard implemented for GPT-4 class models
- [Episodic Memory](../concepts/episodic-memory.md) — memory architecture that A-MEM shows provides disproportionate benefit to smaller GPT-4 family variants
- [Self-Improving Agents](../concepts/self-improving-agents.md) — broader pattern that GPT-4's self-reflection capability enables
