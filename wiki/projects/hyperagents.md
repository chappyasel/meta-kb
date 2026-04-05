# Hyperagents (DGM-H)

> Self-referential agents that can modify both their task-solving behavior and the process that generates future improvements -- enabling metacognitive self-modification where the agent learns not just to perform better, but to improve at improving.

## What It Does

Hyperagents extends the Darwin Godel Machine (DGM) framework with a critical addition: the self-improvement procedure itself is editable and subject to evolution. While DGM demonstrated that open-ended self-improvement is possible by iteratively generating and evaluating improved agents, it relied on the assumption that task performance improvements translate into improvement process improvements. This alignment holds in coding (where both evaluation and modification are in the same domain) but breaks down in general. DGM-Hyperagents (DGM-H) makes both task-solving behavior and the self-improvement procedure editable, enabling agents to discover meta-level improvements like persistent memory and performance tracking that transfer across domains.

## Architecture

- **DGM foundation**: Maintains an archive of generated coding agents, grows it by sampling an agent and using a foundation model to create improved variants, forming a growing tree of diverse agents
- **Hyperagent extension**: Both task-solving code and the self-improvement procedure are mutable and evolvable
- **Metacognitive loop**: The system can modify how it generates new agent variants, not just the agents themselves
- **Cross-domain transfer**: Meta-level improvements (e.g., persistent memory, performance tracking) transfer across domains and accumulate across runs
- **Safety**: All experiments run with sandboxing and human oversight

Evaluated across four diverse domains: coding (SWE-bench), paper review, robotics reward design, and Olympiad-level math solution grading.

## Key Numbers

- 3,622 likes, 661 retweets, 490K views on announcement tweet
- DGM improved SWE-bench from 20.0% to **50.0%**, Polyglot from 14.2% to **30.7%**
- Hyperagents outperform DGM and baselines without self-improvement across all four domains
- Meta-level improvements transfer across domains and accumulate across runs
- Paper: arxiv 2505.22954 (DGM), with Hyperagents extension
- Collaboration: Meta AI, with researchers from Oxford and elsewhere

## Strengths

- The metacognitive dimension is genuinely novel -- most self-improving systems have a fixed improvement process, while Hyperagents makes the improvement process itself evolvable, enabling compounding capability gains at the meta level
- Cross-domain transfer of meta-level improvements (persistent memory, performance tracking) demonstrates that these improvements capture generalizable principles rather than domain-specific tricks

## Limitations

- The system requires significant compute to explore the agent archive and evaluate candidates across multiple domains, making it impractical for individual practitioners
- The reliance on foundation models for generating agent variants means the system's ceiling is bounded by the foundation model's code generation capabilities

## Alternatives

- [self-improving-coding-agent.md](self-improving-coding-agent.md) -- use when you want single-agent self-improvement on its own codebase rather than population-based evolution
- [coral.md](coral.md) -- use when you want multi-agent collaboration with shared knowledge rather than evolutionary agent archives
- [uditgoenka-autoresearch.md](uditgoenka-autoresearch.md) -- use when you want a practical single-agent improvement loop for your project rather than research-scale meta-learning

## Sources

- [jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md](../../raw/tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md) -- "Introducing Hyperagents: an AI system that not only improves at solving tasks, but also improves how it improves itself"
- [zhang-darwin-godel-machine-open-ended-evolution-of-self.md](../../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) -- "The DGM automatically improves its coding capabilities... increasing performance on SWE-bench from 20.0% to 50.0%"
