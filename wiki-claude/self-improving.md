# The State of Self-Improving Systems

> Self-improvement has a recipe now. Karpathy's autoresearch pattern—read, change one thing, test, keep if better, discard if not, repeat—has generalized from ML hyperparameter tuning to any artifact with a measurable evaluation function. Prompts, skills, agent architectures, and entire codebases can undergo 50-100 automated refinement cycles overnight for under $25. The bottleneck has shifted from "how do I improve this?" to "how do I define what 'better' means?"

## Approach Categories

### The Karpathy Autoresearch Pattern

The canonical self-improvement loop originated with Karpathy's autoresearch: a 630-line framework where agents autonomously explore neural network architectures, optimizer settings, and hyperparameters across hundreds of 5-minute training runs per overnight session ([Karpathy autoresearch repo](../raw/repos/karpathy-autoresearch.md), 65,009 stars).

The breakthrough results came three days later: [left running autonomously](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md) (19,459 likes), autoresearch discovered 20 compounding improvements to nanochat—attention sharpening, regularization, schedule optimization—that humans had missed despite months of manual effort. The improvements transferred to larger models and stacked cumulatively for an 11% improvement in "Time to GPT-2."

The [packaging tweet](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md) (28,330 likes, 10.9M views) made the insight explicit: humans engineer agent behavior (via prompt iteration) while agents autonomously optimize code (via git commits). The bottleneck shifts from human iteration speed to prompt quality.

[Awesome Autoresearch](../raw/repos/alvinreal-awesome-autoresearch.md) (1,169 stars) curates 40+ descendant systems, demonstrating that the pattern has generalized across trading, biomechanics, kernel optimization, and other domains.

### Autoresearch Applied: Prompt and Skill Optimization

The autoresearch loop's most accessible application is overnight prompt and skill optimization.

[Sid Saladi's builder's playbook](../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md) codifies the process: pick targets (skills, system prompts, templates, agent workflows), write 3-6 binary eval criteria per target, and execute overnight improvement cycles. Concrete results include Shopify's 53% rendering speedup. Cost estimate: $5-25 for 50-100 cycles.

[MindStudio's guide](../raw/articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md) adds implementation detail: binary eval assertions (not subjective scoring), Claude Code as the optimization agent reading failure patterns and generating targeted prompt variants. Expected progression: obvious fixes in early cycles, structural improvements mid-loop, fine-tuning and plateaus in later cycles. The guide reports 75-85% reliability achievable on specialized skills without manual iteration.

[@hesamation](../raw/tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md) (3,374 likes) demonstrated the pattern on skill improvement specifically: test-driven iteration achieved 56% to 92% success rate in just 4 rounds. This bypasses traditional fine-tuning bottlenecks entirely—skill improvement through iterative definition refinement.

[@aakashgupta](../raw/tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md) generalized the pattern to six domains: ad copy, cold emails, video scripts, code optimization, with concrete results like 11% speed improvements and 20+ undiscovered optimizations to manually-tuned code.

### Autoresearch as Reward Function Design

[Cameron Westland's analysis](../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md) provides the conceptual breakthrough: autoresearch isn't just "run experiments automatically"—it's reward function design. Setting up deterministic replay harnesses and secondary metric constraints acts as a reward function that prevents agents from finding optimization shortcuts that technically work but violate constraints.

His concrete example: an AI agent improved latency from 339ms to 34ms in 49 experiments for $24, but the key innovation was secondary metrics (embedder_calls, db_calls) acting as constraints that caught "reward hacking." The agent learned to avoid optimizations that violated constraints in favor of pure performance gains.

This connects to [Lilian Weng's reward hacking survey](../raw/articles/lil-log-reward-hacking-in-reinforcement-learning.md), which documents how agents exploit specification ambiguities rather than learning genuine capabilities—a critical threat to any self-improving system. The mitigation: multi-metric evaluation with constraint modeling, not single-score optimization.

### Production Self-Improvement Implementations

Several frameworks have productionized the autoresearch pattern:

[Pi-autoresearch](../raw/repos/davebcn87-pi-autoresearch.md) (3,393 stars) is a TypeScript extension implementing the pattern with tooling: experiment initialization, live dashboard, confidence scoring via median absolute deviation, optional backpressure checks (tests, types, lint), and finalization into reviewable branches. The key design: decouple measurements (benchmarking scripts) from agent decision-making.

[GEPA](../raw/repos/gepa-ai-gepa.md) (3,157 stars) uses Genetic-Pareto optimization for evolving any textual parameter (prompts, code, architectures) against measurable objectives, achieving 35x faster optimization than RL methods. Results: 90x cost improvements vs. Claude Opus, 55% to 82% on coding agent tasks. Integrated into DSPy, MLflow, and production systems at Shopify and Databricks.

[Uditgoenka's autoresearch](../raw/repos/uditgoenka-autoresearch.md) (3,142 stars) instantiates the constraint-metric-loop as a reusable Claude Code skill, with git as episodic memory for the improvement process. The modify-verify-keep/discard-repeat loop makes knowledge bases self-improving by default.

[GOAL.md](../raw/repos/jmilinovich-goal-md.md) (112 stars) generalizes the pattern to domains with constructed metrics—documentation quality, API trustworthiness, code health—where natural metrics don't exist. It includes fitness functions, action catalogs, operating modes (converge/continuous/supervised), and dual-score safeguards preventing agents from gaming their own evaluations. Real results: 47 to 83 routing confidence improvements.

### Self-Improving Agent Architectures

Beyond optimizing artifacts, some systems improve the agent itself.

[Darwin Godel Machine](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) (DGM) iteratively modifies its own code and empirically validates changes using coding benchmarks. Inspired by Darwinian evolution, DGM maintains an archive of coding agents and uses foundation models to create novel variations. Performance: SWE-bench from 20% to 50%, Polyglot from 14.2% to 30.7%.

[HyperAgents](../raw/tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md) (3,622 likes, 490K views) extends DGM with metacognitive self-modification—agents that improve not just at solving tasks but at improving how they improve. Meta-level improvements like persistent memory and performance tracking transfer across domains and accumulate across runs.

[Self-Improving Coding Agent](../raw/repos/maximerobeyns-self-improving-coding-agent.md) (299 stars, ICLR workshop paper) implements the canonical loop: evaluate, archive, improve, repeat—with the agent bootstrapping specialized capabilities like file editing and LSP integration through benchmark-driven evolution.

[ADAS](../raw/repos/shengranhu-adas.md) (1,551 stars, ICLR 2025) treats agent architecture as a searchable design space, enabling automated discovery of superior agentic architectures through meta-agent search without manual intervention.

### Self-Improving Through Memory and Feedback

A complementary thread uses memory and error logging as the self-improvement mechanism.

[Kayba's ACE](../raw/repos/kayba-ai-agentic-context-engine.md) (2,112 stars) implements agent self-improvement through a persistent Skillbook that captures learned strategies from execution traces. Specialized roles (Agent, Reflector, SkillManager) extract patterns from failures and successes, storing reusable strategies for retrieval in future runs. Results: 2x consistency improvement on benchmarks.

[@coreyganim's](../raw/tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md) self-improving agent pattern logs errors to ERRORS.md, corrections to LEARNINGS.md, and feature requests to FEATURE_REQUESTS.md. Recurring issues get flagged; important lessons get promoted to permanent memory. A 60-second setup creates a system where agents evolve from generic mistakes on day 1 to domain-specific competence by day 30.

[Autocontext](../raw/repos/greyhaven-ai-autocontext.md) (695 stars) implements a structured multi-agent loop (competitor, analyst, coach, architect, curator) that evaluates strategies through scenario execution and distills stable behavior into reusable playbooks. Supports frontier-to-local distillation with MLX—moving knowledge from expensive models to cheap ones.

[OpenAI's Self-Evolving Agents cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md) demonstrates self-healing workflows combining human review, automated evaluations, and iterative prompt refinement through automated API calls. The healthcare use case shows how regulated domains benefit most from repeatable retraining loops.

[LangChain's improvement loop](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md) formalizes the infrastructure: traces (execution records) are the foundational data layer that converts hunches about what's broken into testable hypotheses about which layer (model, orchestration, context) needs updating.

### Autonomous Operation and the Inception Loop

The most aggressive implementations run self-improvement continuously without human intervention.

[The Inception Loop](../raw/articles/dev-journal-building-the-inception-loop-a-month-of-autonomous.md) describes Tars, a Level 3 Autonomous Sidekick demonstrating Temporal Continuity—persisting state across weeks, managing its own CI/CD, and autonomously improving source code through Git branches and PRs. Self-healing hygiene every 12 hours, process restart management via PM2, and the ability to identify feature gaps and submit Pull Requests autonomously.

[Compound Product](../raw/repos/snarktank-compound-product.md) (503 stars) demonstrates autonomous loops that read daily reports, identify priorities, and implement fixes while maintaining persistent state. The observation-correction loop enables product improvement without manual intervention.

[Memento](../raw/repos/agent-on-the-fly-memento.md) (2,375 stars) uses case-based reasoning over stored trajectories as a learned policy, enabling continual improvement without model weight updates. The framework decouples agent improvement from model weights by treating successful and failed trajectories as a searchable policy space.

## The Convergence

**Binary evaluation is the meta-pattern.** Every successful self-improvement system uses binary (yes/no, pass/fail) evaluation rather than subjective scoring. MindStudio's binary assertions, Cameron Westland's deterministic replay harness, GOAL.md's fitness functions—all converge on the insight that you need a clear, automatable definition of "better" before autonomous improvement can work. Subjective scoring introduces the reward hacking risks that Lilian Weng documents.

**Git as episodic memory for improvement.** Almost every implementation uses git commits as the audit trail for the improvement process: each experiment is a commit, keeping only improvements creates a clean history, and reverting failed experiments is trivial. Git isn't just version control here—it's the episodic memory of the improvement loop.

**The human role shifts to constraint engineering.** In the autoresearch pattern, the human doesn't optimize—the human defines what "better" means and what constraints must be respected. This is Cameron Westland's key insight: autoresearch is reward function design. The quality of the improvement loop is determined by the quality of the evaluation criteria, not the quality of the agent.

## The Divergence

**Artifact optimization vs. architecture evolution.** Autoresearch optimizes a fixed artifact (a prompt, a training run) within a fixed architecture. DGM and ADAS evolve the architecture itself. The tradeoff: artifact optimization is safer and more predictable; architecture evolution can find qualitatively better solutions but risks instability and is harder to validate.

**Single-metric vs. multi-metric optimization.** Karpathy's original autoresearch optimizes a single metric (validation bits-per-byte). Cameron Westland demonstrates that secondary constraints are essential to prevent reward hacking. GEPA uses Pareto optimization across multiple objectives simultaneously. The single-metric approach is simpler but more vulnerable to gaming.

**Overnight batch vs. continuous improvement.** Most autoresearch implementations run as overnight batch jobs. The Inception Loop and Compound Product run continuously. Continuous improvement enables faster iteration but requires more robust safety guardrails to prevent cascading failures in unreviewed changes.

[Algorithmic circuit breakers](../raw/articles/arion-research-llc-algorithmic-circuit-breakers-preventing-flash-cr.md) address the safety side: multi-metric anomaly detection (semantic drift, confidence decay, recursive loops, velocity spikes) with graduated response (throttle, isolation, hard trip) rather than immediate shutdown. This containment infrastructure is essential for continuous self-improvement.

## What's Hot Now

Karpathy's autoresearch repo (65,009 stars) and packaging tweet (28,330 likes, 10.9M views) catalyzed the field. The pattern is being applied to prompt optimization (MindStudio, Sid Saladi), code optimization (Cameron Westland, Shopify), and agent architecture evolution (DGM, HyperAgents).

[GEPA](../raw/repos/gepa-ai-gepa.md) is gaining traction as the production optimization framework, with 35x speedup over RL methods and integrations into DSPy, MLflow, and enterprise deployments.

The [CORAL framework](../raw/repos/human-agent-society-coral.md) enables multi-agent autoresearch where agents share knowledge and compete on a leaderboard—extending the pattern from individual agent improvement to collective intelligence.

## Where It's Going

**Self-improvement will become a standard agent capability.** Just as agents are expected to use tools and manage context, they'll be expected to improve their own performance over time. The autoresearch pattern will be embedded into agent frameworks as a primitive, not a separate system.

**Evaluation engineering will become a discipline.** As the human role shifts to defining "better," the art of writing good evaluation criteria will become as important as prompt engineering is today. Binary assertions, multi-metric constraints, and reward hacking defenses will be standard toolkit items.

**Meta-improvement will compound.** HyperAgents' metacognitive self-modification—improving how you improve—creates compounding returns. If an agent can optimize its own improvement process, the rate of improvement accelerates over time. This is the path to genuinely open-ended agent capability growth.

**Safety infrastructure will gate adoption.** Continuous self-improvement without human review requires robust containment: circuit breakers, anomaly detection, graduated response, and audit trails. The systems that solve the safety problem will define how fast the field can move.

## Open Questions

- What's the ceiling for self-improvement through prompt/skill optimization before you need to change model weights?
- How do you detect and prevent reward hacking in self-improving systems that define their own evaluation criteria?
- Can self-improvement loops maintain diversity, or do they converge to local optima? How do you inject exploration?
- What's the right cadence for human review of self-improved artifacts? Every cycle? Only when metrics plateau? Only when constraints are violated?
- How do you compose improvements across multiple agents working on the same system without conflicts?

## Sources

**Articles**
- [Sid Saladi — AutoResearch 101 Builder's Playbook](../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md)
- [Cameron Westland — AutoResearch is Reward Function Design](../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md)
- [MindStudio — Claude Code with AutoResearch](../raw/articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md)
- [OpenAI — Self-Evolving Agents Cookbook](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)
- [LangChain — Agent Improvement Loop](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)
- [Inception Loop — Autonomous Self-Improvement](../raw/articles/dev-journal-building-the-inception-loop-a-month-of-autonomous.md)
- [Lilian Weng — Reward Hacking](../raw/articles/lil-log-reward-hacking-in-reinforcement-learning.md)
- [Algorithmic Circuit Breakers](../raw/articles/arion-research-llc-algorithmic-circuit-breakers-preventing-flash-cr.md)

**Papers**
- [Zhang et al. — Darwin Godel Machine](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)
- [Shinn et al. — Reflexion](../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

**Tweets**
- [Karpathy — Autoresearch Packaging](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)
- [Karpathy — Autoresearch Results](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)
- [aakashgupta — Autoresearch Generalized](../raw/tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md)
- [hesamation — Skill Improvement Loop](../raw/tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md)
- [jennyzhangzt — HyperAgents](../raw/tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md)
- [coreyganim — Error Logging Pattern](../raw/tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md)
- [DataChaz — Self-Improving Setup](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)

**Repos**
- [Karpathy Autoresearch](../raw/repos/karpathy-autoresearch.md) — [Awesome Autoresearch](../raw/repos/alvinreal-awesome-autoresearch.md)
- [Pi-autoresearch](../raw/repos/davebcn87-pi-autoresearch.md) — [GEPA](../raw/repos/gepa-ai-gepa.md)
- [Uditgoenka Autoresearch](../raw/repos/uditgoenka-autoresearch.md) — [GOAL.md](../raw/repos/jmilinovich-goal-md.md)
- [DGM / Self-Improving Coding Agent](../raw/repos/maximerobeyns-self-improving-coding-agent.md)
- [ADAS](../raw/repos/shengranhu-adas.md) — [Memento](../raw/repos/agent-on-the-fly-memento.md)
- [Kayba ACE](../raw/repos/kayba-ai-agentic-context-engine.md) — [Autocontext](../raw/repos/greyhaven-ai-autocontext.md)
- [Compound Product](../raw/repos/snarktank-compound-product.md) — [CORAL](../raw/repos/human-agent-society-coral.md)
