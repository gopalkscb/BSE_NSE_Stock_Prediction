# MVP4 Requirements Document — RAG-Powered Intelligence Engine

## Introduction

MVP4 extends the Bullish Stock Predictor with a Pinecone-backed RAG pipeline that ingests financial news and research articles to generate AI-powered signal explanations and answer free-text questions about stocks — all grounded in retrieved evidence using a hybrid dense (OpenAI) + sparse (BM25) retrieval approach. Live data streaming from multiple sources (BSE/NSE official APIs, yfinance, Alpha Vantage) is handled by MVP1a.

**Deployment target:** Internal/cloud (same as MVP2).
**Prerequisite:** MVP1 + MVP1a + MVP2 complete.

---

## Glossary Additions

- **RAG (Retrieval-Augmented Generation)**: An AI pattern that retrieves relevant documents from a vector store and passes them as context to an LLM for grounded generation.
- **Dense Retrieval**: Semantic search using vector embeddings (OpenAI text-embedding-3-small).
- **Sparse Retrieval (BM25)**: Keyword-based scoring using term frequency and inverse document frequency.
- **Hybrid Retrieval**: Combining dense and sparse retrieval results using reciprocal rank fusion (RRF).
- **Pinecone**: A managed vector database for storing and querying embeddings.
- **Reciprocal Rank Fusion (RRF)**: A method to merge ranked lists from multiple retrieval systems.
- **Faithfulness**: An evaluation metric measuring whether a generated answer is supported by the retrieved context.
- **Context Relevance**: An evaluation metric measuring whether retrieved documents are relevant to the query.

---

## Requirements

### MVP4-R1 — Pinecone Vector Store Setup

**User Story:** As a developer, I want a managed vector database for storing document embeddings used by the RAG pipeline.

#### Acceptance Criteria

1. THE system SHALL use Pinecone serverless (free tier) as the vector store.
2. FOR cost control (MVP4 initial): THE system SHALL use a SINGLE Pinecone index with namespaces (`news`, `research`). On each ingestion run, existing vectors in the target namespace SHALL be deleted before upserting new ones (delete-and-replace strategy).
3. FOR future (paid tier): THE system SHALL support multiple dedicated indexes when upgraded. A `PINECONE_MULTI_INDEX` env var (default `false`) SHALL control this behavior.
4. THE index SHALL be configured with dimension=1536 (matching text-embedding-3-small), metric=cosine, and pod type=serverless.
5. THE system SHALL store metadata per vector: `source_url`, `title`, `published_date`, `ticker_mentions` (list), `chunk_index`, `total_chunks`.

---

### MVP4-R2 — RAG Document Ingestion Pipeline

**User Story:** As an operator, I want financial news and research automatically ingested into the vector store for RAG retrieval.

#### Acceptance Criteria

1. THE ingestion pipeline SHALL fetch articles from configurable RSS feeds (default: MoneyControl, Economic Times Markets, LiveMint Markets, BSE announcements).
2. THE pipeline SHALL chunk articles using `RecursiveCharacterTextSplitter` with chunk_size=512 and chunk_overlap=50 characters.
3. THE pipeline SHALL embed each chunk using OpenAI `text-embedding-3-small` (1536 dimensions).
4. THE pipeline SHALL generate BM25 sparse vectors for each chunk and store them alongside dense vectors in Pinecone (hybrid-ready).
5. THE pipeline SHALL run on a schedule (default: every 6 hours) via a background task (Celery or APScheduler).
6. THE pipeline SHALL expose `POST /api/v4/rag/ingest` (API key required) for manual trigger.
7. THE pipeline SHALL log: articles fetched, chunks created, vectors upserted, errors encountered, total duration, OpenAI tokens consumed.
8. `GET /api/v4/rag/pipeline/status` (API key required) SHALL return the last run timestamp, status, article count, chunk count, and error count.

---

### MVP4-R3 — Hybrid Retrieval (Dense + BM25)

**User Story:** As a system, I want to retrieve the most relevant documents using both semantic and keyword matching for accurate grounding.

#### Acceptance Criteria

1. THE retrieval system SHALL perform TWO searches per query: (a) dense vector search via Pinecone, (b) BM25 sparse search via Pinecone's hybrid search capability.
2. THE system SHALL merge results using Reciprocal Rank Fusion (RRF) with configurable weight: `alpha` for dense, `(1-alpha)` for sparse. Default alpha=0.7 (dense-heavy).
3. THE system SHALL return the top-k fused results (default k=10) with metadata and relevance scores.
4. THE `RAG_BM25_WEIGHT` env var SHALL control the sparse weight (default 0.3 = 30% BM25, 70% dense).
5. THE retrieval latency SHALL be logged per query and tracked in the evaluation dashboard.

---

### MVP4-R4 — AI-Powered Signal Explanations

**User Story:** As a trader, I want each stock's bullish score accompanied by an AI-generated explanation grounded in real financial news.

#### Acceptance Criteria

1. AFTER scoring a ticker, THE system SHALL automatically query the RAG pipeline with: "Why is {ticker} showing a {confidence} bullish signal based on recent news and market data?"
2. THE LLM (OpenAI GPT-4o-mini) SHALL generate a 2–4 sentence explanation using ONLY the retrieved context. If no relevant context is found, it SHALL state: "No recent news available for grounding."
3. Each explanation SHALL include citation references (source URL + title) for the retrieved documents used.
4. THE explanation SHALL be returned in the `POST /api/v1/analyze` response under a new `explanation` field per ticker.
5. THE Frontend SHALL display the explanation in the StockDetailDrawer below the indicator breakdown, with clickable citation links.
6. A `ENABLE_RAG_EXPLANATIONS` env var (default `true`) SHALL allow disabling explanations without code changes.

---

### MVP4-R5 — Conversational Ticker Q&A

**User Story:** As a trader, I want to ask free-text questions about stocks and get AI answers grounded in financial research.

#### Acceptance Criteria

1. THE Frontend SHALL render a "Ask AI" chat panel (Cloudscape Drawer, right side) accessible via a button on the AnalysisPage.
2. THE user SHALL type free-text questions (e.g., "Why is RELIANCE bullish?", "What news is driving TCS?", "Compare INFY vs WIPRO outlook").
3. THE Backend SHALL expose `POST /api/v4/rag/query` accepting `{question, tickers (optional), conversation_history (optional)}`.
4. THE system SHALL retrieve relevant chunks via hybrid search, pass them + conversation history to GPT-4o-mini, and return a grounded answer with citations.
5. Conversation history SHALL be maintained per browser session (max 10 turns) and sent with each request for multi-turn context.
6. THE response SHALL include: `answer` (string), `sources` (list of {url, title, relevance_score}), `tokens_used` (input + output).

---

### MVP4-R6 — RAG Evaluation Metrics

**User Story:** As an operator, I want to measure the quality of the RAG pipeline so I can identify and fix degradation.

#### Acceptance Criteria

1. THE system SHALL compute the following evaluation metrics using the `ragas` library on a labelled evaluation set:
   - **Retrieval Precision@k**: % of retrieved chunks that are relevant
   - **Retrieval Recall@k**: % of relevant chunks that were retrieved
   - **MRR (Mean Reciprocal Rank)**: Average reciprocal rank of the first relevant result
   - **Context Relevance**: Proportion of retrieved context that is relevant to the query (ragas metric)
   - **Answer Faithfulness**: Whether the generated answer is supported by the retrieved context (ragas metric)
   - **Answer Relevance**: Whether the generated answer addresses the user's question (ragas metric)
2. THE evaluation set SHALL contain at least 50 labelled question-answer pairs with ground-truth relevant documents.
3. THE evaluation SHALL run automatically after each ingestion pipeline completion.
4. THE evaluation results SHALL be stored in SQLite (`data/rag_eval.db`) with timestamp for historical tracking.
5. `GET /api/v4/rag/evaluation/latest` (API key required) SHALL return the most recent evaluation scores.
6. `GET /api/v4/rag/evaluation/history` (API key required) SHALL return evaluation scores over time.

---

### MVP4-R7 — RAG Evaluation Dashboard

**User Story:** As an operator, I want a visual dashboard showing RAG quality metrics over time.

#### Acceptance Criteria

1. THE Frontend SHALL include a "RAG Performance" tab in the Admin Dashboard with:
   - Line charts: Precision@k, Recall@k, MRR over time (Recharts LineChart)
   - Bar chart: Faithfulness and Relevance scores per evaluation run
   - Histogram: Retrieval latency distribution (p50, p95, p99)
   - Table: Per-query breakdown showing question, retrieved docs count, faithfulness score, answer relevance
2. THE dashboard SHALL show cost tracking: total OpenAI tokens consumed (embeddings + generation), estimated USD cost, Pinecone read/write units.
3. THE dashboard SHALL highlight degradation: if any metric drops >10% from the previous run, show an amber warning.
4. Auto-refresh every 5 minutes.

---

### MVP4-R8 — RAG Pipeline Orchestration

**User Story:** As an operator, I want the full RAG pipeline (ingest → chunk → embed → upsert → retrieve → generate → evaluate) configurable and monitorable.

#### Acceptance Criteria

1. THE pipeline configuration SHALL be stored in `config/rag_pipeline.yaml` with settings for: RSS feed URLs, chunk size, chunk overlap, embedding model, LLM model, top-k, BM25 weight, ingest interval, evaluation threshold.
2. THE pipeline SHALL be triggerable via: (a) scheduled background task, (b) `POST /api/v4/rag/ingest` manual trigger, (c) admin dashboard button.
3. THE pipeline status SHALL be queryable via `GET /api/v4/rag/pipeline/status` showing: `last_run`, `status` (idle/running/failed), `articles_ingested`, `chunks_created`, `vectors_upserted`, `eval_scores`, `duration_seconds`.
4. THE pipeline SHALL implement circuit breaker pattern: if OpenAI API fails 3 times consecutively, pause for 15 minutes before retrying.
5. ALL pipeline errors SHALL be logged at ERROR level with full context (stage, article URL, error message) and surfaced in the admin dashboard.