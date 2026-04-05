# The Autoresearch / Self-Improvement Loop

> A pattern where an agent autonomously improves a measurable artifact by repeatedly making one change, evaluating the result against a fixed scoring rubric, keeping improvements, and discarding regressions. The human's role shifts from doing the optimization to designing the evaluation criteria -- effectively, reward function engineering.

## Why It Matters

Most prompt engineering, skill writing, and code optimization follows a manual cycle: change something, check if it is better, repeat. This works for simple tasks but breaks down when you need dozens or hundreds of iterations to find improvements that compound. The autoresearch loop automates the iteration, letting an agent run 50-100 experiments overnight while you sleep.

The pattern generalizes far beyond ML training. Karpathy demonstrated it on neural network code, but practitioners have applied it to prompt optimization, agent skill files, content templates, performance-sensitive code paths, documentation quality, and test infrastructure reliability. The core requirement is simple: if you can score the artifact with a number and the scoring runs without a human, the loop works.

This matters for knowledge base builders because it transforms static artifacts into continuously improving systems. A skill file that passes 55% of eval cases today can reach 75-85% after an overnight run. A wiki compilation prompt that produces inconsistent formatting can be iteratively refined against deterministic quality checks. Git serves as episodic memory -- every experiment is a commit, every improvement is traceable, every regression is revertable.

## How It Works

The loop has five steps:

1. **Read** the current version of the artifact (prompt, skill file, code, template).
2. **Change** one thing about it. Exactly one hypothesis per variant. Multiple changes obscure causation.
3. **Test** it against a fixed scoring rubric. The rubric must be binary (pass/fail) or produce a scalar metric. Subjective 1-10 ratings fail because they are inconsistent across runs.
4. **Keep** if the score improved. **Discard** if it did not. Roll back to the best known version.
5. **Repeat** until a stopping condition is met (target score reached, N consecutive discards, or iteration budget exhausted).

The critical insight is that the loop itself is simple -- the hard part is designing the evaluation criteria. Cameron Westland frames this as "reward function design": the `autoresearch.md` spec is a reward function written in prose. It defines the primary metric to optimize, secondary metrics that act as constraints (to prevent shortcut exploitation), files in scope and off limits, and phase boundaries that control what kinds of changes are allowed.

Binary evaluation outperforms subjective scoring. Each assertion answers a yes/no question: Does the output include specific actionable steps? Is the formatting correct? Does it handle the known edge case? Pass rate (percentage of test cases where all assertions return True) is deterministic, comparable across runs, and easy to reason about.

Git provides episodic memory for the loop. Every experiment is a commit or a JSONL log entry with the run number, metric value, status (keep/discard/crash), and description of the change. This creates an organizational memory about what was tried, what worked, and why -- searchable and replayable.

## Who Implements It

- [Karpathy Autoresearch](../projects/autoresearch.md) -- the canonical implementation; single-GPU LLM training with `program.md` as human-editable agent context. Fixed 5-minute training budget, val_bpb as metric. Agent edits only `train.py`; human edits only `program.md`.
- [Pi-autoresearch](../../raw/repos/davebcn87-pi-autoresearch.md) -- TypeScript extension implementing try/measure/keep/revert loop with benchmarking scripts decoupled from agent decision-making; git branching strategy for experiment isolation
- [GEPA](../projects/gepa.md) -- reflective mutation that reads full execution traces to diagnose failures rather than collapsing them to scalars, achieving 35x fewer evaluations than RL methods for prompt and code optimization
- [GOAL.md](../../raw/repos/jmilinovich-goal-md.md) -- generalizes autoresearch to domains with constructed metrics; dual-score safeguard (one score for artifact quality, another for instrument quality) prevents the agent from gaming its own evaluation
- [Uditgoenka Autoresearch](../../raw/repos/uditgoenka-autoresearch.md) -- Claude Code skill implementing the constraint-metric-loop pattern as a reusable autonomous iteration tool for any domain

## Open Questions

- How do you design stopping conditions that balance compute cost against potential improvements? Current approaches use fixed iteration budgets or consecutive-discard counts, but adaptive stopping based on the improvement curve slope would be more efficient.
- Can the evaluation criteria themselves be autonomously improved? Meta-loops where one agent optimizes the eval rubric of another are theoretically possible but risk runaway specification drift.
- How do you handle domains where binary evaluation is genuinely difficult to define? Documentation quality, design aesthetics, and user experience resist simple pass/fail decomposition.
- What happens when the artifact being optimized interacts with other artifacts? Optimizing one skill file in isolation may degrade system-level behavior when skills compose. Multi-artifact autoresearch loops remain unexplored.

## Sources

- [Karpathy Autoresearch repo](../../raw/repos/karpathy-autoresearch.md) -- "the idea: give an AI agent a small but real LLM training setup and let it experiment autonomously overnight. It modifies the code, trains for 5 minutes, checks if the result improved, keeps or discards, and repeats"
- [Cameron Westland -- Autoresearch Is Reward Function Design](../../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md) -- "the secondary metrics are controls, not telemetry. They play the same role that reward shaping plays in RL: if embedder_calls drops to zero, the agent found a way to make the primary number go down without doing the actual work"
- [Sid Saladi -- Autoresearch 101](../../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md) -- "the Karpathy Loop makes any measured artifact self-improving without ML expertise -- your prompts, skills, and workflows can undergo 50-100 automated refinement cycles overnight if you define what 'better' means through binary test cases"
- [MindStudio -- Self-Improving AI Skills](../../raw/articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md) -- "binary eval assertions combined with automated overnight improvement cycles let you reach 75-85% reliability on specialized AI skills without manual iteration"
