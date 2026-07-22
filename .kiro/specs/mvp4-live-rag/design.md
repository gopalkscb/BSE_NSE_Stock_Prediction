# Design Document — MVP4 RAG-Powered Intelligence Engine

## Overview

MVP4 adds a Pinecone-backed RAG pipeline using hybrid retrieval (OpenAI dense + BM25 sparse) for AI-powered signal explanations and conversational Q&A. The live/near-real-time multi-source data provider architecture is provided by MVP1a, which MVP4 depends on for market data.

---

## System Architecture (MVP4 Additions)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Additions (MVP4)                      │
│  ┌──────────────┐ ┌──────────────────┐                     │
│  │AskAI Drawer  │ │RAG Dashboard Tab │                     │
│  │(Chat Q&A)    │ │(Eval Metrics)    │                     │
│  └──────────────┘ └──────────────────┘                     │
└────────────────────────────│────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (MVP4)                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Data Layer (provided by MVP1a)                          │        │
│  │  DataProvider Interface + fallback chain                  │        │
│  └─────────────────────────────────────────────────┘        │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐        │
│  │  RAG Pipeline                                            │        │
│  │  RSS Feeds → Chunk → Embed(OpenAI) + BM25 Sparse         │        │
│  │       │                                                   │        │
│  │       ▼                                                   │        │
│  │  Pinecone (Hybrid: Dense + Sparse)                       │        │
│  │       │                                                   │        │
│  │       ▼                                                   │        │
│  │  Retrieve (RRF Fusion) → GPT-4o-mini → Answer + Citations│        │
│  │       │                                                   │        │
│  │       ▼                                                   │        │
│  │  Evaluate (ragas: precision, recall, faithfulness)        │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## RAG Pipeline Modules

```python
# src/rag/ingest.py
class ArticleIngester:
    def fetch_rss_feeds(self, feed_urls: list[str]) -> list[Article]: ...
    def chunk_articles(self, articles: list[Article]) -> list[Chunk]: ...
    def embed_chunks(self, chunks: list[Chunk]) -> list[EmbeddedChunk]: ...
    def generate_sparse_vectors(self, chunks: list[Chunk]) -> list[SparseVector]: ...
    def upsert_to_pinecone(self, embedded: list[EmbeddedChunk], sparse: list[SparseVector]) -> int: ...
    def run_pipeline(self) -> IngestResult: ...

# src/rag/retriever.py
class HybridRetriever:
    def dense_search(self, query: str, top_k: int = 10) -> list[RetrievedChunk]: ...
    def sparse_search(self, query: str, top_k: int = 10) -> list[RetrievedChunk]: ...
    def reciprocal_rank_fusion(self, dense: list, sparse: list, alpha: float = 0.7) -> list[RetrievedChunk]: ...
    def retrieve(self, query: str, top_k: int = 10) -> list[RetrievedChunk]: ...

# src/rag/generator.py
class RAGGenerator:
    def generate_explanation(self, ticker: str, confidence: str, context: list[RetrievedChunk]) -> Explanation: ...
    def generate_answer(self, question: str, context: list[RetrievedChunk], history: list[dict]) -> RAGResponse: ...

# src/rag/evaluator.py
class RAGEvaluator:
    def load_eval_set(self) -> list[EvalSample]: ...
    def compute_retrieval_metrics(self, samples: list[EvalSample]) -> RetrievalMetrics: ...
    def compute_generation_metrics(self, samples: list[EvalSample]) -> GenerationMetrics: ...
    def run_evaluation(self) -> EvaluationResult: ...
    def store_results(self, result: EvaluationResult) -> None: ...
```

---

## New Data Models

```python
class RAGQuery(BaseModel):
    question: str
    tickers: list[str] | None = None
    conversation_history: list[dict] | None = None

class RAGResponse(BaseModel):
    answer: str
    sources: list[dict]  # [{url, title, relevance_score}]
    tokens_used: dict    # {input: int, output: int}

class EvaluationResult(BaseModel):
    timestamp: str
    precision_at_k: float
    recall_at_k: float
    mrr: float
    context_relevance: float
    answer_faithfulness: float
    answer_relevance: float
    total_queries: int
    duration_seconds: float
```

---

## Config File Schema

```yaml
# config/rag_pipeline.yaml
ingestion:
  rss_feeds:
    - https://www.moneycontrol.com/rss/marketreports.xml
    - https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms
    - https://www.livemint.com/rss/markets
  chunk_size: 512
  chunk_overlap: 50
  schedule_hours: 6

embedding:
  model: text-embedding-3-small
  dimensions: 1536

retrieval:
  top_k: 10
  bm25_weight: 0.3
  dense_weight: 0.7

generation:
  model: gpt-4o-mini
  max_tokens: 500
  temperature: 0.3

evaluation:
  eval_set_path: data/rag_eval_set.json
  run_after_ingest: true
  degradation_threshold: 0.10
```

---

## Frontend Additions (MVP4)

```
frontend/src/
├── components/
│   ├── AskAIDrawer.jsx           # Chat Q&A panel (Cloudscape Drawer)
│   └── RAGDashboardTab.jsx       # Evaluation metrics charts + cost tracking
└── api/
    └── stockApi.js               # Updated: add v4 RAG functions
```

---

## MVP4 Dependencies (additions to requirements.txt)

```
pinecone-client==3.2.2
openai==1.30.0
langchain-text-splitters==0.2.0
rank-bm25==0.2.2
ragas==0.1.10
feedparser==6.0.11
apscheduler==3.10.4
```

---

## New Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PINECONE_API_KEY` | — | Pinecone vector DB API key |
| `PINECONE_INDEX_NAME` | `bse-nse-research` | Pinecone index name |
| `PINECONE_MULTI_INDEX` | `false` | Multi-index mode (paid tier) |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | LLM for generation |
| `RAG_BM25_WEIGHT` | `0.3` | BM25 weight in hybrid fusion |
| `RAG_TOP_K` | `10` | Retrieval top-k |
| `RAG_INGEST_INTERVAL_HOURS` | `6` | Ingestion schedule |
| `ENABLE_RAG_EXPLANATIONS` | `true` | Toggle AI explanations |
