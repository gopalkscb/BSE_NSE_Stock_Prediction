"""Hybrid retriever: dense (OpenAI) + sparse (BM25) + Reciprocal Rank Fusion."""

import os
import structlog
from dataclasses import dataclass, field
from openai import OpenAI

logger = structlog.get_logger(__name__)


@dataclass
class RetrievedChunk:
    """A chunk retrieved from Pinecone with relevance score."""
    id: str
    text: str
    score: float
    metadata: dict = field(default_factory=dict)


class HybridRetriever:
    """Performs hybrid retrieval using dense + sparse vectors with RRF fusion."""

    def __init__(self, alpha: float = None, top_k: int = None):
        """
        Args:
            alpha: Weight for dense results (1-alpha = sparse weight).
                   Default from RAG_BM25_WEIGHT env var (dense = 1 - bm25_weight).
            top_k: Number of results to return. Default from RAG_TOP_K env var.
        """
        bm25_weight = float(os.environ.get('RAG_BM25_WEIGHT', '0.3'))
        self.alpha = alpha if alpha is not None else (1.0 - bm25_weight)
        self.top_k = top_k or int(os.environ.get('RAG_TOP_K', '10'))
        self._openai_client = None
        self._pinecone_client = None

    @property
    def openai_client(self):
        if self._openai_client is None:
            self._openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        return self._openai_client

    @property
    def pinecone_client(self):
        if self._pinecone_client is None:
            from src.rag.pinecone_client import PineconeClient
            self._pinecone_client = PineconeClient()
        return self._pinecone_client

    def _embed_query(self, query: str) -> list[float]:
        """Embed a query string using OpenAI."""
        model = os.environ.get('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small')
        response = self.openai_client.embeddings.create(input=[query], model=model)
        return response.data[0].embedding

    def _build_sparse_query(self, query: str) -> dict:
        """Build a sparse query vector from query tokens."""
        tokens = query.lower().split()
        # Simple term-frequency based sparse vector
        token_counts = {}
        for token in tokens:
            token_counts[token] = token_counts.get(token, 0) + 1
        
        indices = []
        values = []
        for token, count in token_counts.items():
            # Use hash as index (consistent with upsert)
            idx = abs(hash(token)) % 100000
            tf = count / len(tokens) if tokens else 0
            indices.append(idx)
            values.append(round(tf, 4))
        
        return {'indices': indices, 'values': values}

    def dense_search(self, query: str, top_k: int = None, namespace: str = 'news') -> list[RetrievedChunk]:
        """Perform dense (semantic) vector search."""
        k = top_k or self.top_k
        try:
            query_vector = self._embed_query(query)
            results = self.pinecone_client.query_vectors(
                query_vector=query_vector,
                top_k=k,
                namespace=namespace,
            )
            return [
                RetrievedChunk(
                    id=r.get('id', ''),
                    text=r.get('metadata', {}).get('text', ''),
                    score=r.get('score', 0.0),
                    metadata=r.get('metadata', {}),
                )
                for r in results
            ]
        except Exception as e:
            logger.error('dense_search_failed', error=str(e))
            return []

    def sparse_search(self, query: str, top_k: int = None, namespace: str = 'news') -> list[RetrievedChunk]:
        """Perform sparse (BM25-style) vector search."""
        k = top_k or self.top_k
        try:
            query_vector = self._embed_query(query)
            sparse_vector = self._build_sparse_query(query)
            results = self.pinecone_client.query_vectors(
                query_vector=query_vector,
                top_k=k,
                namespace=namespace,
                sparse_vector=sparse_vector,
            )
            return [
                RetrievedChunk(
                    id=r.get('id', ''),
                    text=r.get('metadata', {}).get('text', ''),
                    score=r.get('score', 0.0),
                    metadata=r.get('metadata', {}),
                )
                for r in results
            ]
        except Exception as e:
            logger.error('sparse_search_failed', error=str(e))
            return []

    def reciprocal_rank_fusion(
        self,
        dense_results: list[RetrievedChunk],
        sparse_results: list[RetrievedChunk],
        alpha: float = None,
        k: int = 60,
    ) -> list[RetrievedChunk]:
        """
        Merge two ranked lists using Reciprocal Rank Fusion.
        
        RRF score = alpha * (1 / (k + rank_dense)) + (1-alpha) * (1 / (k + rank_sparse))
        
        Args:
            dense_results: Results from dense search.
            sparse_results: Results from sparse search.
            alpha: Weight for dense results. Uses instance default if not provided.
            k: RRF constant (default 60, standard value).
        """
        weight = alpha if alpha is not None else self.alpha
        
        # Build score maps
        scores = {}  # id -> fused_score
        chunk_map = {}  # id -> RetrievedChunk
        
        for rank, chunk in enumerate(dense_results):
            rrf_score = weight * (1.0 / (k + rank + 1))
            scores[chunk.id] = scores.get(chunk.id, 0.0) + rrf_score
            chunk_map[chunk.id] = chunk
        
        for rank, chunk in enumerate(sparse_results):
            rrf_score = (1.0 - weight) * (1.0 / (k + rank + 1))
            scores[chunk.id] = scores.get(chunk.id, 0.0) + rrf_score
            if chunk.id not in chunk_map:
                chunk_map[chunk.id] = chunk
        
        # Sort by fused score descending
        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        
        fused_results = []
        for chunk_id in sorted_ids:
            chunk = chunk_map[chunk_id]
            fused_results.append(RetrievedChunk(
                id=chunk.id,
                text=chunk.text,
                score=round(scores[chunk_id], 6),
                metadata=chunk.metadata,
            ))
        
        return fused_results

    def retrieve(self, query: str, top_k: int = None, namespace: str = 'news') -> list[RetrievedChunk]:
        """
        Full hybrid retrieval: dense search + sparse search + RRF fusion.
        
        Returns the top-k fused results.
        """
        k = top_k or self.top_k
        
        logger.info('hybrid_retrieve_start', query=query[:100], top_k=k)
        
        # Run both searches
        dense_results = self.dense_search(query, top_k=k * 2, namespace=namespace)
        sparse_results = self.sparse_search(query, top_k=k * 2, namespace=namespace)
        
        # Fuse results
        fused = self.reciprocal_rank_fusion(dense_results, sparse_results)
        
        # Return top-k
        final = fused[:k]
        
        logger.info('hybrid_retrieve_complete', 
                    dense_count=len(dense_results),
                    sparse_count=len(sparse_results),
                    fused_count=len(final))
        
        return final
