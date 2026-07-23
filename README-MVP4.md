# MVP4 — Live Data Streaming + RAG-Powered Intelligence Engine

> Multi-source live data, Pinecone RAG pipeline, hybrid retrieval, AI explanations, evaluation dashboard

## Status: 🟡 ~80-85% Implemented

> Backend RAG pipeline fully implemented. Frontend components built (AskAIDrawer, AskAIPanel, RAGDashboardTab). 8 backend test files + 11 E2E tests. Notable: `ragas` library not integrated (uses proxy metrics). Prerequisite chain violated (MVP1a/MVP2 not done).

## Spec Files
- [Requirements](.kiro/specs/mvp4-live-rag/requirements.md)
- [Design](.kiro/specs/mvp4-live-rag/design.md)
- [Tasks](.kiro/specs/mvp4-live-rag/tasks.md)
- [Security Baseline](.kiro/steering/security.md)

---

## What's New Over MVP2/3

- **Multi-source data providers**: Pluggable interface with yfinance, BSE India, NSE India, Alpha Vantage adapters
- **Live price polling**: 60-second refresh during market hours (9:15 AM – 3:30 PM IST)
- **Priority fallback chain**: Auto-failover if primary source is down
- **Admin data source management**: Enable/disable/reorder providers via dashboard
- **Pinecone vector store**: Serverless, delete-and-replace for free-tier cost control
- **RAG ingestion pipeline**: RSS feeds → chunk → OpenAI embed + BM25 sparse → Pinecone
- **Hybrid retrieval**: Dense (OpenAI) + Sparse (BM25) + Reciprocal Rank Fusion
- **AI signal explanations**: GPT-4o-mini generates grounded explanations with citations
- **Conversational Q&A**: "Ask AI" chat panel for free-text stock questions
- **RAG evaluation**: precision@k, recall@k, MRR, faithfulness, relevance (ragas library)
- **Evaluation dashboard**: Metrics over time, cost tracking, degradation alerts
- **Pipeline orchestration**: Scheduled ingestion, circuit breaker, manual trigger

---

## New API Endpoints (v4)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v4/config/data-sources` | API key | Hot-reload data source config |
| `POST` | `/api/v4/rag/ingest` | API key | Trigger ingestion pipeline |
| `GET` | `/api/v4/rag/pipeline/status` | API key | Pipeline status + last run |
| `POST` | `/api/v4/rag/query` | — | Conversational Q&A query |
| `GET` | `/api/v4/rag/evaluation/latest` | API key | Latest evaluation scores |
| `GET` | `/api/v4/rag/evaluation/history` | API key | Evaluation history over time |

---

## Architecture

```
DataProvider Interface
├── YFinanceProvider (priority 4, fallback)
├── BSEIndiaProvider (priority 2)
├── NSEIndiaProvider (priority 1, primary)
└── AlphaVantageProvider (priority 3)

RAG Pipeline
RSS Feeds → Chunk(512) → Embed(OpenAI) + BM25 Sparse
    → Pinecone Upsert (delete-and-replace)
    → Hybrid Retrieve (RRF: 70% dense + 30% BM25)
    → Generate (GPT-4o-mini + citations)
    → Evaluate (ragas: precision, recall, faithfulness)
```

---

## New Dependencies

| Package | Version | Purpose |
|---|---|---|
| `pinecone-client` | 3.2.2 | Vector database |
| `openai` | 1.30.0 | Embeddings + LLM generation |
| `langchain-text-splitters` | 0.2.0 | Document chunking |
| `rank-bm25` | 0.2.2 | BM25 sparse retrieval |
| `ragas` | 0.1.10 | RAG evaluation metrics |
| `feedparser` | 6.0.11 | RSS feed parsing |
| `apscheduler` | 3.10.4 | Background task scheduling |

---

## New Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PINECONE_API_KEY` | — | Pinecone API key |
| `PINECONE_INDEX_NAME` | `bse-nse-research` | Index name |
| `PINECONE_MULTI_INDEX` | `false` | Multi-index mode (paid tier) |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | LLM for generation |
| `RAG_BM25_WEIGHT` | `0.3` | BM25 weight in hybrid fusion |
| `RAG_TOP_K` | `10` | Retrieval top-k |
| `RAG_INGEST_INTERVAL_HOURS` | `6` | Ingestion schedule |
| `ENABLE_RAG_EXPLANATIONS` | `true` | Toggle AI explanations |
| `ALPHA_VANTAGE_API_KEY` | — | Alpha Vantage key |

---

## Deployment

**Internal network / cloud** (same as MVP2). Requires Pinecone account (free tier) and OpenAI API key.

---

[← Back to Journey README](README.md)
