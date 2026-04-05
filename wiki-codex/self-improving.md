# The State of Self-Improving Systems

> The decisive change in 2026 is that agent improvement is no longer synonymous with fine-tuning. The dominant pattern is now gradient-free: define an objective, constrain the editable surface, run autonomous experiments, keep wins, discard losses, and carry forward structured lessons. [Karpathy autoresearch tweet](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md) [Cameron Westland](../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md) [OpenAI cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

This pattern shows up across prompts, skills, browser agents, coding agents, research stacks, and memory systems. The common loop is simple: observe behavior, score it, propose a mutation, verify it, and only then promote it into the durable system. What used to be called “prompt iteration” is turning into a measurable control system. [Sid Saladi](../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md) [MindStudio](../raw/articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md)

## Approach Categories

### Eval-Driven Improvement Loops

The canonical version is [Autoresearch](projects/autoresearch.md). Karpathy’s repo and tweets make the template unusually explicit: one editable file, one fixed benchmark harness, one markdown program that tells the agent what “better” means, and an accept-or-revert loop driven by short experiments. The power is not specific to ML. Karpathy, Cameron Westland, Sid Saladi, and MindStudio all argue that the loop applies to any artifact with a measurable score. [Autoresearch repo](../raw/repos/karpathy-autoresearch.md) [Karpathy tweet](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md) [Cameron Westland](../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md) [Sid Saladi](../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md) [MindStudio](../raw/articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md)

[pi-autoresearch](projects/pi-autoresearch.md) generalizes that loop into a reusable extension with dashboards, confidence scores, and resumable session files. [GEPA](projects/gepa.md) pushes in a similar direction from the optimization side, claiming 35x fewer evaluations than RL methods and strong results on prompt, architecture, and agent optimization tasks. Together they show the field moving from one-off experiments toward reusable improvement infrastructure. [pi-autoresearch](../raw/repos/davebcn87-pi-autoresearch.md) [GEPA](../raw/repos/gepa-ai-gepa.md)

The key insight from Cameron Westland is the one most people miss: the real engineering problem is reward design. The harness, secondary metrics, and “off limits” files are what stop the agent from finding shortcuts that technically improve the score while violating the intent. Self-improvement only works when the guardrails are part of the objective, not an afterthought. [Cameron Westland](../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md)

### Trace, Memory, And Playbook Loops

A second branch improves agents through stored traces, reflections, and learned strategies rather than benchmark-only loops. The LangSmith article makes the operational case: traces are the substrate for evals, human review, and regression tests. [ACE](projects/ace.md) stores learned strategies in a Skillbook. [Memento](projects/memento.md) retrieves successful and failed cases. Reflexion stores verbal reflections in episodic memory. These are all forms of externalized experience replay. [LangSmith trace article](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md) [ACE repo](../raw/repos/kayba-ai-agentic-context-engine.md) [Memento](../raw/repos/agent-on-the-fly-memento.md) [Reflexion](../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

This branch is important because it relaxes the requirement for a tight benchmark loop. You do not always have a cheap scalar objective, especially in product or research settings. What you often do have is a trace, human corrections, and recurring failure patterns. Systems like ACE and the OpenAI self-evolving cookbook convert that softer signal into an improvement loop anyway. [ACE paper](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md) [OpenAI cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

### Self-Evolving Architectures

The frontier branch does not just improve prompts or policies. It improves the improvement process. [Darwin Gödel Machine](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) treats the agent’s own codebase as evolvable and reports a jump from 20% to 50% on SWE-bench. Jenny Zhang’s Hyperagents tweet then pushes that further: let the system evolve the meta-procedure that generates future improvements, not just the task behavior itself. [Darwin Gödel Machine](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) [Jenny Zhang](../raw/tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md)

This is still early, but it changes the field’s ambition. The system is no longer a fixed scaffold with a better prompt at the end. The scaffold itself becomes a search space. [ADAS](projects/adas.md) and [CORAL](projects/coral.md) sit closer to this edge as well, using meta-agents or shared evolving public state to improve the overall system over time. [ADAS](../raw/repos/shengranhu-adas.md) [CORAL](../raw/repos/human-agent-society-coral.md)

### Safety, Budgets, And Oversight

The mature self-improvement systems all add brakes. The Arion circuit-breaker piece frames the problem clearly: at enough speed, agent errors outpace human reaction time, so the system needs tripwires for drift, confidence decay, recursive loops, and tool velocity spikes. The more practical sources echo the same lesson in lighter form: caps on iterations, branch isolation, verification checks, confidence scores, and human review thresholds. [Arion circuit breakers](../raw/articles/arion-research-llc-algorithmic-circuit-breakers-preventing-flash-cr.md) [pi-autoresearch](../raw/repos/davebcn87-pi-autoresearch.md) [OpenAI cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

The underrated pattern here is blind review. [Jumperz](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) inserts a separate reviewer between the swarm and the permanent wiki. That same separation will likely become standard in self-improving systems more broadly: one component proposes changes; another scores or validates them without being entangled in the generation path. [Jumperz](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

## What Actually Gets Mutated

One useful way to read this bucket is by editable surface rather than by project name. Some systems mutate prompts or instruction files. Some mutate skills. Some mutate context playbooks and memory artifacts. Some mutate workflow graphs. Some mutate code. Some mutate the optimizer itself. Once you see those layers, the field becomes easier to compare because the central tradeoff is clear: narrow surfaces are easier to verify continuously, while wider surfaces promise more upside but require better governance. [OpenAI cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md) [GEPA](../raw/repos/gepa-ai-gepa.md) [Darwin Gödel Machine](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

This framing also explains why prompt-only improvement loops are no longer the whole story. A prompt change can help quickly, but it is often a poor place to store durable lessons about workflows, edge cases, or reusable procedures. That is why projects like [ACE](projects/ace.md) push lessons into a Skillbook, [Memento](projects/memento.md) pushes them into reusable cases, and Reflexion pushes them into verbal memory. The field is broadening from optimizing outputs to optimizing the external artifacts that shape future outputs. [ACE repo](../raw/repos/kayba-ai-agentic-context-engine.md) [Memento](../raw/repos/agent-on-the-fly-memento.md) [Reflexion](../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

## Failure Modes Beyond Reward Hacking

Reward hacking is the headline failure mode, but it is not the only one. Another common failure is local overfitting: a system gets better on the harness it sees and worse on the broader task distribution the team actually cares about. Karpathy’s emphasis on a fixed benchmark and held-out evaluation exists because self-improvement loops are otherwise very good at learning the idiosyncrasies of their own judge. [Autoresearch repo](../raw/repos/karpathy-autoresearch.md) [Cameron Westland](../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md)

There is also improvement debt. Every accepted mutation increases the burden on future evaluators. A larger skillbook, a more complicated workflow graph, or a stack of prompt patches can all make the next round of improvement harder to reason about. The strongest systems therefore need not just mutation and promotion, but periodic consolidation, pruning, and reset logic. This is one reason the OpenAI cookbook and the LangSmith trace article both emphasize instrumentation and review, not just automation. [OpenAI cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md) [LangSmith trace article](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

The final failure mode is governance mismatch. An organization may allow a system to propose changes faster than it can responsibly inspect them. Arion’s circuit-breaker framing matters here because the limiting factor is not always model capability. It is human supervisory bandwidth. Once loops get cheap enough to run continuously, the bottleneck becomes promotion policy. [Arion circuit breakers](../raw/articles/arion-research-llc-algorithmic-circuit-breakers-preventing-flash-cr.md)

## Why This Feels Different From Old Prompt Tuning

Older prompt tuning culture assumed that improvement happened in a mostly manual loop: test a few changes, compare outputs informally, keep the version that feels better. The newer systems are different in three ways. They separate proposer and evaluator. They keep explicit logs of what changed. And they treat the editable artifact as part of a longer-lived system that should keep compounding. That combination makes the process look less like “tweaking prompts” and more like software release engineering. [Karpathy tweet](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md) [OpenAI cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

That shift is why the field now touches memory, context, skills, and orchestration all at once. Once the loop is formalized, the question naturally becomes: what is the best external artifact to improve? The answer is no longer always “the prompt.” [ACE paper](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md) [LangSmith trace article](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

## The Convergence

Every serious self-improving system in this corpus has four common elements: a durable log of prior runs, a measurable success criterion, a bounded editable surface, and a promotion gate. That is true for [Autoresearch](projects/autoresearch.md), [pi-autoresearch](projects/pi-autoresearch.md), [ACE](projects/ace.md), [Memento](projects/memento.md), and the OpenAI cookbook loop. The field is converging on a standard control pattern even while optimizing different artifacts. [Autoresearch repo](../raw/repos/karpathy-autoresearch.md) [pi-autoresearch](../raw/repos/davebcn87-pi-autoresearch.md) [ACE repo](../raw/repos/kayba-ai-agentic-context-engine.md) [Memento](../raw/repos/agent-on-the-fly-memento.md) [OpenAI cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

The second convergence is that external memory replaces many weight updates. Reflexion, ACE, Memento, and Hyperagents all show variants of the same idea: keep improvement artifacts in language, code, or structured state so the system can adapt cheaply and transparently. That is one of the clearest through-lines in the whole corpus. [Reflexion](../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md) [ACE paper](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md) [Jenny Zhang](../raw/tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md)

## The Divergence

The main split is what gets optimized. Some systems optimize prompts and skills. Some optimize code. Some optimize memory policies. Some optimize the architecture of the optimizer itself. This matters because the cheaper and more local the editable surface, the easier the loop is to run continuously. But broader surfaces may produce more compounding gains if you can evaluate them safely. [MindStudio](../raw/articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md) [GEPA](../raw/repos/gepa-ai-gepa.md) [Darwin Gödel Machine](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

There is also a split between offline benchmark loops and online experience loops. Offline loops are easier to trust and cheaper to reason about. Online loops have better product fit because they improve on real traces, but they need much stronger governance. [OpenAI cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md) [LangSmith trace article](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

## What's Hot Now

The hottest signal is still Karpathy’s autoresearch line. His March 7 tweet hit 28,330 likes and 10.94M views; the follow-up showing 20 additive improvements and an 11% time-to-GPT-2 speedup hit 19,459 likes and 3.57M views. Those numbers are high because the loop feels both novel and immediately transferable. [Karpathy tweet](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md) [Karpathy follow-up](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)

Project momentum is spread across several interpretations of the same idea. [ACE](projects/ace.md) reports 2x consistency on Tau2, 49% token reduction, and roughly $1.50 learning cost in one translation case. [GEPA](projects/gepa.md) reports 35x fewer evaluations than RL and a jump from 32% to 89% on one ARC-AGI agent optimization example. [Darwin Gödel Machine](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) reports 50% on SWE-bench. These are very different systems, but they are all winning attention by making improvement measurable and cheap. [ACE repo](../raw/repos/kayba-ai-agentic-context-engine.md) [GEPA](../raw/repos/gepa-ai-gepa.md) [Darwin Gödel Machine](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

## The Economic Driver

The reason this bucket is accelerating is not just scientific curiosity. It is economics. If a team can improve prompts, skills, or workflows overnight through cheap autonomous experiments, it gets a compounding advantage without paying the cost of model training. That is a very different proposition from fine-tuning-heavy improvement strategies. [Karpathy tweet](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md) [OpenAI cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

This also helps explain the spread from research repos into mainstream builder discourse. The loop is understandable, reproducible, and budget-shaped. It turns “getting better” from a vague aspiration into an engineering process with explicit surfaces, metrics, and rollout rules. [Sid Saladi](../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md) [MindStudio](../raw/articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md)

## Where It's Going

Expect self-improvement to become a standard subsystem in agent products rather than a research novelty. The near-term product form is clear: trace capture, evals, automatic proposal generation, verification, and staged rollout. The stronger systems will add cost ceilings, failure tripwires, and rollback paths by default. [OpenAI cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md) [Arion circuit breakers](../raw/articles/arion-research-llc-algorithmic-circuit-breakers-preventing-flash-cr.md)

The more speculative direction is reflexive improvement of the optimizer itself. Hyperagents and DGM point toward systems that do not just accumulate skills, but accumulate better ways of discovering, testing, and promoting skills. If that line holds up outside benchmarks, it will be the real break from “prompt engineering” into autonomous system design. [Darwin Gödel Machine](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) [Jenny Zhang](../raw/tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md)

The likely stable middle ground is hybrid: benchmark loops to maintain a floor, trace loops to discover new failure modes, memory or playbook layers to retain lessons cheaply, and human approval gates for high-impact promotions. That architecture would match the strongest ideas across Karpathy’s loop, the OpenAI cookbook, LangSmith’s trace-first framing, and ACE’s evolving-context model. [Karpathy tweet](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md) [OpenAI cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md) [LangSmith trace article](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md) [ACE paper](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

## Open Questions

- How much of the eval stack can be automated before reward hacking dominates? [Cameron Westland](../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md) [lil-log reward hacking](../raw/articles/lil-log-reward-hacking-in-reinforcement-learning.md)
- Which improvement artifacts should persist: traces, learned strategies, code diffs, or all three? [LangSmith trace article](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md) [ACE repo](../raw/repos/kayba-ai-agentic-context-engine.md)
- When should online self-improvement stop and hand control back to a human? [Arion circuit breakers](../raw/articles/arion-research-llc-algorithmic-circuit-breakers-preventing-flash-cr.md) [OpenAI cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

## Sources

### Articles

- [Autoresearch is reward function design](../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md)
- [Self-evolving agents cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)
- [How to use Claude Code with AutoResearch](../raw/articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md)
- [Autoresearch 101 builder’s playbook](../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md)
- [The agent improvement loop starts with a trace](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)
- [Algorithmic circuit breakers](../raw/articles/arion-research-llc-algorithmic-circuit-breakers-preventing-flash-cr.md)
- [Reward hacking in reinforcement learning](../raw/articles/lil-log-reward-hacking-in-reinforcement-learning.md)

### Papers

- [Reflexion](../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)
- [Voyager](../raw/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)
- [Agentic Context Engineering](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)
- [Darwin Godel Machine](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

### Repos and Tweets

- [Autoresearch](../raw/repos/karpathy-autoresearch.md)
- [pi-autoresearch](../raw/repos/davebcn87-pi-autoresearch.md)
- [ACE](../raw/repos/kayba-ai-agentic-context-engine.md)
- [Memento](../raw/repos/agent-on-the-fly-memento.md)
- [GEPA](../raw/repos/gepa-ai-gepa.md)
- [CORAL](../raw/repos/human-agent-society-coral.md)
- [ADAS](../raw/repos/shengranhu-adas.md)
- [Karpathy autoresearch tweet](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)
- [Karpathy follow-up tweet](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)
- [Aakash Gupta tweet](../raw/tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md)
- [Hesamation tweet](../raw/tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md)
- [Jenny Zhang tweet](../raw/tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md)
- [Jumperz tweet](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)
