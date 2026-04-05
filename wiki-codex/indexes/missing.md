# Missing And Thin Coverage

> This corpus is strong on coding-agent workflows, external memory, and skills. It is weaker in a few important areas that now matter for production systems.

## Security And Provenance For Skill Ecosystems

The corpus clearly recognizes the problem, but coverage is still thin relative to its importance. The skills survey, Phil Schmid’s warning, Steve Ruiz’s “soldier-proofing” thread, and Google Cloud’s dynamic-skills article all point to the same issue: reusable skills create a new attack and governance surface. What is missing is a deeper body of concrete operational guidance on signing, sandboxing, permission scoping, and trust policies for third-party skills. [Xu & Yan](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) [Phil Schmid](../../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md) [Steve Ruiz](../../raw/tweets/steveruizok-some-of-you-aren-t-soldier-proofing-your-agent-ski.md) [Google Cloud](../../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)

## Shared Benchmarks Across Memory And Context Systems

The corpus contains many headline metrics, but the benchmarks are fragmented. Memory systems cite different tasks than context-compression systems, and improvement loops often evaluate in their own harnesses. The field still lacks a common benchmark suite that cleanly compares storage substrate, retrieval policy, compaction quality, and long-horizon agent outcomes in one place. [Han et al.](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) [LangSmith trace article](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md) [OpenAI cookbook](../../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

## Multimodal And Embodied Memory

Most of the corpus is text-first and coding-first. There are hints of a broader frontier in Voyager and in some of the memory repos, but the material here does not deeply cover multimodal memory, robotics memory, or sensor-rich long-horizon agents. That matters because some of the strongest memory and skill questions become harder once the agent is grounded in environments rather than documents. [Voyager](../../raw/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md) [Lil'Log](../../raw/articles/lil-log-llm-powered-autonomous-agents.md)

## Governance For Self-Improving Systems

The corpus is good on the need for validation and circuit breakers, but thinner on organizational governance once self-improvement loops touch production systems. There is not much here on approval workflows, audit trails, rollback policies, or who owns a change when the change was proposed by the agent itself. [Arion circuit breakers](../../raw/articles/arion-research-llc-algorithmic-circuit-breakers-preventing-flash-cr.md) [Reward hacking article](../../raw/articles/lil-log-reward-hacking-in-reinforcement-learning.md)

## Privacy, Compliance, And Data Lifecycle

Memory systems in the corpus are rich on retrieval quality and continuity, but relatively light on deletion, retention windows, regulatory constraints, and privacy-preserving storage. That is a major production gap because long-term memory is exactly where sensitive data accumulates. [Elasticsearch memory article](../../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md) [Mem0](../../raw/repos/mem0ai-mem0.md) [Letta](../../raw/repos/letta-ai-letta.md)

## What To Add Next

- More sources on skill signing, capability permissions, and supply-chain safety.
- More head-to-head evaluations where memory, context, and self-improvement systems are tested in the same environment.
- More material on multimodal and embodied agent memory.
- More operational writing about rollback, approvals, and observability for self-modifying systems.
- More privacy and compliance guidance for durable memory layers.
