"""Tests for embedding and sparse vector generation in src/rag/ingest.py."""

import pytest
from unittest.mock import patch, MagicMock
from src.rag.ingest import ArticleIngester, Chunk


@pytest.fixture
def sample_chunks():
    return [
        Chunk(text='RELIANCE Q3 results beat estimates', metadata={}, chunk_index=0, total_chunks=2),
        Chunk(text='TCS announced dividend payout', metadata={}, chunk_index=1, total_chunks=2),
    ]


class TestEmbedding:
    @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
    @patch('openai.OpenAI')
    def test_embed_chunks_returns_vectors(self, mock_openai_cls, sample_chunks):
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_response = MagicMock()
        mock_response.data = [
            MagicMock(embedding=[0.1] * 1536),
            MagicMock(embedding=[0.2] * 1536),
        ]
        mock_response.usage.total_tokens = 50
        mock_client.embeddings.create.return_value = mock_response

        ingester = ArticleIngester(config_path='config/rag_pipeline.yaml')
        embeddings, tokens = ingester.embed_chunks(sample_chunks)

        assert len(embeddings) == 2
        assert len(embeddings[0]) == 1536
        assert tokens == 50

    @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
    @patch('openai.OpenAI')
    def test_embed_chunks_handles_failure(self, mock_openai_cls, sample_chunks):
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_client.embeddings.create.side_effect = Exception('API error')

        ingester = ArticleIngester(config_path='config/rag_pipeline.yaml')
        embeddings, tokens = ingester.embed_chunks(sample_chunks)

        # Should return zero vectors on failure
        assert len(embeddings) == 2
        assert embeddings[0] == [0.0] * 1536


class TestSparseVectors:
    def test_generate_sparse_vectors(self, sample_chunks):
        ingester = ArticleIngester(config_path='config/rag_pipeline.yaml')
        sparse = ingester.generate_sparse_vectors(sample_chunks)

        assert len(sparse) == 2
        assert 'indices' in sparse[0]
        assert 'values' in sparse[0]
        assert len(sparse[0]['indices']) > 0
        assert len(sparse[0]['indices']) == len(sparse[0]['values'])

    def test_sparse_vectors_empty_input(self):
        ingester = ArticleIngester(config_path='config/rag_pipeline.yaml')
        sparse = ingester.generate_sparse_vectors([])
        assert sparse == []

    def test_sparse_values_are_normalized(self, sample_chunks):
        ingester = ArticleIngester(config_path='config/rag_pipeline.yaml')
        sparse = ingester.generate_sparse_vectors(sample_chunks)

        for sv in sparse:
            for val in sv['values']:
                assert 0 <= val <= 1.0
