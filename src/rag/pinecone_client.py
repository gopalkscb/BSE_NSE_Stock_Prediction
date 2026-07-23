"""Pinecone vector store client for RAG pipeline."""

import os
import structlog
from pinecone import Pinecone, ServerlessSpec

logger = structlog.get_logger(__name__)


class PineconeClient:
    """Client for Pinecone vector database operations."""

    def __init__(self):
        self.api_key = os.environ.get('PINECONE_API_KEY', '')
        self.index_name = os.environ.get('PINECONE_INDEX_NAME', 'bse-nse-research')
        self.multi_index = os.environ.get('PINECONE_MULTI_INDEX', 'false').lower() == 'true'

        if not self.api_key:
            logger.warning('pinecone_api_key_missing')

        self._pc = Pinecone(api_key=self.api_key)
        self._index = None

    def get_or_create_index(self):
        """Create index if it doesn't exist, then return a reference to it."""
        try:
            existing_indexes = [idx.name for idx in self._pc.list_indexes()]
            if self.index_name not in existing_indexes:
                logger.info('creating_pinecone_index', name=self.index_name)
                self._pc.create_index(
                    name=self.index_name,
                    dimension=1536,
                    metric='cosine',
                    spec=ServerlessSpec(cloud='aws', region='us-east-1'),
                )
            self._index = self._pc.Index(self.index_name)
            logger.info('pinecone_index_ready', name=self.index_name)
            return self._index
        except Exception as e:
            logger.error('pinecone_index_error', error=str(e))
            raise

    def _get_index(self):
        """Get or lazily create the index reference."""
        if self._index is None:
            self.get_or_create_index()
        return self._index

    def delete_namespace(self, namespace: str) -> None:
        """Delete all vectors in a namespace (delete-and-replace strategy)."""
        try:
            index = self._get_index()
            index.delete(delete_all=True, namespace=namespace)
            logger.info('namespace_deleted', namespace=namespace)
        except Exception as e:
            logger.error('namespace_delete_failed', namespace=namespace, error=str(e))

    def upsert_vectors(self, vectors: list[dict], namespace: str) -> int:
        """Batch upsert vectors (100 per batch). Returns total upserted count."""
        try:
            index = self._get_index()
            batch_size = 100
            total_upserted = 0

            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                response = index.upsert(vectors=batch, namespace=namespace)
                total_upserted += response.upserted_count
                logger.debug('batch_upserted', batch_start=i, count=len(batch))

            logger.info('upsert_complete', total=total_upserted, namespace=namespace)
            return total_upserted
        except Exception as e:
            logger.error('upsert_failed', namespace=namespace, error=str(e))
            return 0

    def query_vectors(
        self,
        query_vector: list[float],
        top_k: int = 10,
        namespace: str = 'news',
        filter_dict: dict = None,
        sparse_vector: dict = None,
    ) -> list[dict]:
        """Query vectors with optional sparse vector for hybrid search."""
        try:
            index = self._get_index()
            kwargs = {
                'vector': query_vector,
                'top_k': top_k,
                'namespace': namespace,
                'include_metadata': True,
            }
            if filter_dict:
                kwargs['filter'] = filter_dict
            if sparse_vector:
                kwargs['sparse_vector'] = sparse_vector

            response = index.query(**kwargs)
            results = []
            for match in response.matches:
                results.append({
                    'id': match.id,
                    'score': match.score,
                    'metadata': match.metadata or {},
                })
            logger.info('query_complete', top_k=top_k, results=len(results), namespace=namespace)
            return results
        except Exception as e:
            logger.error('query_failed', namespace=namespace, error=str(e))
            return []

    def get_index_stats(self) -> dict:
        """Get index statistics (namespaces, vector counts, dimension)."""
        try:
            index = self._get_index()
            stats = index.describe_index_stats()
            return {
                'dimension': stats.dimension,
                'total_vector_count': stats.total_vector_count,
                'namespaces': {
                    ns: {'vector_count': ns_stats.vector_count}
                    for ns, ns_stats in (stats.namespaces or {}).items()
                },
            }
        except Exception as e:
            logger.error('stats_failed', error=str(e))
            return {}
