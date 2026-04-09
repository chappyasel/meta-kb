---
url: 'https://x.com/arscontexta/status/2023957499183829467'
type: tweet
author: '@arscontexta'
date: '2026-02-18'
tags:
  - skill-graphs
  - context-engineering
  - knowledge-substrate
  - modular-knowledge
  - wikilinks-navigation
  - agent-architecture
  - structured-skills
key_insight: >-
  Skill graphs enable agents to traverse structured knowledge dynamically rather
  than injecting static context, allowing domain-depth that scales beyond single
  files by leveraging wikilinks-as-prose and YAML descriptions for
  lazy-loading—turning context engineering from injection into navigation.
likes: 8757
retweets: 890
views: 4031126
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 8
  signal_quality: 7
  composite: 8.3
  reason: >-
    Directly introduces skill graphs as a context engineering
    pattern—lazy-loading via wikilinks and YAML frontmatter for agent
    traversal—a novel, actionable extension of SKILL.md and knowledge substrate
    concepts central to this KB.
---
## Tweet by @arscontexta

https://t.co/XmYSO3mC8f

### Engagement

| Metric | Value |
|--------|-------|
| Likes | 8,757 |
| Retweets | 890 |
| Views | 4,031,126 |


---

## Skill Graphs > SKILL.md

Heinrich on X: "Skill Graphs > SKILL.md"
people underestimate the power of structured knowledge. it enables entirely new kinds of applications
right now people write skills that capture one aspect of something. a skill for summarizing, a skill for code review and so on. (often) one file with one capability
thats fine for simple tasks but real depth requires something else
imagine a therapy skill that provides relevant information about cognitive behavioral patterns, attachment theory, active listening techniques, emotional regulation frameworks and so on
a single skill file cant hold that
a skill graph is a network of skill files connected with wikilinks
instead of one big file you have many small composable pieces that reference each other. each file is one complete thought, technique or skill and [[wikilinks between them create a traversable graph]]
a skill graph applies the same skill discovery pattern recursively inside the graph itself
every node has a yaml description the agent can scan without reading the whole file
every wiki link carries meaning because its woven into prose so the agent follows relevant paths and skips what doesnt matter
index → descriptions → links → sections → full content
most decisions happen before reading a single full file
you already have everything you need
wikilinks that read as prose in sentences, so they carry meaning not just references
yaml frontmatter with descriptions so the agent can scan without reading full files
MOCs (maps of content) that organize clusters of related skills into navigable sub-topics
skill links to other skills which link to other skills and the graph goes as deep as the domain requires
arscontexta is a skill graph that teaches your agent how to build skill graphs
(okay actually its about building knowledge bases but thats the same thing...)
~250 connected markdown files that teach an agent how to build a massive knowledge base aka skill graph for you
one skill file couldnt do that
but things change if you build a graph of interconnected research claims (/skills) about cognitive science, zettelkasten, graph theory, agent architecture where each piece links to others, each one composable and the whole thing is traversable
a trading skill graph: risk management, market psychology, position sizing, technical analysis, each piece linked to related concepts so context flows between them
a legal skill graph: contract patterns, compliance requirements, jurisdiction specifics, precedent chains, all traversable from one entry point
a company skill graph: org structure, product knowledge, processes, onboarding context, culture, competitive landscape
none of these fit in one file but all of them work as graphs
the easy way: install the arscontexta claude code plugin, pick the research preset and point it at any topic
it sets up the markdown folder structure for you and then you fill it with /learn and /reduce
the manual way its simpler than you think
a skill graph doesnt need to live in your .claude/skills/ folder. the key is an index file that tells the agent what exists and how to traverse it
heres what an index looks like for a knowledge work skill graph:
the index isnt a lookup table its an entry point that points attention. the agent reads it, understands the landscape and follows the links that matter for the current conversation
each linked file is a standalone methodology claim (= skill). heres what one node looks like:
see how the wikilinks inside the prose tell the agent when and why to follow them
an map of contents (MOCs) organize sub-topics when the graph gets larger.
skills are context engineering, basically curated knowledge injected where it matters
skill graphs are the next step
instead of one injection the agent navigates a knowledge structure, pulling in exactly what the current situation requires
this is the difference between an agent that follows instructions and an agent that understands a domain
arscontexta is a claude code plugin that does this for building knowledge systems. 249 files of structured knowledge the agent traverses to derive a local knowledge system that really fits your workflow
go use it and build skill graphs for everything else
