"""RAG Evaluation: precision@k, recall@k, MRR, faithfulness, relevance."""

import os
import json
import time
import structlog
from dataclasses import dataclass, field

logger = structlog.get_logger(__name__)


@dataclass
class EvalSample:
    """A labelled evaluation sample."""
    query: str
    expected_answer: str
    relevant_doc_ids: list[str] = field(default_factory=list)
    relevant_keywords: list[str] = field(default_factory=list)


@dataclass
class RetrievalMetrics:
    """Retrieval quality metrics."""
    precision_at_k: float = 0.0
    recall_at_k: float = 0.0
    mrr: float = 0.0


@dataclass
class GenerationMetrics:
    """Generation quality metrics."""
    faithfulness: float = 0.0
    answer_relevance: float = 0.0
    context_relevance: float = 0.0


@dataclass
class EvaluationResult:
    """Complete evaluation result."""
    timestamp: str
    precision_at_k: float
    recall_at_k: float
    mrr: float
    context_relevance: float
    answer_faithfulness: float
    answer_relevance: float
    total_queries: int
    duration_seconds: float
    tokens_consumed: int = 0
    cost_usd: float = 0.0


class RAGEvaluator:
    """Evaluates the RAG pipeline quality using labelled samples."""

    def __init__(self, eval_set_path: str = None):
        self.eval_set_path = eval_set_path or os.path.join('data', 'rag_eval_set.json')

    def load_eval_set(self) -> list[EvalSample]:
        """Load the labelled evaluation set from JSON."""
        try:
            with open(self.eval_set_path, 'r') as f:
                data = json.load(f)
            samples = [
                EvalSample(
                    query=item['query'],
                    expected_answer=item.get('expected_answer', ''),
                    relevant_doc_ids=item.get('relevant_doc_ids', []),
                    relevant_keywords=item.get('relevant_keywords', []),
                )
                for item in data.get('samples', [])
            ]
            logger.info('eval_set_loaded', count=len(samples))
            return samples
        except FileNotFoundError:
            logger.warning('eval_set_not_found', path=self.eval_set_path)
            return []
        except Exception as e:
            logger.error('eval_set_load_failed', error=str(e))
            return []

    def compute_retrieval_metrics(
        self, 
        samples: list[EvalSample], 
        retrieved_results: list[list[dict]],
        k: int = 10,
    ) -> RetrievalMetrics:
        """
        Compute retrieval metrics: precision@k, recall@k, MRR.
        
        Args:
            samples: Evaluation samples with ground truth.
            retrieved_results: List of retrieved doc lists per sample.
            k: Cutoff for metrics.
        """
        if not samples or not retrieved_results:
            return RetrievalMetrics()

        precisions = []
        recalls = []
        reciprocal_ranks = []

        for sample, retrieved in zip(samples, retrieved_results):
            # Get top-k retrieved IDs
            retrieved_ids = [r.get('id', '') for r in retrieved[:k]]
            relevant_ids = set(sample.relevant_doc_ids)
            
            if not relevant_ids:
                # If no explicit relevant IDs, use keyword matching
                relevant_count = 0
                for r in retrieved[:k]:
                    text = r.get('text', '').lower()
                    if any(kw.lower() in text for kw in sample.relevant_keywords):
                        relevant_count += 1
                precision = relevant_count / k if k > 0 else 0
                recall = relevant_count / max(len(sample.relevant_keywords), 1)
                rr = 1.0 / (1) if relevant_count > 0 else 0  # Simplified
            else:
                # Standard precision/recall
                hits = set(retrieved_ids) & relevant_ids
                precision = len(hits) / k if k > 0 else 0
                recall = len(hits) / len(relevant_ids) if relevant_ids else 0
                
                # MRR: find first relevant result
                rr = 0.0
                for rank, rid in enumerate(retrieved_ids, 1):
                    if rid in relevant_ids:
                        rr = 1.0 / rank
                        break

            precisions.append(precision)
            recalls.append(recall)
            reciprocal_ranks.append(rr)

        return RetrievalMetrics(
            precision_at_k=round(sum(precisions) / len(precisions), 4) if precisions else 0,
            recall_at_k=round(sum(recalls) / len(recalls), 4) if recalls else 0,
            mrr=round(sum(reciprocal_ranks) / len(reciprocal_ranks), 4) if reciprocal_ranks else 0,
        )

    def compute_generation_metrics(
        self,
        samples: list[EvalSample],
        generated_answers: list[str],
        context_texts: list[list[str]],
    ) -> GenerationMetrics:
        """
        Compute generation metrics: faithfulness, answer relevance, context relevance.
        
        Uses keyword overlap as a simplified proxy for ragas metrics.
        In production, this would use the ragas library for LLM-based evaluation.
        """
        if not samples or not generated_answers:
            return GenerationMetrics()

        faithfulness_scores = []
        answer_relevance_scores = []
        context_relevance_scores = []

        for sample, answer, contexts in zip(samples, generated_answers, context_texts):
            # Faithfulness: how much of the answer is grounded in context
            answer_tokens = set(answer.lower().split())
            context_tokens = set(' '.join(contexts).lower().split())
            if answer_tokens:
                faith = len(answer_tokens & context_tokens) / len(answer_tokens)
            else:
                faith = 0.0
            faithfulness_scores.append(min(faith * 1.5, 1.0))  # Scale up

            # Answer relevance: how well does the answer address the question
            question_tokens = set(sample.query.lower().split())
            if question_tokens:
                relevance = len(answer_tokens & question_tokens) / len(question_tokens)
            else:
                relevance = 0.0
            answer_relevance_scores.append(min(relevance * 2.0, 1.0))

            # Context relevance: how relevant are retrieved contexts to the query
            if context_tokens and question_tokens:
                ctx_rel = len(context_tokens & question_tokens) / len(question_tokens)
            else:
                ctx_rel = 0.0
            context_relevance_scores.append(min(ctx_rel * 2.0, 1.0))

        return GenerationMetrics(
            faithfulness=round(sum(faithfulness_scores) / len(faithfulness_scores), 4),
            answer_relevance=round(sum(answer_relevance_scores) / len(answer_relevance_scores), 4),
            context_relevance=round(sum(context_relevance_scores) / len(context_relevance_scores), 4),
        )

    def run_evaluation(self) -> EvaluationResult | None:
        """
        Run the full evaluation pipeline:
        1. Load eval set
        2. Retrieve for each query
        3. Generate answers
        4. Compute metrics
        5. Return results
        """
        start = time.time()
        
        samples = self.load_eval_set()
        if not samples:
            logger.warning('evaluation_skipped', reason='no eval samples')
            return None

        from src.rag.retriever import HybridRetriever
        from src.rag.generator import RAGGenerator

        retriever = HybridRetriever()
        generator = RAGGenerator()
        
        retrieved_results = []
        generated_answers = []
        context_texts = []
        total_tokens = 0

        for sample in samples:
            # Retrieve
            chunks = retriever.retrieve(sample.query)
            retrieved_results.append([
                {'id': c.id, 'text': c.text, 'score': c.score}
                for c in chunks
            ])

            # Generate
            answer = generator.generate_answer(
                question=sample.query,
                context_chunks=chunks,
            )
            generated_answers.append(answer.answer)
            context_texts.append([c.text for c in chunks])
            total_tokens += answer.tokens_used.get('input', 0) + answer.tokens_used.get('output', 0)

        # Compute metrics
        retrieval_metrics = self.compute_retrieval_metrics(samples, retrieved_results)
        generation_metrics = self.compute_generation_metrics(samples, generated_answers, context_texts)

        duration = round(time.time() - start, 2)
        
        # Estimate cost (GPT-4o-mini: ~$0.15/1M input, ~$0.60/1M output)
        cost_usd = round(total_tokens * 0.0000004, 4)  # Rough average

        result = EvaluationResult(
            timestamp=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            precision_at_k=retrieval_metrics.precision_at_k,
            recall_at_k=retrieval_metrics.recall_at_k,
            mrr=retrieval_metrics.mrr,
            context_relevance=generation_metrics.context_relevance,
            answer_faithfulness=generation_metrics.faithfulness,
            answer_relevance=generation_metrics.answer_relevance,
            total_queries=len(samples),
            duration_seconds=duration,
            tokens_consumed=total_tokens,
            cost_usd=cost_usd,
        )

        logger.info('evaluation_complete', 
                    precision=result.precision_at_k,
                    recall=result.recall_at_k,
                    mrr=result.mrr,
                    faithfulness=result.answer_faithfulness,
                    duration=duration)

        return result
