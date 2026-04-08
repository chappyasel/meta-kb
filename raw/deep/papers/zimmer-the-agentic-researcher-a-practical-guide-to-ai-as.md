---
url: 'https://arxiv.org/abs/2603.15914'
type: paper
author: 'Max Zimmer, Nico Pelleriti, Christophe Roux, Sebastian Pokutta'
date: '2026-03-16'
tags:
  - agentic-skills
  - agent-memory
  - self-improving
  - context-engineering
  - autonomous-agents
  - research-automation
  - prompt-engineering
key_insight: >-
  The "Ten Commandments" pattern -- encoding scientific methodology as explicit
  agent directives in INSTRUCTIONS.md -- transforms CLI coding agents into
  autonomous research assistants capable of 20+ hour sessions. The key insight
  for KB builders: knowledge bases must encode not just domain facts but
  executable workflows, verification procedures, and autonomy guardrails
  (one-variable-per-experiment, tiered evaluation, verify-before-claiming) to
  scaffold extended autonomous operation.
deep_research:
  method: paper-full-text
  text_length: 13000
  analyzed_at: '2026-04-04'
  original_source: papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
relevance_scores:
  topic_relevance: 8
  practitioner_value: 8
  novelty: 7
  signal_quality: 8
  composite: 7.9
  reason: >-
    The INSTRUCTIONS.md/Ten Commandments pattern directly parallels
    CLAUDE.md/AGENTS.md context engineering standards and encodes executable
    workflows and autonomy guardrails—core concepts for KB builders and
    self-improving agent systems—making it highly transferable to the knowledge
    base's topic areas.
---

## Architecture Overview

This paper presents a practical framework for turning CLI coding agents (Claude Code, Codex CLI, Gemini CLI, OpenCode) into autonomous research assistants for mathematics and machine learning. The framework has three components:

**1. Five-Level Integration Taxonomy:**
- Level 0: Classical research (no AI)
- Level 1: AI as Consultant (chatbot for targeted queries)
- Level 2: AI as Typist (AI generates code/text, human reviews before execution)
- Level 3: AI as Collaborator (CLI agents implement tasks, execute code, iterate)
- Level 4: AI as Research Associate (autonomous multi-hour sessions following structured plans)

**2. Agentic Research Framework:**
- Persistent instruction file (INSTRUCTIONS.md) with universal rules and project-specific guidance
- Sandboxed container environment isolating experiments from host systems
- Structured reporting via LaTeX documents and Git version control
- Eight-step experimental loop: Explore -> Plan -> Implement -> Evaluate -> Analyze -> Record -> Commit -> Iterate

**3. Case Studies:** Six detailed examples from deep learning optimization, LLM pruning/quantization, and mathematical theorem proving.

The framework is model-agnostic -- it works with any CLI agent and any frontier LLM. The longest autonomous session ran 20+ hours, dispatching independent experiments across multiple compute nodes without human intervention.

## Core Mechanism

### The Ten Commandments (Methodological Rules as Agent Prompts)

The framework's key innovation is encoding scientific norms as explicit agent directives:

**Integrity and Trust:**
- I. Never Break a Promise: Complete stated intentions or explicitly defer them. Prevents the common agent failure of claiming to do something and silently skipping it.
- II. Never Manipulate Evaluation: Preserve evaluation conditions, prevent metric gaming. Addresses the risk of agents "optimizing" metrics by changing evaluation rather than improving the method.
- III. Never Fabricate Citations: Verify all bibliography entries against primary sources. Prevents hallucinated references.

**Autonomy and Efficiency:**
- IV. Complete All Autonomous Work: Finish tasks without human input before reporting. Prevents premature interruption for unnecessary clarification.
- V. Make It Work Before Moving On: Fix implementation failures rather than abandoning approaches. Prevents the common agent pattern of switching tactics instead of debugging.

**Scientific Rigor:**
- VI. One Variable per Experiment: Change exactly one factor to enable causal attribution. This is the most impactful methodological rule -- it forces systematic exploration instead of the agent's tendency to change multiple things simultaneously.
- VII. Evaluate in Tiers: Three-stage evaluation: crash-test (seconds), signal detection (minutes), full evaluation (hours). This prevents wasting compute on approaches that fail basic sanity checks.
- VIII. Bound Your Expectations: Establish theoretical limits before implementation. Prevents chasing impossible improvements.

**Documentation and Reproducibility:**
- IX. Record Everything: Document all experiments with goal, hypothesis, method, results, analysis, next steps. Creates a complete audit trail.
- X. Verify Before Claiming: Write verification scripts; actively attempt to falsify hypotheses. Prevents premature conclusion.

These rules are not suggestions -- they are injected into the agent's context as mandatory behavioral constraints. The agent is expected to follow them throughout autonomous operation.

### The Eight-Step Experimental Loop

Each research iteration follows a structured cycle:

1. **Explore:** Review literature, codebase, and prior results
2. **Plan:** Formulate hypothesis and experimental design
3. **Implement:** Write code following the plan
4. **Evaluate:** Run tiered evaluation (crash-test -> signal -> full)
5. **Analyze:** Interpret results, identify patterns
6. **Record:** Document in LaTeX report
7. **Commit:** Git commit with structured message
8. **Iterate:** Plan next experiment based on findings

### Infrastructure

- Sandboxed container for isolated execution
- Git-based experiment tracking with structured commits
- Multi-GPU parallelization via Slurm for compute-intensive research
- Project-local package managers (uv for Python, Julia Pkg)
- Concurrent sessions via Git worktrees

## Design Tradeoffs

**Rules as context injection vs. fine-tuning:** The framework encodes methodology as prompt rules rather than fine-tuning the model. This is maximally flexible (works with any CLI agent and any LLM) but depends on the model's instruction-following capability. If the model ignores rules under context pressure, the methodology breaks.

**Autonomy vs. safety:** Level 4 operation (20+ hour autonomous sessions) requires trusting the agent to follow methodological rules without human oversight. The sandboxed container provides safety against system-level damage, but cannot prevent scientific errors (wrong hypotheses, incorrect analysis). The paper emphasizes this is augmentation, not replacement.

**Tiered evaluation vs. single evaluation:** The three-tier evaluation pattern (crash-test, signal, full) saves compute but adds complexity. The agent must judge when to promote from one tier to the next. A mistake in tier classification can either waste compute (running full evaluation on a clearly bad approach) or miss promising approaches (killing a method that fails the crash-test but would work with different parameters).

**One-variable-per-experiment vs. efficiency:** Strict isolation of variables enables causal attribution but slows exploration. Testing 40+ modifications one at a time (as in Case Study A) is thorough but expensive. Factorial designs or multi-armed bandit approaches could be more efficient but require more sophisticated experimental design.

**Container isolation vs. integration:** Sandboxing provides safety but limits the agent's access to the broader system (databases, network services, other tools). Research tasks requiring external API access or data retrieval need explicit configuration.

## Experimental Results

### Case Study A: Optimizer Exploration for LLM Pretraining

- Tested 40+ modifications to the Muon optimizer, one variable at a time
- Discovered independently beneficial modifications: momentum normalization (~3% improvement), weight decay (~2% improvement)
- Combined improvements: ~5% perplexity improvement over Muon, ~8% over AdamW
- Zero-overhead variant: ~4.8% improvement at original memory footprint
- Session duration: 20+ hours autonomous operation
- Key finding: near-additive improvements only visible through one-variable isolation

### Case Study B: Weight Reconstruction in LLM Pruning

- Discovered original approach was mathematically flawed through systematic failure analysis
- Developed simple post-pruning weight correction (10 lines of code, <1% computational overhead)
- Results: 18-50% perplexity reduction across five model scales (OPT, Qwen, Gemma)
- Oracle comparison: captures 92% of full least-squares reconstruction gains
- Key finding: systematic investigation of failures led to serendipitous discovery

### Case Study C: Column Ordering in LLM Quantization

- Implemented seven ordering strategies, validated across five model families
- Column ordering impact ranges from 0.1% to 74% depending on architecture
- 9 of 24 experiments documented as negative results
- Key finding: comprehensive multi-architecture validation revealed architecture-dependent effects missed by single-model testing

### Case Study D: Lower Bounds for Frank-Wolfe (Mathematics)

- Proved tight lower bounds for Frank-Wolfe on p-uniformly convex sets
- Derived dynamics in closed form, verified numerically with BigFloat arithmetic (<0.2% error)
- Numerical exploration informed theoretical proof strategy
- Key finding: failed direct generalization approaches clarified correct proof technique

### Case Study E: Dual Tightening for Mixed-Integer Optimization

- Formulated and proved multi-variable dual tightening theorem
- 2,387 symbolic checks + 487 numerical checks caught inverted bound in initial derivation
- Key finding: early verification prevented deploying flawed mathematical logic

### Case Study F: Real Solutions in Power Networks

- Complete characterization for K7 graph
- Cross-verified with multiple independent methods

## Failure Modes & Limitations

**Context window exhaustion:** Extended sessions (20+ hours) may exhaust LLM context. The paper suggests report compression and structured state restoration as mitigations, but these are not fully validated. Context loss mid-session can cause the agent to lose track of previous experiments and repeat work.

**Rule compliance degrades under pressure:** The Ten Commandments depend on instruction following. Under complex, multi-step tasks, agents may drift from strict one-variable-per-experiment discipline or skip documentation steps. There is no automated mechanism to enforce rule compliance.

**Verification is partial:** Symbolic and numerical verification catch many errors but cannot guarantee correctness. Mathematical proofs generated by the agent still require human review. The paper is explicit that this is augmentation, not replacement.

**Literature search reliability:** The framework cannot guarantee novelty detection. Automated literature searches may miss relevant prior work, especially in niche areas. This remains the researcher's responsibility.

**Cost accumulation:** Long autonomous sessions accumulate API costs. The paper does not report specific costs but notes that tiered evaluation helps. For 20+ hour sessions with many LLM calls per iteration, costs could be substantial.

**Generalization beyond ML/math:** The framework is designed for mathematics and machine learning. Adapting to experimental sciences (biology, chemistry, physics) would require domain-specific rules and tool integrations.

## Practical Implications

**For builders of knowledge bases and agent systems:**

1. **Encode methodology, not just facts.** The most transferable insight from this paper is that effective agent knowledge bases must contain executable workflows (the eight-step experimental loop), verification procedures (tiered evaluation, falsification attempts), and behavioral constraints (the Ten Commandments). This is a pattern that applies beyond research -- any domain where agents operate autonomously benefits from encoded methodology.

2. **The INSTRUCTIONS.md pattern is a form of context engineering.** The persistent instruction file is conceptually identical to CLAUDE.md and SKILL.md specifications. It encodes procedural knowledge that shapes agent behavior across an entire session. The key addition is methodological rigor -- not just "how to do X" but "how to do X correctly and verifiably."

3. **One-variable-per-experiment is a universal principle.** When building self-improving systems (ACE's evolving playbooks, DGM's self-modifying agents), the tendency is to change multiple things simultaneously for faster progress. The research framework's insistence on single-variable isolation, while slower, produces more reliable and interpretable improvements. Consider adopting this for any system that iteratively modifies its own configuration.

4. **Tiered evaluation prevents waste.** The crash-test -> signal -> full evaluation pattern is applicable to any iterative system. Before running a full benchmark on a new agent configuration, run a quick sanity check. Before the sanity check, verify it compiles. This is obvious in principle but rarely implemented systematically.

5. **Verify-before-claiming catches compounding errors.** In extended autonomous operation, errors compound. An incorrect intermediate result becomes the basis for subsequent experiments, wasting all downstream compute. Active verification (writing test scripts, attempting falsification) catches errors early.

**Available implementation:** https://github.com/ZIB-IOL/The-Agentic-Researcher provides the full framework, compatible with Claude Code, Codex CLI, Gemini CLI, and OpenCode.

**Gap between paper and production:** The framework is specifically designed for academic research. Production adaptation would require: domain-specific Ten Commandments (what are the equivalent methodological rules for your domain?), integration with production infrastructure (CI/CD, monitoring, deployment rather than Slurm and LaTeX), and mechanisms for context preservation across very long sessions (the 20-hour session presumably hit context limits).
