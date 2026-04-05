# Quality Criteria

## Citation rules

- Every factual claim MUST cite a specific source: `[Source](../raw/type/file.md)` or `[Source](../raw/deep/type/file.md)`
- Every project mentioned MUST link to its reference card: `[Mem0](projects/mem0.md)`
- If a claim can't be sourced from raw/ or raw/deep/, mark it as `[unverified]`

## Benchmark credibility

- After reporting any benchmark number, assess its credibility:
  - **Verified in code**: the benchmark script exists in the repo
  - **Peer-reviewed**: published in a reviewed paper
  - **Self-reported**: from README or marketing materials, no independent validation
- If a README claims "+26% accuracy" but the deep source found no benchmark code, say so directly

## Comparison rules

- Comparisons MUST include a recommendation: "Use X when Y, use Z when W"
- Don't say "both have pros and cons." Take a position.
- Back recommendations with evidence (benchmarks, architecture analysis, adoption signals)

## Failure modes

- Every approach category in synthesis articles must name at least one specific failure mode
- "Tradeoff" is weak. "Failure mode" is what practitioners worry about.
- Give failure modes evocative names as labels: "stale memory poisoning" not "stale data problem". The name should encode the mechanism.
- Example: "memory poisoning" and "stale certainty" not "memory quality depends on LLM"

## Adoption signals

- Every project mention should include its star count on first reference: "Mem0 (51,880 stars)"
- Omit on subsequent references in the same article

## Insight rules

- Surface non-obvious insights. If it's in every README, it's not an insight.
- Use deep sources for implementation-level insights: name files, functions, algorithms
- Look for: patterns across projects, disagreements between approaches,
  convergences the community hasn't named yet
- Include one "what the field got wrong" insight per synthesis article

## Competing paradigms

- Each synthesis article must include a Divergence section naming 3-4 active
  architectural disagreements with implementations on both sides
- Take a position on which wins under what conditions
- These are not "open questions" — they are active splits with working code on both sides

## Deep source usage

- When both a shallow and deep source exist for a project, prefer deep source details
- Deep sources contain architecture analysis, design tradeoffs, failure modes,
  and verified benchmarks. Surface these in synthesis articles and reference cards.
- Name specific files, functions, classes, line numbers from deep sources
- If a deep source contradicts a README claim, note the discrepancy

## Neutrality

- Equal treatment of all projects
- Same depth AND same criticism for every project
- If a project has serious limitations, say so directly

## Tone

- Write for practitioners who build with AI agents daily
- Be direct and opinionated. Not academic, not corporate.
- Use concrete examples: project names, specific techniques, actual numbers
- Short paragraphs. Direct sentences.
- Follow the [stop-slop](../.claude/skills/stop-slop/SKILL.md) skill rules strictly
