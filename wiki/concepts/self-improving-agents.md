---
entity_id: self-improving-agents
type: concept
bucket: self-improving
abstract: >-
  Self-improving agents modify their own behavior, code, or knowledge through
  feedback loops — distinct from static AI by closing the loop between execution
  and future capability.
sources:
  - tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/bingreeky-memevolve.md
  - repos/alirezarezvani-claude-skills.md
  - repos/shengranhu-adas.md
  - repos/evoagentx-evoagentx.md
  - papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/bingreeky-memevolve.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
related:
  - OpenAI
  - EvoAgentX
  - Reflexion
  - Voyager
  - ADAS
  - Darwin Gödel Machine
  - GEPA
  - SkillWeaver
  - EvoAgentX
  - MemEvolve
  - LLM-as-a-Judge
  - Continual Learning
  - Reinforcement Learning
  - Synthetic Data Generation
  - AutoGPT
  - Reward Hacking
  - Credit Assignment
  - Automatic Curriculum
  - Compositional Skill Synthesis
  - SEAgent
  - Meta-Harness
  - Jeff Clune
last_compiled: '2026-04-05T20:30:12.005Z'
---
# Self-Improving Agents

## What It Is

A self-improving agent modifies its own behavior, skills, memory, or code based on experience, feedback, or reflection. The modification happens without direct human intervention in each cycle. The agent runs a task, observes what happened, updates some representation of itself, and performs better on future tasks.

This distinguishes self-improving agents from standard agents (which execute but don't adapt) and from fine-tuned models (which are updated by humans offline). The key is a closed feedback loop: execution produces signal, signal drives update, update changes future execution.

The concept encompasses a wide range of mechanisms operating at different levels of the agent stack: prompts, memory, skills, tools, reward functions, or the agent's own source code.

## Why It Matters

Static agents hit a ceiling. Every deployment context has idiosyncrasies: your codebase's conventions, your team's terminology, your domain's failure patterns. A static agent cannot learn these. A self-improving agent builds institutional knowledge from operational experience.

The practical stakes are significant. LLM API costs scale with context. An agent that can compress experience into efficient memory structures (rather than stuffing full conversation histories into context) runs cheaper at scale. An agent that learns to avoid recurring mistakes stops burning tokens on predictable failures. An agent that synthesizes new tools stops re-solving solved problems.

Beyond efficiency, there's a capability ceiling argument: the hardest tasks in code, science, and planning require capabilities that weren't anticipated at training time. Self-improvement mechanisms let agents develop task-specific skills post-deployment.

## How It Works: The Core Mechanisms

Self-improvement in practice operates across five distinct layers. Most systems implement one or two; few implement more.

### 1. Memory Evolution

The most common approach. The agent logs experiences, reflects on them, and stores compressed knowledge for future retrieval. The key design choice is whether memory is append-only or actively reorganized.

[A-MEM](../projects/a-mem.md) implements Zettelkasten-style memory where new memories trigger updates to existing ones. When a new memory arrives, an LLM generates keywords, tags, and a contextual description, then finds semantically related existing memories via cosine similarity and establishes bidirectional links. Critically, new memories can trigger evolution of existing memories — their contextual descriptions and attributes update to reflect new context. On the LoCoMo benchmark, this produces 149% improvement in multi-hop reasoning F1 (18.41 to 45.85) with 85% fewer tokens than full-context approaches. The ablation is instructive: removing link generation and memory evolution together drops multi-hop F1 to 24.55; removing only evolution drops it to 31.24; the full system reaches 45.85. Memory organization drives the gains, not retrieval sophistication.

[MemEvolve](../projects/memevolve.md) operates at a higher level: it evolves the memory architecture itself. A four-phase pipeline (Analyze, Generate, Create, Validate) reads agent execution trajectories, uses an LLM to design entirely new memory provider implementations as Python code, installs them into a live registry, and validates them in an isolated environment. This is not parameter tuning — it generates novel memory system architectures. The creativity index maps to LLM temperature (0.3 + creativity × 0.9), ranging from conservative variations on existing providers to genuinely novel designs. Published results show 7–17% performance gains across frameworks and benchmarks, with cross-LLM and cross-framework transfer. Self-reported by the authors; not yet independently validated.

### 2. Skill Accumulation

Rather than modifying memory, the agent accumulates reusable skills — callable routines it can invoke on future tasks.

[Voyager](../projects/voyager.md) (Minecraft) maintains a skill library of JavaScript programs. After completing a task, it stores the working code as a named skill. Future tasks can invoke stored skills, enabling compositional problem-solving: a "build shelter" skill composes from "collect wood," "craft planks," and "place blocks" skills. The library grows monotonically. Voyager discovers 3× more unique items than prior baselines (self-reported).

[SkillWeaver](../projects/skillweaver.md) extends this to general web agents, synthesizing skills from task demonstrations and composing them hierarchically. [Compositional Skill Synthesis](../concepts/compositional-skill-synthesis.md) is the broader pattern: new skills are built from verified existing skills, providing a natural curriculum and limiting error propagation.

### 3. Reflective Self-Correction

The agent reflects on its own failures and updates behavior without necessarily storing structured memory.

[Reflexion](../projects/reflexion.md) generates verbal reflections on failed task attempts and stores them as working memory for the next attempt. The agent writes its own post-mortem and reads it before retrying. On HotpotQA, AlfWorld, and programming benchmarks, this produces substantial gains over non-reflective baselines. The mechanism is simple: append "what went wrong and why" to the next prompt.

The self-healing knowledge base pattern described by Karpathy works similarly at the system level: after building a wiki, an LLM "linting" pass identifies inconsistencies, missing data, and interesting connections, then repairs and extends the knowledge base. The agent maintains its own indexes and runs health checks — self-improvement without any task execution loop, purely through periodic reflection over stored knowledge.

### 4. Automated Architecture Search

Rather than improving within a fixed design, the agent modifies its own architecture or algorithm.

[ADAS](../projects/adas.md) (Automated Design of Agentic Systems) treats agentic architectures as programs and searches over them. A meta-agent generates candidate architectures in code, evaluates them on held-out tasks, and iterates. This shifts the improvement loop from runtime behavior to the agent's design.

[Darwin Gödel Machine](../projects/darwin-godel-machine.md) takes the most ambitious position: the agent rewrites its own source code, guided by empirical performance on a task distribution. Proposed modifications only survive if they improve measured performance. This is the closest current implementation to the original Gödel Machine concept, though with empirical rather than formal proof of improvement.

### 5. Operational Error Logging

The most pragmatic form. The agent logs errors, corrections, and learnings to files that it reviews before future tasks.

The pattern: create a `.learnings/` directory, populate `ERRORS.md`, `LEARNINGS.md`, and `FEATURE_REQUESTS.md` as the agent operates, have the agent review these before major tasks, and periodically promote important lessons to permanent memory (`AGENTS.md`). Recurring issues get flagged. Domain-specific knowledge accumulates. This requires no architectural sophistication — just disciplined logging and retrieval. The compounding effect is real: day 30 of operation produces an agent that knows your codebase's conventions in ways day 1 cannot.

## Key Design Dimensions

**What gets modified:** Prompts and working memory (Reflexion, error logs) vs. persistent memory structures (A-MEM, MemEvolve) vs. skill libraries (Voyager, SkillWeaver) vs. architecture/code (ADAS, Darwin Gödel Machine). Each level offers different power and different risk.

**Modification trigger:** Continuous (every task updates memory) vs. periodic (batch reflection over accumulated experience) vs. event-driven (failures trigger reflection). Continuous modification accumulates more signal but risks overfitting to recent experience.

**Evaluation of improvement:** How does the system know an update is better? Voyager tests skills in a sandbox before adding them. MemEvolve runs tournament selection across candidate memory systems. Darwin Gödel Machine gates changes on empirical performance. Reflexion relies on the LLM's self-assessment, which can be wrong. The evaluation mechanism is often where systems break.

**Memory organization:** Append-only storage (cheap, safe) vs. active reorganization (A-MEM's evolution mechanism). Reorganization produces better multi-hop reasoning but introduces destructive updates — if an evolution update is wrong, there's no undo.

**Scope of improvement:** Within a session vs. persistent across sessions. Error logs and skill libraries persist; working memory in Reflexion does not. Persistent improvement compounds; session-scoped improvement resets.

## Who Builds This

[OpenAI](../orgs/openai.md) integrates continuous learning mechanisms into production systems. [Jeff Clune](../people/jeff-clune.md) and colleagues produced foundational work on open-ended learning and AI-generating algorithms that frame self-improvement as the core challenge in AI development. [GEPA](../projects/gepa.md) and [SEAgent](../projects/seagent.md) implement self-evolving patterns in specific domains. [EvoAgentX](../projects/evoagentx.md) provides infrastructure for systematic evaluation of self-evolving agent workflows.

## Failure Modes

**Reward hacking:** The agent finds ways to score well on its own evaluation criteria without actually improving. [Reward Hacking](../concepts/reward-hacking.md) is endemic to any system where the agent influences what gets measured. MemEvolve's tournament selection based on task performance is robust here, but systems that use LLM self-assessment (Reflexion, error logs) are vulnerable — the model may judge its own output as correct when it isn't.

**Credit assignment failures:** In multi-step tasks, identifying which action caused a later failure is hard. [Credit Assignment](../concepts/credit-assignment.md) errors mean the agent learns the wrong lesson. Reflexion mitigates this with explicit chain-of-thought attribution, but multi-hop failures spanning many steps remain difficult.

**Cascading memory corruption:** A-MEM's evolution mechanism has no version history. One bad update to an existing memory cascades through linked memories. At scale, a single misleading input can corrupt a significant portion of the memory network.

**Monoculture in architectural search:** MemEvolve's tournament selection without diversity pressure converges toward similar memory architectures. The population loses variance. Novel architectures stop appearing. This is a known failure mode in evolutionary computation, addressable with novelty search or quality-diversity algorithms — MemEvolve doesn't implement either.

**Improvement theater:** Agents that appear to self-improve but don't actually generalize. Logging errors to markdown files only helps if the agent reliably reads and applies those logs. Skills accumulated in a library only help if retrieval matches the right skill to the right context. The mechanism exists but the compounding effect may not materialize.

**Open-mode evaluation circularity:** When the agent's improvements affect what it evaluates, the evaluation loses meaning. MemEvolve evolves memory systems and evaluates them on tasks where memory affects performance — there's no clean separation between the optimizer and the objective.

## When Not to Use Self-Improving Agents

Self-improvement adds complexity, cost, and unpredictability. Avoid it when:

**The task distribution is narrow and stable.** If your agent does one well-defined thing and the requirements don't change, a static agent with a carefully crafted prompt outperforms a self-improving one. The improvement mechanisms add latency and cost with no benefit.

**You need reproducibility.** Self-improving agents produce different behavior over time. Auditing and debugging are harder. In regulated domains (finance, healthcare, legal), the inability to reproduce past behavior is a disqualifier.

**The evaluation signal is unreliable.** Self-improvement only works when the feedback signal is trustworthy. If your agent's success criteria are ambiguous, subjective, or gameable, the improvement loop will optimize for the wrong thing.

**You're at small scale with infrequent use.** Memory evolution mechanisms (A-MEM's LLM calls for note construction, link generation, evolution updates) cost more at ingestion than they save at retrieval. At low volume, the economics don't work.

**Correctness is the primary constraint.** Memory evolution with destructive updates, skill accumulation from potentially wrong code, and architectural modifications from empirical search all introduce ways the system can quietly degrade. If a wrong answer is worse than no answer, the risk profile of self-improvement is unfavorable.

## Unresolved Questions

**How do you audit what an agent learned?** Error logs are inspectable. LLM-generated contextual descriptions in A-MEM are readable. But the semantic landscape of a 10,000-node memory network after 6 months of evolution is not auditable by a human. There's no standard for "memory explainability."

**What's the cost at scale?** Published benchmarks measure performance gains, not economic viability. MemEvolve requires ~70 task evaluations per evolution round plus multiple LLM calls. A-MEM requires LLM calls at ingestion time for every new memory. At production scale with thousands of daily agent interactions, these costs compound. The papers don't report cost per improvement.

**How do improvements interact across agents?** All current implementations treat self-improvement as single-agent. Multi-agent systems where agents share memory or skills face unresolved questions: whose improvements propagate? What happens when two agents learn conflicting lessons? How do you prevent one agent's corruption from spreading?

**How do you prevent skill library staleness?** Voyager and SkillWeaver accumulate skills over time. Skills written for one environment version may be wrong in another. There's no standard mechanism for skill deprecation or validity checking over time.

**What's the right granularity for memory evolution?** A-MEM's evolution updates individual notes. MemEvolve evolves the entire memory architecture. Neither addresses the intermediate level: when should a collection of related notes be consolidated into a higher-order concept? Automatic curriculum learning [Automatic Curriculum](../concepts/automatic-curriculum.md) in reinforcement learning faces the analogous question with task difficulty.

## Relationships to Adjacent Concepts

[Continual Learning](../concepts/continual-learning.md) addresses how models learn new tasks without forgetting old ones. Self-improving agents face the same catastrophic forgetting problem at the skill and memory level, but with the additional constraint of operating at inference time rather than training time.

[Reinforcement Learning](../concepts/reinforcement-learning.md) provides the formal framework (policy, reward, value function, credit assignment) that underlies many self-improvement mechanisms. Voyager's skill accumulation is essentially a curriculum RL problem. MemEvolve's tournament selection resembles evolutionary RL.

[Synthetic Data Generation](../concepts/synthetic-data-generation.md) connects when agents generate their own training data from operation logs — Karpathy notes this natural extension of the knowledge base pattern, where accumulated wiki content becomes fine-tuning data.

[LLM-as-a-Judge](../concepts/llm-as-a-judge.md) is the evaluation mechanism in most self-improving systems that don't have ground-truth task rewards. The quality of self-improvement is bounded by the quality of LLM self-evaluation.

## Alternatives

**Static agents with careful prompting:** When your task distribution is known and stable. Lower cost, higher reproducibility.

**Human-in-the-loop fine-tuning:** When you have labeled data and can afford training runs. More reliable than in-context improvement, better generalization.

**Retrieval-augmented generation with human-curated knowledge bases:** When accuracy matters more than automation. Human-curated knowledge is more trustworthy than agent-evolved knowledge; RAG retrieval is more predictable than evolved memory systems.

**Modular agents with explicit versioning:** When auditability matters. Instead of continuous self-modification, ship discrete agent versions with explicit changelogs. Less adaptive but debuggable.


## Related

- [OpenAI](../projects/openai.md) — implements (0.4)
- [EvoAgentX](../projects/evoagentx.md) — implements (0.7)
- [Reflexion](../concepts/reflexion.md) — implements (0.7)
- [Voyager](../projects/voyager.md) — implements (0.8)
- [ADAS](../projects/adas.md) — implements (0.8)
- [Darwin Gödel Machine](../concepts/darwin-godel-machine.md) — implements (0.9)
- [GEPA](../concepts/gepa.md) — implements (0.7)
- [SkillWeaver](../projects/skillweaver.md) — implements (0.7)
- [EvoAgentX](../projects/evoagentx.md) — implements (0.8)
- [MemEvolve](../projects/memevolve.md) — implements (0.6)
- [LLM-as-a-Judge](../concepts/llm-as-judge.md) — implements (0.6)
- [Continual Learning](../concepts/continual-learning.md) — implements (0.8)
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — implements (0.7)
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — implements (0.6)
- [AutoGPT](../projects/autogpt.md) — implements (0.6)
- [Reward Hacking](../concepts/reward-hacking.md) — part_of (0.5)
- [Credit Assignment](../concepts/credit-assignment.md) — part_of (0.6)
- [Automatic Curriculum](../concepts/automatic-curriculum.md) — implements (0.7)
- [Compositional Skill Synthesis](../concepts/compositional-skill-synthesis.md) — implements (0.6)
- [SEAgent](../projects/seagent.md) — implements (0.7)
- [Meta-Harness](../concepts/meta-harness.md) — implements (0.7)
- [Jeff Clune](../concepts/jeff-clune.md) — implements (0.7)
