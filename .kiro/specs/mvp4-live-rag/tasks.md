# Implementation Plan: MVP4 RAG-Powered Intelligence Engine

## Completion Status: ~80-85% (11/13 tasks implemented, 2 gates unverified)

MVP4 was built ahead of the planned prerequisite chain. Tasks 1-11 have implementation code. Task 8 uses simplified proxy metrics instead of the ragas library. Tasks 12-13 (integration and release gates) have not been verified — prerequisite MVPs (MVP1a, MVP2) are not complete.

## Overview

Tasks 1–13 implement the MVP4 RAG pipeline layer on top of completed MVP1 + MVP1a + MVP2. All previous tests must remain GREEN throughout.

> **Prerequisite**: All MVP1 (Tasks 1–15), MVP1a (Tasks 1–9), and MVP2 (Tasks 16–35) must be complete and all test suites GREEN before starting MVP4 tasks.

---

## Tasks

- [x] 1. Pinecone setup + index creation
  - Add `pinecone-client==3.2.2` to requirements.txt
  - Create `src/rag/__init__.py` + `src/rag/pinecone_client.py`
  - Implement index creation (dim=1536, metric=cosine, serverless)
  - Implement delete-and-replace namespace strategy
  - Write `tests/test_pinecone_client.py` (mocked)
  - 🟢 **Unit gate**: `pytest tests/test_pinecone_client.py` — DONE (pinecone_client.py exists with tests)
  - _Requirements: MVP4-R1_

- [x] 2. RSS ingestion + chunking pipeline
  - Add `feedparser==6.0.11`, `langchain-text-splitters==0.2.0` to requirements.txt
  - Create `src/rag/ingest.py`: fetch RSS, parse articles, chunk with RecursiveCharacterTextSplitter(512, 50)
  - Create `config/rag_pipeline.yaml` with feed URLs and chunking config
  - Write `tests/test_rag_ingest.py`
  - 🟢 **Unit gate**: `pytest tests/test_rag_ingest.py` — DONE (ingest.py exists with feedparser + langchain)
  - _Requirements: MVP4-R2_

- [x] 3. OpenAI embedding + BM25 sparse vector generation
  - Add `openai==1.30.0`, `rank-bm25==0.2.2` to requirements.txt
  - Extend `src/rag/ingest.py`: embed chunks via text-embedding-3-small, generate BM25 sparse vectors
  - Write `tests/test_rag_embedding.py`
  - 🟢 **Unit gate**: `pytest tests/test_rag_embedding.py` — DONE (ingest.py extended, tests exist)
  - _Requirements: MVP4-R2_

- [x] 4. Pinecone upsert (delete-and-replace strategy)
  - Extend `src/rag/ingest.py`: delete namespace, upsert dense + sparse vectors with metadata
  - Implement `POST /api/v4/rag/ingest` (manual trigger, API key)
  - Implement `GET /api/v4/rag/pipeline/status`
  - Write `tests/test_rag_upsert.py`
  - 🟢 **Unit gate**: `pytest tests/test_rag_upsert.py` — DONE (POST /ingest, GET /status endpoints exist)
  - _Requirements: MVP4-R2_

- [x] 5. Hybrid retrieval (dense + BM25 + RRF fusion)
  - Create `src/rag/retriever.py`: dense_search, sparse_search, reciprocal_rank_fusion
  - Configurable alpha (default 0.7 dense, 0.3 BM25)
  - Write `tests/test_rag_retriever.py` with unit + property tests
  - 🟢 **Unit gate**: `pytest tests/test_rag_retriever.py` — DONE (retriever.py with dense + sparse + RRF)
  - _Requirements: MVP4-R3_

- [x] 6. AI signal explanation generation
  - Create `src/rag/generator.py`: generate_explanation using GPT-4o-mini + retrieved context
  - Add `explanation` field to analyze response
  - `ENABLE_RAG_EXPLANATIONS` env var toggle
  - Write `tests/test_rag_generator.py`
  - 🟢 **Unit gate**: `pytest tests/test_rag_generator.py` — DONE (generator.py generate_explanation)
  - _Requirements: MVP4-R4_

- [x] 7. Conversational Q&A endpoint + frontend chat panel
  - Extend `src/rag/generator.py`: generate_answer with conversation history
  - Implement `POST /api/v4/rag/query`
  - Create `frontend/src/components/AskAIDrawer.jsx`
  - Write `tests/test_rag_qa.py` + Vitest tests
  - 🟢 **Unit gate**: `pytest tests/test_rag_qa.py` + `npx vitest run` — DONE (POST /query + AskAIDrawer.jsx)
  - _Requirements: MVP4-R5_

- [x] 8. RAG evaluation metrics (ragas integration)
  - Add `ragas==0.1.10` to requirements.txt
  - Create `src/rag/evaluator.py`: compute precision@k, recall@k, MRR, faithfulness, relevance
  - Create `data/rag_eval_set.json` with 50 labelled samples
  - Write `tests/test_rag_evaluator.py`
  - ⚠️ **Unit gate**: `pytest tests/test_rag_evaluator.py` — PARTIAL. `ragas==0.1.10` is in requirements.txt but never imported. evaluator.py uses simplified keyword-overlap proxy metrics instead of the ragas library.
  - _Requirements: MVP4-R6_

- [x] 9. Evaluation SQLite storage + history endpoints
  - Store results in `data/rag_eval.db` with timestamp
  - Implement `GET /api/v4/rag/evaluation/latest` + `GET /api/v4/rag/evaluation/history`
  - Write `tests/test_rag_eval_storage.py`
  - 🟢 **Unit gate**: `pytest tests/test_rag_eval_storage.py` — DONE (eval_store.py + API endpoints)
  - _Requirements: MVP4-R6_

- [x] 10. RAG dashboard tab in admin panel
  - Create `frontend/src/components/RAGDashboardTab.jsx`
  - Line charts (precision/recall/MRR), bar chart (faithfulness/relevance), latency histogram, cost tracking
  - Degradation warnings (>10% drop = amber)
  - Write Vitest unit tests
  - 🟢 **Unit gate**: `npx vitest run` — DONE (RAGDashboardTab.jsx exists)
  - _Requirements: MVP4-R7_

- [x] 11. Pipeline orchestration (scheduler + circuit breaker)
  - Add `apscheduler==3.10.4` to requirements.txt
  - Implement scheduled ingestion (every 6 hours)
  - Implement circuit breaker: 3 consecutive OpenAI failures → 15min pause
  - Auto-trigger evaluation after each ingest
  - Admin dashboard trigger button
  - Write `tests/test_rag_orchestration.py`
  - 🟢 **Unit gate**: `pytest tests/test_rag_orchestration.py` — DONE (orchestrator.py with APScheduler + circuit breaker)
  - _Requirements: MVP4-R8_

- [ ] 12. 🔴 Full MVP4 backend integration gate
  - `pytest tests/ -v` — ALL tests (MVP1 + MVP1a + MVP2 + MVP4) GREEN
  - MVP1a data provider fallback chain tested end-to-end
  - RAG pipeline runs successfully (ingest → retrieve → generate → evaluate)
  - All v4 API endpoints return correct responses
  - **Do NOT proceed to release gate until this passes**
  - ❌ **Cannot pass** — prerequisite MVP1a and MVP2 tests don't exist. Those MVPs have not been implemented yet.

- [ ] 13. 🔴 Full MVP4 release gate
  - `pytest tests/ -v` — all GREEN (includes MVP1, MVP1a, MVP2, MVP4 tests)
  - `npx vitest run` — all GREEN
  - `npx playwright test` — all GREEN
  - `pip-audit --fail-on HIGH` — exits 0
  - `npm audit --audit-level=high` — exits 0
  - RAG evaluation metrics above threshold (precision@10 > 0.6, faithfulness > 0.7)
  - MVP1a data source providers healthy (prerequisite layer verified)
  - **MVP4 is complete only when ALL gates pass**
  - ❌ **Cannot pass** — ragas threshold check impossible without ragas integration; prerequisite layers (MVP1a, MVP2) missing.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3"] },
    { "id": 3, "tasks": ["4", "5"] },
    { "id": 4, "tasks": ["6", "7"] },
    { "id": 5, "tasks": ["8", "9"] },
    { "id": 6, "tasks": ["10", "11"] },
    { "id": 7, "tasks": ["12"] },
    { "id": 8, "tasks": ["13"] }
  ]
}
```
