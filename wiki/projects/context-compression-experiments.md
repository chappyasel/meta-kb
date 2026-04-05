# Context Compression Experiments

> Practical experiments comparing DSPy GEPA and TextGrad for optimizing context compression prompts in production agentic RAG systems -- demonstrating that prompt optimization can recover 30%+ of failed compressions on cheaper models without upgrading the LLM.

## What It Does

This project addresses a real production problem: context compression in an agentic RAG pipeline where each retrieved document needs LLM-based compression to extract query-relevant content. The prompt works well with gpt-4o but fails frequently with gpt-4o-mini, and rate limits on Azure OpenAI force frequent fallback to the cheaper model. The experiments use three optimization approaches: (1) DSPy GEPA (genetic algorithm-based prompt evolution over 75 iterations), (2) TextGrad (textual gradient descent over 8 iterations), and (3) a hybrid approach running TextGrad on the GEPA-optimized prompt. The hybrid achieves 100% extraction success (vs 0% for the original prompt with gpt-4o-mini) on a curated dataset of 296 failure cases.

## Architecture

- **Dataset**: 296 document-query pairs where gpt-4o-mini with the original prompt returned NO_OUTPUT but gpt-4o succeeded, filtered from 1000+ LangFuse traces
- **DSPy GEPA optimizer**: Genetic-Pareto algorithm evolving the compression prompt over ~75 iterations (~1 hour), achieving ~45% validation accuracy and 62% test extraction rate
- **TextGrad optimizer**: Textual gradient descent from the base prompt over 8 iterations (~30 mins), achieving 79% extraction rate
- **Hybrid optimizer**: TextGrad refining the GEPA-optimized prompt, achieving **100% extraction rate**
- **Evaluation**: Coverage visualization mapping extracted lines against gpt-4o reference using sentence-level semantic similarity
- **Base prompt**: Inspired by LangChain's LLMChainExtractor, focusing on verbatim extraction of query-relevant content

## Key Numbers

- 70 GitHub stars, 7 forks
- Python
- **Original prompt + gpt-4o-mini**: 0% success on failure dataset
- **GEPA optimized**: 62% extraction rate
- **TextGrad optimized**: 79% extraction rate
- **Hybrid (GEPA + TextGrad)**: **100% extraction rate**
- 296 document-query test pairs from production traces

## Strengths

- The progression from 0% to 100% extraction on the failure dataset with prompt optimization alone (no model change) is a compelling practical result that directly reduces inference costs in production RAG systems
- The hybrid approach (genetic search for broad exploration followed by gradient-based refinement) demonstrates a reusable meta-pattern for prompt optimization

## Limitations

- The 296 failure cases are specific to one domain's knowledge base, and the evolved prompts contain domain-specific strategies (redacted in the README) that may not transfer to other retrieval contexts
- Extraction success rate (something vs nothing) is a binary metric that does not measure compression quality -- extracting irrelevant content still counts as success

## Alternatives

- [llmlingua.md](llmlingua.md) -- use when you want model-based token-level compression rather than prompt-level optimization of the extraction instruction
- [gepa.md](gepa.md) -- use when you want the standalone GEPA optimizer for general prompt optimization beyond context compression
- [swe-pruner.md](swe-pruner.md) -- use when you need context pruning specifically for code/SWE tasks rather than document retrieval

## Sources

- [laurian-context-compression-experiments-2508.md](../../raw/repos/laurian-context-compression-experiments-2508.md) -- "Context compression for RAG systems is a critical bottleneck where cheaper models consistently fail -- optimizing prompts via genetic algorithms (DSPy GEPA) and gradient-based methods (TextGrad) can recover 30%+ of failed compressions"
