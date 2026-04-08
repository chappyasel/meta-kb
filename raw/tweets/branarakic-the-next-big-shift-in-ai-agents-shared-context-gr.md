---
url: 'https://x.com/BranaRakic/status/2040159452431560995'
type: tweet
author: '@BranaRakic'
date: '2026-04-03'
tags:
  - knowledge-bases
  - agent-memory
  - context-engineering
  - agent-systems
  - decision-lineage
  - context-graphs
  - multi-agent-coordination
  - verifiable-knowledge
  - decentralized-knowledge-graph
key_insight: >-
  The convergence of personal knowledge graphs (Karpathy's structured wikis) and
  enterprise decision lineage reveals that agent value comes from shared,
  queryable context graphs with cryptographic provenance—not just memory
  capacity. This shifts the competitive moat from isolated agent-memory products
  to decentralized protocols where trust and decision traces are first-class
  primitives.
likes: 329
retweets: 67
views: 57182
relevance_scores:
  topic_relevance: 9
  practitioner_value: 6
  novelty: 7
  signal_quality: 6
  composite: 7.4
  reason: >-
    Directly addresses shared context graphs, decision lineage, and
    decentralized knowledge protocols for multi-agent coordination—core pillars
    of the KB—with a concrete multi-agent coding use case, though it's a
    tweet/article hybrid without deep technical implementation details.
---
## Tweet by @BranaRakic

https://t.co/UT4yNDrvlJ

### Engagement

| Metric | Value |
|--------|-------|
| Likes | 329 |
| Retweets | 67 |
| Views | 57,182 |


---

## The next big shift in AI agents: shared context graphs

Something interesting is converging. Karpathy is building personal knowledge bases with LLMs. Foundation Capital is writing about context graphs as the next trillion-dollar platform. Every AI lab is shipping agent memory.

They're all circling the same insight: agents don't just need to remember. They need shared, structured context they can reason over together.

Karpathy got there from the developer side - using LLMs to build structured wikis that agents compile, query, lint for inconsistencies, and compound over time. Every answer feeds back in, growing the knowledge corpus. He said there's room for an incredible product here.

And he’s right -  what he's describing is a knowledge graph for agents - a context graph. Foundation Capital arrived at the same conclusion from the enterprise side: companies need "decision lineage" - knowing not just what happened, but who approved it, under what policy, with what precedent. They call the accumulated structure of those traces a "context graph" and argue it will be the most valuable asset in the age of AI.

Two completely different starting points. Same conclusion: the future isn't bigger memory. It's shared, structured context that compounds.

That's what we've been building with the @origin_trail Decentralized Knowledge Graph (DKG) - a protocol for sharing context graphs where agents publish, query, and verify knowledge together. Any agent that can make an HTTP call — Claude Code, Cursor, Codex, LangChain, CrewAI - can participate.

Here's what this looks like for a real use case: multi-agent coding.

Six coding agents — running on Cursor, Claude Code, Codex — collaborating on a codebase. No Slack, no meetings. They initiate a shared context graph on the @origin_trail DKG. It's structured into sub-graphs, each holding a different kind of decision trace:

→ /code graph: functions, classes, imports, call graph. Used to have a better understanding and navigation through the codebase
→ /decisions graph: architectural decisions with rationale and affected files. The why behind every choice. 
→ /sessions graph: who worked on what, when, and a summary of changes. The audit trail.

→ /tasks graph: assignments, dependencies, status, priority. The coordination layer.

→ /github graph: PRs, issues, commits, reviews. The external sync.

Not markdown notes. Not PR comments that get buried. Persistent decision traces that any agent can query at any time.

Agent A finishes refactoring the authentication module and publishes a decision to the shared DKG context graph: "switched from session tokens to JWTs - simpler to scale across microservices, no server-side state to manage." That decision goes into the /decisions graph with the author's identity, a timestamp, and links to the affected files.

Next morning, Agent B starts building the user permissions system. First thing it does: query the context graph for anything affecting auth. Gets back the rationale, the new token format, the updated middleware signature from /code, and the open PR from /github. One query. Full context. Zero coordination overhead.

That's what sharing context looks like. Not "read my markdown notes." Not "check Slack." A structured, queryable knowledge base where every contribution has provenance and every agent can build on what came before.

But sharing isn't enough. You also need trust.

Today, Agent B has no way to know whether Agent A's claim is reliable. Was it tested? Did anyone review it? Is it still current? Every piece of agent memory sits at the same level - an untested hypothesis carries the same weight as a finding confirmed by three independent sources. That's how hallucinations compound. That's how agent swarms build confidently on shaky foundations.

Think about how this works in software teams today. You experiment in a local branch - just you, trying things, discarding what doesn't work. You push a draft PR so your team can review. You merge to main - now it's official. Senior engineers approve the release - now it's verified.

Different stages, different trust. The DKG builds this into the protocol for shared context graphs:

Working Memory graph → private scratch space. Experiment freely, nobody sees this (the agents local branch)

Shared Working Memory graph → team staging area. Visible, but not final. (the PR territory)

Long-term Memory graph → permanently published and stored, with cryptographic provenance. (merged code territory)

Verified Memory graph → multiple independent agents agree via consensus or confirmation threshold (release territory)

Agents can filter by trust. "Show me only what the team has formally agreed on" queries Verified Memory. "Show me everything in progress" queries Shared Working Memory. "Show me only release-approved changes" queries a stricter quorum threshold.

A pharmacy agent checking a drug batch doesn't want "some agent said this is safe." It wants: "the manufacturer, distributor, and regulator all independently verified this chain of custody, and their signatures are on-chain."

At 10 agents, you can read everyone's output. At 1,000, you need filters. Trust levels ARE the filter.

Each decision published to the context graph is an ownable Knowledge Asset on the DKG, anchored on-chain with TRAC and knowledge NFTs. Knowledge with cryptographically embedded decision TRACes, if you will. And unlike every AI memory product on the market — no central authority owns the data. Your agents run on your devices. Your context graphs belong to you.

Every major AI lab is building memory. None of them are building shared context graphs with trust built in. None of them are capturing decision traces as structured, queryable, verifiable knowledge.

Shared context. Structured knowledge. Trust at every layer. Every decision a TRAC(e).

That's the @origin_trail DKG. A fresh new version is just around the corner with all the goodies - give it a spin.

👉 github.com/OriginTrail/dkg-v9

Join the red team here:: https://t.me/+9uMXqEpCsNFlYzI0
