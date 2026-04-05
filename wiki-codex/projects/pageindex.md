# PageIndex

> A vectorless retrieval system that structures documents as trees and uses reasoning over the hierarchy instead of embedding similarity. [Source](../../raw/repos/vectifyai-pageindex.md)

## What It Does

PageIndex builds hierarchical document structures and retrieves through tree-guided reasoning, positioning itself as an alternative to chunk-and-embed RAG for semantically coherent lookup. [Source](../../raw/repos/vectifyai-pageindex.md)

## Architecture

The core move is tree indexing. Instead of relying on nearest-neighbor vector search, the system creates structured document outlines that the model can reason over during retrieval. [Source](../../raw/repos/vectifyai-pageindex.md)

## Key Numbers

- 23,899 GitHub stars. [Source](../../raw/repos/vectifyai-pageindex.md)

## Strengths

- Strong alternative when vector similarity is the wrong inductive bias. [Source](../../raw/repos/vectifyai-pageindex.md)
- Keeps document structure explicit instead of flattening it into chunks. [Source](../../raw/repos/vectifyai-pageindex.md)

## Limitations

- Less obviously suited to highly relational cross-document memory than graph systems. [Source](../../raw/repos/vectifyai-pageindex.md)

## Alternatives

- [Napkin](napkin.md) for local markdown retrieval without tree indexing.
- [Graphiti](graphiti.md) for graph-backed memory instead of document trees.

## Sources

- [PageIndex repo](../../raw/repos/vectifyai-pageindex.md)
