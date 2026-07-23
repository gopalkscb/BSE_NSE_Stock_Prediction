"""Tests for src/rag/evaluator.py — RAG evaluation metrics."""

import pytest
from src.rag.evaluator import RAGEvaluator, EvalSample, RetrievalMetrics, GenerationMetrics


class TestRetrievalMetrics:
    def setup_method(self):
        self.evaluator = RAGEvaluator(eval_set_path='nonexistent.json')

    def test_empty_inputs(self):
        result = self.evaluator.compute_retrieval_metrics([], [])
        assert result.precision_at_k == 0.0
        assert result.recall_at_k == 0.0
        assert result.mrr == 0.0

    def test_perfect_precision(self):
        samples = [
            EvalSample(
                query='test query',
                expected_answer='answer',
                relevant_doc_ids=['d1', 'd2'],
            )
        ]
        retrieved = [[
            {'id': 'd1', 'text': 'doc 1'},
            {'id': 'd2', 'text': 'doc 2'},
            {'id': 'd3', 'text': 'doc 3'},
        ]]
        result = self.evaluator.compute_retrieval_metrics(samples, retrieved, k=3)
        # 2 relevant out of 3 retrieved
        assert result.precision_at_k == pytest.approx(2/3, abs=0.01)
        # 2 out of 2 relevant found
        assert result.recall_at_k == 1.0
        # First relevant at rank 1
        assert result.mrr == 1.0

    def test_no_relevant_found(self):
        samples = [
            EvalSample(
                query='test',
                expected_answer='answer',
                relevant_doc_ids=['d10'],
            )
        ]
        retrieved = [[
            {'id': 'd1', 'text': 'doc 1'},
            {'id': 'd2', 'text': 'doc 2'},
        ]]
        result = self.evaluator.compute_retrieval_metrics(samples, retrieved, k=2)
        assert result.precision_at_k == 0.0
        assert result.recall_at_k == 0.0
        assert result.mrr == 0.0

    def test_keyword_matching_fallback(self):
        samples = [
            EvalSample(
                query='RELIANCE earnings',
                expected_answer='Strong earnings',
                relevant_doc_ids=[],
                relevant_keywords=['RELIANCE', 'earnings'],
            )
        ]
        retrieved = [[
            {'id': 'd1', 'text': 'RELIANCE reported strong earnings growth'},
            {'id': 'd2', 'text': 'Market overview today'},
        ]]
        result = self.evaluator.compute_retrieval_metrics(samples, retrieved, k=2)
        assert result.precision_at_k > 0


class TestGenerationMetrics:
    def setup_method(self):
        self.evaluator = RAGEvaluator(eval_set_path='nonexistent.json')

    def test_empty_inputs(self):
        result = self.evaluator.compute_generation_metrics([], [], [])
        assert result.faithfulness == 0.0

    def test_faithful_answer(self):
        samples = [EvalSample(query='What about TCS?', expected_answer='TCS earnings')]
        answers = ['TCS reported strong quarterly earnings growth']
        contexts = [['TCS quarterly earnings were strong this quarter']]
        result = self.evaluator.compute_generation_metrics(samples, answers, contexts)
        assert result.faithfulness > 0

    def test_irrelevant_answer(self):
        samples = [EvalSample(query='What about TCS?', expected_answer='TCS')]
        answers = ['Completely unrelated random gibberish xyz abc']
        contexts = [['TCS quarterly earnings were strong']]
        result = self.evaluator.compute_generation_metrics(samples, answers, contexts)
        # Low faithfulness since answer doesn't overlap with context
        assert result.faithfulness < 0.8


class TestLoadEvalSet:
    def test_missing_file(self):
        evaluator = RAGEvaluator(eval_set_path='nonexistent.json')
        samples = evaluator.load_eval_set()
        assert samples == []
