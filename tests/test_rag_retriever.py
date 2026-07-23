"""Tests for src/rag/retriever.py — hybrid retrieval + RRF."""

import pytest
from src.rag.retriever import HybridRetriever, RetrievedChunk


class TestReciprocalRankFusion:
    def setup_method(self):
        self.retriever = HybridRetriever(alpha=0.7, top_k=10)

    def test_rrf_empty_inputs(self):
        result = self.retriever.reciprocal_rank_fusion([], [])
        assert result == []

    def test_rrf_dense_only(self):
        dense = [
            RetrievedChunk(id='a', text='doc a', score=0.9),
            RetrievedChunk(id='b', text='doc b', score=0.8),
        ]
        result = self.retriever.reciprocal_rank_fusion(dense, [])
        assert len(result) == 2
        assert result[0].id == 'a'
        assert result[1].id == 'b'

    def test_rrf_sparse_only(self):
        sparse = [
            RetrievedChunk(id='x', text='doc x', score=0.7),
            RetrievedChunk(id='y', text='doc y', score=0.6),
        ]
        result = self.retriever.reciprocal_rank_fusion([], sparse)
        assert len(result) == 2
        assert result[0].id == 'x'

    def test_rrf_merged_results(self):
        dense = [
            RetrievedChunk(id='a', text='doc a', score=0.9),
            RetrievedChunk(id='b', text='doc b', score=0.8),
            RetrievedChunk(id='c', text='doc c', score=0.7),
        ]
        sparse = [
            RetrievedChunk(id='b', text='doc b', score=0.85),
            RetrievedChunk(id='d', text='doc d', score=0.75),
            RetrievedChunk(id='a', text='doc a', score=0.65),
        ]
        result = self.retriever.reciprocal_rank_fusion(dense, sparse)
        # b appears in both so should rank highly
        ids = [r.id for r in result]
        assert 'a' in ids
        assert 'b' in ids
        assert 'c' in ids
        assert 'd' in ids

    def test_rrf_scores_are_positive(self):
        dense = [RetrievedChunk(id=f'd{i}', text=f'doc {i}', score=0.5) for i in range(5)]
        sparse = [RetrievedChunk(id=f's{i}', text=f'sparse {i}', score=0.4) for i in range(5)]
        result = self.retriever.reciprocal_rank_fusion(dense, sparse)
        for r in result:
            assert r.score > 0

    def test_rrf_respects_alpha(self):
        dense = [RetrievedChunk(id='only_dense', text='dense only', score=0.9)]
        sparse = [RetrievedChunk(id='only_sparse', text='sparse only', score=0.9)]
        # High alpha = dense-heavy
        result_dense = self.retriever.reciprocal_rank_fusion(dense, sparse, alpha=0.9)
        assert result_dense[0].id == 'only_dense'
        # Low alpha = sparse-heavy
        result_sparse = self.retriever.reciprocal_rank_fusion(dense, sparse, alpha=0.1)
        assert result_sparse[0].id == 'only_sparse'

    def test_rrf_deduplicates(self):
        dense = [RetrievedChunk(id='same', text='same doc', score=0.9)]
        sparse = [RetrievedChunk(id='same', text='same doc', score=0.8)]
        result = self.retriever.reciprocal_rank_fusion(dense, sparse)
        assert len(result) == 1
        assert result[0].id == 'same'


class TestHybridRetrieverInit:
    def test_default_alpha(self):
        r = HybridRetriever()
        assert r.alpha == 0.7  # 1 - 0.3 (default BM25 weight)

    def test_custom_alpha(self):
        r = HybridRetriever(alpha=0.5)
        assert r.alpha == 0.5

    def test_default_top_k(self):
        r = HybridRetriever()
        assert r.top_k == 10
