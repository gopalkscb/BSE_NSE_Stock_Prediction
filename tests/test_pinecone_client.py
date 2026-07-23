"""Tests for src/rag/pinecone_client.py (mocked)."""

import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture
def mock_pinecone():
    with patch('src.rag.pinecone_client.Pinecone') as mock:
        instance = MagicMock()
        mock.return_value = instance
        yield instance


class TestPineconeClient:
    @patch.dict('os.environ', {'PINECONE_API_KEY': 'test-key'})
    def test_init_reads_env(self, mock_pinecone):
        from src.rag.pinecone_client import PineconeClient
        client = PineconeClient()
        assert client is not None

    @patch.dict('os.environ', {'PINECONE_API_KEY': 'test-key'})
    def test_get_or_create_index_existing(self, mock_pinecone):
        from src.rag.pinecone_client import PineconeClient
        mock_pinecone.list_indexes.return_value.names.return_value = ['bse-nse-research']
        mock_pinecone.Index.return_value = MagicMock()
        client = PineconeClient()
        index = client.get_or_create_index()
        assert index is not None

    @patch.dict('os.environ', {'PINECONE_API_KEY': 'test-key'})
    def test_upsert_vectors_batches(self, mock_pinecone):
        from src.rag.pinecone_client import PineconeClient
        mock_index = MagicMock()
        mock_pinecone.Index.return_value = mock_index
        mock_pinecone.list_indexes.return_value.names.return_value = ['bse-nse-research']

        client = PineconeClient()
        client.get_or_create_index()

        vectors = [{'id': f'v{i}', 'values': [0.1] * 1536} for i in range(5)]
        result = client.upsert_vectors(vectors, 'news')
        assert result >= 0

    @patch.dict('os.environ', {'PINECONE_API_KEY': 'test-key'})
    def test_delete_namespace(self, mock_pinecone):
        from src.rag.pinecone_client import PineconeClient
        mock_index = MagicMock()
        mock_pinecone.Index.return_value = mock_index
        mock_pinecone.list_indexes.return_value.names.return_value = ['bse-nse-research']

        client = PineconeClient()
        client.get_or_create_index()
        client.delete_namespace('news')
        # Should not raise

    @patch.dict('os.environ', {'PINECONE_API_KEY': 'test-key'})
    def test_query_vectors(self, mock_pinecone):
        from src.rag.pinecone_client import PineconeClient
        mock_index = MagicMock()
        mock_index.query.return_value = MagicMock(matches=[])
        mock_pinecone.Index.return_value = mock_index
        mock_pinecone.list_indexes.return_value.names.return_value = ['bse-nse-research']

        client = PineconeClient()
        client.get_or_create_index()
        results = client.query_vectors([0.1] * 1536, top_k=5, namespace='news')
        assert isinstance(results, list)
