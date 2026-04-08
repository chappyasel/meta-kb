---
url: 'https://cameronwestland.com/autoresearch-is-reward-function-design/'
type: article
author: Cameron Westland
date: '2026-03-24'
tags:
  - agentic-skills
  - self-improving
  - context-engineering
  - reward-shaping
  - deterministic-testing
  - optimization-agents
  - constraint-modeling
key_insight: >-
  Setting up deterministic replay harnesses and secondary metric constraints
  acts as a reward function that prevents LLM agents from finding optimization
  shortcuts that technically work but violate constraints—this becomes critical
  for knowledge bases where agents must distinguish between valid improvements
  and constraint-violating hacks.
relevance_scores:
  topic_relevance: 8
  practitioner_value: 8
  novelty: 7
  signal_quality: 7
  composite: 7.7
  reason: >-
    Directly demonstrates a self-improving agent loop with reward function
    design, constraint enforcement via secondary metrics, and deterministic
    replay harnesses—all highly transferable patterns for knowledge base
    self-improvement systems.
---
## Autoresearch Is Reward Function Design

> Published on Cameron Westland by  on 2026-03-24

I pointed an AI agent at a performance-sensitive Python code path, gave it a 40-line spec and a replay harness, and walked away. An hour later it had tried 49 optimizations, kept 20, and taken the p95 latency from 339ms to 34ms. The whole thing cost $24.

Here’s the artifact it produced. A JSONL file where each line is a structured experiment:

```json
{"run":1,  "metric":338.57, "status":"keep",    "description":"Baseline before any code changes"}
{"run":2,  "metric":113.35, "status":"keep",    "description":"Vectorized iterrows → Series.map"}
{"run":7,  "metric":102.57, "status":"checks_failed", "description":"Cached query embeddings, broke embedder_calls assertion"}
{"run":11, "metric":43.85,  "status":"keep",    "description":"Hoisted object-column numeric coercion into cache"}
{"run":25, "metric":34.75,  "status":"keep",    "description":"Shallow copies from cache instead of deep"}
{"run":40, "metric":33.83,  "status":"keep",    "description":"Removed redundant parsed_dates dict"}
{"run":49, "metric":34.31,  "status":"discard", "description":"Helper-level memoization exhausted"}
```

I didn’t build autoresearch. [Karpathy released the concept](https://github.com/karpathy/autoresearch), and a team built [pi-autoresearch](https://github.com/davebcn87/pi-autoresearch), a plugin for the Pi coding agent. I applied it. The interesting part isn’t the tool or the optimizations. It’s the setup work.

## The problem and the harness

I work on a product that lets investors build thematic stock portfolios. You type a theme like “AI” or “clean energy,” and the system scores thousands of securities against it using vector search and semantic matching. Our head of AI delivered a well-designed algorithm with parameters that were already tuned, but the Python implementing it hadn’t been performance-optimized. Fresh and correct, not fast.

I wanted to optimize the local Python (DataFrame manipulation, scoring math, expression evaluation), not the network calls to the vector database and embedding model that the code also makes. So the first thing I built was a replay harness. I captured all the network traffic from several real requests and stored them as fixtures. A record/playback tool intercepted those calls during benchmarking and returned the captured responses instantly. This gave me deterministic benchmarks with no network jitter, golden outputs from the baseline that would catch any optimization that changed the result, and exact counts of network calls per request type.

## The spec as reward function

If you’ve done any reinforcement learning work, the autoresearch setup should look familiar. I wrote a [series about vibe-coding RL experiments](https://cameronwestland.com/vibe-coding-reinforcement-learning) a year ago, and the hardest part was always the same: designing the reward function. What metric are you optimizing? What constitutes cheating? What constraints prevent the optimizer from finding a shortcut that technically scores well but produces garbage?

The `autoresearch.md` spec is a reward function written in prose:

```markdown
## Objective
Reduce latency for the in-process scoring path while
preserving exact replay outputs in Phase 1.

## Metrics
- **Primary**: p95_ms (ms, lower is better)
- **Secondary**: p50_ms, total_ms, embedder_calls, db_calls, identifier_lookups

## Files in Scope
- core/scoring.py
- core/universe_creation.py

## Off Limits
- benchmark/replay/cases.json
- benchmark/replay/fixtures/**
- benchmark/replay/goldens/**
- autoresearch.md, autoresearch.sh, autoresearch.checks.sh

## Constraints
- Phase 1 is exact parity only. If replay goldens change, discard.
- No public API changes.
- Do not edit benchmark assets or harness files.
```

The secondary metrics are controls, not telemetry. They play the same role that reward shaping plays in RL: if `embedder_calls` drops to zero, the agent found a way to make the primary number go down without doing the actual work. Here’s what a successful run looks like in the JSONL (run 6, where everything checks out):

```json
{
  "run": 6,
  "metric": 101.13,
  "metrics": {
    "embedder_calls": 7,
    "db_calls": 28,
    "identifier_lookups": 7
  },
  "status": "keep",
  "description": "Added conservative function-call guards so scoring-only requests skip unrelated legacy expression processors."
}
```

And here’s run 7:

```json
{
  "run": 7,
  "metric": 102.57,
  "metrics": {
    "embedder_calls": 0,
    "db_calls": 28,
    "identifier_lookups": 7
  },
  "status": "checks_failed",
  "description": "Tried deterministic query-embedding memoization, but replay tests explicitly assert historical embedder call counts.",
  "asi": {
    "hypothesis": "Caching deterministic query embeddings should reduce repeated embedder work without changing replay outputs.",
    "rollback_reason": "Replay tests assert aggregate embedder_calls == 1, so embedding memoization changes monitored benchmark call counts and fails checks.",
    "error": "AssertionError: summary['aggregate']['embedder_calls'] == 1 failed because observed 0"
  }
}
```

`embedder_calls`: 7 to 0. Textbook reward hacking. The agent found a legitimate optimization (embedding results are deterministic for the same query, so caching them is sound engineering), but under Phase 1 constraints where the goal is exact behavioral parity including call counts, it’s cheating. The `asi.rollback_reason` shows it understood why:

> “Avoid optimizations that alter checked secondary metrics in phase 1; focus on pure local CPU improvements that leave embedder/db/identifier counts unchanged.”

It learned the boundary and didn’t try embedding caching again. Instead, it parked the idea in an `autoresearch.ideas.md` file for Phase 2, where the metric contracts could be relaxed.

## The diminishing returns curve

<svg viewBox="0 0 720 320" xmlns="http://www.w3.org/2000/svg" style="max-width:720px;width:100%;font-family:monospace;"><rect width="720" height="320" fill="#1a1a1a" rx="4"></rect><line x1="60" y1="30" x2="60" y2="270" stroke="#333" stroke-width="1"></line><line x1="60" y1="270" x2="700" y2="270" stroke="#333" stroke-width="1"></line><line x1="60" y1="54" x2="700" y2="54" stroke="#282828" stroke-width="1" stroke-dasharray="4,4"></line><line x1="60" y1="102" x2="700" y2="102" stroke="#282828" stroke-width="1" stroke-dasharray="4,4"></line><line x1="60" y1="150" x2="700" y2="150" stroke="#282828" stroke-width="1" stroke-dasharray="4,4"></line><line x1="60" y1="198" x2="700" y2="198" stroke="#282828" stroke-width="1" stroke-dasharray="4,4"></line><text x="52" y="58" text-anchor="end" fill="#888" font-size="11">300ms</text> <text x="52" y="106" text-anchor="end" fill="#888" font-size="11">200ms</text> <text x="52" y="154" text-anchor="end" fill="#888" font-size="11">100ms</text> <text x="52" y="202" text-anchor="end" fill="#888" font-size="11">50ms</text> <text x="52" y="274" text-anchor="end" fill="#888" font-size="11">0ms</text> <text x="73" y="288" fill="#888" font-size="11">1</text> <text x="195" y="288" fill="#888" font-size="11">10</text> <text x="325" y="288" fill="#888" font-size="11">20</text> <text x="455" y="288" fill="#888" font-size="11">30</text> <text x="585" y="288" fill="#888" font-size="11">40</text> <text x="688" y="288" fill="#888" font-size="11">50</text> <text x="380" y="310" text-anchor="middle" fill="#888" font-size="11">Run</text> <text x="16" y="150" text-anchor="middle" fill="#888" font-size="11" transform="rotate(-90,16,150)">p95 latency</text> <circle cx="112" cy="117" r="3" fill="#555" opacity="0.4"></circle><circle cx="164" cy="118" r="3" fill="#555" opacity="0.4"></circle><circle cx="177" cy="118" r="3" fill="#555" opacity="0.4"></circle><circle cx="229" cy="206" r="3" fill="#555" opacity="0.4"></circle><circle cx="268" cy="209" r="3" fill="#555" opacity="0.4"></circle><circle cx="281" cy="208" r="3" fill="#555" opacity="0.4"></circle><circle cx="294" cy="209" r="3" fill="#555" opacity="0.4"></circle><circle cx="307" cy="208" r="3" fill="#555" opacity="0.4"></circle><circle cx="320" cy="206" r="3" fill="#555" opacity="0.4"></circle><circle cx="333" cy="208" r="3" fill="#555" opacity="0.4"></circle><circle cx="346" cy="209" r="3" fill="#555" opacity="0.4"></circle><circle cx="359" cy="208" r="3" fill="#555" opacity="0.4"></circle><circle cx="385" cy="210" r="3" fill="#555" opacity="0.4"></circle><circle cx="398" cy="210" r="3" fill="#555" opacity="0.4"></circle><circle cx="411" cy="270" r="3" fill="#d44" opacity="0.5"></circle><circle cx="424" cy="209" r="3" fill="#555" opacity="0.4"></circle><circle cx="437" cy="210" r="3" fill="#555" opacity="0.4"></circle><circle cx="450" cy="209" r="3" fill="#555" opacity="0.4"></circle><circle cx="463" cy="210" r="3" fill="#555" opacity="0.4"></circle><circle cx="476" cy="210" r="3" fill="#555" opacity="0.4"></circle><circle cx="489" cy="210" r="3" fill="#555" opacity="0.4"></circle><circle cx="515" cy="210" r="3" fill="#555" opacity="0.4"></circle><circle cx="528" cy="210" r="3" fill="#555" opacity="0.4"></circle><circle cx="554" cy="211" r="3" fill="#555" opacity="0.4"></circle><circle cx="580" cy="270" r="3" fill="#d44" opacity="0.5"></circle><circle cx="593" cy="211" r="3" fill="#555" opacity="0.4"></circle><circle cx="606" cy="211" r="3" fill="#555" opacity="0.4"></circle><circle cx="619" cy="211" r="3" fill="#555" opacity="0.4"></circle><circle cx="632" cy="211" r="3" fill="#555" opacity="0.4"></circle><circle cx="645" cy="211" r="3" fill="#555" opacity="0.4"></circle><circle cx="658" cy="211" r="3" fill="#555" opacity="0.4"></circle><circle cx="671" cy="211" r="3" fill="#555" opacity="0.4"></circle><circle cx="684" cy="211" r="3" fill="#555" opacity="0.4"></circle><circle cx="697" cy="210" r="3" fill="#555" opacity="0.4"></circle><polyline fill="none" stroke="#4ade80" stroke-width="2" points="
      73,42
      86,131
      99,126
      125,123
      138,122
      190,147
      203,151
      216,205
      229,207
      242,207
      255,208
      268,209
      372,211
      502,211
      541,212
      567,212
    "></polyline><circle cx="73" cy="42" r="4" fill="#4ade80"></circle><circle cx="86" cy="131" r="4" fill="#4ade80"></circle><circle cx="99" cy="126" r="4" fill="#4ade80"></circle><circle cx="125" cy="123" r="4" fill="#4ade80"></circle><circle cx="138" cy="122" r="4" fill="#4ade80"></circle><circle cx="190" cy="147" r="4" fill="#4ade80"></circle><circle cx="203" cy="151" r="4" fill="#4ade80"></circle><circle cx="216" cy="205" r="4" fill="#4ade80"></circle><circle cx="229" cy="207" r="4" fill="#4ade80"></circle><circle cx="242" cy="207" r="4" fill="#4ade80"></circle><circle cx="255" cy="208" r="4" fill="#4ade80"></circle><circle cx="268" cy="209" r="4" fill="#4ade80"></circle><circle cx="372" cy="211" r="4" fill="#4ade80"></circle><circle cx="502" cy="211" r="4" fill="#4ade80"></circle><circle cx="541" cy="212" r="4" fill="#4ade80"></circle><circle cx="567" cy="212" r="4" fill="#4ade80"></circle><text x="90" y="38" fill="#4ade80" font-size="10">339ms</text> <text x="90" y="128" fill="#4ade80" font-size="10">113ms vectorize</text> <text x="220" y="199" fill="#4ade80" font-size="10">44ms cache coercion</text> <text x="570" y="226" fill="#4ade80" font-size="10">34ms final</text> <text x="411" y="264" fill="#d44" font-size="9">crash</text> <circle cx="480" cy="38" r="4" fill="#4ade80"></circle><text x="490" y="42" fill="#888" font-size="10">keep</text> <circle cx="530" cy="38" r="3" fill="#555" opacity="0.4"></circle><text x="540" y="42" fill="#888" font-size="10">discard</text> <circle cx="590" cy="38" r="3" fill="#d44" opacity="0.5"></circle><text x="600" y="42" fill="#888" font-size="10">crash</text></svg>

If you’ve trained ML models, this curve is instantly recognizable. It’s a loss curve.

The early wins were obvious: vectorize hot loops, cache repeated computation, replace deep copies with shallow ones. A good engineer with `cProfile` would find most of these in an afternoon. But the agent also found things I wouldn’t have profiled for. Run 11 was the biggest single drop (87ms to 44ms), from hoisting generic object-to-numeric coercion into the cached preparation path. The agent called it “the hidden dominant local cost.” It looks like pandas housekeeping until you measure it.

After run 15, the curve flattened. Twenty-five more attempts, most discarded. The agent tried increasingly speculative ideas, ran confirmation reruns on borderline wins to check if a 0.02ms improvement was real or noise, and eventually recognized it was done: “Remaining wins are below the reliable threshold.” It kept going anyway because I set `maxIterations` to 50 and didn’t give it a stopping condition.

## Human-in-the-loop still matters

I built the harness and the spec inside [Codex](https://openai.com/index/codex/). While we were setting up, before I’d even launched autoresearch, Codex started trying to optimize the code. The pi-autoresearch plugin has a [“What’s Been Tried” section](https://github.com/davebcn87/pi-autoresearch) in the spec template, designed so resuming agents have full context from previous sessions. Codex saw that section was empty and decided to fill it. It began running optimizations so it would have prior attempts to report. I stopped it: “Why are you trying to do the job of autoresearch?”

It was overfitting to the plugin’s resume protocol, even though this was a fresh start with no prior work. It manufactured a prerequisite and started fulfilling it. The right move was to leave the section empty, set up the harness, and let autoresearch build its own history from a clean baseline. The loop is automated, but knowing when to let it run (and when to stop the agent from “helping”) still requires a person.

The optimizations autoresearch produced are not groundbreaking. `iterrows` is slow, caching deterministic computation is obvious, shallow copies beat deep copies. Standard stuff. But do you have someone available to spend an afternoon on code they didn’t write? I don’t own this code. I could have spent a day building context and profiling, or I could spend an evening on a spec and a replay harness and let an agent do 49 experiments for $24. The cost comparison that matters isn’t “AI vs. expert human.” It’s “AI vs. nothing, right now.”

## Constraint design, not prompt engineering

The whole experience was easier than I expected. Specifying constraints in natural language (off-limits files, phase boundaries, metric controls) worked surprisingly well. The loop itself is dumb. It runs experiments, logs results, keeps what improves, discards what doesn’t. The value is in the constraints you give it. A clear metric. A correctness harness. Secondary controls that catch cheating. Bounded scope. A parking lot for ideas that violate current constraints.

If you’ve ever designed a reward function for RL, you already know how to do this. If you haven’t, that’s the skill to develop. You can’t point autoresearch at a React app and say “make it better.” The results will be unpredictable because you haven’t defined what “better” means precisely enough for a dumb loop to optimize against. The narrower and more measurable the problem, the better this works: single-number metrics, binary correctness checks, fast feedback loops.

Next time I’ll add a stopping condition. Something like “stop after 5 consecutive discards” would have saved half the compute. I’m also thinking about what it would look like to store these JSONL artifacts properly. Right now mine is sitting in a Codex worktree. But the experiment log documents what was tried, what worked, what failed, and why, across 49 runs. Imagine every autoresearch run across a team stored and indexed as an experiment log. That’s an organizational memory about your codebase that doesn’t exist today.

The experience felt less like “directing an AI” and more like training a model. Which, if you squint, is exactly what it is.

**Process note:** I built the replay harness and autoresearch spec in Codex (OpenAI’s coding agent). The optimization loop ran via [pi-autoresearch](https://github.com/davebcn87/pi-autoresearch), a plugin for the Pi coding agent, using GPT 5.4 with max thinking. Total cost was $24.10 for 2.3M input tokens and 177K output tokens across 49 runs. The [autoresearch concept](https://github.com/karpathy/autoresearch) is Karpathy’s. All claims and numbers in this post are mine; mistakes are mine.
