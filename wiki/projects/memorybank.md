---
entity_id: memorybank
type: project
bucket: agent-memory
abstract: >-
  MemoryBank is a long-term memory system for LLMs that selectively reinforces
  or decays stored memories using the Ebbinghaus forgetting curve, enabling
  persistent personality modeling across sessions without unbounded context
  growth.
sources:
  - repos/zhongwanjun-memorybank-siliconfriend.md
  - papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T23:18:12.363Z'
---
# MemoryBank

## What It Is

MemoryBank is a memory mechanism for LLMs that gives models persistent access to past interactions, user personality summaries, and contextually relevant history. The core differentiator: memories age and decay according to the Ebbinghaus forgetting curve rather than persisting indefinitely at equal weight or being naively truncated. The companion application, SiliconFriend, demonstrates the mechanism in a long-term AI companionship chatbot tuned for empathetic responses via LoRA on 38K Chinese psychological dialog examples.

The system integrates with both closed-source models (ChatGPT) and open-source models (ChatGLM, BELLE).

**Repository:** [zhongwanjun/MemoryBank-SiliconFriend](https://github.com/zhongwanjun/MemoryBank-SiliconFriend)
**Paper:** [MemoryBank: Enhancing Large Language Models with Long-Term Memory](https://arxiv.org/pdf/2305.10250.pdf)
**Stars:** 419 | **Forks:** 60 | **License:** MIT

## Core Mechanism

### Ebbinghaus Forgetting Curve

The defining feature is memory decay modeled on Hermann Ebbinghaus's 1885 retention research. Rather than treating all stored memories as equally available, MemoryBank calculates a retention probability for each memory based on:

- **Time elapsed** since last access or creation
- **Repetition count**: how often this memory has been retrieved or reinforced
- **Significance**: a weight assigned at storage time

Memories that are accessed repeatedly stay strong; memories that sit unused decay. This mirrors how human episodic memory works and solves a real production problem: naive retrieval systems return stale, irrelevant memories at the same confidence as recent, important ones.

### Memory Pipeline

1. **Storage**: Conversations are summarized (using OpenAI's API for summarization, even in open-source model deployments) and written to a memory bank as structured entries in `memory_bank.json` files.

2. **Retrieval**: At query time, the system fetches semantically relevant memories, then applies the forgetting curve to re-rank them. A memory that is a good semantic match but was accessed six months ago gets downweighted against a slightly weaker match from last week.

3. **Update**: Retrieved memories get their access timestamps updated, reinforcing retention. Memories consistently ignored decay toward forgetting threshold and are eventually pruned.

4. **Personality Synthesis**: Beyond individual episodic memories, the system maintains a synthesized personality model of the user, built from accumulated interaction history. This is stored separately and updated periodically.

### SiliconFriend

The demonstration application (`SiliconFriend-ChatGLM-BELLE/`) runs a bilingual (Chinese/English) chatbot using ChatGLM or BELLE with LoRA adapters fine-tuned on psychological dialog data. The LoRA checkpoints are hosted as GitHub releases (~500MB each). The web demo uses Gradio; CLI usage is also supported.

## Evaluation

The evaluation setup uses ChatGPT to simulate users with distinct personalities, generating conversation histories across multiple topics stored in `eval_data/cn/memory_bank_cn.json` and `eval_data/en/`. Researchers then manually crafted 100 probing questions to test memory retrieval accuracy.

Qualitative analysis uses real-world user dialogs. Quantitative analysis uses the simulated dialogs. The paper reports that SiliconFriend with MemoryBank demonstrates "strong capability for long-term companionship" including empathetic responses, relevant memory recall, and user personality understanding.

**Credibility note:** These results are self-reported by the authors. The evaluation benchmark is bespoke and not independently validated against standardized long-term memory benchmarks like LongMemEval or MADail-Bench. The probing question set (100 questions) is small.

## Strengths

**Human-plausible memory dynamics.** The forgetting curve mechanism produces behavior that users find natural: the system remembers things you mention repeatedly and forgets details from isolated, old conversations. This matters for companionship applications where unnatural recall ("you mentioned that once eighteen months ago") can feel surveillance-like rather than helpful.

**Broad model compatibility.** The architecture treats memory retrieval and summarization as separate from the inference model. Swapping ChatGLM for BELLE for ChatGPT requires changing configuration, not rewriting the memory layer. This is a real engineering advantage for teams experimenting with model choices.

**Compact memory representation.** Summarizing conversations into memory entries rather than storing raw transcripts keeps the memory bank manageable and retrieval fast, without requiring vector database infrastructure for small deployments.

## Critical Limitations

**Concrete failure mode:** The forgetting curve parameters (decay rate, significance weights, repetition thresholds) appear fixed rather than learned per user or per domain. For a user who mentions a critical medical condition once and never again, the memory will decay toward forgetting threshold despite its obvious importance. The system has no mechanism to distinguish "mentioned rarely because unimportant" from "mentioned rarely because traumatic or taken for granted."

**Unspoken infrastructure assumption:** Memory summarization relies on OpenAI's API even when the inference model is open-source. The `launch_chatglm_app.sh` configuration requires `OPENAI_API_KEY`. Teams deploying in air-gapped environments, with strict data residency requirements, or on tight API budgets face a hidden dependency that the README mentions only in passing.

**No multi-hop reasoning.** MemoryBank retrieves relevant memories and injects them into context, but it does not link memories to each other or propagate updates across related memories. Asking "how have my feelings about my job changed over the past year?" requires synthesizing a chain of episodic memories. A-MEM's Zettelkasten-style linking and memory evolution would handle this better; MemoryBank would return a flat list of job-related memories without temporal synthesis. [See A-MEM for the contrast.](../concepts/agentic-memory.md)

**Scale limits untested.** All experiments use a single Tesla A100 80GB GPU. The system stores memories in JSON files rather than a vector database. At thousands of conversations or millions of memories, the retrieval approach needs replacement.

## When NOT to Use It

**Multi-hop reasoning tasks.** If your application requires synthesizing relationships across multiple stored memories (connecting a past project failure to a current proposal, tracing how user preferences evolved), MemoryBank's flat retrieval model will underperform systems with explicit memory linking like A-MEM or graph-enhanced approaches.

**Strict data privacy deployments.** The dependency on OpenAI for summarization means conversation content leaves your infrastructure. Healthcare, legal, and enterprise deployments with data residency requirements need to replace this component explicitly.

**High-volume production systems.** JSON-file memory storage and the absence of a proper vector database layer mean this architecture requires non-trivial re-engineering before handling production load at scale.

**Tasks requiring temporal precision.** "What did the user say on March 4th?" or "What changed between month one and month three?" require temporal indexing. The forgetting curve addresses relevance over time, not temporal lookup. Zep's bi-temporal indexing is the better fit for temporal queries.

## Unresolved Questions

The documentation does not address how significance scores are assigned at storage time, whether this is automated or manual, or how to tune the weights for domains other than companionship. There is no explanation of what happens when the forgetting curve prunes a memory that turns out to be important later, or how to audit what the system has forgotten. The relationship between the personality synthesis mechanism and individual episodic memories is also underspecified: when new memories contradict the existing personality model, which wins?

## Alternatives

| Use case | Better choice |
|---|---|
| Multi-hop reasoning across memories | [A-MEM](https://github.com/WujiangXu/A-mem): Zettelkasten-style linking, memory evolution, 2.5x improvement on multi-hop F1 |
| Temporal queries ("what changed when?") | Zep with bi-temporal indexing |
| Production scale with structured retrieval | MemGPT / Letta: OS-inspired memory hierarchy with explicit paging |
| Pure retrieval without decay semantics | Standard RAG with a vector database (Chroma, Pinecone, Weaviate) |

Use MemoryBank when the forgetting/reinforcement dynamics matter for the user experience specifically, particularly in companionship or coaching applications where human-like memory behavior is a feature rather than an implementation detail, and when the deployment is small enough to avoid the JSON storage scaling wall.
