"""RAG Pipeline Orchestrator: scheduled ingestion + circuit breaker."""

import os
import time
import structlog
from datetime import datetime, timedelta
from dataclasses import dataclass, field

logger = structlog.get_logger(__name__)


@dataclass
class CircuitBreakerState:
    """Tracks consecutive failures for circuit breaker pattern."""
    failure_count: int = 0
    last_failure_time: float = 0.0
    is_open: bool = False
    cooldown_seconds: int = 900  # 15 minutes
    threshold: int = 3  # Open after 3 consecutive failures

    def record_failure(self):
        """Record a failure. Opens circuit if threshold reached."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.threshold:
            self.is_open = True
            logger.warning('circuit_breaker_opened', 
                          failures=self.failure_count,
                          cooldown_sec=self.cooldown_seconds)

    def record_success(self):
        """Record a success. Resets the failure counter."""
        self.failure_count = 0
        self.is_open = False

    def can_proceed(self) -> bool:
        """Check if the circuit allows proceeding."""
        if not self.is_open:
            return True
        # Check if cooldown has elapsed
        elapsed = time.time() - self.last_failure_time
        if elapsed >= self.cooldown_seconds:
            logger.info('circuit_breaker_half_open', elapsed_sec=round(elapsed))
            return True  # Allow one attempt (half-open)
        return False


class PipelineOrchestrator:
    """
    Orchestrates the RAG pipeline:
    - Scheduled ingestion (APScheduler)
    - Circuit breaker for OpenAI failures
    - Auto-trigger evaluation after ingest
    """

    def __init__(self):
        self.circuit_breaker = CircuitBreakerState()
        self.scheduler = None
        self._running = False
        self.last_run_result = None
        self.last_run_time = None

    def start_scheduler(self):
        """Start the APScheduler for periodic ingestion."""
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.triggers.interval import IntervalTrigger

            interval_hours = int(os.environ.get('RAG_INGEST_INTERVAL_HOURS', '6'))
            
            self.scheduler = BackgroundScheduler()
            self.scheduler.add_job(
                self.run_pipeline,
                trigger=IntervalTrigger(hours=interval_hours),
                id='rag_ingest_pipeline',
                name='RAG Ingestion Pipeline',
                replace_existing=True,
            )
            self.scheduler.start()
            logger.info('scheduler_started', interval_hours=interval_hours)
        except Exception as e:
            logger.error('scheduler_start_failed', error=str(e))

    def stop_scheduler(self):
        """Stop the scheduler gracefully."""
        if self.scheduler:
            self.scheduler.shutdown(wait=False)
            logger.info('scheduler_stopped')

    def run_pipeline(self) -> dict:
        """
        Run the full pipeline: ingest → evaluate.
        Respects circuit breaker state.
        """
        if self._running:
            logger.warning('pipeline_already_running')
            return {'status': 'already_running'}

        if not self.circuit_breaker.can_proceed():
            remaining = self.circuit_breaker.cooldown_seconds - (
                time.time() - self.circuit_breaker.last_failure_time
            )
            logger.warning('circuit_breaker_blocking', remaining_sec=round(remaining))
            return {
                'status': 'circuit_open',
                'retry_after_seconds': round(remaining),
            }

        self._running = True
        self.last_run_time = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        
        try:
            # Step 1: Run ingestion
            from src.rag.ingest import ArticleIngester
            ingester = ArticleIngester()
            ingest_result = ingester.run_pipeline()

            self.circuit_breaker.record_success()
            
            # Step 2: Run evaluation (if configured)
            eval_result = None
            try:
                from src.rag.evaluator import RAGEvaluator
                evaluator = RAGEvaluator()
                eval_result = evaluator.run_evaluation()
                
                # Store evaluation results
                if eval_result:
                    import asyncio
                    from src.rag.eval_store import store_evaluation, init_eval_db
                    
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        loop.run_until_complete(init_eval_db())
                        loop.run_until_complete(store_evaluation(eval_result))
                    finally:
                        loop.close()
                    
            except Exception as e:
                logger.error('post_ingest_evaluation_failed', error=str(e))

            self.last_run_result = {
                'status': 'completed',
                'ingest': {
                    'articles_fetched': ingest_result.articles_fetched,
                    'chunks_created': ingest_result.chunks_created,
                    'vectors_upserted': ingest_result.vectors_upserted,
                    'duration_seconds': ingest_result.duration_seconds,
                    'tokens_consumed': ingest_result.tokens_consumed,
                },
                'evaluation': {
                    'precision_at_k': eval_result.precision_at_k if eval_result else None,
                    'recall_at_k': eval_result.recall_at_k if eval_result else None,
                    'mrr': eval_result.mrr if eval_result else None,
                    'faithfulness': eval_result.answer_faithfulness if eval_result else None,
                } if eval_result else None,
                'timestamp': self.last_run_time,
            }

            logger.info('pipeline_orchestration_complete', result=self.last_run_result)
            return self.last_run_result

        except Exception as e:
            self.circuit_breaker.record_failure()
            self.last_run_result = {
                'status': 'failed',
                'error': str(e),
                'circuit_breaker': {
                    'failure_count': self.circuit_breaker.failure_count,
                    'is_open': self.circuit_breaker.is_open,
                },
                'timestamp': self.last_run_time,
            }
            logger.error('pipeline_orchestration_failed', error=str(e))
            return self.last_run_result

        finally:
            self._running = False

    def get_status(self) -> dict:
        """Get the current orchestrator status."""
        return {
            'scheduler_running': self.scheduler is not None and self.scheduler.running if self.scheduler else False,
            'pipeline_running': self._running,
            'last_run_time': self.last_run_time,
            'last_run_result': self.last_run_result,
            'circuit_breaker': {
                'is_open': self.circuit_breaker.is_open,
                'failure_count': self.circuit_breaker.failure_count,
                'cooldown_seconds': self.circuit_breaker.cooldown_seconds,
            },
        }


# Global singleton
_orchestrator: PipelineOrchestrator | None = None


def get_orchestrator() -> PipelineOrchestrator:
    """Get or create the global orchestrator instance."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = PipelineOrchestrator()
    return _orchestrator
