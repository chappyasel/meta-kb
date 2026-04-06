---
entity_id: knowledge-base-evolution
type: concept
bucket: knowledge-bases
abstract: >-
  Knowledge base evolution describes how agent-maintained document stores update
  themselves through query feedback, automated linting, and content synthesis —
  distinguishing dynamic self-improving memory from static retrieval indexes.
sources:
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
related: []
last_compiled: '2026-04-05T23:11:49.678Z'
---
# Knowledge Base Evolution

## What It Is

Knowledge base evolution describes the process by which an LLM-maintained document store changes its own content over time. Queries feed back into the corpus. Automated health checks find gaps and inconsistencies. Outputs get filed as new articles. The knowledge base at query time differs from the knowledge base at ingestion time, and the difference accumulates from agent activity rather than human editing.

This contrasts with static retrieval systems, where the index is a snapshot of documents that humans curated and the retrieval layer finds chunks within it. In an evolving knowledge base, the agent writes, revises, and reorganizes the content itself.

## How It Works

Karpathy's implementation illustrates the core loop. Raw sources land in a `raw/` directory. An LLM compiles them into a `wiki/` directory of `.md` files, generating summaries, backlinks, concept articles, and cross-references. The LLM maintains index files and brief per-document summaries that let it navigate the corpus without loading everything into context. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

Four distinct processes drive evolution:

**Query-driven expansion.** When a user asks a complex question, the agent researches it against the wiki and renders output as a new markdown file or Marp slide deck. That output gets filed back into the wiki. Future queries can reference it. Each question leaves a trace.

**Self-healing linting.** Periodic health check passes run the LLM over the corpus looking for inconsistent data, missing fields, broken cross-references, and interesting connection candidates. The LLM uses web search to impute missing information. Articles get corrected or merged without human intervention.

**Synthetic index maintenance.** Rather than relying on vector embeddings, the LLM writes and updates plain-text index files describing what each document contains. These indexes let the agent answer routing questions ("which articles cover X?") without reading everything. The agent updates these indexes incrementally as the corpus grows.

**Connection discovery.** The LLM suggests new article candidates by finding relationships the existing structure doesn't capture. These suggestions become new documents, which in turn create new backlink targets for existing articles to reference.

At ~100 articles and ~400K words, this approach matches or replaces traditional RAG. The bottleneck shifts from retrieval architecture to maintaining index coherence and preventing linting loops from diverging. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

## Why It Matters

Static knowledge bases decay. Research moves, terminology shifts, contradictions accumulate across documents written at different times. Human maintenance doesn't scale past a few hundred documents for individual researchers. Evolution through agent loops addresses the maintenance problem without increasing human editorial load.

The architectural insight from Karpathy's commentary: agents don't need massive context windows if they maintain queryable indexes over their own storage. Clean file organization plus self-maintained indexes substitutes for expensive embedding infrastructure at small-to-medium scale. [Source](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)

The longer-term trajectory points toward weight incorporation. As a repo grows large enough, synthetic data generation from wiki content feeds finetuning, so the model "knows" the corpus in its weights rather than retrieving it at query time. Evolution through interaction becomes evolution through training.

## Failure Modes

**Degenerate linting loops.** If a health check pass incorrectly flags correct content and the corrective action introduces new errors, subsequent passes can amplify the mistake. Without tracking which self-modifications succeeded or failed, the system has no way to detect or reverse the degeneration. Self-improving agents must solve this tracking problem; a simple linting loop does not. [Source](../raw/tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md)

**Index drift.** The agent-maintained indexes are only as accurate as the LLM's ability to characterize document content. If the LLM misclassifies a document's topic or fails to update an index after a content revision, routing queries go to the wrong articles. At small scale this is recoverable; at a few thousand documents, stale indexes silently degrade retrieval quality.

**Contradiction propagation.** When two source documents disagree, the LLM synthesis may not surface the conflict. It may instead blend the two accounts into a coherent-sounding but inaccurate summary, which then gets backlinked from other articles. Linting passes can find inconsistencies between articles, but only if they compare the articles against each other rather than accepting each document's internal coherence.

**Scale ceiling.** Karpathy's system works at ~400K words because the LLM can hold relevant index files in context. Past a few million words, even summary-of-summaries strategies hit context limits. The approach does not scale linearly; at some threshold it requires either embedding-based retrieval or a hierarchical indexing scheme the current setup doesn't implement.

## When Not to Use This

Avoid this approach when the corpus requires guaranteed accuracy. Self-healing linting introduces LLM judgment into content modification. For domains like medical protocols, legal references, or compliance documentation, any automated content revision without human review creates liability. The system is designed for research exploration where approximation is acceptable.

Avoid it when multiple contributors need to modify the corpus concurrently. The single-agent assumption breaks under concurrent write access. If two agents lint the same article simultaneously, their modifications conflict and one agent's work disappears. Standard version control helps but doesn't solve the semantic conflict problem.

Avoid it past the scale ceiling without redesigning the indexing layer. Treating the markdown wiki as the sole storage mechanism works up to a point. Past that point, either hybrid retrieval or a different architecture is needed.

## Unresolved Questions

**Conflict resolution between linting agents.** The current setup assumes a single agent maintains the wiki. Multi-agent linting, where different agents run health checks in parallel, needs a conflict resolution protocol. None of the sources describe one.

**Cost accounting at scale.** Running health checks across hundreds of articles generates substantial token usage. Karpathy's setup is personal research infrastructure where cost is secondary. For organizational deployments, the per-document cost of each linting pass compounds as the corpus grows and passes run frequently.

**Ground truth for self-correction.** The linting loop assumes the LLM can judge correctness. For factual domains, this assumption fails when the training data itself contains the error. The system has no external oracle to validate corrections against.

**Retention policy.** Filed query outputs accumulate indefinitely. There is no described mechanism for deciding when an old output has been superseded by a newer one, or when to merge two overlapping articles into one. The corpus grows monotonically.

## Alternatives

**Static RAG with human curation.** Use chunking plus vector embeddings over a human-maintained document set. Retrieval is more reliable at scale, but maintenance is manual. Choose this when accuracy matters more than breadth and editorial bandwidth is available.

**Vector database with automated ingestion.** Automate the ingestion pipeline but keep the index static between ingestion runs. Avoids the self-modification failure modes at the cost of losing query-driven evolution. Choose this when you need scale past a few hundred documents.

**Database-backed agent memory (e.g., Letta).** Structured persistence with explicit memory read/write operations rather than free-form markdown. Better conflict handling and audit trails. Choose this when multiple agents share the same memory layer or when you need reliable tracking of what was added and when.

**Finetuning alone.** At the far end of Karpathy's trajectory, incorporate the corpus into model weights through synthetic data generation and finetuning. Eliminates retrieval latency but requires retraining to incorporate new knowledge. Choose this when the corpus is stable and query latency is the primary constraint.
