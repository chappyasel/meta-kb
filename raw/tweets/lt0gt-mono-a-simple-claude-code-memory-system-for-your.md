---
url: 'https://x.com/lt0gt/status/2015031883017441769'
type: tweet
author: '@lt0gt'
date: '2026-01-24'
tags:
  - knowledge-substrate
  - agent-memory
  - context-engineering
  - agent-architecture
  - markdown-wiki
  - persistent-context
  - session-continuity
  - decision-capture
  - skill-composition
  - multi-session-retention
key_insight: >-
  By externalizing project context into a persistent /memory layer that Claude
  automatically manages across sessions, teams can reduce costly context
  reconstruction cycles and surface implicit knowledge that would otherwise
  remain trapped in conversation history—turning ephemeral insights into
  actionable artifacts that compound over time.
likes: 18
retweets: 0
views: 5204
relevance_scores:
  topic_relevance: 8
  practitioner_value: 7
  novelty: 6
  signal_quality: 6
  composite: 7.1
  reason: >-
    Directly addresses persistent memory/knowledge substrate patterns for Claude
    Code agents—externalized /memory folders, cross-session context retention,
    markdown artifact accumulation—which maps closely to context engineering and
    agent memory topics, with a concrete usable system (mono) though described
    via tweet rather than detailed docs.
---
## Tweet by @lt0gt

https://t.co/ruYo331QAc

### Engagement

| Metric | Value |
|--------|-------|
| Likes | 18 |
| Retweets | 0 |
| Views | 5,204 |


---

## mono - A Simple Claude Code Memory System for Your Projects

{ I N P U T } on X: "mono - A Simple Claude Code Memory System for Your Projects"
I have /memory folders for all my projects to externalise into. No matter the project, i want claude code to accumulate context for future use. Always. Instead of letting insights, decisions, or learnings stay implicit and get lost over time, just persist everything to markdown files. With this, ephemeral clues from prior conversations easily persist across sessions, allowing future claude instances to build on past work even more. For the human in the loop this is obviously also very helpful, and can even give new surfaces to work on. 
All this should happen naturally, without you having to worry about it. The system is biased toward capture over curation. Reconstructing "damn i think we had this a few sessions ago" is much harder than "well i dont need any of this". Better yet, keep it via git and you can even go back to those deleted parts if needed. mono is a persistent knowledge layer that sits above your projects. you work from within mono, having your actual projects in a repo/ subfolder. With things like /change-project or /default-project you can tell claude to focus on a specific project. It then auto-handles feature branches, git commits per action and the /memory folder automatically (in the scope of the sub repo), while you direct claude to do the actual work at the same time. If you notice that something in the session did not meet your expectations, you can e.g. use /toclaude to update the workflow to your liking. This can either be project specific settings that mono should honour, or config changes in mono itself. (Note that sub-project integration and local claude rule conflict resolution is not perfect yet. Im still playing around with it a lot, but its good enough to play with) 
Here are some of the files I have in my /memory (both in mono, and in other repo/s) 
Many types of files are snapshots that help externalise things to act upon in the moment. They can be used as basis for new sessions, and also capture decisions. - `architecture` - Overview of a coding project currents state - `bug` - Bug reports - `codereview` - Ranked review of the current code base with suggestions on what to do next - `consistency` - Notice unclosed todos, open tasks, content that is inconsitent between files - `drift` - Compares documented intent to the current state - `goal` - This should really be named more like problem and preferences - `next` - Collects what tasks could be done next - `plan` - Implementation plans for complex changes, tracking progress and learnings (can use to reflect or act upon in a later step) - `proposal` - Suggested changes before making a plan - `reflect` - Extracted learnings, tasks, incoherences - `research` - Collected websearch or file search results - `session` - Chat exports (from `/tomd` or `/done`) - `spec` - Specifications as part of plans (underused) - `todo` - Actionable tasks - `solved` - Completed todos (renamed from todo) - `videoplan` - Scene-by-scene video structure (playing around with a manim skill)
- `c` - Concepts as prose claims - `idea` - Ideas and brainstorming - `learning` - Insights from reflection - `meta` - System/workflow files - `moc` - Maps of Content (hierarchy indexes, underexplored still) - `problem` - Problems identified - `question` - Questions to explore
- `/sprint-start` - Orchestrates goal -> proposal -> spec -> plan creation and approval - `/goal` - Captures problem, desired outcome, and preferences - `/proposal` - Explore approaches and decision points for a goal - `/spec` - Define requirements, constraints, and open questions - `/plan-continue` - Resume work on an existing plan
- `/reflect` - Analyse files, extract learnings, tasks, incoherences, questions - `/consistency` - Check project structure for inconsistencies and violations - `/drift` - Detect divergence between documented intent and current state - `/architecture` - Create codebase structure snapshots - `/code-review` - Code quality analysis with severity ratings - `/next` - Collect, store and present things to work on next
- `/research` - Research and document topics via websearch or from local sources - `/todo` - Quickly create todo files from input or extract from files
- `/detect-project` - Check which project we should be wokring on (git and memory management) - `/change-project` - Switch active project - `/default-project` - Set default project (.PROJECT file)
- `/done` - End session with export (`session-`) and offer to merge (can follow with `/reflect` manually) - `/tomd` - Export conversation to markdown - `/toscript` - Export code blocks to script file (untested) - `/toclaude` - Extract learnings to CLAUDE.md etc - `/tomanim` - Convert markdown to manim-animated video (wip)
- `/process` - Process in-file prompts ({ ... } blocks) - `/human-sort` - Reorganize human.md sections without modifying content - `/showrules` - Toggle citation of rules before each response (should be debug tool but is broken rn) - `/toskill` - Create a new skill from conversation 
mono/ memory/ # Knowledge that persists .claude/commands/ # Your custom workflows (skills) repo/ # Your actual projects live here project-a/ .claude memory/ src/ ... project-b/
`memory/` uses a flat file structure, no nested folders. Most of it works through `[[wiki links]]` that link to other documents. Its all just markdown files. (need to make much more use of MOCs etc) 
Open e.g. VSCode in `mono/` and then use `/change-project` or `/default-project` to start working on the sub-repo. ``` !!! you should probably test things out first, e.g. copy paste your git repo as new git repo, since mono uses git automatically once you are happy with the workflow (go ham on changing stuff), then you may want to give it a real shot. or better yet start with new toy projects to test this out. ``` 
One example from my usage, checking consistency of the project, and acting on findings. All with managed git flow. Then do /next to see what else to do.
Consider running `/research` on `mono` itself to learn more. Then use `mono` to change `mono` to your liking. 
`mono` was developed organically over a few days, by using `mono`. Note that pretty much all of the docs in the repo are written by claude itself using mono.
All of this barely scratches the surface and can be improved immensly. Next ill have to evolve `mono` by running `/research` on the mindblowing stuff 
has found out about 
using
