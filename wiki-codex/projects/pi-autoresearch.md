# pi-autoresearch

> A reusable autoresearch extension that adds dashboards, confidence scoring, and resumable sessions to the benchmark-driven loop pattern. [Source](../../raw/repos/davebcn87-pi-autoresearch.md)

## What It Does

pi-autoresearch equips the `pi` coding agent with tools and workflows for autonomous optimization loops over any measurable target, including test speed, bundle size, or model training metrics. [Source](../../raw/repos/davebcn87-pi-autoresearch.md)

## Architecture

The design separates infrastructure from knowledge: the extension handles logging, dashboarding, and loop mechanics, while the skill gathers the domain-specific objective, files in scope, and benchmark command. [Source](../../raw/repos/davebcn87-pi-autoresearch.md)

## Key Numbers

- 3,393 GitHub stars. [Source](../../raw/repos/davebcn87-pi-autoresearch.md)
- Includes confidence scoring, full-screen dashboards, append-only experiment logs, and optional correctness checks. [Source](../../raw/repos/davebcn87-pi-autoresearch.md)

## Strengths

- One of the best operationalizations of the Karpathy loop for daily engineering. [Source](../../raw/repos/davebcn87-pi-autoresearch.md)
- Makes noise floors and verification checks visible instead of implicit. [Source](../../raw/repos/davebcn87-pi-autoresearch.md)

## Limitations

- Still benchmark-bound; without a good `autoresearch.sh`, the loop has nothing trustworthy to optimize. [Source](../../raw/repos/davebcn87-pi-autoresearch.md)

## Alternatives

- [Autoresearch](./autoresearch.md) for the canonical minimal version.
- [GEPA](./gepa.md) for broader reflective optimization.

## Sources

- [pi-autoresearch repo](../../raw/repos/davebcn87-pi-autoresearch.md)
