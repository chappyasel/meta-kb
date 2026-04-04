---
url: 'https://www.mindstudio.ai/blog/claude-code-autoresearch-self-improving-skills'
type: article
author: MindStudio Team
date: '2026-03-14'
tags:
  - self-improving
  - context-engineering
  - agentic-skills
  - prompt-optimization
  - eval-automation
  - karpathy-pattern
  - claude-code
key_insight: >-
  Binary eval assertions combined with automated overnight improvement cycles
  let you reach 75–85% reliability on specialized AI skills without manual
  iteration—Claude Code reads failure patterns and generates targeted prompt
  variants, turning prompt engineering from an art into a measurable, structured
  experiment.
relevance_scores:
  topic_relevance: 8
  practitioner_value: 8
  novelty: 7
  signal_quality: 7
  composite: 7.7
  reason: >-
    Directly covers self-improving AI skills via automated overnight eval loops
    with Claude Code—maps strongly to topics 4 (agentic skills), 5
    (self-improving systems), and 3 (prompt/context engineering), with
    actionable methodology for building measurable prompt improvement pipelines.
---
## How to Use Claude Code with AutoResearch to Build Self-Improving AI Skills

> Published on MindStudio by MindStudio Team on 2026-03-14

ClaudeWorkflowsAutomation

Combine Claude Code skills with Karpathy's AutoResearch loop to automatically improve prompt quality overnight using binary eval assertions and pass rates.

![How to Use Claude Code with AutoResearch to Build Self-Improving AI Skills](https://i.mscdn.ai/70cbb1ad-08d7-4fdc-ab31-e343780966a6/generated-images/d14f2400-7561-4664-8988-c787e2a8a83b.png?fm=auto&w=1200&fit=cover?fm=auto&w=1200&fit=cover)

## Why Your Prompts Should Improve Themselves

Most prompt engineering follows a predictable pattern: write a prompt, run it manually, notice the output isn’t quite right, tweak it, repeat. That works for simple tasks. But when you’re building serious AI skills — specialized workflows that handle real-world inputs at scale — this approach breaks down. Edge cases multiply, output quality is hard to measure, and the gap between “seems fine in testing” and “reliable in production” gets wide fast.

**Claude Code** combined with the **AutoResearch loop** solves this. Claude Code, Anthropic’s agentic CLI tool, can read project files, execute evaluation scripts, analyze failures, and write improved prompt variants — all without human supervision. Pair that with Andrej Karpathy’s AutoResearch methodology (define a metric, run experiments overnight, review results in the morning), and you have a system that improves your AI skills automatically using binary eval assertions and pass rate tracking.

This guide walks through exactly how to build that system: from structuring your project to writing deterministic eval assertions to running 30+ improvement cycles while you sleep.

## What the AutoResearch Loop Actually Does

The core idea is simple: if you can define a success metric and automate evaluation, you can run hundreds of experiments without sitting at your desk.

For prompt engineering, the loop works like this:

1. Define what “good output” means using binary eval assertions — yes/no checks on specific output properties
2. Establish a baseline pass rate on a set of test inputs
3. Have Claude Code generate improved prompt variants by analyzing which test cases are failing and why
4. Run eval assertions against each variant and record pass rates
5. Move the highest-scoring variant to your active prompt
6. Repeat

A single cycle — generate 3 variants, evaluate each against 20 test cases, select the winner — takes roughly 5–15 minutes depending on response length and API latency. Over 8 hours overnight, you can complete 30–50 cycles. That’s enough to push most prompts from 40–50% pass rates into the 75–85% range.

The critical difference from random prompt variation is that Claude Code reads the failure patterns before generating candidates. It understands which test cases are failing and what they have in common, then proposes targeted changes. This is structured experimentation, not guesswork.

## Why Binary Evals Beat Subjective Scoring

The obvious approach to prompt evaluation is asking an LLM to rate outputs 1–10. It feels intuitive but falls apart in practice. Scores are inconsistent across runs, sensitive to framing, and impossible to compare between prompt versions.

Binary eval assertions cut through all of that noise. Each assertion answers a yes/no question:

- Does the response include an empathy phrase? → True/False
- Is the word count under 200? → True/False
- Does the output include a concrete next step? → True/False
- Does the response avoid invented policies? → True/False

Your pass rate is the percentage of test cases where every assertion returns True. This metric is deterministic, comparable across every run, and easy to reason about. When pass rate goes from 55% to 73%, something real improved.

### What makes a strong assertion

A strong assertion tests something that directly predicts whether an output is actually useful — not just surface properties. “Is the response longer than 50 words?” tells you almost nothing. “Does the response include a specific action the customer can take right now?” tells you a lot.

The best assertions come from your actual failure modes. Look at bad outputs from your skill and ask: what do they have in common? Write assertions that catch those patterns.

Aim for 3–6 assertions per skill. Too few and you’re under-measuring quality. Too many and pass rates drop so low that distinguishing good prompts from bad ones gets noisy.

## Prerequisites

Before building the loop, you need a few things in place.

**Claude Code installed and configured.** It runs as a CLI tool in your terminal and requires an Anthropic API key and Node.js. The [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code) covers setup in full.

**A specific, bounded task.** “Respond to customer support tickets about shipping delays” works. “Be a helpful assistant” does not. Tight task definition is what makes binary assertions possible.

**20–100 test cases.** These are example inputs your skill should handle. Diversity matters more than quantity. At 20 cases, a 15-point pass rate difference is meaningful. At 50 cases, you can detect 5–10 point differences reliably. Cover different tones, edge cases, and question types.

**Python or Node.js for your eval runner.** The examples below use Python.

## Set Up Your Project Structure

Claude Code works by reading and writing files in your project directory. Give it a clean, predictable layout:

```plaintext
/my-skill/
  /prompts/
    current.txt          # Active system prompt
    /candidates/         # Variants under evaluation
    /history/            # Past versions with scores in filenames
  /evals/
    test_cases.jsonl     # Test inputs
    assertions.py        # Binary eval functions
    runner.py            # Evaluation harness
  /results/
    scores.json          # Pass rate history
    latest_run.json      # Detailed results for Claude Code to analyze
  AGENT_INSTRUCTIONS.md  # Operating instructions for Claude Code
```

Your `test_cases.jsonl` has one JSON record per line:

```json
{"id": "tc_001", "input": "My order hasn't arrived after two weeks", "metadata": {"category": "shipping"}}
{"id": "tc_002", "input": "I need to return a damaged item", "metadata": {"category": "returns"}}
{"id": "tc_003", "input": "Do you offer international shipping?", "metadata": {"category": "info"}}
```

You don’t need expected outputs. Your binary assertions define what “correct” means — this isn’t string matching.

## Write Your Binary Eval Assertions

Create `evals/assertions.py`. Write each assertion as an explicit, deterministic function:

```python
def assert_empathy_opener(response: str) -> bool:
    """Response acknowledges the customer's situation."""
    phrases = ["i understand", "i'm sorry", "that sounds frustrating",
               "i can see why", "i apologize"]
    return any(p in response.lower() for p in phrases)

def assert_concise(response: str) -> bool:
    """Response is under 200 words."""
    return len(response.split()) < 200

def assert_actionable(response: str) -> bool:
    """Response gives the customer something to do."""
    signals = ["please", "you can", "contact us", "visit", "click",
               "call", "check your", "log in to"]
    return any(s in response.lower() for s in signals)

def assert_no_invented_policy(response: str) -> bool:
    """Response doesn't invent policies that don't exist."""
    prohibited = ["30-day guarantee", "free replacement", "instant refund",
                  "same-day shipping guarantee"]
    return not any(p.lower() in response.lower() for p in prohibited)

ASSERTIONS = [
    assert_empathy_opener,
    assert_concise,
    assert_actionable,
    assert_no_invented_policy
]
```

Each function is independently debuggable. Because they’re deterministic, the same output always produces the same result across every run.

## Build the Evaluation Runner

Your `evals/runner.py` runs the current prompt against all test cases, applies all assertions, and saves detailed results for Claude Code to analyze:

```python
import json
import anthropic
from pathlib import Path
from assertions import ASSERTIONS

def evaluate_prompt(prompt_path: str, test_cases_path: str) -> float:
    client = anthropic.Anthropic()
    prompt = Path(prompt_path).read_text()
    test_cases = [
        json.loads(l)
        for l in Path(test_cases_path).read_text().strip().split("\n")
    ]

    passed = 0
    results = []

    for case in test_cases:
        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=400,
            system=prompt,
            messages=[{"role": "user", "content": case["input"]}]
        )
        output = response.content[0].text
        assertion_results = {fn.__name__: fn(output) for fn in ASSERTIONS}
        case_passed = all(assertion_results.values())

        results.append({
            "id": case["id"],
            "passed": case_passed,
            "assertions": assertion_results,
            "output_preview": output[:120]
        })

        if case_passed:
            passed += 1

    pass_rate = passed / len(test_cases)
    Path("results/latest_run.json").write_text(json.dumps(results, indent=2))
    return pass_rate

if __name__ == "__main__":
    import sys
    prompt_path = sys.argv[1] if len(sys.argv) > 1 else "prompts/current.txt"
    score = evaluate_prompt(prompt_path, "evals/test_cases.jsonl")
    print(f"Pass rate: {score:.1%}")
```

Run this on your starting prompt first. Whatever it returns — 35%, 55%, 65% — is your baseline. Don’t worry about the number yet. The loop exists to move it up.

## Configure Claude Code’s Instructions

Create `AGENT_INSTRUCTIONS.md`. This is what Claude Code reads to understand its job:

```markdown
# Prompt Optimization Agent

## Goal
Improve the pass rate of \`prompts/current.txt\` using an eval-driven loop.
Current history is in \`results/scores.json\`.

## Each Cycle
1. Read \`results/latest_run.json\` — understand which test cases are failing and why
2. Write a brief failure analysis to \`results/failure_analysis.txt\`:
   - Which assertion fails most often?
   - What do failing inputs have in common?
   - What specific change would address the top failure pattern?
3. Generate exactly 3 prompt variants in \`prompts/candidates/\` 
   named v[N]a.txt, v[N]b.txt, v[N]c.txt
4. For each variant, run: \`python evals/runner.py prompts/candidates/[variant]\`
5. Record all three scores in \`results/scores.json\`
6. If any variant beats the current best, copy it to \`prompts/current.txt\`
7. Archive the previous version to \`prompts/history/\` with its score in the filename
8. Proceed to the next cycle

## Constraints
- Change ONE thing per variant. Add a comment at the top stating the hypothesis.
- If pass rate doesn't improve after 3 consecutive cycles, try a structural change 
  (not just wording tweaks)
- Stop when pass rate exceeds 85% or after 15 cycles
```

Then kick it off:

```bash
claude --dangerously-skip-permissions \
  "Follow AGENT_INSTRUCTIONS.md and run the full optimization loop"
```

The `--dangerously-skip-permissions` flag removes confirmation prompts, which is required for unattended overnight runs. Use this only in a sandboxed, project-scoped directory — Claude Code will limit itself to files within that path.

Walk away. Check back in the morning.

## What to Expect Overnight

When you review results the next day, you’ll typically see a clear progression across cycles:

**Cycles 1–5:** Improvements from obvious fixes — tone adjustments, removing hedging language, adding an empathy opener that was failing the first assertion reliably.

**Cycles 6–12:** Structural improvements — reordering prompt sections, adding a brief few-shot example, tightening the instruction for the most common failure category.

**Cycles 13+:** Marginal gains and fine-tuning, or a plateau that signals your test cases need more diversity to break through.

The history directory gives you a full audit trail. You can diff any two versions to see exactly what changed and what it was worth in pass rate points. Often the biggest jumps came from one small, specific change — and the log tells you exactly what it was.

## Extending Claude Code Skills with MindStudio

Claude Code running in a terminal is powerful for building and improving skills, but it’s isolated. On its own, it can’t send notifications when a run finishes, search the web for current information, or trigger downstream workflows when a prompt hits your quality threshold.

That’s where [MindStudio’s Agent Skills Plugin](https://mindstudio.ai/) fits naturally. The `@mindstudio-ai/agent` npm package gives Claude Code — and any other agent — access to 120+ typed capabilities as simple method calls, handling rate limiting, retries, and authentication automatically.

Install it:

```bash
npm install @mindstudio-ai/agent
```

Then use it at the end of your optimization loop to send a results summary:

```javascript
import MindStudio from "@mindstudio-ai/agent";
const agent = new MindStudio();

async function sendRunSummary(startScore, finalScore, cyclesCompleted) {
  await agent.sendEmail({
    to: "you@yourcompany.com",
    subject: \`AutoResearch done: ${(finalScore * 100).toFixed(0)}% pass rate\`,
    body: \`Optimization finished after ${cyclesCompleted} cycles.
           
Pass rate: ${(startScore * 100).toFixed(0)}% → ${(finalScore * 100).toFixed(0)}%
Best prompt saved to: prompts/current.txt
See prompts/history/ for full changelog\`
  });
}
```

Or enrich the eval cycle itself. If your skill answers questions that require current information, Claude Code can call `agent.searchGoogle()` during candidate evaluation to cross-check outputs against live data — making the loop improve prompts against real-world accuracy, not just your test cases.

The split works well: Claude Code handles the reasoning layer (what’s failing, what to change, what to test next), while MindStudio handles the infrastructure layer (external calls, integrations, notifications). You can also [deploy the skills you optimize into scheduled, production-grade workflows](https://mindstudio.ai/blog/ai-automation-workflows) directly in MindStudio, with monitoring and integrations built in — no infrastructure to manage separately.

You can [try MindStudio free at mindstudio.ai](https://mindstudio.ai/) — no separate API keys needed for the 120+ capabilities in the Skills Plugin.

## Common Mistakes to Avoid

**Making multiple changes per variant.**  
When you change five things at once and the score improves, you don’t know which change caused it. One change might have hurt and two might have helped — you’d never know. One hypothesis per variant is a hard rule.

**Homogeneous test cases.**  
If all 30 test cases are slight variations of the same scenario, an 85% pass rate is misleading. The skill may fail on inputs your test set doesn’t cover. Review for category diversity before starting the loop. A 75% pass rate on a diverse test set is worth more than 90% on a narrow one.

**Stopping at the first plateau.**  
Pass rates often stall around 60–70% and then break through suddenly with a specific structural change. Don’t stop early. A plateau usually means incremental wording changes have been exhausted and Claude Code needs to try a fundamentally different prompt structure — instruct it to do so explicitly in `AGENT_INSTRUCTIONS.md`.

**Assertions that don’t catch your real failure mode.**  
If outputs are degrading in a way none of your assertions measure, the pass rate won’t reflect it. Periodically spot-check `results/latest_run.json` against your actual quality bar to verify the assertions are testing what matters.

## Frequently Asked Questions

### What is Karpathy’s AutoResearch loop?

Andrej Karpathy, formerly at OpenAI and the head of AI at Tesla, has advocated for automating the research cycle: define a success metric, automate evaluation, let the machine search through options while you sleep, and review results in the morning rather than running each experiment manually. The human’s job becomes defining good evaluation criteria; the machine does the searching. Applied to prompt engineering, this means setting up a loop where an agent generates variants, tests them, and iterates without requiring human input per cycle.

### How is Claude Code different from chatting with Claude?

Claude Code is a command-line agent designed to work autonomously on file-based projects. It can read your entire project directory, execute shell commands, run scripts, write files, and operate for extended periods without human confirmation on each step. A chat interface gives you one response at a time. Claude Code can execute a multi-step task like “run an optimization loop for 15 cycles and save the results” end-to-end, unattended.

### How much does an overnight AutoResearch run cost?

At 20 test cases, 3 variants per cycle, and ~300 tokens per response, each cycle uses roughly 18,000 tokens (input + output combined). At current Claude pricing, that’s around $0.05–$0.15 per cycle depending on the model. A full overnight run of 30 cycles costs $1.50–$4.50. Using Claude Haiku for eval runs and Claude Sonnet only for generating new prompt variants can cut this by 60–70%.

### Can I use this loop for skills that output structured data?

Binary assertions work especially well for structured output. Testing JSON validity (`json.loads(output)` without raising an exception → True/False), field presence (`"order_id" in parsed_output`), and value constraints (`parsed_output["confidence"] > 0.7`) are all deterministic checks that give the loop a clear optimization signal. Structured-output skills often respond particularly well because failures are precise and attributable to specific prompt instructions.

### What if my pass rate never improves?

Two common causes: your assertions are testing the wrong things, or your test cases are too easy. Check whether assertion failures in `results/latest_run.json` correspond to actual quality problems in the outputs. If the outputs look fine but assertions are failing, your assertions may be miscalibrated. If outputs are genuinely poor but pass rate is stuck, Claude Code may need a structural change — add an instruction in `AGENT_INSTRUCTIONS.md` to try a fundamentally different prompt architecture after 3 consecutive cycles without improvement.

### Can I run this loop against workflows built in MindStudio?

Yes. If you have a workflow deployed in MindStudio, you can call it via `agent.runWorkflow()` from the Agent Skills Plugin. Claude Code submits inputs through the plugin, receives outputs, and runs assertions against them. This lets you [optimize the prompts inside your MindStudio workflows](https://mindstudio.ai/) using the same AutoResearch loop — without manually testing each change through the visual editor.

---

## Key Takeaways

- The AutoResearch loop automates prompt improvement by combining Claude Code’s file and execution capabilities with binary eval assertions and pass rate tracking.
- Binary assertions (deterministic yes/no checks on output properties) are more reliable than LLM-based scoring — they’re stable, comparable across runs, and easy to debug.
- A full overnight run of 30–50 cycles is typically enough to push prompts from 40–50% pass rates to 75–85%.
- Claude Code’s failure analysis before each generation cycle makes this systematic experimentation, not random mutation.
- The single biggest pitfall is changing multiple things per variant — one hypothesis per variant is a hard rule.
- MindStudio’s Agent Skills Plugin extends what Claude Code can do during eval cycles: notifications, live search, workflow triggers, and more — without infrastructure overhead.

The right starting point is picking one AI skill you’re building and writing 3–4 binary assertions for it. That’s the hardest part. Once the eval harness is in place, Claude Code can run the rest while you’re not watching — and you’ll have measurably better prompts by morning.

[Try MindStudio free at mindstudio.ai](https://mindstudio.ai/) to deploy the skills you optimize into production workflows with scheduling, integrations, and monitoring built in.
