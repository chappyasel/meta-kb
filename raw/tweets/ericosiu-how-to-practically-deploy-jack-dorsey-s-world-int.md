---
url: 'https://x.com/ericosiu/status/2040543007716553088'
type: tweet
author: '@ericosiu'
date: '2026-04-04'
tags:
  - agent-systems
  - knowledge-bases
  - agent-memory
  - world-model
  - vector-database
  - organizational-coordination
  - local-inference
key_insight: >-
  The 'world model' (unified vector database syncing all company data every 15
  minutes) is the critical bottleneck that most AI-native organization
  blueprints overlook—without months of accumulated, well-structured data
  flowing into agents, coordination remains shallow regardless of model
  capability.
likes: 774
retweets: 103
views: 150170
relevance_scores:
  topic_relevance: 6
  practitioner_value: 5
  novelty: 5
  signal_quality: 5
  composite: 5.4
  reason: >-
    Describes a practical implementation of a company-wide vector database
    'world model' syncing all organizational data to feed AI agents—directly
    relevant to agent memory and knowledge base architecture patterns, though
    the signal is a tweet/article summary with limited technical depth.
---
## Tweet by @ericosiu

https://t.co/ySUpmxpwFo

### Engagement

| Metric | Value |
|--------|-------|
| Likes | 774 |
| Retweets | 103 |
| Views | 150,170 |


---

## How to practically deploy Jack Dorsey's 'world intelligence' today

Jack Dorsey just published a blueprint for AI-native companies.

We’ve been running a version of it for 4 months.

It powers 50+ daily workflows, coordinates decisions across teams, and surfaces issues 10x faster than our leadership layer.

It also breaks in ways no one talks about.

Here’s what actually happens when you deploy this inside a real company.



Jack Dorsey just published the blueprint my company has been building for 4 months.

His essay with Roelof Botha, "From Hierarchy to Intelligence," dropped April 1. It got 5 million views in 48 hours. People are calling it the most important organizational design document since the Toyota Production System paper.

I read it on my phone at 6am. Then I read it again. Then I walked over to the Mac Studio running our AI chief of staff and thought: wait a minute, we already have a version of this.

Not all of it. But enough of it that I can tell you what the essay gets right, what it leaves out, and what actually happens when you try to run a company this way.

Since late December 2025, we've been rebuilding our entire company around AI agents. Building it internally, breaking things weekly, and writing down what works.

Here's what Dorsey's framework looks like when a smaller company actually implements it. And how any founder reading this can do the same.

Dorsey and Botha describe four layers for an AI-native organization:

Layer 1: Capabilities (the raw AI tools).

Layer 2: World Model (the company's living memory).

Layer 3: Intelligence Layer (the thing that makes decisions).

Layer 4: Surfaces (where humans interact with the system).

Block is doing this at 6,000-person scale. They're cutting middle management and replacing coordination layers with AI. We're doing it as a smaller company, which means we can move faster and break things more visibly.

Let me map each layer to what we actually run. Any company can follow this same playbook.

Layer 1 is the hardware. Dorsey mentions the capability shift from Opus 4.5 and Codex 5.3 last December. That's when we started too. The models crossed a threshold where they could hold enough context to actually understand a business, not just answer questions about one.

Here's the current machine stack:

```

```
Mac Mini M4 (32GB)
Alfred: CEO agent
Crons: 50+ daily jobs
Message routing
DGX Spark GB10 (128GB) - adding more as needed
Local inference
Team agent hosting
World Brain vector DB
Mac Studio Ultra - adding more as needed. 
Client agent fleets
Overflow compute
```

```

The DGX Spark is new. Moving from cloud API endpoints to local inference cuts costs by roughly 70%. And with Google's Gemma 4 combined with NVIDIA compressing it 4x, the cost savings will be even better.

Layer 2 is where it gets interesting. Dorsey describes two "world models" at Block: one for internal operations, one for customer behavior. We're building something similar. We call it the Single Brain.

Single Brain is a unified vector database that ingests all company data every 15 minutes. Slack messages. CRM records. Call transcripts from Gong. Google Analytics. Search Console data. Client deliverables. Meeting notes. Financial data. Everything.

```

```
Every 15 min:
Slack ──┐
CRM  ──┤
Gong ──┤──> Single Brain
GA4  ──┤    (vector DB)
GSC  ──┤       │
Docs ──┘       ▼
Agent queries
Decisions
Actions
```

```

Every agent in our system queries this same brain. When our sales agent evaluates a lead, it sees the full picture. Marketing performance. Past client results in that vertical. Current team capacity. It doesn't just know the lead's company size. It knows whether we can actually deliver for them.

This is what Dorsey means by "world model" and it's the part most people will underestimate. The model isn't the AI. The model is the data structure that lets the AI understand your specific business. It takes months to build because the data has to accumulate. And that's true whether you're running a 10-person startup or a 500-person company.

Layer 3 is the intelligence layer. Dorsey describes this as the thing that "composes products dynamically." At Block, their AI routes transactions, composes financial products, coordinates across Cash App and Square without human middle managers making those calls.

At Single Grain, our intelligence layer is a fleet of specialized agents:

Alfred handles CEO operations. Calendar, email triage, task coordination, strategic analysis. He runs my day.

Arrow runs sales. Lead scoring, outbound sequences, pipeline tracking, meeting prep. He does this with my team.

Oracle handles SEO. Keyword research, content gap analysis, competitor monitoring, ranking reports. She gets stronger by the day with my team (they made their own SEOClaw to work with Oracle)

Flash does organic social content. Drafts, repurposing, distribution strategy, performance tracking.

Cyborg manages recruiting. Sourcing candidates, screening, scheduling, drip campaigns.

The World Agent sits above all of them. It's the organizational brain that sees everything and coordinates across agents.

We also run two automated systems. AutoResearch does continuous pattern mining across all our data. AutoGrowth runs A/B experiments automatically. Both feed results back to the World Brain.

50+ cron jobs fire daily. These are the nervous system of the operation. Data syncs, report generation, alert triggers, cleanup tasks, health checks. TBH in many cases, we don't need crons because triggers will suffice.

Here's what our org looks like now versus six months ago:

```

```
BEFORE:
CEO
C-suite
├─ VP Marketing
│   ├─ SEO Lead
│   ├─ Content Lead
│   └─ Social Lead
├─ VP Sales
│   └─ SDRs
├─ Operations
└─ HR
AFTER:
CEO
├─ World Agent
│   ├─ Alfred (ops)
│   ├─ Arrow (sales)
│   ├─ Oracle (SEO)
│   ├─ Flash (content)
│   ├─ Cyborg (recruit
├─ DRI teams (temporary)
└─ ICs (human specialists)
The team counts on the context from the agents to help them make better decisions, faster.
```

```

Any company can draw this diagram for their own org. The specific agents change. The structure doesn't. You need a coordinator, specialized agents mapped to business functions, temporary project teams, and humans doing the work that requires human judgment.

Layer 4 is surfaces. Where humans touch the system. Dorsey talks about this in terms of customer-facing products. For us, it's Slack channels, dashboards, and agent outputs that show up wherever the team already works. No one logs into an "AI platform." The agents meet you where you are.

Now the part Dorsey's essay doesn't cover. What's actually hard about this.

Agent coordination is a mess. When you have multiple agents operating on the same data, they conflict. The sales agent promises a client timeline that the SEO agent's data says you can't hit. The content agent creates content based on keywords that the SEO agent deprioritized two hours ago. The ops agent schedules a meeting during a block that the recruiting agent already claimed for an interview.

We had to build a conflict resolution system. And a security layer with NemoClaw that does kernel-level sandboxing and policy enforcement on every agent. We built multi-tier permissioning: data that everyone sees, data restricted by role, and data that only the CEO and the organizational brain can access.

None of this existed three months ago. We built it because agents kept doing things they shouldn't. One agent almost emailed a client's financial data to the wrong contact. That's when we got serious about security.

If you're building this yourself, plan for security on day one. We didn't. We should have. The agents will find creative ways to access data they shouldn't touch.

The DRI system is borrowed directly from Dorsey's essay is critical. DRI stands for Directly Responsible Individual. In our case, a DRI can be an agent team, not a person. You spin up a temporary team around a specific goal, give it 90 days, and it either hits the target or dissolves.

Each DRI has agents assigned to it. When the DRI completes or fails, the agents return to the general pool and the learnings get absorbed into the World Brain. The organization gets smarter from every project, including the failures.

This is the part any company can steal immediately. Pick your top three business goals. Create a DRI for each one. Assign agents. Set a deadline. Measure.

We're rolling out personal agents for every team member. Each person gets their own AI agent configured to their role, with appropriate data access, connected to the same Single Brain.

The target architecture is actually simpler than what we run today. We're consolidating down to fewer, more capable core agents: one for the CEO, one for the organization, and one execution agent with multiple skill modes. Fewer agents, more capability per agent. The models are good enough now that one agent with the right context can do what multiple specialized agents did six months ago.

Here's the thing about compounding that Dorsey hints at but doesn't fully explain.

Month 1 of this system was terrible. Agents hallucinated. Data was wrong. Automations broke at 3am. I spent more time fixing the system than the system saved me.

Month 2 was slightly better. The Single Brain had enough data to start making connections. AutoResearch surfaced a pattern in our sales calls that no human had noticed. Certain keywords prospects used in the first five minutes of a call correlated with 3x higher close rates. Our sales agent started prioritizing those leads automatically.

Month 3, the flywheel started turning. Each agent's outputs improved because the Single Brain had three months of data instead of three weeks. SEO recommendations got better because the system could see which recommendations from month 1 actually moved rankings. Content improved because the system could see engagement data from its own prior work.

Now, it feels like a different company. The system catches things I miss. It runs processes I forgot I set up. It makes connections across departments that would require a full leadership meeting to surface in a normal company.

This compounding curve is the same regardless of company size. The variable is how much data you feed it and how consistently. A company with a busy CRM and active Slack workspace will compound faster than one with sparse data. The loop matters more than the tools.

Months of continuous data ingestion creates a world model that would take a competitor a long time to replicate. Not because the technology is secret. Because the data is proprietary and accumulates in ways that can't be fast-forwarded. This is the real moat Dorsey is describing, and most readers will miss it because it sounds boring compared to the AI layoff headlines.

That brings me to the product angle. Everything I just described, the Single Brain, the agent architecture, the DRI system, the security layer, becomes a product you can sell to clients. Run it internally first. Prove it works. Then deploy it for companies that want the same operating system but don't want to spend months building it from scratch.

We're doing exactly that. The agency model used to be: sell services, deliver services. The new model is: sell the intelligence layer that makes those services 10x more effective, and the services come with it.

If you run an agency or a consulting firm, this is the play. Your internal implementation becomes your product. Your months of compounded data and learnings become your differentiation. Clients aren't buying software. They're buying the fact that you already made the mistakes and know what works.

Any company can apply this framework. You need three things: a way to ingest your data continuously, agents that can query that data and take actions, and a feedback loop that tracks outcomes and feeds them back into the system. The stack matters less than the loop. If your system learns from its own output, it compounds. If it doesn't, month 6 looks the same as month 1.

Dorsey can afford to write a manifesto because he has Block's resources. Most companies reading his essay will nod along and then do nothing because the gap between theory and implementation is enormous.

That gap is the business opportunity.

The uncomfortable truth: most companies will not build what Dorsey describes. The org chart change is too threatening. The upfront investment is real. The first three months feel like you're going backwards. You need someone willing to let AI agents make mistakes with real business data while the system learns.

Most executives won't stomach that. Most boards won't approve it. Most middle managers will actively work against it because the essay literally describes eliminating their coordination role.

The companies that do build this will operate at a fundamentally different speed. Not 10% faster. A different game entirely. 1000% faster. Because their organization learns from every action and compounds that learning automatically.

Four months in, I can tell you the compounding is real. The pain of months 1 and 2 was real too. Both of those things are true, and anyone who tells you otherwise is selling something or hasn't actually built it.

Dorsey wrote the theory. We're writing the implementation notes. And those notes are getting longer every day.



If you're a business interested in having AI systems built, you can go to https://www.singlebrain.com or for marketing help, just go to https://www.singlegrain.com 

For more like this, level up your marketing with 14,000+ marketers and founders in my Leveling Up newsletter here for free: https://levelingup.beehiiv.com/subscribe

If you want to join up with our team,  'beat AI' first ;) 
