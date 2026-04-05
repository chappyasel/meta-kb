# Autoresearch

> The canonical benchmark-driven autonomous improvement loop in this corpus. [Source](../../raw/repos/karpathy-autoresearch.md)

## What It Does

Autoresearch lets an agent iteratively modify one research surface, run a short fixed evaluation, keep improvements, and discard regressions while a human edits the markdown “program” that defines the research organization. [Source](../../raw/repos/karpathy-autoresearch.md)

## Architecture

The setup is intentionally minimal: a fixed prep file, one mutable training file, and a `program.md` that acts like a lightweight skill describing the improvement process. The repo is benchmark-first and branch-first. [Source](../../raw/repos/karpathy-autoresearch.md)

## Key Numbers

- 65,009 GitHub stars. [Source](../../raw/repos/karpathy-autoresearch.md)
- Fixed 5-minute runs imply roughly 12 experiments per hour or about 100 overnight. [Source](../../raw/repos/karpathy-autoresearch.md)
- Karpathy reported about 20 additive improvements and an 11% time-to-GPT-2 improvement in a follow-up tweet. [Source](../../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)

## Strengths

- Simple enough to become a transferable pattern outside ML. [Source](../../raw/repos/karpathy-autoresearch.md)
- Makes the measurable objective and editable surface unusually explicit. [Source](../../raw/repos/karpathy-autoresearch.md)

## Limitations

- Works best when a cheap, trustworthy benchmark loop exists. [Source](../../raw/repos/karpathy-autoresearch.md)

## Alternatives

- [pi-autoresearch](./pi-autoresearch.md) for a more productized dashboard-driven version.
- [GEPA](./gepa.md) for broader text and workflow optimization with reflective mutation.

## Sources

- [Autoresearch repo](../../raw/repos/karpathy-autoresearch.md)
- [Karpathy launch tweet](../../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)
- [Karpathy follow-up tweet](../../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)
