# Self-Improving Coding Agent (SICA)

> A coding agent framework where the agent works on its own codebase, creating a tight feedback loop where self-observation (benchmark evaluation) directly drives agentic skill evolution -- enabling agents to bootstrap specialized capabilities without manual feature engineering.

## What It Does

SICA operates as an iterative self-improvement loop: (1) evaluate the current agent version on benchmark tasks to capture performance, (2) store results in an archive, (3) run the agent on its own codebase to work on an improvement, (4) repeat with the updated agent code. The base agent is deliberately minimal -- it lacks efficient file editing tools, devtools like tree sitter or LSP integrations, and advanced reasoning structures. This is by design: it has the necessary building blocks to bootstrap these features and specialize itself to the distribution of benchmark tasks included. The agent can develop tools, modify its own code architecture, and evolve its capabilities through benchmark-driven selection.

## Architecture

- **Self-improvement loop**: Evaluate on benchmarks -> store results in archive -> agent modifies own codebase -> repeat
- **Docker isolation**: All agent execution runs in Docker containers for safety, preventing inadvertent host filesystem manipulation
- **Multi-provider LLM support**: Anthropic, OpenAI, Gemini, Vertex, Fireworks, DeepSeek -- configured via environment variables
- **Web visualization**: Interactive callgraph viewer at localhost:8080 showing event bus, agent traces, and overseer messages
- **Configurable benchmarks**: Modular benchmark system in `base_agent/src/benchmarks/`

```
base_agent/
  src/
    agents/      # Agent implementations
    benchmarks/  # Benchmark definitions
    config.py    # LLM and agent configuration
    tools/       # Agent-accessible tools
    oversight/   # Safety and monitoring
    web_server/  # Interactive visualization
runner.py        # Self-improvement loop orchestrator
```

## Key Numbers

- 299 GitHub stars, 49 forks
- Python, MIT license
- Multi-provider: Anthropic, OpenAI, Gemini, Vertex, Fireworks, DeepSeek
- Workshop paper at ICLR 2025 (Workshop on Scaling Self-Improving Foundation Models)
- Docker-based sandboxed execution

## Strengths

- By instrumenting the agent's own codebase as the improvement target, the framework creates the tightest possible feedback loop -- the agent can develop tools like efficient file editing or LSP integration that directly improve its own benchmark performance
- The deliberately minimal base agent validates that self-improvement can bootstrap real capabilities rather than just fine-tuning existing ones

## Limitations

- Running the self-improvement loop requires significant compute (multiple LLM inference calls per benchmark evaluation, multiplied by iterations), making experimentation expensive
- The variance problem is acknowledged but unsolved -- early features influence subsequent features, making self-improvement runs non-deterministic and hard to reproduce

## Alternatives

- [coral.md](coral.md) -- use when you want multi-agent collaborative evolution rather than single-agent self-modification
- [hyperagents.md](hyperagents.md) -- use when you want metacognitive self-modification where the improvement process itself evolves
- [uditgoenka-autoresearch.md](uditgoenka-autoresearch.md) -- use when you want to improve a target project rather than the agent's own codebase

## Sources

- [maximerobeyns-self-improving-coding-agent.md](../../raw/repos/maximerobeyns-self-improving-coding-agent.md) -- "A coding agent experiment, that works on its own codebase... evaluating the current agent version on some benchmark tasks, storing results in an archive, running the agent on its own codebase to work on an improvement"
