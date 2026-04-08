---
url: 'https://x.com/jumperz/status/2040166448492900356'
type: tweet
author: '@jumperz'
date: '2026-04-03'
tags:
  - agent-memory
  - knowledge-bases
  - self-improving
  - multi-agent-coordination
  - quality-gates
  - context-engineering
  - hallucination-prevention
key_insight: >-
  Separating the review/validation layer from the executing swarm creates a
  critical quality gate for multi-agent knowledge bases—a supervisor agent that
  evaluates articles blind to their production process can catch compounding
  hallucinations before they corrupt the permanent knowledge base and poison
  downstream agent contexts.
likes: 221
retweets: 19
views: 11971
images:
  - images/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my/image.jpg
relevance_scores:
  topic_relevance: 10
  practitioner_value: 8
  novelty: 7
  signal_quality: 7
  composite: 8.5
  reason: >-
    Directly implements Karpathy wiki pattern in a multi-agent swarm with a
    blind supervisor validation layer, per-agent briefings, and a
    compile-validate-feedback loop—covering knowledge substrate, agent memory,
    multi-agent coordination, and self-improving patterns all in one concrete
    architecture.
---
## Tweet by @jumperz

took karpathy's wiki pattern and wired it into my 10 agent swarm 

and here is what the architecture looks like when you make it multi agent:

>every agent auto dumps its output into a raw/ folder as it works
>a compiler runs every few hours and organises everything into structured wiki articles grouped by domain.. infrastructure, signals, content, technical patterns. backlinks, an index.. they're all auto maintained

but the problem is that raw data is dangerous when it compounds cause one hallucinated connection enters the brain and every agent downstream builds on it.. 

so since hermes is my supervisor for my swarm he sits between drafts and live as the review gate...

every article gets scored before it enters the permanent knowledge base so clean outputs get promoted and bad ones just die in drafts

once articles are live, per-agent briefings get generated so each agent starts with exactly the context it needs instead of waking up blank

and this is where it matters that Hermes is a separate system..

it is not part of the swarm it is supervising bascially an agent reviewing its own swarm's work..

and what's interesting that hermes has no context about how the work was produced so no bias toward keeping it so it just reads the article and asks

is this accurate? 
should this enter the permanent brain?

now we have openclaw handles the execution.. running agents, routing tasks, managing channels, dispatching crons and hermes handles the judgment.. reviewing what the swarm produced and deciding what deserves to persist.

the wiki brain ties them together.

>agents produce raw material
>the compiler organises it
>hermes validates it
>briefings feed it back to agents
>the loop runs

ps: you can use any separate agent as the review agent but hermes is great here because nous research literally trains it with structured outputs, function calling, and evaluation-style reasoning  and this is the exact traits you want in a review gate..

and when that review gate is processing hundreds of articles, i think consistency in this case would matter more than raw intelligence..

### Engagement

| Metric | Value |
|--------|-------|
| Likes | 221 |
| Retweets | 19 |
| Views | 11,971 |

### Images

![](../images/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my/image.jpg)
