---
entity_id: locomo
type: project
bucket: agent-memory
sources:
  - repos/supermemoryai-supermemory.md
related:
  - Agent Memory
last_compiled: '2026-04-04T21:20:30.582Z'
---
# LoCoMo

## What It Is

LoCoMo (Long-Context Conversational Memory) is a benchmark and dataset designed to evaluate how well AI systems remember and reason over information shared across extended, multi-session dialogues. It addresses a significant gap in evaluation tooling: most conversational benchmarks test single-session, short-context interactions, leaving the long-term memory capabilities of AI agents largely unmeasured.

## What's Unique

Most conversational QA benchmarks assume a single context window. LoCoMo specifically stress-tests the degradation of recall and reasoning as conversations span many sessions over simulated time. Key distinguishing features:

- **Multi-session structure**: Conversations span dozens of sessions, simulating weeks or months of interaction
- **Temporal reasoning requirements**: Questions require understanding *when* facts were stated and whether they remain current
- **Contradiction and update handling**: The benchmark includes scenarios where earlier statements are revised or contradicted later
- **Realistic dialogue patterns**: Conversations reflect natural topic drift, re-introduction of old context, and implicit references to prior sessions

## Architecture / Dataset Summary

LoCoMo provides structured dialogue datasets where each "conversation" consists of multiple sessions with timestamps. Evaluation queries are categorized by the type of memory challenge they represent:

- **Episodic recall**: Retrieving specific facts from early sessions
- **Temporal reasoning**: Ordering events or understanding recency
- **Contradiction resolution**: Identifying when a user has updated or changed stated preferences/facts
- **Multi-hop reasoning**: Connecting facts across sessions to answer composite questions

Evaluation metrics typically include exact match, F1, and model-judged accuracy depending on the answer type.

## Benchmarks / Key Numbers

Specific star counts and benchmark leaderboard numbers are not available in current source material. LoCoMo is primarily a research artifact rather than a widely-starred open-source tool. Performance on LoCoMo varies significantly by retrieval strategy — naive RAG over full conversation history underperforms structured memory approaches that extract and index facts explicitly.

## Strengths

- Fills a real gap: few benchmarks test genuinely long-horizon conversational memory
- Temporal and contradiction dimensions are underrepresented elsewhere
- Useful for comparing [Agent Memory](../concepts/agent-memory.md) architectures (e.g., RAG vs. structured fact stores vs. full-context models)

## Limitations

- Dataset may not capture all real-world memory failure modes (e.g., user identity confusion, privacy-motivated forgetting)
- Simulated dialogues may not fully reflect organic long-term human-AI conversation dynamics
- As a benchmark, it measures what it measures — good LoCoMo scores don't guarantee production memory quality
- Limited community tooling compared to mainstream NLP benchmarks

## Practical Implications

Systems like [Supermemory](../projects/supermemory.md) address the exact failure modes LoCoMo probes — staleness, contradiction, and temporal drift. LoCoMo can serve as a principled evaluation harness when comparing:

- Full-context LLMs (long-context window models)
- Retrieval-augmented approaches over conversation history
- Structured memory with explicit fact extraction and update handling

## Alternatives / Related Benchmarks

- **MSC (Multi-Session Chat)**: Earlier multi-session benchmark, less focus on temporal reasoning
- **LOCRET / LongMemEval**: Related long-context memory evaluation efforts
- **SCROLLS**: Long-document comprehension, not conversational

## Sources

[Supermemory](../../raw/repos/supermemoryai-supermemory.md)


## Related

- [Agent Memory](../concepts/agent-memory.md) — implements (0.7)
