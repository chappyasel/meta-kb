---
entity_id: longmemeval
type: project
bucket: agent-memory
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/memorilabs-memori.md
  - repos/supermemoryai-supermemory.md
  - repos/nemori-ai-nemori.md
  - repos/mem0ai-mem0.md
  - repos/michaelliv-napkin.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/volcengine-openviking.md
  - deep/repos/michaelliv-napkin.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T05:25:03.384Z'
---
# LongMemEval

## What It Is

LongMemEval is a benchmark for evaluating conversational AI systems on long-term memory tasks across multiple sessions. Published at ICLR 2025, it tests whether AI assistants can retrieve and reason over information spread across hundreds of prior conversations, not just the immediate context window.

The benchmark contains 500 questions drawn from realistic multi-session conversation histories. Sessions scale from single conversations (the S dataset) to roughly 500 sessions (the M dataset), making it one of the most demanding evaluations for agent memory systems.

## What It Tests

Five categories of memory and reasoning:

- **Single-session memory**: Retrieving facts from one specific prior session
- **Cross-session synthesis**: Combining information across multiple sessions to answer one question
- **Temporal reasoning**: Tracking how user information changes over time and reasoning about when things happened
- **Preference evolution**: Detecting when preferences shift across sessions
- **Negative recall**: Correctly identifying when no prior session contains the answer

The temporal reasoning and cross-session synthesis tasks are where current systems fail most visibly. A user who mentions dietary restrictions in session 12 and an allergy in session 47 creates a query no single-session retrieval system handles cleanly.

## Datasets

Three splits, escalating in difficulty:

| Split | Sessions | What makes it hard |
|-------|----------|---------------------|
| Oracle | 1-6 | Baseline, small history |
| S | ~40 | Moderate multi-session retrieval |
| M | ~500 | Long-range retrieval, temporal drift |

GPT-4o with full context scores 92.4% on Oracle, 64% on S, and fails entirely on M (context window exceeded). The M dataset is effectively inaccessible to full-context approaches.

## Reported Scores (Credibility Assessment)

Scores in this space are predominantly self-reported by system authors:

- **Zep** (temporal knowledge graph): Up to 18.5% accuracy improvement over baseline, 90% latency reduction on LongMemEval. Reported by Zep's own paper. [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- **napkin** (BM25 on markdown): 91% on S, 83% on M. Reported by the napkin project README. [Source](../../raw/repos/michaelliv-napkin.md)
- **Mem0**: Benchmarked primarily on LOCOMO, not LongMemEval directly. [Source](../../raw/repos/mem0ai-mem0.md)

No independent replication of these scores is documented in the source material. The M dataset scores in particular should be treated cautiously until reproduced outside of the submitting teams.

## Why It Matters

Most memory benchmarks test retrieval from a handful of documents or a single session. LongMemEval's M split is unusual: 500 sessions means any system that naively stuffs history into context fails by construction. This forces evaluations to surface genuine architectural differences between memory strategies.

The benchmark also tests temporal reasoning explicitly. A question like "What was her job when she started learning Spanish?" requires not just finding the Spanish mention and the job mention, but ordering them correctly in time. Few benchmarks stress this.

## Key Architectural Finding

Full-context retrieval degrades sharply as session count grows, while selective retrieval systems (BM25, knowledge graphs, vector search with summaries) maintain higher accuracy. The napkin result is notable: BM25 on raw markdown files, with no embeddings or graph construction, scores 83% on the M dataset while GPT-4o with full context cannot run the dataset at all. This suggests retrieval architecture matters more than retrieval sophistication for the hardest splits.

## Limitations as a Benchmark

**Coverage**: LongMemEval tests conversational memory specifically. It does not cover agent tool use, structured data recall, or memory under adversarial conditions.

**Annotation**: The 500 questions were curated, not naturally occurring. Whether the distribution of question types matches production agent workloads is an open question.

**Scoring**: Questions are evaluated against reference answers, and the exact scoring rubric affects how partial credit is handled. Temporal reasoning questions with approximate answers (correct year, wrong month) may score differently across evaluations.

**No standardized leaderboard**: Teams run their own evaluations on their own infrastructure with their own prompting, making direct comparison between reported scores unreliable.

## When NOT to Use This Benchmark

If you are building a single-session assistant with no persistent memory across users or conversations, LongMemEval scores tell you nothing useful. The benchmark is specifically calibrated to multi-session, long-horizon memory. A system that scores poorly here may still perform well if your actual sessions are short and self-contained.

Similarly, if your application involves structured data retrieval (database queries, calendar access) rather than conversational history recall, the benchmark does not reflect your problem.

## Unresolved Questions

The documentation does not clarify:

- How temporal annotations handle timezone or calendar ambiguity in source conversations
- Whether the M dataset distribution of session lengths is uniform or reflects realistic user engagement patterns
- How the benchmark handles contradictory information across sessions (does the later session always win?)
- Governance of the benchmark: who validates new submissions, and whether there is an official leaderboard

## Related Concepts

Relevant memory architectures being evaluated against this benchmark:

- Temporal knowledge graphs (Zep/Graphiti approach): Scores well on cross-session synthesis
- BM25 lexical retrieval (napkin approach): Scores well on the M dataset with minimal infrastructure
- Vector search with LLM-generated summaries (Mem0 approach): Evaluated more heavily on LOCOMO than LongMemEval

## Selection Guidance

Use LongMemEval when you are comparing memory retrieval architectures for multi-session conversational agents, particularly if cross-session synthesis and temporal reasoning matter to your use case. It is the strongest publicly available benchmark for this problem class as of early 2025.

Use LOCOMO or DMR (Deep Memory Retrieval) instead if you want benchmarks with more established baseline comparisons or if your use case is closer to single-document QA than multi-session dialogue.
