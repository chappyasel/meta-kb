---
url: >-
  https://yearofthegraph.xyz/newsletter/2026/03/beyond-context-graphs-how-ontology-semantics-and-knowledge-graphs-define-context-the-year-of-the-graph-newsletter-vol-30-spring-2026/
type: article
author: ganadiotis
date: '2026-04-08'
tags:
  - context-engineering
  - knowledge-substrate
  - agent-memory
  - semantic-layers
  - decision-tracing
  - precedent-management
  - enterprise-autonomy
key_insight: >-
  Context graphs transform LLM agents from stateless reasoners into
  precedent-aware autonomous systems by making decision rationale and exception
  handling searchable and reusable across sessions, enabling agents to
  distinguish rule application from real-world constraints that rules fail to
  capture.
relevance_scores:
  topic_relevance: 8
  practitioner_value: 6
  novelty: 6
  signal_quality: 6
  composite: 6.8
  reason: >-
    Directly addresses context graphs, knowledge graphs, ontologies, and
    GraphRAG as they apply to LLM agent infrastructure—core to the knowledge
    substrate and context engineering pillars—with a broad survey covering
    tools, research, and market trends that practitioners can use to orient
    themselves.
---
## Beyond Context Graphs: How Ontology, Semantics, and Knowledge Graphs Define Context

> Published on The Year of the Graph by ganadiotis on 2026-04-08

![Beyond Context Graphs: How Ontology, Semantics, and Knowledge Graphs Define Context. The Year of the Graph Newsletter Vol. 30, Spring 2026](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/guerrillabuzz-N2oyIFeir-s-unsplash.jpg "Beyond Context Graphs: How Ontology, Semantics, and Knowledge Graphs Define Context. The Year of the Graph Newsletter Vol. 30, Spring 2026")

**What are context graphs, what are they good for, and why are they dubbed AI’s trillion-dollar opportunity? What does context mean actually, and how can we define context using graphs and ontologies? And how can different types of graphs and graph technologies power AI?**

Gartner highlighted Data Management, Semantic Layers, and GraphRAG as Top Trends in Data and Analytics for 2026. Startups and incumbents in the graph technology space are making progress, while graph is becoming the fastest growing segment in AI research.

A comprehensive, up-to-date repository, visualization, and analysis of offerings across the graph technology space has been unveiled. New and existing combinations of Graphs and AI are being used to power use cases such as software engineering productivity and supporting enterprise needs at Netflix scale.

New graph database products, features, and benchmarks are available. Use cases as well as research and development on ontologies are on the rise too, including topics such as Enterprise Architecture, visual tooling, and quality assessment for LLM-assisted use of ontologies.

And yet, the most widely discussed topic in the world of graph technology – and beyond – for this past couple of months has been context graphs. So what are context graphs and where do they fit in the graph technology landscape?

In this issue of the Year of the Graph, we explore progress in Ontology, Semantics, Knowledge Graphs, Graph Databases and Analytics, and how these technologies can help define context and power AI.

## 📋 Table of Contents

- [An Introduction to Context Graphs](#context_graph_introduction)
- [Context Beyond Context Graphs](#context_beyond_context_graphs)
- [Ontologies, Context Graphs, and Semantic Layers: What AI Actually Needs in 2026](#ontologies_context_graphs_semantic_layers)
- [Tooling and Evaluation Frameworks for Ontologies](#tooling_evaluation_frameworks_ontologies)
- [From Retrieval Augmented Generation to Knowledge Augmented Generation](#RAG_to_KAG)
- [Knowledge Graphs in Software Engineering and Enterprise Architecture](#knowledge_graphs_software_engineering_enterprise_architecture)
- [Knowledge Graph Research, Applications and Best Practices](#knowledge_graph_research_applications_best_practices)
- [Knowledge Graph Tools and Platforms](#knowledge_graph_tools_platforms)
- [The State of the Graph Database Market](#state_of_the_graph_database_market)
- [Graph Analytics and Graph AI Updates](#graph_analytics_graph_AI)

---

**This issue of the Year of the Graph is brought to you by [metaphacts](https://metaphacts.com/knowledge-driven-ai-whitepaper?mtm_campaign=Year%20of%20the%20%20Graph%20-%20March%202026&mtm_kwd=knowledge-driven-ai-whitepaper-landing-pa%20ge), [Graphwise](https://graphwise.ai/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=develop-and-govern), [Connected Thinking](https://2026.connected-thinking.space/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=Spring2026), [Linkurious](https://eu1.hubs.ly/H0qhxmM0), [Process Tempo](https://calendly.com/processtempo/yotg), [State of the Graph,](https://www.stateofthegraph.com/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=Spring2026) [Connected Data London,](https://2026.connected-data.london/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=Spring2026) and [Pragmatic AI Training](http://pragmaticai.training/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=Spring2026).**

---

**Why Most Enterprise AI Strategies Fail**

[![Why Most Enterprise AI Strategies Fail](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/YoG-AI.whitepaper.png "Why Most Enterprise AI Strategies Fail")](https://metaphacts.com/knowledge-driven-ai-whitepaper?mtm_campaign=Year%20of%20the%20%20Graph%20-%20March%202026&mtm_kwd=knowledge-driven-ai-whitepaper-landing-pa%20ge)

Even as AI adoption soars, 80% of enterprises report no return on their AI investments, and 42% end up abandoning their strategies entirely. At the same time, those who pivot away from AI risk accelerating their own obsolescence. The missing link? A knowledge graph with a semantic layer.

By pairing LLMs with a symbolic layer, companies are able to leverage AI and trust that its outputs are contextualized and explainable. This whitepaper dives into how  
knowledge graphs provide the necessary structure and grounding that LLMs lack, enabling scalable, future-proof AI strategies.

[**Download the free whitepaper**](https://metaphacts.com/knowledge-driven-ai-whitepaper?mtm_campaign=Year%20of%20the%20%20Graph%20-%20March%202026&mtm_kwd=knowledge-driven-ai-whitepaper-landing-pa%20ge)

---

## An Introduction to Context Graphs

Rules tell an agent what should happen in general. Decision traces capture what happened in specific cases. Agents don’t just need rules. They need access to the decision traces that show how rules were applied in the past, where exceptions were granted, how conflicts were resolved, who approved what, and which precedents actually govern reality.

A context graph is the accumulated structure formed by those traces: not “the model’s chain-of-thought,” but a living record of decision traces stitched across entities and time so precedent becomes searchable. Over time, that context graph becomes the real source of truth for autonomy – because it explains not just *what* happened, but *why it was allowed* to happen.

This is how [Foundation Capital’s Jaya Gupta and Ashu Garg defined context graphs](https://www.linkedin.com/feed/update/urn:li:activity:7411311600407658498), claiming they will be the single most valuable asset for companies in the era of AI, and a trillion-dollar opportunity. This thesis sparked an array of follow-ups, both [from Gupta and Garg as well as from others.](https://www.linkedin.com/posts/foundation-capital_thecontext-graphwill-be-the-single-most-activity-7415095500942725120-IY5M/)

[![Are context graphs AI's trillion-dollar opportunity?](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/ContextGraph.jpg "Are context graphs AI's trillion-dollar opportunity?")](https://www.linkedin.com/feed/update/urn:li:activity:7411311600407658498)

Some people, like Gartner’s Afraz Jaffri, believe that [using context as an adjective to describe a graph is redundant as a graph implicitly holds context](https://www.linkedin.com/posts/afraz-jaffri_all-the-talk-around-context-graphs-is-exciting-activity-7415141675779452928-AGHp/). Others, like Graphwise’s Andreas Blumauer, see [context graphs as an evolution that builds upon knowledge graphs, adding time and decision lineage](https://www.linkedin.com/pulse/how-do-context-graphs-knowledge-differ-from-each-other-blumauer-wkfcf/).

[Todd Blaschka identifies what he calls the Logic Gap in the context graph narrative](https://www.linkedin.com/pulse/context-graph-hype-why-holy-grail-leaking-todd-blaschka-fjene): the distance between recording a decision and understanding its meaning. While a knowledge graph defines static relationships, a context graph captures operational reality – decision traces, temporal intelligence, and lineage.

When AI architecture lacks a formal knowledge graph foundation, you encounter three critical failures: identity crisis, hallucinated judgment, and context rot, Blaschka notes. Jessica Talisman elaborates further, [arguing that “context graph” is a rebranding](https://www.linkedin.com/pulse/trillion-dollar-rebranding-jessica-talisman-u3ljc/), and [context graphs are great in theory but will require solid knowledge management foundations to become a reality](https://jessicatalisman.substack.com/p/context-graphs-and-process-knowledge).

---

**Transform Your AI With A Semantic Layer**

[![Transform Your AI With A Semantic Layer](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/Pyramid-Bundles-Soltuons-changed%20(1).png "Transform Your AI With A Semantic Layer")](https://graphwise.ai/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=develop-and-govern)

Enterprises are pouring millions into AI, but without the right foundation, that investment stalls. Graphwise delivers the knowledge graph and semantic AI infrastructure that make enterprise AI ready to scale, trusted, and built to perform.

Recognized by Gartner, named “Data Integration Innovation of the Year” at the 2025 Data Breakthrough Awards, and listed among KMWorld’s 100 Companies That Matter, Graphwise is the industry’s most comprehensive and validated solution.

[**Get started with Graphwise today to make generative AI reliable and scalable for your business.**](https://graphwise.ai/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=develop-and-govern)

---

## Context Beyond Context Graphs

But there are even deeper issues with the way “context” is used, [Talisman expands](https://jessicatalisman.substack.com/p/the-context-problem). When a word becomes a billing unit, the concept associated with the word can quickly lose meaning. Are we discussing context relative to tokens or context designed for AI reliability? Is it a graph? A markdown file? A YAML format or schema tables?

To help disambiguate things, the [mission of the W3C Context Graphs Community Group](https://www.linkedin.com/feed/update/urn:li:activity:7436689792806887425) is to develop specifications, vocabularies, and best practices for representing and resolving contextual misalignment between global knowledge representations and local interpretation contexts in decision systems and human–AI workflows.

[![AI agents need five graphs, and nobody has all of them](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/Sephirotic%20Tree%20of%20Life.webp "AI agents need five graphs, and nobody has all of them")](https://jasonstanley.substack.com/p/five-graphs-your-agents-need-and)

Athanasius Kircher’s Sephirotic Tree of Life, from Oedipus Aegyptiacus (1652).

Jason Stanley argues that [AI agents need five graphs, and nobody has all of them](https://jasonstanley.substack.com/p/five-graphs-your-agents-need-and).

Access graphs map who can reach what. Security graphs map what is exploitable and what the blast radius looks like. Context graphs capture decision trajectories so agents can act on precedent. Action graphs model what operations are legal on what objects under what rules. Knowledge graphs represent entities and relationships across the enterprise.

In more practical terms, Andrea Splendiani, Kurt Cagle, the Glean team and Will Lyon share approaches for implementing context graphs. [Splendiani](https://www.linkedin.com/pulse/context-knowledge-graphs-andrea-splendiani-slude/) and [Cagle](https://ontologist.substack.com/p/knowledge-graphs-context-graphs-and) offer RDF-based alternatives, while [Lyon works with Neo4j](https://medium.com/neo4j/hands-on-with-context-graphs-and-neo4j-8b4b8fdc16dd). The [Glean team share their architecture](https://www.glean.com/blog/how-do-you-build-a-context-graph), based on the premise that “ [you can’t reliably capture the why; you can capture the how](https://www.glean.com/blog/context-data-platform) “.

The context graph thesis also became the blueprint for the development of the first stable release of [Semantica: an open source framework for building context graphs and decision intelligence layers for AI](https://www.linkedin.com/feed/update/urn:li:activity:7437389600492273664).

---

**Connected Thinking: From civilizational patterns to the next system**

A unique journey of exploration, transformation, companionship, and grounding. A series of interactive seminars on foot, reviving the peripatetic school tradition of ancient thinkers in meta-modern times.

[![Connected Thinking: From civilizational patterns to the next system](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/Connected-Thinking-Banner-1200x628.png "Connected Thinking: From civilizational patterns to the next system")](https://2026.connected-thinking.space/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=Spring2026)

● Civilizational Patterns: An Introduction to Macrohistory.

● The Pulsation of the Commons Hypothesis: How commons-based coordination has pulsed through history as an alternative.

● P2P and the Commons: The emerging logic of peer-to-peer as a post-hierarchical coordination model.

● The Next System: What Can We Know? Mapping the contours of what replaces the exhausted form.

 [**![👉](https://fonts.gstatic.com/s/e/notoemoji/16.0/1f449/32.png) Learn more and apply here**](https://2026.connected-thinking.space/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=Spring2026)

---

## Ontologies, Context Graphs, and Semantic Layers: What AI Actually Needs in 2026

Inevitably, the context graph conversation touches upon ontology as well, in the sense of capturing context in a way that both people and AI can reliably use. As Graphlit’s Kirk Marple [frames it](https://www.linkedin.com/pulse/context-graphs-what-ontology-debate-gets-wrong-kirk-marple-afotc/), entity ontologies are largely solved by existing standards. The real unsolved work is temporal validity, decision traces, and fact resolution.

The current conversation has crystallized around a dichotomy: prescribed ontologies vs learned ontologies. What’s missing from this framing is a third option that’s been hiding in plain sight: Adopt what exists. Extend where needed. Focus learning on what’s genuinely novel.

Even though ontology is considered part of the fundamentals of Information Systems, with [2026 having been proclaimed the year of the ontology](https://yearofthegraph.xyz/newsletter/2025/12/the-ontology-issue-from-knowledge-to-graphs-and-back-again-the-year-of-the-graph-newsletter-vol-29-winter-2025-2026/), its origins are in philosophy. The entry for [Ontology and Information Systems in the Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/entries/ontology-is/) provides background and references.

In 2026, [ontology is trending because AI agents exposed the gap](https://www.linkedin.com/feed/update/urn:li:activity:7430576586451587072). Years of pipeline-stacking without caring about meaning landed us here: agents failing precisely where semantic understanding was supposed to live. Connectivity without semantics is just faster error, as Frédéric Verhelst notes in In “ [Own the Ontology or Rent Your Future](https://www.linkedin.com/feed/update/urn:li:activity:7422296169525080064/) “.

Verhelst identifies four capability gaps that make agentic AI ungovernable and proposes the Minimum Viable Ontology approach. Following up, he elaborates on the missing contract: [why most boards cannot govern what they cannot define, and how to fix this with semantics and ontology](https://www.linkedin.com/feed/update/urn:li:activity:7427395983426306049).

[![Ontologies, Context Graphs, and Semantic Layers: What AI Actually Needs in 2026](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/What%20AI%20Actually%20Needs%20in%202026.webp "Ontologies, Context Graphs, and Semantic Layers: What AI Actually Needs in 2026")](https://metadataweekly.substack.com/cp/185458632)

Ontologies, Context Graphs, and Semantic Layers: What AI Actually Needs in 2026. By Jessica Talisman

The world at large seems to be waking up to the importance of semantics and ontology. [Gartner highlighted Data Management, Semantic Layers, and GraphRAG as Top Trends in Data and Analytics for 2026](https://www.linkedin.com/feed/update/urn:li:activity:7429850443196964864), with [Semantic Enrichment recognized as a key capability of Data Management Platforms](https://www.linkedin.com/posts/robert-thanaraj_gartnerda-toptrends-datamanagementplatforms-activity-7431763301673455616-4GYG/). Gartner now states that [budget for semantic capabilities is non-negotiable](https://juansequeda.substack.com/p/gartner-data-and-analytics-march).

Bill Inmon, widely recognized as the father of the data warehouse, shared his journey towards semantics and ontology too. Inmon joined forces with Jessica Talisman to introduce [some perspectives on ontology](https://www.linkedin.com/feed/update/urn:li:activity:7417179789280714753/), admitting that he never wanted to end up knowing anything about ontology; it was ontology that found him.

Inmon and Talisman followed up with [the anatomy of an ontology](https://www.linkedin.com/feed/update/urn:li:activity:7426596450224173056/), where they explore what ontologies look like, how they are structured, and what their defining characteristics and structures are. For people drawn to ontology by the conversation on AI, context graphs and semantic layers, Talisman [explores their relationship and what AI needs in 2026](https://metadataweekly.substack.com/cp/185458632).

---

**The shortest path between you and graph insights**

Graph visualization and analytics just got a lot easier!  
Introducing [Linkurious Enterprise Cloud](https://eu1.hubs.ly/H0qhyQV0): An online solution that brings powerful graph exploration to anyone, right from a browser.

[![The shortest path between you and graph insights](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.29/LinkuriousEnterpriseCloud.jpg "The shortest path between you and graph insights")](https://eu1.hubs.ly/H0qhxmM0)

Create an account, connect your graph database, start the exploration of your data, collaborate with your teammates and share your results, all before lunch.

What else?  
• Compatibility with leading graph databases  
• Zero IT bottlenecks or infrastructure tasks  
• Flexible plans that adapt to your needs

The fastest way to start a graph project today — and the easiest way to scale it tomorrow.

![👉](https://fonts.gstatic.com/s/e/notoemoji/16.0/1f449/32.png) [Sign up now](https://eu1.hubs.ly/H0qhxmM0) for a 30-day free trial.

---

## Tooling and Evaluation Frameworks for Ontologies

For non-experts, when it comes to implementing semantic artifacts such as ontologies, [semantic work may need its Figma moment](https://dataprodmgmt.substack.com/p/why-semantic-work-needs-its-design). Even when people understand why AI depends on semantics and get the buy-in, Anna Bergevin argues that the tools and process are insufficient for solving this problem.

Bergevin notes that currently, semantics tools are built for experts, not for getting started. She identifies a gap in the market, and believes the parallel success story of how design democratized itself without undermining expertise may be instructive. She is not alone in this observation.

Athanassios Hatzis started a conversation on tooling to visualize ontologies, which soon [expanded to include ontology editors](https://www.linkedin.com/feed/update/urn:li:activity:7403759799978438657/). Steve Hedden shared [a list of free, open-source RDF & ontology visualization tools](https://www.linkedin.com/posts/steve-hedden_reactodia-activity-7416543599598759936-Dmwg/). New tools for semantic modeling work such as [Termboard](https://termboard.com/), [OntoBoom](https://ontoboom.com/), and [OntoView](https://www.linkedin.com/feed/update/urn:li:activity:7404362896454922240/) are emerging, while others like [gra.fo retiring](https://www.linkedin.com/feed/update/urn:li:activity:7428030120931721216).

[![The semantic tooling landscape](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/SemanticToolingLandscape.webp "The semantic tooling landscape")](https://dataprodmgmt.substack.com/p/why-semantic-work-needs-its-design)

Does Semantic Work Need Its Figma Moment? By Anna Bergevin

Some people may be tempted to [get LLMs to write their ontology](https://www.linkedin.com/posts/fredericverhelst_agenticai-aigovernance-knowledgegraphs-activity-7431977004281016320-F9wh), but Frédéric Verhelst and Joe Hoeller warn against [blindly trusting LLM ontologies](https://www.linkedin.com/pulse/terrifying-truths-how-blindly-trusting-llm-ontologies-joe-h--qru0c/) – aka “vibe ontologies”. However, like most professionals, knowledge engineers can benefit from using LLMs thoughtfully to assist in their work.

A [framework and benchmark for open source LLM-driven ontology construction for enterprise knowledge graphs](https://www.linkedin.com/feed/update/urn:li:activity:7424764642490691584/) was presented by Liber AI. More benchmarks for evaluating LLM-generated ontologies were developed, [one as a collaboration between LettrIA and EURECOM](https://ceur-ws.org/Vol-3953/362.pdf) and [another one featuring researchers from German and British universities](https://ceur-ws.org/Vol-3979/paper2.pdf).

Ontologies are knowledge artifacts, but they’re also software artifacts. Like any software, their quality should be measured in a systematic, operationalizable way. In “ [Evaluating the Quality of Ontologies](https://www.linkedin.com/posts/jbarrasa_goingmeta-semantics-knowledgegraphs-activity-7415433957091016704-Gf37) “, Neo4j’s Jesús Barrasa and Alexander Erdl reviewed some papers on this topic and implemented some of the ideas they found.

---

**Process Tempo is the missing layer every graph stack needs**

[![Process Tempo is the missing layer every graph stack needs](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/YearOfTheGraphVER2.png "Process Tempo is the missing layer every graph stack needs")](https://calendly.com/processtempo/yotg)

Built to accelerate the design, development, and deployment of graph-driven applications, Process Tempo turns your ideas into production-ready solutions faster.

Whether you’re building enterprise knowledge graphs or data intelligence platforms, Process Tempo provides the speed, structure, and flexibility needed to bring your connected ideas to life.

 [**![👉](https://fonts.gstatic.com/s/e/notoemoji/16.0/1f449/32.png) Learn More**](https://calendly.com/processtempo/yotg)

---

## From Retrieval Augmented Generation to Knowledge Augmented Generation

Using ontology in Retrieval Augmented Generation (RAG) is getting traction too. Sergey Vasiliev labels this family of approaches [KAG: Knowledge Augmented Generation](https://www.linkedin.com/feed/update/urn:li:activity:7433121866724081664/). Rather than only improving retrieval, the aim is to integrate a knowledge graph as a reasoning substrate. In this view, the graph is not merely a retriever index but a semantic backbone.

In “ [Enhancing HippoRAG with Graph-Based Semantics](https://www.linkedin.com/feed/update/urn:li:activity:7429126856962084864) “, a team from Graphwise show how an ontology-based knowledge graph boosts the multi-hop Q&A accuracy of a leading schemaless GraphRAG system. Replacing generic graph construction with strict ontologies and structured knowledge graphs transforms HippoRAG from an associative engine into a reasoning engine.

[Granter research compared a variety of approaches](https://arxiv.org/abs/2511.05991v1#): standard vector-based RAG, GraphRAG, and retrieval over knowledge graphs built from ontologies derived either from relational databases or textual corpora. Results show that ontology-guided knowledge graphs incorporating chunk information achieve competitive performance with state-of-the-art frameworks.

[![In Knowledge Augmented Generation, the aim is to integrate a knowledge graph as a reasoning substrate](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/RAG%20vs%20GraphRAG%20vs%20KAG.webp "In Knowledge Augmented Generation, the aim is to integrate a knowledge graph as a reasoning substrate")](https://www.linkedin.com/feed/update/urn:li:activity:7433121866724081664/)

In Knowledge Augmented Generation, the aim is to integrate a knowledge graph as a reasoning substrate

That’s not to say that other RAG and GraphRAG approaches have gone away. Raphaël MANSUY elaborates on [why classic RAG doesn’t work and what to do about it](https://www.linkedin.com/pulse/why-classic-rag-doesnt-work-what-do-rapha%C3%ABl-mansuy-kpw9c/), as a preamble to introducing [EdgeQuake: a high performance open source Graph-RAG framework in Rust](https://www.linkedin.com/feed/update/urn:li:activity:7427009513746186240).

[MegaRAG automatically builds knowledge graphs from visual documents](https://www.linkedin.com/feed/update/urn:li:activity:7439274572379578369). And Graphcore Research published [UltRAG: a Universal Simple Scalable Recipe for Knowledge Graph RAG](https://graphcore-research.github.io/2026-02-20-ultrag/).

A group of Chinese researchers published [a survey of Graph Retrieval-Augmented Generation](https://www.linkedin.com/feed/update/urn:li:activity:7413853058935287808/). A systematic survey of GraphRAG, with workflow formalization, downstream tasks, application domains, evaluation methodologies, industrial use cases, and an open source repository.

Google published [a guide to building GraphRAG agents with Google’s Agent Development Kit](https://www.linkedin.com/feed/update/urn:li:activity:7418995209461563392). This hands-on tutorial demonstrates how to create intelligent agents that understand data context through graph relationships and deliver highly accurate query responses.

Steve Hedden explores [the rise of context engineering and semantic layers for Agentic AI](https://towardsdatascience.com/beyond-rag/). He notes that RAG may have been necessary for the first wave of enterprise AI, but it’s evolving into something larger. Neo4j’s Alex Gilmore wrote the [Text2Cypher Guide](https://neo4j.com/blog/genai/text2cypher-guide/), elaborating on when and how to implement Text2Cypher in agentic applications.

---

**State of the Graph**

A comprehensive, up-to-date repository, visualization, and analysis of offerings across the graph technology space.

[![State of the Graph](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/SOTG%20Logo%202.png "State of the Graph")](https://www.stateofthegraph.com/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=Spring2026)

• Tech professionals exploring graph tools, platforms, and architectures  
• Analysts and investors tracking market trends  
• Vendors and builders seeking a clear, inclusive map to position their innovations

 **[![👉](https://fonts.gstatic.com/s/e/notoemoji/16.0/1f449/32.png)](https://calendly.com/processtempo/yotg) [Learn more](https://www.stateofthegraph.com/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=Spring2026)**

---

## Knowledge Graphs in Software Engineering and Enterprise Architecture

Bala Adithya Malaraju was trying to apply a GraphRAG architecture to his codebase, but running against issues. Then he decided to [stop letting LLMs build his knowledge graphs](https://www.linkedin.com/feed/update/urn:li:activity:7432431977460441088/), and adopted the Fixed Entity Architecture. The core idea is simple: instead of letting a LLM discover your ontology from scratch, you define it yourself.

This is just one application of knowledge graphs and ontology in the domain that’s probably seeing the bigest impact from AI: software engineering. There are many more. Amir Hosseini [evaluates Codebase-Oriented RAG through Knowledge Graph analysis](https://gdotv.com/blog/codebase-rag-knowledge-graph-analysis-part-1), using [Code-Graph-RAG](https://github.com/vitali87/code-graph-rag) and gdotv.

[GitNexus](https://github.com/abhigyanpatwari/GitNexus) turns a repository into an AST-driven knowledge graph directly in the browser. [session-graph](https://www.linkedin.com/feed/update/urn:li:activity:7434564616099287041) turns scattered AI coding sessions into a queryable knowledge graph. [Repository Planning Graph Encoder](https://www.linkedin.com/feed/update/urn:li:activity:7425139443663290369/) creates a unified, high fidelity representation for AI-assisted coding.

[Repolex](https://www.linkedin.com/feed/update/urn:li:activity:7435648447824715776) offers semantic code intelligence through RDF knowledge graphs. [Code review graph](https://github.com/tirth8205/code-review-graph) creates a local knowledge graph for Claude Code. [pr-split](https://www.linkedin.com/feed/update/urn:li:activity:7435225704725700608) decomposes large PRs into a Directed Acyclic Graph of small, reviewable stacked PRs, and [gitCGR instantly visualises any GitHub repo as a graph](https://gitcgr.com/).

[![Repository Planning Graph Encoder](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/Repository%20Planning%20Graph%20Encoder.jpeg "Repository Planning Graph Encoder")](https://www.linkedin.com/feed/update/urn:li:activity:7425139443663290369/)

Repository Planning Graph Encoder creates a unified, high fidelity representation for AI-assisted coding.

But ultimately software engineering is just one part of Enterprise Architecture. What if ontology could revitalize Enterprise Architecture?

This is the question driving Alberto D. Mendoza’s conversion of [ArchiMate 3.2 to an RDF Ontology](https://www.linkedin.com/feed/update/urn:li:activity:7434958723590250496). Enterprise Architecture frameworks like TOGAF, DoDAF, and FEAF have long used ArchiMate: an open, vendor-neutral, standardized graphical modeling language used to describe, analyze & visualize architectures.

The problem is that after ArchiMate diagrams are created they are flattened, saved as a PDF, and the knowledge it took so long to collect is frozen. But ArchiMate is more than a drawing standard: it’s a formal language with precisely defined element types and relationship semantics.

Elements could be stored in a model that is governed, referenced, and evolves over time rather than recreated from scratch. But EA tools store this information in relational tables, so EA becomes a roadblock. Graphs are the obvious fix. RDF/OWL was designed for rich knowledge representation, so this seems like a natural match.

---

**Connected Data London 2026**

10 Years Connecting Data, People and Ideas

[![Connected Data London 2026](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/CDL26.jpeg "Connected Data London 2026")](https://2026.connected-data.london/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=Spring2026)

🎤 Keynote: William Tunstall-Pedoe, the pioneer behind Amazon Alexa  
🔹 Malcolm Hawker – Thought leader, CDO Profisee  
🔹 Juan Sequeda – Principal Fundamental Researcher, ServiceNow  
🔹 Jessica Talisman – Semantic Architect, Founder of The Ontology Pipeline

 **[![👉](https://fonts.gstatic.com/s/e/notoemoji/16.0/1f449/32.png)](https://calendly.com/processtempo/yotg) [Book Now](https://2026.connected-data.london/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=Spring2026)**

---

## Knowledge Graph Research, Applications and Best Practices

Similar to how software engineering is a premium application domain for knowledge graphs, graph is emerging as the fastest growing segment in AI research. [Graph was a significant part of NeurIPS 2025, signifying its growing importance and market share](https://www.linkedin.com/feed/update/urn:li:activity:7401893973113470976).

Dan McGrath’s findings reinforce this. [McGrath tracked the raw growth of graph-related research against the baseline of all AI papers from 2023 to present](https://www.linkedin.com/feed/update/urn:li:activity:7427740539589955584/). The results show a clear acceleration, with a turning point in 2024, when graph became the fastest growing segment in AI research.

Real-world applications abound as well, as shown in Juan Sequeda’s [Connected Data London 2025 trip report](https://www.linkedin.com/feed/update/urn:li:activity:7402247397042536448/). A knowledge graph conference where every single talk came from businesses. Not by vendors. Not POCs. Real production deployments with mature architectures and well thought out roles and processes.

Sequeda has been a knowledge graph builder and advocate for decades. He shared [20 lessons from 20 years of building ontologies and knowledge graphs](https://juansequeda.substack.com/p/the-20-lessons-about-building-ontologies), and he will be [back to Connected Data London 2026 as part of an initial lineup also featuring William Tunstall-Pedoe, Malcolm Hawker and Jessica Talisman](https://www.connected-data.london/post/cdl-2026-announcement).

[![Juan Sequeda's 20 lessons from 20 years of building ontologies and knowledge graphs](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/20%20Lessons%20about%20Building%20Ontologies%20and%20Knowledge%20Graphs.webp "Juan Sequeda's 20 lessons from 20 years of building ontologies and knowledge graphs")](https://juansequeda.substack.com/p/the-20-lessons-about-building-ontologies)

Juan Sequeda’s 20 lessons from 20 years of building ontologies and knowledge graphs

Veronika Heimsbakk wrote a series of posts for [data engineers looking to understand knowledge graphs](https://substack.com/home/post/p-183770493). Kicking off with the motivation – [why you should care about knowledge graphs](https://veronahe.substack.com/p/data-engineer-why-should-you-care) – she elaborates on [data engineering ontologies](https://veronahe.substack.com/p/data-engineering-ontologies), [a few elementary pieces on logic](https://substack.com/home/post/p-184588621), and shares a translation guide – [SPARQL for SQL developers](https://veronahe.substack.com/p/sparql-for-sql-developers-a-translation).

Ashleigh Faith also has decades of experience modeling knowledge graphs and ontology. She shares her [top 10 modeling tips for ontology and graph](https://www.youtube.com/watch?v=Gq-xMA2wtYI). While her tips have a heavy focus on RDF-based graph models, the principles are deep enough to be useful for almost any graph data modeling project.

The debate between the RDF and Labelled Property Graph (LPG) graph data models is ongoing. Sergey Vasiliev [explains Property Graph and LPG as structural and applied semantic models, places RDF in its role as a general semantic framework](https://substack.com/inbox/post/183678713), and formally analyses the relationships between them. He argues [RDF is a knowledge representation model and LPG is decision infrastructure](https://www.linkedin.com/feed/update/urn:li:activity:7438197030499426304).

Niklas Emegård shares a [no-ontology hack to show that you don’t need to spend weeks data modeling to start building a RDF knowledge graph](https://niklasemegard.medium.com/the-secret-no-ontology-rdf-hack-nobody-tells-you-0165fe7d9003), and Pieter Colpaert argues for [eventual interoperability](https://pietercolpaert.be/interoperability/2026/01/08/eventual-interoperability%5D\(https://pietercolpaert.be/interoperability/2026/01/08/eventual-interoperability\)) – avoiding getting stuck on making trade-off decisions and having to wait for consensus.

---

**Pragmatic AI Training**

[![Pragmatic AI Training](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/PragmaticAI-2026-1200x628-layout558-1kmukcv.png "Pragmatic AI Training")](http://pragmaticai.training/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=Spring2026)

From Data Literacy to Data Science and Pragmatic AI

For those who want to understand the first principles of AI, and learn how to use it to get results.

• Created through extensive experience  
• Designed for busy professionals  
• Validated by global leaders  
• Delivered on-site

 **[![👉](https://fonts.gstatic.com/s/e/notoemoji/16.0/1f449/32.png)](https://calendly.com/processtempo/yotg) [Learn More](http://pragmaticai.training/?utm_source=year-of-the-graph&utm_medium=newsletter&utm_campaign=Spring2026)**

---

## Knowledge Graph Tools and Platforms

If you are looking for knowledge graph tools and platforms you can use, there are some resources to help there too.

[knwler](https://knwler.com/) turns documents into structured knowledge, extracting entities, relationships, and topics. [Knowledge Graph Toolkit (KGTK)](https://kgtk.readthedocs.io/en/latest/) is a Python library for easy manipulation with knowledge graphs. [graflo](https://pypi.org/project/graflo/) is a framework for transforming tabular and hierarchical data into property graphs and ingesting them into graph databases.

The [State of the Graph](https://stateofthegraph.com/) is a comprehensive, up-to-date repository, visualization, and analysis of offerings across the graph technology space. The [State of the Graph knowledge graph catalog](https://stateofthegraph.com/knowledge-graphs/) brings together dedicated platforms, infrastructure providers, and knowledge‑centric search and management tools so you can see who is doing what, where they overlap, and where they differ.

TopBraid’s Steve Hedden created [Open Knowledge Graphs – a search engine for ontologies, controlled vocabularies, and Semantic Web tools](https://stevehedden.medium.com/open-knowledge-graphs-a-search-engine-for-ontologies-controlled-vocabularies-and-semantic-web-cfcf32a5babe). Ítalo Oliveira created [a shortlist of Conceptual Modeling and Linked Data Tools](https://www.linkedin.com/feed/update/urn:li:activity:7406236067789508608/). And Michael Hoogkamer created [an interactive taxonomy of semantic modeling concepts](https://www.linkedin.com/posts/michaelhoogkamer_what-the-rdf-is-a-knowledge-graph-i-generated-activity-7407749459469705216-oxCI/).

[![A Unified Framework for AI-Native Knowledge Graphs](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/A%20Unified%20Framework%20for%20AI-Native%20Knowledge%20Graphs.webp "A Unified Framework for AI-Native Knowledge Graphs")](https://www.linkedin.com/feed/update/urn:li:activity:7426600280659582977)

A Unified Framework for AI-Native Knowledge Graphs. By Fanghua (Joshua) Yu

Taxonomies can be considered as stepping stones for ontologies and knowledge graphs. Heather Hedden shared her insights on [what taxonomies are not](https://accidental-taxonomist.blogspot.com/2026/01/what-taxonomy-is-not.html) and [taxonomy sources](https://accidental-taxonomist.blogspot.com/2026/02/taxonomy-sources-re-use-license-or-ai.html), and Kurt Cagle shows how to [use public taxonomies](https://ontologist.substack.com/p/using-public-taxonomies).

[Taxonomists have a role in the new world of Generative AI](https://www.linkedin.com/feed/update/urn:li:activity:7424079471856582657/), and Yumiko Saito reflects on it. Kurt Cagle explores [how to make taxonomies (and knowledge graphs in general) more friendly for LLMs](https://ontologist.substack.com/p/knowledge-graph-first-kgf-design).

To use LLMs with knowledge graphs, [Fanghua (Joshua) Yu proposes Generative Knowledge Modeling (GenKM)](https://www.linkedin.com/feed/update/urn:li:activity:7426600280659582977): a comprehensive methodology introducing a modular four-stage architecture that unifies 40+ existing Graph RAG systems under a common formalism, a [generative operator algebra](https://www.linkedin.com/feed/update/urn:li:activity:7429092906713554945), and the [GenKG Lifecycle for end-to-end knowledge graph governance](https://www.linkedin.com/posts/year-of-the-graph_emergingtech-evaluation-genai-activity-7437822256933793792-_re9).

---

## The State of the Graph Database Market

The [graph database market is growing](https://yearofthegraph.xyz/newsletter/2025/12/the-ontology-issue-from-knowledge-to-graphs-and-back-again-the-year-of-the-graph-newsletter-vol-29-winter-2025-2026/#graph-databases-growing-market-intensifying-competition-more-options), with more competition among vendors and more options for users. The [State of the Graph catalog of graph databases](https://stateofthegraph.com/2026/03/03/exploring-the-graph-database-landscape/) is an attempt to present the market in a single, structured, vendor‑inclusive view. It aims to enable users to see how graph databases compare across different features.

There are more than 50 graph databases listed on the State of the Graph catalog. But Jason Saltzman, Head of Insights at CB Insights, [notes that like cloud infrastructure before it, databases are moving from broad experimentation to standardization around a few critical workloads](https://www.linkedin.com/posts/jason-salt_select-from-databasestartups-where-mosaicchange-share-7424557214008246272-6nxm/). As that happens, the market becomes far less forgiving.

Saltzman calls out Neo4j, noting that their momentum reflects scale and defensibility: $200M ARR, 84% Fortune 100 penetration, and accelerating GraphRAG adoption, contributing to one of the highest IPO probabilities CB Insights tracks.

Sudhir Hasbe, Neo4j CPO, elaborates on [Neo4j’s evolving architectural evolution in 2025](https://neo4j.com/blog/news/2025-ai-scalability/), and shares a roadmap for 2026. Notably, this includes “Ontologies as a First-Class Citizen”: a top-level, independent modeling tool with a repository of use-case-specific samples and native graph schema enforcement. The latest version of [Neo4j introduces support for schema as a preview feature](https://www.linkedin.com/feed/update/urn:li:activity:7438193778252750848).

[![The State of the Graph database catalog](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/State%20of%20the%20Graph%20Database%20Market.png "The State of the Graph database catalog")](https://stateofthegraph.com/graph-databases/)

The State of the Graph database catalog offers a single access point for browsing, comparing, and choosing the offering that is right for your needs.

We saw mobility in the graph database landscape, with new vendors and releases.

[TuringDB released Community Version](https://www.linkedin.com/posts/turingdb-ai_starting-the-year-with-something-weve-been-activity-7416848300282392576-7oQG/), an open-source edition of its high-performance, versioned graph database. [AllegroGraph released v8.5](https://www.linkedin.com/feed/update/urn:li:activity:7439649483019390976), combining knowledge graphs, vector embeddings, and neurosymbolic reasoning. [Memgraph released Atomic GraphRAG Pipelines](https://memgraph.com/blog/atomic-graphrag-explained-single-query-pipeline), implementing sophisticated pipelines as atomic database queries.

[SurrealDB released version 3.0](https://surrealdb.com/blog/introducing-surrealdb-3-0--the-future-of-ai-agent-memory), bringing improvements on stability, performance and tooling, developer experience, and building AI agents, while also [raising a $23M Series A extension](https://surrealdb.com/blog/surrealdb-raises-23m-series-a-extension-to-power-the-ai-native-database-era). [Vela Partners released a new fork of KuzuDB](https://www.linkedin.com/feed/update/urn:li:activity:7437045828206272512) and added concurrent multi-writer support.

Both Grafeo and Samyama highlight [LDBC benchmarks](https://ldbcouncil.org/benchmarks/) results. The [Graph Data Council (GDC)](https://ldbcouncil.org/), formerly known as the Linked Data Benchmark Council (LDBC), is a non-profit organization that defines standard graph benchmarks and fosters a community around graph processing technologies.

There are more benchmarks and updates for the Gremlin ecosystem. [LDBC SNB Interactive for TinkerPop](https://github.com/JetBrains/ldbc-snb-interactive-gremlin) is a Gremlin-based implementation of the [LDBC Social Network Benchmark (SNB) Interactive v1](https://ldbcouncil.org/benchmarks/snb-interactive/) workload. [TinkerBench](https://github.com/aerospike-community/tinkerbench) is a benchmarking tool designed for graph databases based on Apache TinkerPop. And the [Second Edition of Practical Gremlin: An Apache TinkerPop Tutorial was published](https://www.linkedin.com/feed/update/urn:li:activity:7436682219538194432).

---

## Graph Analytics and Graph AI Updates

The Graph Analytics market is projected to grow from USD 2.41 billion in 2025 to USD 2.92 billion in 2026 (21.61% CAGR), on track to reach USD 9.49 billion by 2032. The [State of the Graph catalog for graph analytics](https://stateofthegraph.com/graph-analytics/) offers a single access point for browsing, comparing, and selecting graph analytics tools that match your needs.

A noteworthy entry in the graph analytics market is Google BigQuery Graph. [BigQuery Graph, currently in private preview](https://medium.com/google-cloud/bigquery-graph-series-part-1-from-dark-data-to-knowledge-graphs-5a37f052d043), enables users to query at scale, unify data, and visualize insights, while supporting the Graph Query Language (GQL).

Netflix leverages graph analytics too. The team shared [how and why Netflix built a real-time distributed graph](https://www.linkedin.com/feed/update/urn:li:activity:7430603226808209408/) and [how they created a high-throughput graph abstraction](https://www.linkedin.com/feed/update/urn:li:activity:7433118823773315072/). The next step was the [AI evolution of graph search at Netflix, going from structured queries to natural language](https://www.linkedin.com/feed/update/urn:li:activity:7421880804949233664/).

ClickHouse and PuppyGraph introduce the [LakeHouse Graph concept: Zero-Copy graph analytics](https://www.linkedin.com/posts/year-of-the-graph_lakehouse-datamanagement-dataengineering-activity-7428076704289505281-gxhZ), querying relationships directly on existing data without ETL to a graph database. [DuckDB also offers graph analytics now via Onager](https://www.linkedin.com/feed/update/urn:li:activity:7414575551476285440/).

[Graphina](https://github.com/habedi/graphina) is a graph data science library for Rust. It provides common data structures and algorithms for analyzing real-world networks, such as social, transportation, and biological networks. The Neo4j blog offers background and examples on some of the most common graph analytics algorithms – [Louvain](https://neo4j.com/blog/aura-graph-analytics/from-cafeteria-cliques-to-graph-communities-understanding-the-louvain-algorithm/), [Jaccard](https://neo4j.com/blog/aura-graph-analytics/why-jay-z-shouldnt-drive-your-recommendations-the-intuition-behind-the-jaccard-coefficient/), and [PageRank](https://neo4j.com/blog/aura-graph-analytics/whose-signature-really-matters-understanding-pagerank-through-yearbook-signatures/).

[![Graph-based Agent Memory: Taxonomy, Techniques, and Applications](https://filedn.com/lAGFqCrfCf9p4SPhvQtCjAf/YotG_Images/Posts/YotGV.30/Graph-based%20Agent%20Memory.jpeg "Graph-based Agent Memory: Taxonomy, Techniques, and Applications")](https://www.linkedin.com/feed/update/urn:li:activity:7425498780084649984/)

“Graph-based Agent Memory: Taxonomy, Techniques, and Applications” presents a comprehensive review of agent memory from the graph-based perspective

Graph AI is being redefined by the advent of graph memory for AI agents. “ [Graph-based Agent Memory: Taxonomy, Techniques, and Applications](https://www.linkedin.com/feed/update/urn:li:activity:7425498780084649984/) ” presents a comprehensive review of agent memory from the graph-based perspective. Cognee, an open source AI memory engine that turns data into a living knowledge graph, [raised $7.5M seed funding to build memory for AI agents](https://www.cognee.ai/blog/cognee-news/cognee-raises-seven-million-five-hundred-thousand-dollars-seed).

Himanshu jha elaborates on a parallel between how Transformers changed sequence modeling and how Graph Transformers might be changing graph learning, framing [the shift from GNNs to Graph Transformers through the lens of the Transformer revolution](https://www.linkedin.com/feed/update/urn:li:activity:7417831914524483585).

[Graphbench](https://graphbench.github.io/website/) is a comprehensive graph learning benchmark across domains and prediction regimes. GraphBench standardizes evaluation, and includes a unified hyperparameter tuning framework, and provides strong baselines with state-of-the-art message-passing and graph transformer models and easy plug-and-play code.

Graph Billion- Foundation-Fusion (GraphBFF) is the first end-to-end recipe for building [billion-parameter Graph Foundation Models](https://arxiv.org/abs/2602.04768) (GFMs) for arbitrary heterogeneous, billion-scale graphs. Central to the recipe is the GraphBFF Transformer, a flexible and scalable architecture designed for practical billion-scale GFMs.
