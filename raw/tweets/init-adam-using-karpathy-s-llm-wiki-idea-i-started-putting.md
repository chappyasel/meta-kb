---
url: 'https://x.com/init_adam/status/2041847636873932983'
type: tweet
author: '@init_adam'
date: '2026-04-08'
tags:
  - knowledge-substrate
  - self-improving
  - agent-architecture
  - trace-driven-optimization
  - open-source-models
  - training-data-flywheel
  - agent-reasoning-capture
key_insight: >-
  Open-source agent trace collection creates a self-reinforcing feedback loop
  for model improvement—capturing the "inner dialogue" of agent reasoning at
  scale enables data-driven optimization that previously only proprietary model
  providers could exploit, fundamentally shifting who can participate in the
  moat-building cycle.
likes: 0
retweets: 0
relevance_scores:
  topic_relevance: 7
  practitioner_value: 5
  novelty: 6
  signal_quality: 5
  composite: 6
  reason: >-
    Directly touches self-improving systems via trace-driven optimization and
    agent feedback loops (topic 6), plus knowledge substrate patterns (Karpathy
    wiki), but the tweet is a high-level summary without implementation details
    or actionable architecture specifics.
---
## Tweet by @init_adam

Using @karpathy's LLM wiki idea, I started putting together a wiki for AI engineering, covering topics like models, harnesses, context, memory, embeddings, and more.

It's truly an excellent way to learn. Every new piece of content ingested opens up multiple paths for further exploration, which quickly leads you down all kinds of rabbit holes.

One interesting thing I came across today:

The crowdsourcing of open agent trace data

In a nutshell:

When you use an AI coding agent, every session produces a trace. This is the full record of prompts, tool calls, reasoning, errors, fixes, and everything else along the way. It is essentially the agent's inner dialogue and process as it does the work.

Leading closed-source model providers like OpenAI and Anthropic collect millions of these traces from users of their products and use them to train better models.

Each improvement drives more usage and generates even more training data. It is a flywheel that creates a massive competitive moat for them.

But now the open source community is starting to build the plumbing to do the same thing: capture agent sessions, scrub PII, publish them as open datasets, and use sampling to identify the traces that are actually high signal.

If it works as intended, it could end up being a key factor in improving open models and helping close the gap with proprietary ones

If you want to dive deeper, check out the post below from @badlogicgames announcing pi-share-hf

### Engagement

| Metric | Value |
|--------|-------|
| Likes | 0 |
| Retweets | 0 |
