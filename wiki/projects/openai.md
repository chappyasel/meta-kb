---
entity_id: openai
type: project
bucket: agent-systems
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/memodb-io-acontext.md
  - repos/getzep-graphiti.md
  - repos/memorilabs-memori.md
  - repos/gepa-ai-gepa.md
  - repos/greyhaven-ai-autocontext.md
  - repos/wangziqi06-724-office.md
  - repos/caviraoss-openmemory.md
  - repos/topoteretes-cognee.md
  - repos/nemori-ai-nemori.md
  - repos/mem0ai-mem0.md
  - repos/infiniflow-ragflow.md
  - repos/yusufkaraaslan-skill-seekers.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/snarktank-compound-product.md
  - deep/repos/vectifyai-pageindex.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - Claude Code
  - Anthropic
  - OpenAI Codex
  - OpenAI Agents SDK
  - Google Gemini
  - Claude
  - DeepSeek
  - Model Context Protocol
  - LangChain
  - LangGraph
  - GitHub Copilot
  - Retrieval-Augmented Generation
  - Reinforcement Learning
  - GRPO
  - AutoGen
  - SWE-Bench
  - ARC-AGI
  - Andrej Karpathy
  - Omar Khattab
  - Tobi Lütke
last_compiled: '2026-04-05T05:21:06.463Z'
---
# OpenAI

## What It Does

OpenAI is a research company and API provider that builds large language models and the tooling to deploy them. Its core products are the GPT model family (accessed through the completions and chat APIs), the [OpenAI Agents SDK](../projects/openai-agents-sdk.md) for building multi-agent workflows, [OpenAI Codex](codex.md) for code generation, and [GitHub Copilot](../projects/github-copilot.md) which it powers. It ships Retrieval-Augmented Generation primitives through its files and vector store APIs, and applies [Reinforcement Learning](../concepts/reinforcement-learning.md) including [GRPO](../concepts/grpo.md) in training its reasoning models. OpenAI also participates in benchmarking ecosystems like [SWE-Bench](../projects/swe-bench.md) and [ARC-AGI](../projects/arc-agi.md), and implements Model Context Protocol for tool interoperability.

## What's Architecturally Unique

OpenAI's production infrastructure separates model serving from agent orchestration. The Responses API — newer than the older Completions API — embeds tool call handling and state threading inside the API boundary itself, so agents don't need external state machines to pass tool results back. The Agents SDK (`openai-agents-python`) builds on this: `Runner.run()` in `runner.py` drives the turn loop, `tool.py` handles function schema generation via type introspection, and `handoffs.py` encodes the pattern where one agent transfers context to another with typed parameters rather than free text. This makes agent handoffs inspectable and testable in ways that raw prompt chaining is not.

Training uses RLHF with human preference data and, in reasoning models (the `o` series), a process called "thinking" where the model generates an internal scratchpad before producing output. The scratchpad is not fully visible to callers. GRPO and related RL variants push these reasoning traces toward better performance on verifiable tasks like math and code.

OpenAI also ships a native memory layer through ChatGPT's product, separate from the API. Third-party tools like [Mem0](../projects/mem0.md) benchmark against "OpenAI Memory" and report +26% accuracy on LOCOMO (self-reported by Mem0, not independently verified).

## Key Numbers

- GPT-4o and o3 benchmark results appear on evals like MMLU, HumanEval, MATH, and ARC-AGI. Most of these are **self-reported** in model cards and API announcements; independent replication sometimes diverges, particularly on reasoning benchmarks where prompt formatting affects scores substantially.
- o3 scored 87.5% on ARC-AGI-1 at high compute settings (self-reported, subsequently tested by ARC Prize — numbers were confirmed but the compute cost per task was extremely high).
- GPT-4 and successors consistently rank near the top on [SWE-Bench](../projects/swe-bench.md) coding tasks, though leaderboard positions shift as competitors release updates.
- API pricing and rate limits change frequently; any specific number here would be stale within months.

## Strengths

**Ecosystem depth.** More third-party integrations exist for OpenAI's APIs than for any competitor. [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), [AutoGen](../projects/autogen.md), and most agent frameworks treat OpenAI's function calling spec as the default and others as adapters.

**Function calling reliability.** The structured outputs feature (JSON Schema enforcement at the logit level) lets callers specify exact output schemas. In practice this produces fewer malformed responses than asking models to "respond in JSON" via prompt alone. Tool call reliability is consistently better than most alternatives for multi-step agent workflows.

**Reasoning models.** The `o1`, `o3`, and `o4-mini` series handle complex multi-step reasoning tasks — competition math, formal proofs, long-horizon coding — better than standard chat models. The internal chain-of-thought approach produces qualitatively different failure modes than instruction-tuned models.

**Code generation.** Codex lineage runs through GPT-4o and powers GitHub Copilot. Performance on HumanEval and SWE-Bench reflects sustained investment in code-specific training data and RLHF.

## Critical Limitations

**Concrete failure mode:** Reasoning model opacity. The `o` series models produce internal scratchpads that callers cannot inspect. When an o3 model makes a reasoning error on a multi-step problem, there is no way to identify where the chain broke or whether it followed instructions at all. You can see the input and output, not the path. For debugging agent pipelines this is a significant gap — you can't distinguish a model that understood the task and reasoned incorrectly from one that misread the input.

**Unspoken infrastructure assumption:** OpenAI's API availability is a single point of failure for any production system built on it. The function calling spec, model names, rate limits, and pricing are unilaterally changeable. Teams that build deeply around specific model behavior (particular system prompt sensitivity, specific context window assumptions, structured output schemas) face migration costs when OpenAI deprecates models or changes defaults. There is no contractual guarantee of behavioral stability between model versions, even minor ones.

## When NOT to Use It

Don't build on OpenAI's API when data sovereignty or residency is a hard requirement. API calls route through OpenAI's infrastructure; even with zero data retention agreements, model inputs and outputs traverse their systems. Regulated industries (health, finance, defense) with strict data localization requirements need self-hosted alternatives.

Don't use it when budget predictability is critical at scale. Token costs for agentic workloads that involve long contexts, many tool calls, or reasoning models can spike unexpectedly. The cost structure rewards short, well-specified tasks — not exploratory or open-ended agent loops. Teams at scale often find the bill behavior surprising relative to initial estimates.

Don't use reasoning models (`o` series) when you need latency under a few seconds. They are significantly slower than GPT-4o class models due to the internal thinking pass.

## Unresolved Questions

**Governance:** OpenAI's transition from nonprofit to capped-profit to a restructured for-profit entity is ongoing. How safety commitments are enforced as commercial pressure increases is not documented in any binding external mechanism. The board governance crisis of late 2023 demonstrated that internal checks are fragile.

**Cost at scale for agents:** The Agents SDK and Responses API make it easy to build loops where every turn costs tokens. There is no public documentation on how costs scale for realistic multi-agent topologies with many handoffs, parallel subagents, and long memory contexts. Teams discover this empirically.

**Model versioning conflicts:** OpenAI points aliases like `gpt-4o` to new model snapshots without always changing the name. Evaluations done against `gpt-4o` in one month may not reproduce against the same string three months later. The documentation acknowledges this but does not provide a clear mitigation path beyond pinning dated snapshots.

**Safety vs. capability tradeoffs:** The system prompt refusal behavior and safety filtering are adjusted across model versions. Behavior that worked in one deployment may fail after a model update, and the criteria for these adjustments are not fully published.

## Alternatives

- **[Anthropic](../projects/anthropic.md) / Claude:** Better instruction-following on nuanced tasks, stronger refusal boundaries by default. Use when reliability on long documents, precise instruction adherence, or safety constraints matters more than ecosystem breadth.
- **[Google Gemini](gemini.md):** Competitive on multimodal tasks, tighter Google Cloud integration. Use when your stack is GCP-native or when you need very long context windows (Gemini 1.5/2.0 lead here).
- **[DeepSeek](../projects/deepseek.md):** Open weights, runs self-hosted, strong on code and reasoning at lower cost. Use when data residency requirements prevent API calls or when cost reduction at inference scale is the primary driver.
- **Local models via Ollama or vLLM:** Use when you need complete data control, reproducible behavior, or custom fine-tuning. Tradeoff is operational burden and capability gap on complex reasoning.

## Related Concepts

- [Reinforcement Learning](../concepts/reinforcement-learning.md)
- [GRPO](../concepts/grpo.md)
- Retrieval-Augmented Generation
- Model Context Protocol
