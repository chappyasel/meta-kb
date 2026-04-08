---
url: 'https://x.com/ashpreetbedi/status/2041901460523270409'
type: tweet
author: '@ashpreetbedi'
date: '2026-04-08'
tags:
  - multi-agent-systems
  - agent-memory
  - knowledge-substrate
  - context-engineering
  - self-improving
  - data-infrastructure
  - query-curation
key_insight: >-
  Dash's dual-tier knowledge system (curated metadata + auto-learned
  corrections) and schema isolation strategy solve the core failure mode of data
  agents: they separate validated query patterns and business logic from raw
  schema dumps, making agents reliable enough for production use while enabling
  self-improvement through captured corrections rather than pure prompt
  engineering.
likes: 116
retweets: 15
views: 9280
relevance_scores:
  topic_relevance: 7
  practitioner_value: 7
  novelty: 7
  signal_quality: 7
  composite: 7
  reason: >-
    Dash v2's dual-tier knowledge system (curated metadata + auto-learned
    corrections) and multi-agent data architecture directly demonstrate
    transferable patterns for self-improving agent systems and knowledge
    substrate design, with concrete implementation details around schema
    isolation, validated query libraries, and correction-capture loops that are
    applicable beyond the data domain.
---
## Tweet by @ashpreetbedi

https://t.co/0MgpKyo2Ra

### Engagement

| Metric | Value |
|--------|-------|
| Likes | 116 |
| Retweets | 15 |
| Views | 9,280 |


---

## Dash v2: The Multi-Agent Data System Every Company Needs

Ashpreet Bedi on X: "Dash v2: The Multi-Agent Data System Every Company Needs"
Every company with 30+ people should have an internal data agent. 
Today I'm making it dead simple to build one: take 
(free, open-source), run it in your cloud (private, secure), give your team access via Slack.
Most AI-forward companies have already built their own:
This post will show you how to build a best-in-class data system and make it available to your team over Slack. If you do this well, Dash should handle roughly 80% of routine data questions, send daily reports, and catch metric anomalies before anyone asks.
Dash is a self-learning data system made of 3 agents. 
It uses a dual-tier knowledge and learning system to deliver an incredible work-with-your-data experience. You can chat with it via slack or the AgentOS UI. It obviously writes SQL, runs it, and tells you what the numbers mean but more importantly, when it makes a mistake or gets corrected, it learns from it. When your team keeps asking the same question, it builds infrastructure so the answer is faster next time. 
A self-learning data system, not a data agent.
Dash uses its own PostgreSQL database. You don't point it at your production database. You progressively load the tables you want it to work with, along with the context it needs to be useful. This is the part most people skip, and is the part that makes it special.
Here's how it looks like in Slack:
Note: this is synthetic data. I know I'm crazy, but not crazy enough to post our real numbers here 😂
The media could not be played.
Using the AgentOS UI, you can chat with your agents, view sessions, traces, metrics, and schedules. It's the agent platform you didn't know you needed.
Most data agents get a schema dump and the impossible task of writing SQL from business logic that only lives in the data engineer's head. That's why they're bad. Column names and types tell you nothing about the data. They don't tell you that `ended_at IS NULL` means a subscription is active. That annual billing gets a 10% discount. That usage metrics are sampled 3-5 days per month, not daily, so summing them gives you garbage.
Dash uses a carefully curated knowledge system backed by PgVector. It contains:
1a) Table metadata: table schema, column types, what they mean, what to use each table for, the gotchas (date is a particular format). Every table ships with use cases and data quality notes. Eg: status is 'active', 'churned', or 'trial'; always check against subscriptions for ground truth.
1b) Validated queries (must have): battle-tested SQL with the right JOINs, the right NULL handling, the right edge cases. When the Analyst gets your question, it searches knowledge first. Before it writes a line of SQL, it already knows the shape of the data and which traps to avoid.
1c) Business rules: how MRR is calculated, what NRR means, that a customer can have multiple subscription records because upgrades close the old row and open a new one. This is the context that separates a correct answer from a plausible-looking wrong one.
This knowledge is curated by the user, but what makes Dash special is its ability to learns on its own.
Separate from knowledge, Dash captures what it learns automatically (or agentically via tool calls). When the Analyst hits a type error and fixes it, the fix gets saved. When a user corrects a result, that correction is recorded. When the system discovers a data quirk, it notes it.
Next time anyone asks a similar question, the Analyst checks learnings before writing SQL. Dash gets better the more its used.
Dash is three agents. Leader routes requests and synthesizes answers. Analyst writes and runs SQL. Engineer builds views, summary tables, and computed data. They work together, sharing knowledge and learnings.
3a) The Leader has no SQL tools. It cannot touch the database.
3b) The Analyst is read-only. Not "read-only because the prompt says so"; read-only because the PostgreSQL connection is configured with `default_transaction_read_only=on`. The database itself rejects writes. No prompt injection or clever jailbreak changes this. The database says no.
3c) The Engineer can write, but only to the `dash` schema. A SQLAlchemy event listener intercepts every SQL statement before execution and blocks anything targeting the `public` schema. Your company data is untouchable.
This gives you two schemas with a hard boundary:
public schema: your company data. You load it. Agents read it.
dash schema: views, summary tables, computed data. The Engineer owns and maintains it. Humans don't touch it.
There's also an `ai` schema where Dash stores its sessions, learnings, knowledge vectors, and other operational data. It powers the AgentOS UI. You don't interact with it directly, but it's what powers the self-improvement loop (dash improving its own codebase). More on that in v3.
When the Leader notices your team keeps asking the same expensive question (MRR by plan, churn by segment, revenue waterfall) it asks the Engineer to build a view.
The Engineer creates `dash.monthly_mrr_by_plan`. A SQL view joining the right tables, handling all edge cases, producing a clean result. Then it does the critical thing: it calls `update_knowledge` to record the view in the knowledge base. What it contains, what columns it has, example queries.
Next time someone asks about MRR by plan, the Analyst searches knowledge, finds the view, and queries it directly. No complex join. No risk of getting NULL handling wrong. Faster. Pre-validated. Consistent.
The agents build on each other's work. The Engineer creates infrastructure. The Analyst discovers and uses it. The Leader notices patterns and triggers the cycle. Over time, the `dash` schema fills with views and summary tables that nobody manually created. It's an analytics layer the system built for itself, shaped by what your team actually asks about.
You ask a question. Leader delegates.
The Analyst searches knowledge, writes correct SQL, returns an insight.
Good queries get saved to knowledge. Errors become learnings.
Repeated patterns become views. Views get recorded to knowledge.
Next time, the Analyst uses the view. Faster, pre-validated, consistent.
As I mentioned before, Dash isn't a chatbot. It's a system that accumulates institutional knowledge about your data and compounds with use.
Dash is free and open-source, 
and follow the 
for in-depth instructions.
git clone https://github.com/agno-agi/dash && cd dash cp example.env .env # Add OPENAI_API_KEY docker compose up -d --build docker exec -it dash-api python scripts/generate_data.py docker exec -it dash-api python scripts/load_knowledge.py
This starts Dash with a synthetic dataset (~900 customers, 6 tables) and loads the knowledge base (table metadata, validated queries, business rules). 
You can demo the entire system without connecting any real data.
Add OS → Local → `http://localhost:8000`
Connect
The media could not be played.
Dash lives in Slack. You can DM it or mention it in a channel with 
. Each thread maps to one session, so every conversation gets its own context.
Run Dash and give it a public URL (use ngrok for local, or your deployed domain).
Follow instructions in 
to create and install the Slack app from the manifest.
Set `SLACK_TOKEN` and `SLACK_SIGNING_SECRET`, then restart Dash.
The media could not be played.
Once you have Dash running, making it your own is as simples as replacing the sample dataset with your data and giving Dash the context it needs.
Use whatever pipeline you already have. `pg_dump`, a Python script, dbt, Airbyte; it doesn't matter. Dash reads from `public` and never writes to it.
You can use your existing workflow orchestration tools (airflow, dagster), or use Dash's built-in scheduler to load data (more on that later).
For each table, create a JSON file in `knowledge/tables/`:
{ "table_name": "customers", "table_description": "B2B SaaS customer accounts with company info and lifecycle status", "use_cases": ["Churn analysis", "Cohort segmentation", "Acquisition reporting"], "data_quality_notes": [ "signup_date is DATE (not TIMESTAMP) — no time component", "status values: active, churned, trial", "company_size is self-reported" ], "table_columns": [ {"name": "id", "type": "SERIAL", "description": "Primary key"}, {"name": "company_name", "type": "TEXT", "description": "Company name"}, {"name": "status", "type": "TEXT", "description": "Current status: active, churned, trial"} ] }
This is the single highest-leverage thing you can do. The better your knowledge, the better Dash performs. 
We can also auto-generate this, but we'll keep that for another day.
For your most common questions, write the SQL that gives the correct answer and save it in `knowledge/queries/`:
-- <query current_mrr> -- <description>Current total MRR from active subscriptions</description> -- <query> SELECT SUM(mrr) AS total_mrr, COUNT(*) AS active_subscriptions FROM subscriptions WHERE status = 'active'; -- </query>
This is the easiest way to make sure Dash uses your internal semantics for answering routine questions. Remember, your job is to deliver the best work-with-your-data experience for your team, this makes it possible.
Document your metrics, definitions, and gotchas in `knowledge/business/`:
{ "metrics": [ { "name": "MRR", "definition": "Sum of active subscriptions excluding trials", "calculation": "SUM(mrr) FROM subscriptions WHERE status = 'active'" } ], "common_gotchas": [ { "issue": "Active subscription detection", "solution": "Filter on ended_at IS NULL, not status column" } ] }
This is helpful context for Dash but you can skip if its too much work.
After setting everything up, load your knowledge base so Dash can access it.
python scripts/load_knowledge.py # Upsert changes python scripts/load_knowledge.py --recreate # Fresh start
Dash ships with a built-in scheduler. You can schedule any type of task that your container can handle (eg: don't schedule a 90TB map-reduce task on a 2gb container).
Out of the box, dash comes with 1 pre-built schedule that re-indexes your knowledge base every night at 4am UTC:
mgr.create( name="knowledge-refresh", cron="0 4 * * *", endpoint="/knowledge/reload", payload={}, timezone="UTC", description="Daily knowledge file re-index", )
This is the same pattern you'd use to schedule anything:
Daily metric summaries posted to Slack
Anomaly detection runs
Weekly email digests
Automated data quality checks
Register a schedule, point it at an endpoint, Dash handles the rest. The best agents are proactive, and scheduled tasks is the first step in that direction.
Dash ships with five eval categories:
Accuracy: correct data and meaningful insights
Routing: team routes to the correct agent
Security: no credential or secret leaks
Governance: refuses destructive SQL operations
Boundaries: schema access boundaries respected
python -m evals # Run all python -m evals --category accuracy # Run one category python -m evals --verbose # Show response details
You can deploy Dash to railway with one command:
cp example.env .env.production # Edit .env.production — set OPENAI_API_KEY railway login ./scripts/railway_up.sh
Railway is fine for getting started, eventually you'd want it wherever your existing data infrastructure lives. Everything is containerized so should be straightforward to deploy. Be mindful of the egress costs.
Note: Production requires a `JWT_VERIFICATION_KEY` from 
for RBAC. It would be insane to expose dash on a public endpoint. See the 
for more details.
Dash is built with systems engineering principles, you can read more here:
Ashpreet Bedi
Systems Engineering: Building Agentic Software That Works
In the early 1940s, Bell Labs was building the national telephone network, the most complex technical system in the world at the time. Millions of switches, cables, relays, and operators had to work...
If there's interest, I might do deep dives on each layer of the system:
Agent Engineering: The business logic. Model, instructions, tools, knowledge, and the self-learning loop.
Data Engineering: The context layer. Memory, knowledge, learnings, storage. Why the data layer is the most underinvested part of the stack.
Security Engineering: Auth, RBAC, governance, data isolation, and audit trails designed into the system as core primitives.
Interface Engineering: Turning an agent into a product. REST APIs, web UIs, Slack, MCP, and how one agent serves multiple surfaces.
Infrastructure Engineering: How to deploy and scale Dash. Containers, deployment, scheduling.
Thank you for reading, here are some links for reference:
