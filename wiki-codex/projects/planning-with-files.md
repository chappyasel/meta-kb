# planning-with-files

> A disciplined markdown working-memory pattern for agents that need durable progress across `/clear` and long-running tasks. [Source](../../raw/repos/othmanadi-planning-with-files.md)

## What It Does

planning-with-files gives agents a small set of persistent markdown artifacts for plans, findings, and recovery so work survives context resets and can be resumed cleanly in later sessions. [Source](../../raw/repos/othmanadi-planning-with-files.md)

## Architecture

The repo centers on the filesystem-as-memory idea: store working state in files, not in volatile chat history. It also includes session-recovery logic and compatibility guidance across many skill-enabled IDEs and agents. [Source](../../raw/repos/othmanadi-planning-with-files.md)

## Key Numbers

- 17,968 GitHub stars. [Source](../../raw/repos/othmanadi-planning-with-files.md)
- Works across a long list of IDEs and agent products that support Agent Skills. [Source](../../raw/repos/othmanadi-planning-with-files.md)

## Strengths

- Simple, legible, and highly transferable. [Source](../../raw/repos/othmanadi-planning-with-files.md)
- Good answer to the “TodoWrite disappears on reset” class of problems. [Source](../../raw/repos/othmanadi-planning-with-files.md)

## Limitations

- Intentionally simple; it does not solve relational or semantic memory at the depth of graph systems. [Source](../../raw/repos/othmanadi-planning-with-files.md)

## Alternatives

- [Claude-Mem](./claude-mem.md) for richer retrieval over past observations.
- [OpenViking](./openviking.md) for a more elaborate layered context database.

## Sources

- [planning-with-files repo](../../raw/repos/othmanadi-planning-with-files.md)
