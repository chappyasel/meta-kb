---
url: 'https://x.com/vtahowe/status/2040832207087194448'
type: tweet
author: '@vtahowe'
date: '2026-04-05'
tags:
  - context-engineering
  - agent-systems
  - enterprise-infrastructure
  - identity-access-management
  - decision-tracking
  - agent-autonomy
  - knowledge-retrieval
key_insight: >-
  Context graphs represent a fundamental shift from storing outcomes to storing
  decision-making processes, but their realization depends on solving enterprise
  IAM at scale—agents need simultaneous autonomy (to discover context),
  capability (to access fragmented systems), and security (to enforce
  fine-grained retrieval permissions), which current IAM architectures cannot
  provide.
likes: 63
retweets: 8
views: 5946
relevance_scores:
  topic_relevance: 7
  practitioner_value: 5
  novelty: 6
  signal_quality: 6
  composite: 6.1
  reason: >-
    Context graphs as decision-process memory stores are directly relevant to
    agent memory and knowledge base architecture, but the article focuses
    heavily on IAM/enterprise access management rather than implementation
    patterns for building such systems.
---
## Tweet by @vtahowe

https://t.co/5HtJm0KsEw

### Engagement

| Metric | Value |
|--------|-------|
| Likes | 63 |
| Retweets | 8 |
| Views | 5,946 |


---

## Context Graphs: an IAM Problem at Scale

What is a Context Graph?

I first learned about context graphs from @akoratana. On an Insecure Agents podcast with Animesh I learned that a context graph is a system that captures and stores how decisions are made, not just the final outcomes. Once built, you can use a context graph as a world model to predict outcomes and model behaviors. 

Suddenly, everyone at your company can learn from every decision that has been made. This is newly possible with agents that sit on the decision trace, observe decisions as they are made, and use that context to analyze patterns and discover relationships across the enterprise. 

This is why context graphs have captured the attention of VCs, AI-native startup founders, and enterprises. 

Context graphs get so much hype because they represent the realization of the full potential of agents. However, without proper agent identity and access management (IAM), most companies will never build one.

Context graphs are an IAM problem at scale for two key reasons:

Context Discovery (Building the Graph)

Agents need high levels of access and autonomy to navigate the enterprise and accumulate context.

Context Retrieval (Using the Graph)

A context graph produces a shared memory store everyone at your company can access.

Both of these functions depend heavily on robust agent identity and access management.

Why Build a Context Graph

Context graphs unlock the ability to understand why decisions were made. Animesh Koratana explains this in his viral X article on context graphs.

“Your CRM stores the final deal value, not the negotiation. Your ticket system stores "resolved," not the reasoning. Your codebase stores the current state, not the two architectural debates that produced it.”

We couldn’t do this before because we didn’t have a way to capture fragmented context: a message in slack, an update in your CRM, a merged pull request that triggers a code deploy. Agents naturally sit where decisions get made, can observe them, record them, and then organize that information into a world model accessible to your entire organization. Now every decision is something everyone on your team can learn from.

This is a massive unlock for enterprises and reveals the true potential of agents. These are agents that can help enterprises make better decisions, iterate faster and more intelligently than competitors, and self improve over time.

Jaya Gupta, partner at Foundation Capital, explains in her recent and equally viral X article, Google's 20-Year Secret Is Now Available to Every Enterprise, how this becomes possible as context graphs gain density:

“And once these graphs become dense enough, the game changes from retrieval to prediction. Instead of "how did we handle this last time?" you can ask "if we structured the deal this way, what's likely to happen?"—grounded not in generic training data but in your organization's actual decision history and outcomes. That capability does not fully exist yet, but the companies assembling these foundations are building toward it.”

In other words, the race amongst competitors of who can climb the agent autonomy curve first is on.

Why IAM is Blocking Companies From Building a Context Graph Today

Context graphs create two distinct IAM problems.

First, discovery. Agents need permission to traverse systems and collect context. Without meaningful access, they cannot build a useful model of how decisions are made.



Second, retrieval. Once that context exists in a shared memory layer, who gets to see what?

If a context graph creates a shared world model that is accessible across the enterprise (which is the key strength, and frankly the whole point of it), how do we manage access to that memory store? We can’t decide that only a subset of the enterprise gets access because then the value from the context graph is lost. The access management strategy for a context graph has to be more nuanced.

If an executive’s agent learns sensitive details from private email threads, should every employee have access to that memory? 

If Alice is on the engineering team and her agent records a mandate from leadership to cut the engineering team by 30% and invest more into AI, should a junior engineer be able to access that information? 

If a sales agent observes confidential negotiation tactics, what should be shared broadly versus withheld? 

That’s why just giving agents read-only access to everything isn’t a practical solution. Who can read what and when from the shared memory derived from a context graph requires an IAM solution that provides context-aware, task based authorization.

Context discovery and context retrieval requires agents with autonomy, capability, and security, but the current reality is most agents only have 2 out of the 3. Without all 3, traversing the context graph at scale becomes impossible.



In her X article, Google's 20-Year Secret Is Now Available to Every Enterprise, Jaya explains

“For some companies, the play is owning their own context graph, building the proprietary decision infrastructure that makes their agents smarter than anyone else's in their domain. For these, a new infrastructure layer will emerge: the picks and shovels for constructing, securing, and querying context graphs at enterprise scale”

At the core, the inability to give agents the autonomy, capability, and security they need to build context graphs is an identity and access management problem. Autonomy requires humans to exit the loop and let hard boundaries like IAM policies enforce what agents can and can’t do when they inevitably go wrong. Capability requires wide access grants and secrets sharing, which is only reasonably possible with highly ephemeral, task scoped credentials. Security for highly autonomous and capable agents is only possible if a detailed audit log can show you every step they take as they navigate the context scattered across the enterprise.

Jaya is right that there are key shovels missing for companies to use to build context graphs. For security, Keycard is that shovel.

Keycard is the missing identity infrastructure needed to build a context graph

There’s a lot of reasons I’m excited about @KeycardLabs, but ultimately I am most excited because I believe Keycard is the unlock for enterprise AI.

With Keycard your agents don’t need access to local secrets. We wrote a blog on how we ran OpenClaw without an env file.

With Keycard you can shut down a rogue agent instantly, either piecemeal (shut down Google Workspace access) or in total (shut down access to every resource). This is the top item on the OWASP Top Ten for Agentic Applications that CISOs tell me keeps them up at night.

With Keycard you can connect the backchannel to your agent. In her article Jaya says

"The strongest objection [to context graphs] is that the most valuable judgment often never emits a trace—it lives in intuition, politics, memory, and side conversations." 

How and why the most important decisions get made lives in the backchannel: your CEOs iMessage, a private slack channel, your Signal messages. Without Keycard, trusting your agents with access to that context is unthinkable.

I share Keycard’s vision that security dev tools should be a business enabler, not a blocker. In my career I have worked as both a software engineer and a security engineer so I deeply understand how devs want to ship fast and security teams want governance and proper guardrails.

Keycard enables both.

With Keycard, devs no longer have to make impossible choices such as do faster agent tools calls with a CLI that provides an insecure shared set of credentials, or slower more secure tool calls with MCP. Keycard’s identity infrastructure works with both so you can use whatever helps you create the best agents.

The opportunity context graphs, and ultimately agents, present is massive. It’s why AI-native companies are well poised to disrupt and replace long-standing incumbents. Their agents sit along the decision trace, accumulate structured context, which in turn creates a world model that can explain why decisions were made, predict outcomes, and model behaviors.

The future is here, but only for those with the identity infrastructure to enable it.
