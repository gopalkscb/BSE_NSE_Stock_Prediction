"""RSS ingestion, chunking, embedding, and Pinecone upsert pipeline."""

import os
import re
import time
import structlog
import feedparser
import yaml
from dataclasses import dataclass, field
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = structlog.get_logger(__name__)


@dataclass
class Article:
    title: str
    url: str
    content: str
    published_date: str
    source: str
    ticker_mentions: list[str] = field(default_factory=list)


@dataclass
class Chunk:
    text: str
    metadata: dict
    chunk_index: int
    total_chunks: int


@dataclass
class EmbeddedChunk:
    chunk: Chunk
    dense_vector: list[float]
    sparse_vector: dict  # {indices: [...], values: [...]}


@dataclass
class IngestResult:
    articles_fetched: int
    chunks_created: int
    vectors_upserted: int
    errors: list[str]
    duration_seconds: float
    tokens_consumed: int


class ArticleIngester:
    """Full RAG ingestion pipeline: RSS fetch → chunk → embed → upsert."""

    def __init__(self, config_path: str = 'config/rag_pipeline.yaml'):
        self.config = self._load_config(config_path)
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.config.get('ingestion', {}).get('chunk_size', 512),
            chunk_overlap=self.config.get('ingestion', {}).get('chunk_overlap', 50),
            separators=['\n\n', '\n', '. ', ' ', ''],
        )

    def _load_config(self, path: str) -> dict:
        try:
            with open(path, 'r') as f:
                return yaml.safe_load(f) or {}
        except FileNotFoundError:
            logger.warning('config_not_found', path=path)
            return {}

    def fetch_rss_feeds(self, feed_urls: list[str] | None = None) -> list[Article]:
        """Fetch articles from configured RSS feeds."""
        urls = feed_urls or self.config.get('ingestion', {}).get('rss_feeds', [])
        articles = []
        for url in urls:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:20]:  # limit per feed
                    content = entry.get('summary', '') or entry.get('description', '')
                    if not content:
                        continue
                    article = Article(
                        title=entry.get('title', 'Untitled'),
                        url=entry.get('link', ''),
                        content=content,
                        published_date=entry.get('published', ''),
                        source=feed.feed.get('title', url),
                        ticker_mentions=self._extract_tickers(content),
                    )
                    articles.append(article)
            except Exception as e:
                logger.error('rss_fetch_failed', url=url, error=str(e))
        logger.info('rss_fetched', total_articles=len(articles), feeds_processed=len(urls))
        return articles

    def _extract_tickers(self, text: str) -> list[str]:
        """Extract potential Indian stock ticker symbols from text."""
        # Match common Indian stock ticker patterns
        patterns = re.findall(r'\b([A-Z]{2,10})(?:\.NS|\.BO)?\b', text)
        # Filter to likely tickers (uppercase, 2-10 chars)
        common_words = {
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN',
            'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'HAS', 'ITS', 'HIS', 'HOW',
            'WHO', 'OIL', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'MAY', 'DAY',
            'TOO', 'ANY', 'NSE', 'BSE', 'IPO', 'CEO', 'CFO', 'THIS', 'THAT',
            'WITH', 'HAVE', 'FROM', 'THEY', 'WILL', 'BEEN', 'SAID', 'EACH',
            'WHAT', 'WHEN', 'WERE', 'ALSO', 'THAN', 'OVER', 'SUCH', 'ONLY',
            'INTO', 'YEAR', 'SOME', 'THEM', 'TIME', 'VERY', 'MADE', 'AFTER',
            'MANY',
        }
        return [t for t in set(patterns) if t not in common_words and len(t) >= 3]

    def chunk_articles(self, articles: list[Article]) -> list[Chunk]:
        """Split articles into smaller chunks for embedding."""
        chunks = []
        for article in articles:
            texts = self.splitter.split_text(article.content)
            total = len(texts)
            for i, text in enumerate(texts):
                chunk = Chunk(
                    text=text,
                    metadata={
                        'source_url': article.url,
                        'title': article.title,
                        'published_date': article.published_date,
                        'source': article.source,
                        'ticker_mentions': article.ticker_mentions,
                    },
                    chunk_index=i,
                    total_chunks=total,
                )
                chunks.append(chunk)
        logger.info('chunking_complete', total_chunks=len(chunks), articles=len(articles))
        return chunks

    def embed_chunks(self, chunks: list[Chunk]) -> tuple[list[list[float]], int]:
        """Embed chunks using OpenAI text-embedding-3-small. Returns (vectors, tokens_used)."""
        from openai import OpenAI

        client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        model = self.config.get('embedding', {}).get('model', 'text-embedding-3-small')

        embeddings = []
        total_tokens = 0
        batch_size = 100

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            texts = [c.text for c in batch]
            try:
                response = client.embeddings.create(input=texts, model=model)
                for item in response.data:
                    embeddings.append(item.embedding)
                total_tokens += response.usage.total_tokens
            except Exception as e:
                logger.error('embedding_failed', batch_start=i, error=str(e))
                # Append zero vectors for failed batch
                embeddings.extend([[0.0] * 1536] * len(batch))

        logger.info('embedding_complete', chunks=len(chunks), tokens=total_tokens)
        return embeddings, total_tokens

    def generate_sparse_vectors(self, chunks: list[Chunk]) -> list[dict]:
        """Generate BM25 sparse vectors for hybrid search."""
        from rank_bm25 import BM25Okapi

        # Tokenize all chunks
        tokenized = [chunk.text.lower().split() for chunk in chunks]

        if not tokenized:
            return []

        bm25 = BM25Okapi(tokenized)

        sparse_vectors = []
        # Build vocabulary
        vocab = {}
        for tokens in tokenized:
            for token in tokens:
                if token not in vocab:
                    vocab[token] = len(vocab)

        for i, tokens in enumerate(tokenized):
            # Get BM25 scores for this document's tokens
            indices = []
            values = []
            seen_tokens = set()
            for token in tokens:
                if token in seen_tokens:
                    continue
                seen_tokens.add(token)
                idx = vocab[token]
                # Use TF as sparse value (simplified BM25 contribution)
                tf = tokens.count(token) / len(tokens) if tokens else 0
                if tf > 0:
                    indices.append(idx)
                    values.append(round(tf, 4))

            sparse_vectors.append({'indices': indices, 'values': values})

        logger.info('sparse_vectors_generated', count=len(sparse_vectors))
        return sparse_vectors

    def run_pipeline(self, namespace: str = 'news') -> IngestResult:
        """Run the full ingestion pipeline: fetch → chunk → embed → upsert."""
        start = time.time()
        errors = []

        # Step 1: Fetch
        articles = self.fetch_rss_feeds()
        if not articles:
            return IngestResult(
                articles_fetched=0, chunks_created=0, vectors_upserted=0,
                errors=['No articles fetched from RSS feeds'],
                duration_seconds=round(time.time() - start, 2), tokens_consumed=0
            )

        # Step 2: Chunk
        chunks = self.chunk_articles(articles)

        # Step 3: Embed
        dense_vectors, tokens = self.embed_chunks(chunks)

        # Step 4: Sparse vectors
        sparse_vectors = self.generate_sparse_vectors(chunks)

        # Step 5: Upsert to Pinecone
        from src.rag.pinecone_client import PineconeClient
        pc = PineconeClient()

        # Delete-and-replace
        pc.delete_namespace(namespace)

        # Prepare vectors for upsert
        vectors_to_upsert = []
        for i, chunk in enumerate(chunks):
            vec = {
                'id': f'{namespace}_{i}',
                'values': dense_vectors[i],
                'sparse_values': sparse_vectors[i] if i < len(sparse_vectors) else None,
                'metadata': {
                    **chunk.metadata,
                    'text': chunk.text,
                    'chunk_index': chunk.chunk_index,
                    'total_chunks': chunk.total_chunks,
                },
            }
            if vec['sparse_values'] is None:
                del vec['sparse_values']
            vectors_to_upsert.append(vec)

        upserted = pc.upsert_vectors(vectors_to_upsert, namespace)

        duration = round(time.time() - start, 2)
        logger.info('pipeline_complete', articles=len(articles), chunks=len(chunks),
                    upserted=upserted, duration=duration, tokens=tokens)

        return IngestResult(
            articles_fetched=len(articles),
            chunks_created=len(chunks),
            vectors_upserted=upserted,
            errors=errors,
            duration_seconds=duration,
            tokens_consumed=tokens,
        )


if __name__ == '__main__':
    """Manual pipeline trigger: python -m src.rag.ingest"""
    ingester = ArticleIngester()
    result = ingester.run_pipeline()
    print(f'Pipeline complete: {result}')
