# Darwin Godel Machine

> Self-improving system that uses Darwinian evolution to modify its own code -- including its own self-improvement mechanisms -- achieving SWE-bench improvement from 20% to 50% and Polyglot from 14.2% to 30.7% without human intervention.

## What It Does

The Darwin Godel Machine (DGM) is a self-improving AI system that iteratively modifies its own codebase and empirically validates each change using coding benchmarks. Inspired by the theoretical Godel Machine (which required provably beneficial changes), DGM replaces proof with empirical validation. It maintains an archive of generated coding agents, grows the archive by sampling an agent and using a foundation model to create a new variant, and retains variants that perform better. The system automatically discovers improvements like better code editing tools, long-context window management, and peer-review mechanisms -- all without human architectural guidance.

## Architecture

The system maintains an archive of coding agent variants organized as a growing tree. Each iteration: (1) sample an agent from the archive, (2) use a foundation model to create a new, interesting variant of the sampled agent, (3) evaluate the variant on coding benchmarks, (4) add to the archive if it passes quality thresholds. This open-ended exploration forms a tree of diverse, high-quality agents and allows parallel exploration of many paths through the search space. The key insight is archive-based variation: instead of hill-climbing on a single agent, maintaining diversity enables escaping local optima. All experiments ran with safety precautions including sandboxing and human oversight.

## Key Numbers

- SWE-bench: 20.0% to 50.0% (2.5x improvement)
- Polyglot benchmark: 14.2% to 30.7% (2.2x improvement)
- Significantly outperforms baselines without self-improvement or open-ended exploration
- Published May 2025, updated March 2026
- Authors: Jenny Zhang, Shengran Hu, Cong Lu, Robert Lange, Jeff Clune

## Strengths

- Demonstrates that empirical self-improvement is practical today -- agents can discover code editing tools and review mechanisms humans did not design
- Archive-based variation maintains diversity, avoiding the single-solution convergence that plagues standard optimization
- The system improves its own self-improvement ability, creating a compound effect that accelerates discovery
- SWE-bench jump from 20% to 50% is one of the largest autonomous improvements documented on a standard benchmark

## Limitations

- Requires significant compute -- each variant must be evaluated on full benchmark suites
- Safety depends on sandboxing and human oversight, which the paper acknowledges is necessary
- No published open-source implementation -- the paper describes the system but does not release code
- Improvements are benchmark-specific -- no evidence that discovered variants generalize beyond SWE-bench and Polyglot

## Alternatives

- [gepa.md](gepa.md) -- use when you want controlled optimization of specific textual parameters rather than open-ended agent evolution
- [obsidian-skills.md](obsidian-skills.md) -- use when you need modular, human-curated skill composition rather than autonomous skill discovery
- [supermemory.md](supermemory.md) -- use when the bottleneck is memory/context management rather than agent architecture

## Sources

- [Source](../../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) -- "The DGM automatically improves its coding capabilities (e.g., better code editing tools, long-context window management, peer-review mechanisms), increasing performance on SWE-bench from 20.0% to 50.0%."
