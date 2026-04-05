# The State of Context Engineering

> Context engineering has become the operating system for capable agents. The field no longer treats prompts as isolated artifacts; it treats context as a budgeted, layered, dynamically curated system spanning rules, skills, files, tools, memory, and compaction strategies. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [Mei et al.](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)

This shift happened because large context windows did not remove the need for selection. Agents still degrade under context rot, drown in tool descriptions, and follow stale or contradictory guidance. Modern context engineering is therefore about choosing what gets loaded, when, by whom, and in what form. That makes it the connective tissue between memory systems, skill systems, and retrieval systems. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)

## Approach Categories

### Instruction Layering And Capability Surfaces

One major branch of the field focuses on the instruction surface itself: what belongs in an always-on project guide, what should be file-scoped, what should become a skill, and what should become a hook or separate agent. Martin Fowler’s coding-agent memo is useful because it makes the decision boundaries explicit: instructions, guidance, tools, skills, subagents, MCP servers, and hooks are all different context interfaces with different loading policies. [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)

Anthropic Skills formalize this branch. Skills are folders with a `SKILL.md` and optional resources that Claude can load dynamically. [everything-claude-code](projects/claude-code.md), gstack, and claude-skills then show what happens when you build large capability systems on top of that primitive. The benefit is modularity. The cost is context sprawl if every skill, MCP server, and rule is loaded at once. [Anthropic Skills](../raw/repos/anthropics-skills.md) [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md) [gstack](../raw/repos/garrytan-gstack.md) [claude-skills](../raw/repos/alirezarezvani-claude-skills.md)

The best operational insight here is that decomposition is not just for maintainability; it is for token control. Pawel Huryn’s tweet says it bluntly: a bloated `CLAUDE.md` is often doing jobs that rules, hooks, skills, and agents were built for. Explicit layers create smaller, more verifiable contexts. [Pawel Huryn](../raw/tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md)

### Progressive Disclosure, Retrieval, And Compaction

The second branch treats context as a runtime loading problem. Anthropic’s context-engineering article argues for “just in time” retrieval, minimal viable toolsets, and compaction for long-horizon work. The key move is progressive disclosure: give the model a compact index or summary first, then let it earn access to detail. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md)

This pattern now appears in multiple concrete systems. Claude-Mem exposes a search → timeline → full observation flow and claims roughly 10x token savings by filtering before expansion. OpenViking uses L0/L1/L2 filesystem layers. Napkin uses markdown plus BM25 plus staged reveal. planning-with-files keeps durable working memory in markdown files so context resets do not destroy progress. These systems differ in storage model, but their context strategy is the same: front-load cheap signal, defer expensive detail. [Claude-Mem](../raw/repos/thedotmack-claude-mem.md) [OpenViking](../raw/repos/volcengine-openviking.md) [Napkin](../raw/repos/michaelliv-napkin.md) [planning-with-files](../raw/repos/othmanadi-planning-with-files.md)

Compression is the other half of the story. [LLMLingua](projects/llmlingua.md) reports up to 20x prompt compression, LongLLMLingua reports RAG gains while using a quarter of the tokens, and the smaller context-compression experiments repo shows that even mediocre models can be made materially better with prompt optimization loops. Compression is no longer a cleanup pass. It is part of the retrieval stack. [LLMLingua](../raw/repos/microsoft-llmlingua.md) [context compression experiments](../raw/repos/laurian-context-compression-experiments-2508.md)

### Evolving Contexts And Learned Playbooks

The third branch treats context as something that should improve from execution feedback. [ACE](concepts/execution-traces.md) is the clearest project expression: store learned strategies in a persistent Skillbook and use them to improve future runs. The ACE paper generalizes that idea into evolving contexts that avoid “context collapse” by adding structured updates instead of repeatedly rewriting a giant prompt. [ACE repo](../raw/repos/kayba-ai-agentic-context-engine.md) [ACE paper](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

[everything-claude-code](projects/claude-code.md) and gstack push a more operational version of the same theme. They treat the agent harness itself as a context-engineering surface, with reusable skills, long-term learnings, and selective loading policies. This is why context engineering is increasingly inseparable from agent memory. Context is becoming a maintained playbook, not a static prompt. [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md) [gstack](../raw/repos/garrytan-gstack.md)

## Context Is Becoming A Control Plane

One reason this bucket is suddenly central is that it now includes decisions that used to be scattered across system prompts, retrieval wrappers, memory managers, and product code. Which skills are visible? Which tools are advertised? Which files enter the window automatically? Which rules are path-scoped? Which failures trigger a subagent instead of a retry? These are all context decisions. The field is increasingly treating them as one coordinated control surface. [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md) [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md)

This framing also explains why builders are obsessing over `CLAUDE.md`, `SKILL.md`, hooks, rules, MCP descriptions, and external notes all at once. Those artifacts are not random configuration files. They are the levers by which context is allocated, constrained, and refreshed. Pawel Huryn’s tweet is useful because it names the architectural mistake directly: teams put too many jobs into one always-on file when the system really needs multiple context surfaces with different loading policies. [Pawel Huryn](../raw/tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md) [Akshay Pachaar](../raw/tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md)

## Failure Modes And Pressure Points

The first failure mode is context rot. Instructions accumulate, examples drift out of date, tool docs expand, and nobody is sure which layer is authoritative anymore. The result is not always dramatic failure. More often it is slow incoherence: lower hit rates on tools, brittle behavior around edge cases, and higher token spend for the same task. Anthropic’s context-engineering guide is fundamentally a response to this failure pattern. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md)

The second failure mode is retrieval overreaction. When a system responds to uncertainty by fetching too much, it often makes the model worse, not better. The RAG failure-mode article and the LangSmith trace piece both point at this from different angles: retrieval thrash, tool storms, and context bloat are usually symptoms of weak loading policy rather than weak model intelligence. Better context engineering often means adding refusal and pruning, not adding more retrieval. [Towards Data Science](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md) [LangSmith trace article](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

The third failure mode is hidden coupling between context layers. A skill may quietly assume the presence of a project guide. A hook may mutate files that another rule depends on. An MCP description may be so long that it crowds out the very instructions that say when to use it. Large harnesses like [everything-claude-code](projects/claude-code.md) and gstack are valuable case studies because they confront this complexity directly instead of pretending context remains simple at scale. [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md) [gstack](../raw/repos/garrytan-gstack.md)

## Practical Design Rules

The corpus points toward a fairly consistent operating discipline:

- put the minimum durable worldview in the always-on guide, [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md)
- move specialized procedures into skills or scoped rules, [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)
- externalize long-running state into files or memory rather than keeping it in chat history, [planning-with-files](../raw/repos/othmanadi-planning-with-files.md)
- compress and summarize aggressively before a reset becomes necessary, [LLMLingua](../raw/repos/microsoft-llmlingua.md)
- and use traces to debug the context policy itself, not just the model. [LangSmith trace article](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

What makes this a real discipline is that the advice is now repeatable across many systems, not specific to one tool vendor. The sources disagree on implementation details, but they increasingly agree on the architecture. [Mei et al.](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)

## The Convergence

The strongest convergence is toward budget awareness. Anthropic frames context as an “attention budget.” Fowler emphasizes keeping context small. [everything-claude-code](projects/claude-code.md) explicitly warns that too many MCP descriptions can shrink a 200k window dramatically. OpenViking, Claude-Mem, and [ACE](concepts/execution-traces.md) all report measurable token reductions as product outcomes, not academic side effects. The field now treats token economy as a first-class systems problem. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md) [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md) [OpenViking](../raw/repos/volcengine-openviking.md) [ACE repo](../raw/repos/kayba-ai-agentic-context-engine.md)

The second convergence is layered control. Builders want some context loaded by agent autonomy, some by deterministic software hooks, and some by explicit human action. Skills, rules, hooks, and subagents exist because one control policy does not fit every context surface. [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md) [Pawel Huryn](../raw/tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md)

## The Divergence

The main disagreement is whether better context mostly comes from better prompts or better runtime scaffolding. Some projects still focus on stronger instructions and reusable prompt assets. Others assume that agent performance is mostly a retrieval-and-compaction problem. A third group thinks the real leverage is learned context evolution over time. All three camps are right in different failure modes, which is why the field still looks fragmented. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [ACE paper](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md) [Anthropic Skills](../raw/repos/anthropics-skills.md)

There is also a practical split between teams that want agent autonomy and teams that want deterministic triggers. Hooks, scoped rules, and path-based loading exist because many organizations still do not trust the model to decide what context it should load. Skills and MCPs exist because fully manual context management does not scale. Context engineering is increasingly about choosing where to sit on that trust spectrum. [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md) [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md)

## What's Hot Now

The hottest operational systems are large harnesses and skills ecosystems. [everything-claude-code](projects/claude-code.md) sits at 136,116 stars, Anthropic Skills at 110,064, gstack at 63,766, Claude-Mem at 44,950, and planning-with-files at 17,968. That tells you where builders are spending time: not just on model APIs, but on durable context scaffolding around them. [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md) [Anthropic Skills](../raw/repos/anthropics-skills.md) [gstack](../raw/repos/garrytan-gstack.md) [Claude-Mem](../raw/repos/thedotmack-claude-mem.md) [planning-with-files](../raw/repos/othmanadi-planning-with-files.md)

Compression is also hot because it now has concrete economic hooks. [ACE](concepts/execution-traces.md) reports 49% token reduction on browser automation. [LLMLingua](projects/llmlingua.md) reports up to 20x compression. Omar Sar0’s tweet on a universal `CLAUDE.md` got traction precisely because even simple format expectations can cut output tokens materially. [ACE repo](../raw/repos/kayba-ai-agentic-context-engine.md) [LLMLingua](../raw/repos/microsoft-llmlingua.md) [Omar Sar0](../raw/tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md)

## Why This Suddenly Matters To Everyone

Context engineering became unavoidable once agents moved from short chats to long-running work. A single answer can tolerate a messy prompt. A coding task, browser workflow, or research loop cannot. The moment agents started operating over hours instead of turns, context turned from prompt craft into runtime design. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)

This is also why the bucket now feels crowded. Skills, MCPs, hooks, notes, memory layers, guide files, and compression systems all compete here because they all change what the model sees at decision time. The field is converging on the insight that the real scarce resource is not raw tokens, but coherent attention. [Mei et al.](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)

## Where It's Going

Expect more context systems to become explicit control planes. The survey literature already frames context engineering as retrieval, processing, and management, not just prompting. The next generation of systems will likely expose more observability, more context-budget dashboards, more structured policies for loading, and more learned context mutation based on trace feedback. [Mei et al.](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) [LangSmith trace article](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

The most important long-term trend is that context engineering is merging with agent architecture. Dynamic workflow graphs, skill registries, memory layers, and compaction policies are all becoming pieces of one larger design problem: how to decide what the model should know right now. [Yue et al.](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md) [ACE paper](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

Another way to say this is that context engineering is becoming the interface layer between every other bucket. It tells knowledge bases how much structure must be surfaced, tells memory systems what deserves promotion into active use, tells skill systems when specialization should be loaded, and tells self-improvement loops which artifacts most need revision. That is why the topic suddenly feels bigger than prompting. It now governs the live boundary between latent system state and current model attention. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [Mei et al.](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)

In practice, that means context engineering is where product and model behavior now meet. It is not just an LLM concern. It is also an interface-design concern, a systems-budget concern, and an observability concern. That breadth is a good clue that the category will remain important even as models improve. [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)

Put differently, bigger models can reduce the pain of bad context, but they do not remove the architectural need to decide what the model should see now. That decision remains the heart of capable agent behavior. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md)

## Open Questions

- Which decisions should stay deterministic and which should be delegated to the model? [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)
- How should teams measure context quality beyond raw token counts? [LangSmith trace article](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md) [Mei et al.](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)
- Can evolving playbooks avoid collapse without turning into another bloated context layer? [ACE paper](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

## Sources

### Articles

- [Effective context engineering for AI agents](../raw/articles/effective-context-engineering-for-ai-agents.md)
- [Context engineering for coding agents](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)
- [The agent improvement loop starts with a trace](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

### Papers

- [A Survey of Context Engineering for Large Language Models](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)
- [Agentic Context Engineering](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)
- [Workflow Optimization for LLM Agents](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)

### Repos and Tweets

- [Anthropic Skills](../raw/repos/anthropics-skills.md)
- [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md)
- [gstack](../raw/repos/garrytan-gstack.md)
- [Claude-Mem](../raw/repos/thedotmack-claude-mem.md)
- [planning-with-files](../raw/repos/othmanadi-planning-with-files.md)
- [OpenViking](../raw/repos/volcengine-openviking.md)
- [Napkin](../raw/repos/michaelliv-napkin.md)
- [LLMLingua](../raw/repos/microsoft-llmlingua.md)
- [ACE](../raw/repos/kayba-ai-agentic-context-engine.md)
- [Akshay Pachaar tweet](../raw/tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md)
- [Pawel Huryn tweet](../raw/tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md)
- [Omar Sar0 tweet](../raw/tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md)
