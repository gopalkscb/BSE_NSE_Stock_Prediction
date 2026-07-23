"""RAG pipeline API routes (v4)."""

import os
import time
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix='/api/v4/rag')

# Simple pipeline state tracker
_pipeline_state = {
    'status': 'idle',
    'last_run': None,
    'last_result': None,
}


class IngestResponse(BaseModel):
    status: str
    articles_fetched: int = 0
    chunks_created: int = 0
    vectors_upserted: int = 0
    errors: list[str] = Field(default_factory=list)
    duration_seconds: float = 0.0
    tokens_consumed: int = 0


class PipelineStatusResponse(BaseModel):
    status: str
    last_run: Optional[str] = None
    articles_ingested: int = 0
    chunks_created: int = 0
    vectors_upserted: int = 0
    duration_seconds: float = 0.0
    error_count: int = 0


def _verify_api_key(x_api_key: str = Header(None)):
    """Verify admin API key for protected endpoints."""
    expected = os.environ.get('ADMIN_API_KEY', '')
    if not expected or not x_api_key:
        raise HTTPException(status_code=401, detail='API key required')
    import hmac
    if not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail='Invalid API key')


@router.post('/ingest', response_model=IngestResponse,
             summary='Trigger RAG ingestion pipeline',
             description='Manually triggers the RSS ingestion pipeline. Requires API key.')
async def trigger_ingest(x_api_key: str = Header(None)):
    _verify_api_key(x_api_key)

    if _pipeline_state['status'] == 'running':
        raise HTTPException(status_code=409, detail='Pipeline already running')

    _pipeline_state['status'] = 'running'
    try:
        from src.rag.ingest import ArticleIngester
        ingester = ArticleIngester()
        result = ingester.run_pipeline()

        _pipeline_state['status'] = 'idle'
        _pipeline_state['last_run'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        _pipeline_state['last_result'] = result

        return IngestResponse(
            status='completed',
            articles_fetched=result.articles_fetched,
            chunks_created=result.chunks_created,
            vectors_upserted=result.vectors_upserted,
            errors=result.errors,
            duration_seconds=result.duration_seconds,
            tokens_consumed=result.tokens_consumed,
        )
    except Exception as e:
        _pipeline_state['status'] = 'failed'
        raise HTTPException(status_code=500, detail=f'Pipeline failed: {str(e)}')


@router.get('/pipeline/status', response_model=PipelineStatusResponse,
            summary='Get RAG pipeline status',
            description='Returns the last run status of the ingestion pipeline.')
async def pipeline_status(x_api_key: str = Header(None)):
    _verify_api_key(x_api_key)

    result = _pipeline_state.get('last_result')
    return PipelineStatusResponse(
        status=_pipeline_state['status'],
        last_run=_pipeline_state.get('last_run'),
        articles_ingested=result.articles_fetched if result else 0,
        chunks_created=result.chunks_created if result else 0,
        vectors_upserted=result.vectors_upserted if result else 0,
        duration_seconds=result.duration_seconds if result else 0.0,
        error_count=len(result.errors) if result else 0,
    )



# ─── Q&A Models & Endpoint ────────────────────────────────────────────────

class RAGQueryRequest(BaseModel):
    """Request body for conversational Q&A."""
    question: str = Field(..., min_length=3, max_length=1000)
    tickers: Optional[list[str]] = None
    conversation_history: Optional[list[dict]] = None


class RAGQueryResponse(BaseModel):
    """Response from Q&A endpoint."""
    answer: str
    sources: list[dict] = Field(default_factory=list)
    tokens_used: dict = Field(default_factory=dict)


@router.post('/query', response_model=RAGQueryResponse,
             summary='Ask AI about stocks',
             description='Conversational Q&A grounded in financial news via RAG retrieval.')
async def rag_query(request: RAGQueryRequest):
    """Process a free-text question using hybrid retrieval + GPT-4o-mini."""
    # Check required API keys
    if not os.environ.get('OPENAI_API_KEY'):
        raise HTTPException(
            status_code=503,
            detail='RAG service unavailable: OPENAI_API_KEY not configured. Add it to your .env file.'
        )
    if not os.environ.get('PINECONE_API_KEY'):
        raise HTTPException(
            status_code=503,
            detail='RAG service unavailable: PINECONE_API_KEY not configured. Add it to your .env file.'
        )

    try:
        from src.rag.retriever import HybridRetriever
        from src.rag.generator import RAGGenerator

        # Build query - include ticker context if provided
        query = request.question
        if request.tickers:
            query = f"{' '.join(request.tickers)}: {query}"

        # Retrieve relevant context
        retriever = HybridRetriever()
        chunks = retriever.retrieve(query)

        # Generate answer
        generator = RAGGenerator()
        result = generator.generate_answer(
            question=request.question,
            context_chunks=chunks,
            conversation_history=request.conversation_history,
        )

        return RAGQueryResponse(
            answer=result.answer,
            sources=result.sources,
            tokens_used=result.tokens_used,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'RAG query failed: {str(e)}')



# ─── Evaluation Endpoints ────────────────────────────────────────────────

class EvaluationResponse(BaseModel):
    """Single evaluation result."""
    id: Optional[int] = None
    timestamp: Optional[str] = None
    precision_at_k: float = 0.0
    recall_at_k: float = 0.0
    mrr: float = 0.0
    context_relevance: float = 0.0
    answer_faithfulness: float = 0.0
    answer_relevance: float = 0.0
    total_queries: int = 0
    duration_seconds: float = 0.0
    tokens_consumed: int = 0
    cost_usd: float = 0.0


class EvaluationHistoryResponse(BaseModel):
    """List of evaluation results."""
    results: list[EvaluationResponse] = Field(default_factory=list)
    degradation: Optional[dict] = None


@router.get('/evaluation/latest', response_model=EvaluationResponse,
            summary='Get latest RAG evaluation',
            description='Returns the most recent evaluation scores. Returns zeroed metrics if no evaluation has run yet.')
async def evaluation_latest():
    from src.rag.eval_store import get_latest_evaluation, init_eval_db
    await init_eval_db()
    result = await get_latest_evaluation()
    if not result:
        # Return default empty evaluation instead of 404
        return EvaluationResponse(
            timestamp=None,
            precision_at_k=0.0,
            recall_at_k=0.0,
            mrr=0.0,
            context_relevance=0.0,
            answer_faithfulness=0.0,
            answer_relevance=0.0,
            total_queries=0,
            duration_seconds=0.0,
            tokens_consumed=0,
            cost_usd=0.0,
        )
    return EvaluationResponse(**result)


@router.get('/evaluation/history', response_model=EvaluationHistoryResponse,
            summary='Get RAG evaluation history',
            description='Returns evaluation scores over time.')
async def evaluation_history(limit: int = 50):
    from src.rag.eval_store import get_evaluation_history, get_degradation_check, init_eval_db
    await init_eval_db()
    results = await get_evaluation_history(limit)
    degradation = await get_degradation_check()
    return EvaluationHistoryResponse(
        results=[EvaluationResponse(**r) for r in results],
        degradation=degradation,
    )


class QueryMetricResponse(BaseModel):
    """Per-query evaluation metric."""
    id: Optional[int] = None
    eval_id: Optional[int] = None
    query: str = ''
    precision_at_k: float = 0.0
    recall_at_k: float = 0.0
    mrr: float = 0.0
    faithfulness: float = 0.0
    answer_relevance: float = 0.0
    context_relevance: float = 0.0
    retrieved_count: int = 0
    tokens_used: int = 0


@router.get('/evaluation/queries', response_model=list[QueryMetricResponse],
            summary='Get per-query evaluation breakdown',
            description='Returns per-query metrics for the latest (or specified) evaluation run.')
async def evaluation_queries(eval_id: Optional[int] = None):
    from src.rag.eval_store import get_query_results, init_eval_db
    await init_eval_db()
    results = await get_query_results(eval_id)
    return [QueryMetricResponse(**r) for r in results]
