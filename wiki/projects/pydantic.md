---
entity_id: pydantic
type: project
bucket: agent-architecture
abstract: >-
  Pydantic is a Python data validation library using type annotations to enforce
  schemas at runtime; its structured output and JSON schema generation make it
  the de facto standard for typed LLM tool interfaces.
sources:
  - deep/repos/evoagentx-evoagentx.md
  - deep/repos/getzep-graphiti.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
related:
  - openai
  - anthropic
last_compiled: '2026-04-08T23:24:38.189Z'
---
# Pydantic

## What It Does

Pydantic validates Python data structures at runtime using type annotations. You define a class inheriting from `BaseModel`, declare fields with Python type hints, and Pydantic enforces those types when you instantiate the class, raising `ValidationError` with detailed messages when input doesn't conform.

In agent systems, Pydantic solves a specific problem: LLMs produce text, but agents need typed, structured data. Pydantic bridges that gap by providing `model_json_schema()` to generate JSON Schema that frameworks inject into LLM prompts (telling the model what shape to return), and `model_validate_json()` to parse and validate the model's response back into a typed Python object.

## Architecturally Unique Properties

Pydantic V2 (released 2023) rewrote the core validation engine in Rust (`pydantic-core`), making it 5-50x faster than V1 on typical workloads. This matters for agents running thousands of tool calls per session.

The key architectural choices for agent use:

- **JSON Schema generation is first-class.** `MyModel.model_json_schema()` returns a dict that precisely describes valid inputs, including nested objects, unions, enums, and field descriptions from `Field(description=...)`. Frameworks like [OpenAI Agents SDK](../projects/openai-agents-sdk.md) and [LangChain](../projects/langchain.md) call this method to build the `tools` array sent to the LLM.
- **`model_config` controls serialization behavior.** `model_config = ConfigDict(strict=True)` disables Pydantic's default coercion (e.g., it won't silently cast `"42"` to `int`). In agent tool validation, coercion is usually wrong; you want to know the model returned a string where an integer was expected.
- **Validators as decorated methods.** `@field_validator` and `@model_validator` let you attach Python logic to validation, so a `FilePathModel` can check that the path exists, not just that it's a string. This turns schema validation into business logic validation without separate code.
- **`TypeAdapter` for arbitrary types.** If you don't want a full `BaseModel` subclass, `TypeAdapter(list[MyModel]).validate_json(...)` validates a JSON array against a schema without a wrapper class.

## Core Mechanism

A typical agent tool integration looks like this:

```python
from pydantic import BaseModel, Field

class SearchInput(BaseModel):
    query: str = Field(description="The search query")
    max_results: int = Field(default=5, ge=1, le=20)

# Framework calls this to build tool schema for the LLM:
schema = SearchInput.model_json_schema()

# After the LLM responds, framework calls:
parsed = SearchInput.model_validate_json(llm_output_string)
```

The schema dict that `model_json_schema()` produces maps directly to what OpenAI, Anthropic, and Gemini accept in their `tools[].function.parameters` fields. This is not a convention — [OpenAI](../projects/openai.md) and [Anthropic](../projects/anthropic.md) built their function-calling formats around JSON Schema, and Pydantic's output is JSON Schema-compliant.

Structured output from LLMs (where the model is constrained to produce valid JSON matching a schema) typically uses Pydantic as the schema source. [OpenAI](../projects/openai.md)'s `client.beta.chat.completions.parse()` accepts a Pydantic model class directly and returns a validated instance. [Anthropic](../projects/anthropic.md)'s structured output mode does the same. Internally these frameworks call `model_json_schema()`, pass it to the API, then call `model_validate_json()` on the response.

[Graphiti](../projects/graphiti.md) uses Pydantic heavily throughout its multi-stage LLM pipeline: `ExtractedEntity`, `EdgeDuplicate`, and similar response models are Pydantic classes that each LLM call validates against. The `graphiti_core/llm_client/` layer passes these models to providers as structured output targets. [EvoAgentX](../projects/evoagentx.md) builds its entire `BaseModule` hierarchy on top of Pydantic `BaseModel`, using it for typed configuration, JSON serialization via `save_module()`/`load_module()`, and the `init_module()` lifecycle hook.

## Key Numbers

- **GitHub stars**: ~24,000 (as of mid-2025, based on public repository tracking — independently observable)
- **PyPI downloads**: Consistently in the top 10 most downloaded Python packages, with hundreds of millions of monthly downloads (PyPI stats are public and independently verifiable)
- **V2 performance**: Pydantic's own benchmarks claim 5-50x speedup over V1; independent benchmarks like `python-pydantic-benchmark` confirm substantial gains, though exact multipliers vary by use case
- **Adoption**: Required dependency of FastAPI, used by LangChain, LangGraph, OpenAI Python SDK, Anthropic Python SDK, DSPy, and virtually every Python agent framework

## Strengths

**Schema-LLM alignment.** The JSON Schema that `model_json_schema()` produces is the same schema the LLM reasons about when generating tool arguments. Adding `Field(description="...")` to a field improves LLM understanding of that field without any extra integration work — the description appears in the schema the model sees.

**Composable nested models.** Agent tools often need complex inputs. Pydantic handles arbitrary nesting (`List[Union[TypeA, TypeB]]`, discriminated unions, recursive models) and generates correct JSON Schema for all of it. This is harder than it sounds; naive approaches break on union types.

**Error messages that LLMs can act on.** `ValidationError` produces structured error output that frameworks can feed back to the LLM as a correction prompt. LangChain's `RetryWithErrorOutputParser` does exactly this: it passes the validation error string back to the model asking it to fix the output. The error messages are human-readable enough that models usually succeed on retry.

**Fast enough for tight loops.** With the Rust core, validation overhead is sub-millisecond for typical agent schemas. In a loop making hundreds of tool calls, this does not accumulate to a meaningful bottleneck.

## Critical Limitations

**Concrete failure mode: union ambiguity in LLM outputs.**
When a field accepts `Union[str, int]`, Pydantic V2 in non-strict mode tries coercion in order. The LLM frequently returns `"42"` as a string when the schema allows integers; Pydantic in default mode accepts this and stores the string, not the integer, unless you set `strict=True`. Meanwhile, `strict=True` rejects the string entirely. There is no middle ground that says "try to coerce numbers represented as strings, but reject truly invalid types." Teams hit this in production when LLM-generated JSON passes validation but downstream code receives wrong types.

**Unspoken infrastructure assumption: JSON Schema version drift.**
Pydantic V2 generates JSON Schema Draft 2020-12 by default, but many LLM provider APIs (including older OpenAI endpoints) expect Draft 7 semantics. `model_json_schema(mode='serialization')` versus `mode='validation'` produce different schemas. Using `schema_extra` or complex validators can produce schema constructs that the LLM's schema interpreter ignores silently. A field marked as required in Python can appear optional in the generated schema depending on how defaults are declared, leading to the LLM omitting it without error.

## When NOT to Use It

**When schema complexity exceeds LLM instruction-following capability.** A Pydantic model with 15 fields, deeply nested unions, and custom validators produces a JSON Schema that the LLM must follow exactly. More fields increase the probability of the model omitting required ones or mistyping values. If your tool needs that many fields, split it into multiple simpler tools rather than adding more Pydantic complexity.

**When you're doing prompt-only structured extraction without a framework.** If you're calling an LLM API directly and parsing the response yourself, Pydantic adds overhead for simple cases. For a single-field extraction, `response.split("Answer:")[-1].strip()` is faster to write, easier to debug, and has no dependency. Pydantic earns its keep when you have multiple fields, validation logic, or downstream code that depends on type safety.

**When you need schema evolution with persisted data.** Pydantic validates at instantiation but has no built-in migration system. If you serialize Pydantic model instances to a database (a common pattern in [Letta](../projects/letta.md)-style persistent memory systems), adding a required field to the model breaks deserialization of old records. You need a separate versioning strategy; Pydantic doesn't provide one.

## Unresolved Questions

**Cost at scale with complex schemas.** Larger JSON Schemas injected into the system prompt consume tokens. A Pydantic model with 10 fields and `Field(description=...)` annotations on each can add 300-500 tokens to every LLM call. For high-volume agents making thousands of calls per session, this adds up. The documentation does not address schema minification strategies or how to measure the marginal accuracy gain of field descriptions against their token cost.

**Discriminated union reliability across providers.** Pydantic's discriminated unions (`Union[Cat, Dog]` with a `type` literal field) generate clean JSON Schema, but whether [Gemini](../projects/gemini.md), [Claude](../projects/claude.md), and GPT-4 handle discriminated unions equally well in structured output mode is undocumented. Provider-specific structured output implementations may parse the schema differently.

**`model_rebuild()` and forward references in dynamic agent frameworks.** Frameworks that build Pydantic models dynamically at runtime (e.g., from tool registry definitions loaded from a database) frequently encounter `PydanticUserError: `model` is not fully defined` until `model_rebuild()` is called. The ordering requirements are subtle, and the error messages are not always clear about what forward reference is missing.

## Alternatives

| Alternative | When to choose it |
|---|---|
| `dataclasses` + `dacite` | You need lightweight typed containers without validation overhead, schema generation isn't required, and you're not integrating with an LLM framework that expects Pydantic |
| `attrs` + `cattrs` | You need more control over object construction and transformation pipelines, especially in data processing code adjacent to but not directly in the agent loop |
| `msgspec` | You need the fastest possible JSON serialization/deserialization and can accept a smaller feature set; benchmarks show msgspec outperforms even Pydantic V2 for pure serialization tasks |
| TypedDict + `jsonschema` | You're generating JSON Schema for API documentation or validation outside Python, and don't need Python-side validation or model instances |
| Raw dict + manual validation | You're prototyping, the tool schema is trivial (one or two fields), or the LLM output format is too irregular for schema validation to be reliable |

## Relationship to Agent Infrastructure

Pydantic sits at the intersection of [Context Engineering](../concepts/context-engineering.md) (providing the schema that shapes what the LLM is asked to produce), [Tool Registry](../concepts/tool-registry.md) (defining typed interfaces for each tool), and [Multi-Agent Systems](../concepts/multi-agent-systems.md) (defining the typed message contracts between agents). It is infrastructure rather than a framework: it does not orchestrate, plan, or execute — it validates the typed boundaries between components that do.

The [Model Context Protocol](../concepts/model-context-protocol.md) relies on JSON Schema for tool definitions, which means Pydantic-generated schemas are directly usable as MCP tool input schemas without transformation.


## Related

- [OpenAI](../projects/openai.md) — implements (0.4)
- [Anthropic](../projects/anthropic.md) — implements (0.4)
