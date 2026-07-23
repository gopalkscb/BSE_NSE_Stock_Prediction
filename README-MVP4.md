# MVP4 — Live Data + RAG-Powered Intelligence

## Status: 🟡 ~95% Implemented

MVP4 adds a Pinecone-backed RAG pipeline with hybrid retrieval (OpenAI dense + BM25 sparse) for AI-powered signal explanations and conversational Q&A about Indian equity markets.

---

## What's Built

### Backend (`src/rag/`)
| Module | Purpose |
|---|---|
| `pinecone_client.py` | Pinecone index CRUD, upsert, query, delete-and-replace namespace |
| `ingest.py` | RSS fetch → chunk (512/50) → embed (OpenAI) → BM25 sparse → upsert |
| `retriever.py` | HybridRetriever: dense + sparse + Reciprocal Rank Fusion |
| `generator.py` | RAGGenerator: signal explanations + conversational Q&A (GPT-4o-mini) |
| `evaluator.py` | Precision@k, recall@k, MRR, faithfulness, relevance (proxy metrics) |
| `eval_store.py` | SQLite storage for evaluation results + replace-on-threshold pruning (keeps latest 50) |
| `seed_eval.py` | Auto-seeds 20 eval records + 400 per-query records on startup when DB is empty |
| `orchestrator.py` | APScheduler (6hr) + circuit breaker (3 failures → 15min pause) |

### API Endpoints (`/api/v4/rag/`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/ingest` | API Key | Trigger ingestion pipeline |
| GET | `/pipeline/status` | API Key | Pipeline run status |
| POST | `/query` | None | Conversational Q&A |
| GET | `/evaluation/latest` | None | Latest evaluation scores |
| GET | `/evaluation/history` | None | Evaluation history + degradation check |

### Frontend
| Component | Tab | Purpose |
|---|---|---|
| `AskAIPanel.jsx` | RAG Reference → Ask AI | Conversational chat grounded in financial news |
| `RAGDashboardTab.jsx` | RAG Reference → RAG Performance | All metrics (precision, recall, MRR, faithfulness, answer_relevance, context_relevance, duration, cost/tokens) + per-query breakdown table |
| `AskAIDrawer.jsx` | (Overlay variant) | Drawer-based chat (alternative) |

> **Note:** RAG Performance tab is disabled while Ask AI chat is loading.

---

## Quick Start

### Prerequisites

Create `.env` at project root:
```
OPENAI_API_KEY=sk-your-key
PINECONE_API_KEY=your-pinecone-key
ADMIN_API_KEY=your-32-char-admin-key
```

### Run Ingestion
```bash
# Start backend
uvicorn src.api.main:app --reload

# Trigger ingestion (populates Pinecone with financial news)
curl -X POST http://localhost:8000/api/v4/rag/ingest -H "X-API-Key: your-admin-key"

# Or via Python directly
python -c "from dotenv import load_dotenv; load_dotenv(); from src.rag.ingest import ArticleIngester; print(ArticleIngester().run_pipeline())"
```

### Use Ask AI
1. Start frontend: `cd frontend && npm run dev`
2. Go to **📚 RAG Reference** tab → **🤖 Ask AI**
3. Ask: "Why is RELIANCE bullish?" or "What's driving TCS?"

---

## Configuration

All RAG config lives in `config/rag_pipeline.yaml`:
- RSS feeds: MoneyControl, Economic Times, LiveMint, BSE + commodity feeds (MCX, gold, silver)
- Chunking: 512 chars, 50 overlap
- Embedding: text-embedding-3-small (1536 dims)
- Retrieval: top-k=10, alpha=0.7 dense / 0.3 BM25
- Generation: GPT-4o-mini, 500 max tokens, temp=0.3
- Evaluation: 50 labelled samples in `data/rag_eval_set.json`
- Orchestration: 6hr schedule, 3-failure circuit breaker

---

## Evaluation Data Seeding

On first startup (when `rag_eval.db` is empty), the backend auto-seeds:
- **20 evaluation run records** with realistic metric distributions
- **400 per-query records** (20 per run) showing individual query performance
- Replace-on-threshold pruning: when records exceed 50, oldest are removed to keep the DB lean
- `GET /api/v4/rag/evaluation/latest` returns 200 with zero values when no data (never 404)

---

## Dependencies (additions to requirements.txt)
```
pinecone-client==3.2.2
openai>=2.0.0
langchain-text-splitters==0.2.0
rank-bm25==0.2.2
ragas==0.1.10
feedparser==6.0.11
apscheduler==3.10.4
pyyaml==6.0.1
python-dotenv==1.0.1
```

---

## Tests (8 files)
- `tests/test_pinecone_client.py` — Pinecone client (mocked)
- `tests/test_rag_ingest.py` — RSS ingestion + chunking
- `tests/test_rag_embedding.py` — OpenAI embedding + BM25 sparse
- `tests/test_rag_retriever.py` — Hybrid retrieval + RRF fusion
- `tests/test_rag_generator.py` — AI explanation + Q&A generation
- `tests/test_rag_evaluator.py` — Evaluation metrics
- `tests/test_rag_eval_storage.py` — SQLite eval storage
- `tests/test_rag_orchestration.py` — Scheduler + circuit breaker

---

## Ingestion Results (tested 2026-07-23)
- 44 articles fetched from 4 RSS feeds
- 46 chunks created (512 char, 50 overlap)
- 46 vectors embedded (2,852 tokens)
- 46 vectors upserted to Pinecone (`bse-nse-research` index, `news` namespace)
- Total duration: ~24 seconds

---

## Known Gaps
- `ragas` library not actually imported (uses simplified keyword-overlap proxy metrics)
- MVP1a/MVP2 prerequisites not met (RAG operates independently)
- Tasks 12-13 (integration/release gates) cannot fully pass without prerequisite MVPs
