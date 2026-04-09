---
url: 'https://x.com/arscontexta/status/2026492755430474002'
type: tweet
author: '@arscontexta'
date: '2026-02-25'
tags:
  - knowledge-substrate
  - context-engineering
  - agent-architecture
  - agent-memory
  - self-improving
  - company-knowledge-graphs
  - structured-context
  - markdown-wikis
  - tacit-knowledge-externalization
key_insight: >-
  Company knowledge graphs structured as traversable markdown wikis are the
  missing infrastructure layer that enables agents to operate on knowledge work
  the same way they operate on codebases—the difference between 'bad context'
  and working partners hinges on whether tacit knowledge is externalized into a
  composable graph that agents can traverse and stay synchronized with.
likes: 1436
retweets: 123
views: 828672
relevance_scores:
  topic_relevance: 9
  practitioner_value: 7
  novelty: 6
  signal_quality: 6
  composite: 7.5
  reason: >-
    Directly articulates the core thesis of this knowledge base—traversable
    markdown wikis as agent context infrastructure—with concrete architectural
    patterns (decision logs, atomic notes, composable graphs) that practitioners
    can apply, though it's a tweet thread rather than implementation
    documentation.
---
## Tweet by @arscontexta

https://t.co/VUU8gefosy

### Engagement

| Metric | Value |
|--------|-------|
| Likes | 1,436 |
| Retweets | 123 |
| Views | 828,672 |


---

## Company Graphs = Context Repository

Heinrich on X: "Company Graphs = Context Repository"
everything is a context problem
when people say AI cant do real work, what theyre actually saying is they gave it bad context
said 2026 will transform knowledge work (read this after you finished this article)
Alex Albert
Claude transformed coding in 2025. In 2026, it will transform knowledge work.
Today we launched Claude Opus 4.6. To me, this is bigger than a model upgrade. It's the watershed moment for AI becoming a real working partner for people who spend their days in spreadsheets, slide...
i think hes right and the fundamental mechanism for this is structured context graphs that agents can traverse
coding was solved first because the structure was already there. codebases were text files with relationships between them
the agent reads the code, follows the imports and understands the architecture. that was natural because this is how programmers already worked with code
knowledge work doesnt have that structure yet. mostly outdated knowledge bases or wikis nobody reads
but some people were building it anyway. the obsidian and tool for thought nerds spent years figuring out how to structure knowledge
notes that link to each other, ideas that are atomic and composable and maps of content that give you the topology of an entire domain
turns out they accidentally engineered the perfect architecture for LLMs
(this is what the methodology ars contexta, the art of context, is built around)
the problem isnt that the context doesnt exist, its that its scattered everywhere and nothing can traverse it
slack threads from 8 months ago that nobody can find, google docs with 12 versions, notion pages updated once and never again and most of it just lives in peoples heads, where it disappears when they leave
Balaji
Much of any digital job is now preparing context for AI models. Organizing files in folders, naming everything correctly, introducing things in the right order, and only then asking the AI to do something in clear written English.
structuring knowledge properly is not an easy problem. when scaling knowledge it gets complex really fast
(but this is exactly what the arscontexta plugin helps with, more on that later)
what every company needs is a well structured company knowledge graph. thats the perfect context repository for your entire organization
these are real notes (md files) that capture: every decision with alternatives and reasoning attached, every meeting, not just the recording but extracted claims, decisions, action items and strategic shifts, everything you have published, every research session and every competitive analysis
and of course, you can (and should) throw your code repositories inside this graph as well
company/ ├── org/ │ ├── decisions/ # every decision with reasoning │ ├── strategy/ # vision, positioning, open dilemmas │ ├── competitors/ # competitive landscape │ ├── pipeline/ # deals, partnerships, investors │ └── risks/ # threats with triggers and mitigations ├── teams/ │ ├── engineering/ # standards, architecture, runbooks │ ├── marketing/ # campaigns, positioning, analytics │ └── sales/ # playbooks, objections, win-loss ├── projects/ │ ├── product-alpha/ │ │ ├── prd/ # product spec as a graph of claims │ │ ├── features/ # backlog → shipped lifecycle │ │ ├── repo/ # the actual codebase │ │ └── decisions/ # architectural choices │ └── product-beta/ ├── research/ # deep domain knowledge graphs ├── transcripts/ # raw team conversations ├── archive/ # processed history └── CLAUDE.md # teaches the agent how your company works
one domain = one network of composable files
skill graphs made this pattern graspable, but what im saying is this applies to every kind of context/knowledge/thoughts that can be structured as a traversable markdown graph
the hardest knowledge to capture isnt in documents, its in peoples heads
when your CTO decides on postgres over mongo, maybe the decision gets written down. but the reasoning, the tradeoffs she considered, the context that made it obvious to her but invisible to everyone else is lost
i wrote about this before: yapping is work now
meetings used to be the ultimate time sink, but now you can record conversations, an agent mines them exhaustively and the tacit knowledge locked in peoples heads becomes structured graph state
this is not about meeting summaries nobody reads, its active synchronization with your thinking and the externalized representation of your thinking
your agent works with the externalized version and thats why it needs to represent EVERYTHING you know
meetings are how you keep the graph in sync
what does a CEO actually do
imagine running a company thats moving in fifty directions at once. the engineering department is building three products, marketing is positioning against competitors, sales is closing deals and the strategy shifts with every conversation
the CEOs job is to hold all of that
they should notice when the roadmap contradicts a decision from last quarter and when a competitor move changes what to build next
we started crafting a company graph for our own projects
The media could not be played.
the company note network holds everything as composable markdown files related to each other through wikilinks
sidenote: little example about the framing of our CLAUDE.md:
this vault is your exosuit. when you join this session you put on the accumulated knowledge of the entire organization you are not an assistant you are the driving force behind a company that compounds knowledge into competitive advantage
btw humans have externalized knowledge for thousands of year, this is what really enabled progress
each medium (like cave paintings, parchment paper, books, digital information...) let the next generation build on what came before instead of starting from scratch
we are standing on the shoulders of giants
agents live in context windows like humans live in lifespans. they are temporary, bounded and forget everything when the session ends
they need externalized knowledge for the same reason we needed writing: to transcend the limits of individual memory
a company graph is an agents library. every session it picks up the accumulated knowledge of the entire organization and operates from there
you dont need to read everything in the graph. thats the whole point
same as hiring mckinsey for a strategic analysis. twenty analysts spend thousands of hours on your problem
you dont read all their internal documents, you just want the deliverable
the company graph is the research base, you interact with it and get what you need: a competitive briefing for tuesday, a pitch deck for the conference or dynamically rendered components or views inside an AI-native knowledge work app
you can kick off background jobs that go acquire more knowledge, synthesize different perspectives or craft deliverables for different audiences all simultaneously
its like 10 employees aka subagents doing all the ground work so you can derive your next deliverable or action from it
but the structure matters A LOT. an unstructured dump of notes doesnt scale
you need wikilinks as semantic connections, atomic composable markdown notes, maps of content notes for navigation / attention management, metadata for queries or progressive disclosure and a few other "kernel functions". these are the primitives that make a graph traversable
arscontexta relies on a methodology graph to help you build systems like this. it constructs yours through semantic metaprogramming, you describe what you want and the system derives the architecture
this isnt just for companies, but for any field of knowledge work like your university studies, personal research or whatever
and whats most important: you own your own memory because its just instructions, hooks and markdown files
the methodology graph of arscontexta also makes the whole thing antifragile. when youre exploring new structures or unsure if the architecture fits, you can always consult it and it gives you research-backed guidance for your individual setup
(little warning: rushed the release and debugging/testing "semantic metaprograms" and knowledge graphs is genuinely hard but were on it. please write an issue if you find something broken)
btw were building an app for this too. think cursor for knowledge work, or networked note-taking apps but rethought AI-native, deeply interwoven with arscontexta, the art of context
companies have wanted one place where all knowledge is stored forever, but all "solutions" died the same death:
maintenance costs (imo this is also why tools for thought never went mainstream)
someone had to keep it updated
agents dont get bored of maintenance and they dont skip the update because theyre late for a meeting
the thing that killed every wiki is the exact thing agents are built for
you can build MUCH more complex methodologies and structures that would be unmaintainable for a human (actively exploring rn)
also a company graph with an agent operator is fundamentally different
the agent notices when two notes contradict each other and flags the tension
it notices when the spec / PRD graph is out of sync with your codebase (yes. please apply that graph concept everywhere)
while working, friction signals accumulate automatically and when enough observations pile up the agent proposes structural changes to the system itself
it refactors its own instructions and it evolves its own architecture when the current one creates too much drag
also its easy to make this knowledge economically actionable and valuable
start putting your company into a graph
the structure doesnt need to be perfect on day one, future models will refactor the architecture easily and the arscontexta plugin creates the basic individual structure for you to get started
what happened to software development with vibe coding is about to happen to knowledge work
2025 was agents writing code, 2026 is agents disrupting knowledge work and steering companies
one last thing: your company is already a graph. the question is whether you can see it
