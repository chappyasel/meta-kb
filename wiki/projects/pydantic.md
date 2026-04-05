---
entity_id: pydantic
type: project
bucket: agent-systems
sources:
  - repos/getzep-graphiti.md
  - repos/memorilabs-memori.md
  - repos/gepa-ai-gepa.md
  - repos/kayba-ai-agentic-context-engine.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/gepa-ai-gepa.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/memento-teams-memento-skills.md
related: []
last_compiled: '2026-04-05T05:26:38.810Z'
---
# Pydantic

**Type:** Library / Framework Dependency
**Domain:** Agent Systems, Data Validation

## What It Is

Pydantic is a Python data validation library that enforces type constraints at runtime using Python type annotations. You declare a class inheriting from `BaseModel`, annotate fields with Python types, and Pydantic validates, coerces, and serializes data automatically. In the LLM ecosystem, it serves as the structural backbone for parsing model outputs into typed Python objects and for generating JSON Schema that instructs models what to produce.

```python
from pydantic import BaseModel

class ExtractedEntity(BaseModel):
    name: str
    entity_type: str
    confidence: float

# Pydantic validates and coerces on instantiation
entity = ExtractedEntity(name="Acme Corp", entity_type="organization", confidence=0.92)
```

## Why It Matters for LLM Systems

LLM outputs are strings. Agent frameworks need structured data. Pydantic bridges that gap by providing:

- **JSON Schema generation** (`model.model_json_schema()`) that frameworks pass to LLM APIs via structured output modes
- **Runtime validation** that catches malformed model responses before they propagate through agent pipelines
- **Serialization** (`model.model_dump()`, `model.model_dump_json()`) for storing and transmitting structured results

When OpenAI, Anthropic, and Google released structured output modes, they built them around JSON Schema. Pydantic became the standard way Python developers generate that schema. Every major agent framework (PydanticAI, LangChain, LlamaIndex, Instructor) depends on this.

## Core Mechanism

### BaseModel Validation Pipeline

The central class is `pydantic.BaseModel`. On instantiation, Pydantic runs a validation pipeline:

1. **Field collection** via `ModelMetaclass` inspects Python annotations
2. **Type coercion** attempts to cast input values to declared types (e.g., `"42"` → `42` for `int` fields)
3. **Validator execution** runs any `@field_validator` or `@model_validator` decorators
4. **Error aggregation** collects all failures into a `ValidationError` with structured error details

Pydantic V2 (released 2023) rewrote the core validation engine in Rust via `pydantic-core`, which delivers roughly 5-50x speedup over V1 for common validation tasks. The Python API is mostly compatible, but V2 changed serialization behavior and validator signatures enough to break many downstream libraries during migration.

### Schema Generation

`model.model_json_schema()` produces a JSON Schema dict. For nested models, Pydantic generates `$defs` blocks with references. This schema is what libraries like Instructor and frameworks like PydanticAI send to LLM APIs.

```python
class ToolCall(BaseModel):
    tool_name: str
    arguments: dict[str, str]
    reasoning: str | None = None

print(ToolCall.model_json_schema())
# {'properties': {'tool_name': {'title': 'Tool Name', 'type': 'string'}, ...}}
```

### Discriminated Unions and Complex Types

For agent systems where the model must choose between multiple output types, Pydantic supports discriminated unions:

```python
from typing import Literal, Union
from pydantic import BaseModel

class SearchAction(BaseModel):
    action_type: Literal["search"]
    query: str

class AnswerAction(BaseModel):
    action_type: Literal["answer"]
    content: str

AgentAction = Union[SearchAction, AnswerAction]
```

This generates JSON Schema with `oneOf` semantics, which structured output APIs can enforce.

## Key Numbers

- **GitHub stars:** ~22,000+ (pydantic/pydantic) — independently observable
- **PyPI downloads:** Consistently among the top 10 most downloaded Python packages; ~300M+ monthly downloads (reported by PyPI Stats, cross-verifiable)
- **Pydantic V2 core benchmark:** ~5-50x faster than V1 for validation-heavy workloads (self-reported by Pydantic team, confirmed by community benchmarks like `python-benchmark-harness`)
- **Adoption:** FastAPI, LangChain, OpenAI Python SDK, Anthropic Python SDK, and PydanticAI all depend on it

## Strengths

**Schema generation is automatic and correct.** You write a Python class and get valid JSON Schema without manual maintenance. When you change the class, the schema updates.

**Error messages are diagnostic.** A `ValidationError` tells you which fields failed, what values were received, and why validation failed. In agent systems, this distinguishes "model returned wrong type" from "model returned nothing" from "model returned unexpected field."

**Nested models compose naturally.** Agents often need structured outputs with nested objects (e.g., a `Plan` containing a list of `Step` objects, each with `tool_name` and `arguments`). Pydantic handles this without boilerplate.

**Serialization round-trips reliably.** `model.model_dump()` and `Model.model_validate()` are inverses. Storing agent state to a database and rehydrating it works without custom serializers for most types.

## Critical Limitations

**Concrete failure mode — coercion hides model errors:** Pydantic coerces types by default. If an LLM returns `"0.95"` for a field typed `float`, Pydantic silently converts it. This is useful until a model returns `"not_a_number"` and you get a `ValidationError` pointing at the wrong level of your pipeline. More insidiously: if a field expects `int` and the model returns `1.0`, Pydantic V2 accepts it in strict=False mode. Your downstream code gets a float masquerading as an int in some edge cases depending on the type system path taken. Agents that don't enable `model_config = ConfigDict(strict=True)` can accumulate subtle type drift across long runs.

**Unspoken infrastructure assumption — structured output API availability:** Pydantic's value in agent systems assumes the LLM you're calling supports either native structured outputs (OpenAI, Gemini) or reliable JSON mode plus post-hoc parsing. When routing to smaller or self-hosted models without structured output support, Pydantic validation failures become frequent. The library provides no retry logic, fallback parsing, or partial validation. Libraries like Instructor layer this on top, but Pydantic itself has no mechanism for "accept what I can, log what failed."

**V1/V2 migration friction:** Many production systems still pin `pydantic<2.0`. Code written for V2 (`model.model_dump()`, `@field_validator` signatures, `model_config`) is not backward compatible. If your agent framework dependency tree includes any library that hasn't migrated, you get version conflicts.

## When NOT to Use It

**Don't use Pydantic models as your primary agent memory store.** Pydantic objects are validated at construction time, not continuously. A `BaseModel` instance doesn't re-validate if you mutate a field directly. For state that changes across agent turns, you need either immutable Pydantic objects (reconstruct on each update) or a different storage mechanism.

**Don't use deeply nested optional Pydantic models with weak LLMs.** A schema with 5 levels of nesting and many optional fields generates complex JSON Schema that smaller models frequently violate. The validation failures tell you parsing failed; they don't help you recover partial structure. For complex schemas against weak models, consider flatter representations or streaming parsers.

**Don't use Pydantic if you need partial validation.** If a model returns a 95% correct response with one malformed field, Pydantic rejects the whole object. For agent systems where partial results have value, you need custom parsing before Pydantic validation.

## Unresolved Questions

**Governance and versioning stability:** Pydantic is maintained by a small commercial entity (Pydantic Services Inc.) that also sells Pydantic Logfire (observability). The relationship between commercial priorities and library direction is not publicly documented. V2's breaking changes introduced significant ecosystem churn; the policy for future breaking changes is unclear.

**Cost at scale with complex schemas:** Generating JSON Schema from complex models adds tokens to every structured output request. For schemas with many optional fields and deep nesting, the schema itself can consume hundreds of tokens per call. No published analysis quantifies this cost across typical agent workloads.

**Validation in streaming contexts:** LLM streaming returns tokens incrementally. Pydantic validates complete objects. The pattern for streaming-then-validating (buffer until complete, then parse) loses the latency benefits of streaming. Partial object validation is not a supported Pydantic primitive, and the community has no settled pattern for this.

## Relationship to PydanticAI

PydanticAI is a separate agent framework built by the same team that treats Pydantic models as first-class agent output types. It uses `model_json_schema()` to construct structured output requests and wraps LLM responses in Pydantic validation automatically. The Agentic Context Engine (ACE) uses PydanticAI for structured output validation across all three of its roles (Agent, Reflector, SkillManager). Graphiti uses Pydantic models for custom entity and edge type definitions in its ontology system.

## Alternatives

**Instructor** (`instructor` library): Wraps any LLM client and handles retry logic, partial parsing, and validation failures. Use Instructor when you need resilience against malformed outputs and can't use native structured output APIs.

**TypedDict + `json.loads`:** For simple, flat structures, Python's `TypedDict` with manual JSON parsing avoids Pydantic's dependency weight and coercion behavior. Use when you need predictable, strict parsing without schema generation.

**Marshmallow:** Older serialization library with explicit field definitions. More verbose than Pydantic, no Rust core, but V1-style API is stable. Use when you need compatibility with pre-V2 codebases or prefer explicit over inferred validation.

**Attrs + Cattrs:** Composition-based alternative with explicit converters. More control over coercion behavior. Use when Pydantic's implicit coercion is a liability for your use case.
