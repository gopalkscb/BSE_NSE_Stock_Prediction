"""Tests for src/rag/generator.py — AI explanation + Q&A generation."""

import pytest
from unittest.mock import patch, MagicMock
from src.rag.generator import RAGGenerator, Explanation, RAGAnswer
from src.rag.retriever import RetrievedChunk


@pytest.fixture
def sample_chunks():
    return [
        RetrievedChunk(
            id='c1', text='RELIANCE reported strong Q3 earnings beating analyst estimates.',
            score=0.92, metadata={'source_url': 'https://news.com/1', 'title': 'Reliance Q3'}
        ),
        RetrievedChunk(
            id='c2', text='Jio subscriber growth continues to drive RELIANCE revenue.',
            score=0.85, metadata={'source_url': 'https://news.com/2', 'title': 'Jio Growth'}
        ),
    ]


class TestGenerateExplanation:
    def test_no_context_returns_default(self):
        gen = RAGGenerator()
        result = gen.generate_explanation('RELIANCE', 'High', [])
        assert isinstance(result, Explanation)
        assert 'No recent news' in result.text
        assert result.sources == []

    @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
    @patch('openai.OpenAI')
    def test_generates_explanation(self, mock_openai_cls, sample_chunks):
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content='RELIANCE is bullish due to strong earnings.'))]
        mock_response.usage.prompt_tokens = 100
        mock_response.usage.completion_tokens = 30
        mock_client.chat.completions.create.return_value = mock_response

        gen = RAGGenerator()
        result = gen.generate_explanation('RELIANCE', 'High', sample_chunks)

        assert 'RELIANCE' in result.text or 'bullish' in result.text
        assert result.ticker == 'RELIANCE'
        assert len(result.sources) > 0
        assert result.tokens_used['input'] == 100

    @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
    @patch('openai.OpenAI')
    def test_handles_api_error(self, mock_openai_cls, sample_chunks):
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_client.chat.completions.create.side_effect = Exception('Rate limited')

        gen = RAGGenerator()
        result = gen.generate_explanation('TCS', 'Medium', sample_chunks)

        assert 'Unable to generate' in result.text
        assert result.tokens_used['input'] == 0


class TestGenerateAnswer:
    @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
    @patch('openai.OpenAI')
    def test_generates_answer(self, mock_openai_cls, sample_chunks):
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content='RELIANCE earnings were strong in Q3.'))]
        mock_response.usage.prompt_tokens = 150
        mock_response.usage.completion_tokens = 40
        mock_client.chat.completions.create.return_value = mock_response

        gen = RAGGenerator()
        result = gen.generate_answer('Why is RELIANCE bullish?', sample_chunks)

        assert isinstance(result, RAGAnswer)
        assert len(result.answer) > 0
        assert result.tokens_used['output'] == 40

    @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
    @patch('openai.OpenAI')
    def test_includes_conversation_history(self, mock_openai_cls, sample_chunks):
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content='Follow-up answer.'))]
        mock_response.usage.prompt_tokens = 200
        mock_response.usage.completion_tokens = 20
        mock_client.chat.completions.create.return_value = mock_response

        gen = RAGGenerator()
        history = [
            {'role': 'user', 'content': 'Tell me about TCS'},
            {'role': 'assistant', 'content': 'TCS is an IT company.'},
        ]
        result = gen.generate_answer('What about their earnings?', sample_chunks, history)

        assert isinstance(result, RAGAnswer)
        # Verify history was passed to the API
        call_args = mock_client.chat.completions.create.call_args
        messages = call_args.kwargs.get('messages') or call_args[1].get('messages', [])
        assert len(messages) >= 4  # system + 2 history + user
