"""Tests for src/rag/ingest.py — RSS ingestion + chunking."""

import pytest
from unittest.mock import patch, MagicMock
from src.rag.ingest import ArticleIngester, Article, Chunk


class TestArticleIngester:
    def test_init_default_config(self):
        ingester = ArticleIngester(config_path='nonexistent.yaml')
        assert ingester.config == {}

    def test_chunk_articles_basic(self):
        ingester = ArticleIngester(config_path='config/rag_pipeline.yaml')
        articles = [
            Article(
                title='Test Article',
                url='https://example.com/1',
                content='This is a test article. ' * 50,
                published_date='2024-01-01',
                source='Test Source',
                ticker_mentions=['TCS'],
            )
        ]
        chunks = ingester.chunk_articles(articles)
        assert len(chunks) > 0
        assert all(isinstance(c, Chunk) for c in chunks)
        assert chunks[0].metadata['title'] == 'Test Article'
        assert chunks[0].metadata['source_url'] == 'https://example.com/1'

    def test_chunk_preserves_metadata(self):
        ingester = ArticleIngester(config_path='config/rag_pipeline.yaml')
        articles = [
            Article(
                title='RELIANCE News',
                url='https://example.com/reliance',
                content='RELIANCE Industries reported strong Q3 results. ' * 20,
                published_date='2024-01-15',
                source='MoneyControl',
                ticker_mentions=['RELIANCE'],
            )
        ]
        chunks = ingester.chunk_articles(articles)
        for chunk in chunks:
            assert chunk.metadata['ticker_mentions'] == ['RELIANCE']
            assert chunk.total_chunks == len(chunks)

    def test_extract_tickers(self):
        ingester = ArticleIngester(config_path='config/rag_pipeline.yaml')
        text = 'RELIANCE and TCS reported strong earnings while INFY missed estimates'
        tickers = ingester._extract_tickers(text)
        assert 'RELIANCE' in tickers
        assert 'TCS' in tickers
        assert 'INFY' in tickers

    def test_extract_tickers_filters_common_words(self):
        ingester = ArticleIngester(config_path='config/rag_pipeline.yaml')
        text = 'THE market was volatile AND stocks WERE down'
        tickers = ingester._extract_tickers(text)
        assert 'THE' not in tickers
        assert 'AND' not in tickers
        assert 'WERE' not in tickers

    @patch('feedparser.parse')
    def test_fetch_rss_feeds(self, mock_parse):
        mock_parse.return_value = MagicMock(
            entries=[
                MagicMock(
                    title='Test Entry',
                    link='https://example.com/entry1',
                    summary='Article content about RELIANCE stock',
                    published='Mon, 01 Jan 2024 00:00:00 GMT',
                    get=lambda k, d='': {
                        'title': 'Test Entry',
                        'link': 'https://example.com/entry1',
                        'summary': 'Article content about RELIANCE stock',
                        'published': 'Mon, 01 Jan 2024 00:00:00 GMT',
                        'description': '',
                    }.get(k, d),
                )
            ],
            feed=MagicMock(get=lambda k, d='': 'Test Feed' if k == 'title' else d),
        )
        ingester = ArticleIngester(config_path='config/rag_pipeline.yaml')
        articles = ingester.fetch_rss_feeds(['https://test.com/rss'])
        assert len(articles) >= 1
        assert articles[0].title == 'Test Entry'

    def test_empty_articles_produces_no_chunks(self):
        ingester = ArticleIngester(config_path='config/rag_pipeline.yaml')
        chunks = ingester.chunk_articles([])
        assert chunks == []
