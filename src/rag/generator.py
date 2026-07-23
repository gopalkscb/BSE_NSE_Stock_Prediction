"""RAG Generator: AI-powered signal explanations and conversational Q&A."""

import os
import structlog
from dataclasses import dataclass, field
from openai import OpenAI

logger = structlog.get_logger(__name__)


@dataclass
class Explanation:
    """AI-generated signal explanation for a ticker."""
    ticker: str
    text: str
    sources: list[dict] = field(default_factory=list)  # [{url, title, relevance_score}]
    tokens_used: dict = field(default_factory=dict)  # {input: int, output: int}


@dataclass
class RAGAnswer:
    """Response from conversational Q&A."""
    answer: str
    sources: list[dict] = field(default_factory=list)
    tokens_used: dict = field(default_factory=dict)


class RAGGenerator:
    """Generates AI explanations and answers grounded in retrieved context."""

    def __init__(self):
        self._client = None
        self.model = os.environ.get('OPENAI_CHAT_MODEL', 'gpt-4o-mini')
        self.max_tokens = 500
        self.temperature = 0.3

    @property
    def client(self):
        if self._client is None:
            self._client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        return self._client

    def _format_context(self, chunks: list) -> str:
        """Format retrieved chunks into a context string for the LLM."""
        context_parts = []
        for i, chunk in enumerate(chunks[:5], 1):  # Limit to top 5 for token efficiency
            source = chunk.metadata.get('title', 'Unknown')
            text = chunk.text[:300]  # Truncate long chunks
            context_parts.append(f"[{i}] {source}:\n{text}")
        return '\n\n'.join(context_parts)

    def _extract_sources(self, chunks: list) -> list[dict]:
        """Extract source citations from retrieved chunks."""
        sources = []
        seen_urls = set()
        for chunk in chunks[:5]:
            url = chunk.metadata.get('source_url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                sources.append({
                    'url': url,
                    'title': chunk.metadata.get('title', 'Unknown'),
                    'relevance_score': round(chunk.score, 3),
                })
        return sources

    def generate_explanation(
        self,
        ticker: str,
        confidence: str,
        context_chunks: list,
    ) -> Explanation:
        """
        Generate a 2-4 sentence explanation for a ticker's bullish signal,
        grounded in retrieved financial news context.
        """
        if not context_chunks:
            return Explanation(
                ticker=ticker,
                text='No recent news available for grounding.',
                sources=[],
                tokens_used={'input': 0, 'output': 0},
            )

        context_str = self._format_context(context_chunks)
        sources = self._extract_sources(context_chunks)

        system_prompt = (
            "You are a financial analyst assistant. Generate a brief 2-4 sentence explanation "
            "for why a stock is showing a bullish signal. Use ONLY the provided context. "
            "Be factual and cite specific news. If the context doesn't contain relevant info, say so."
        )

        user_prompt = (
            f"Ticker: {ticker}\n"
            f"Confidence Level: {confidence}\n\n"
            f"Recent News Context:\n{context_str}\n\n"
            f"Explain why {ticker} is showing a {confidence.lower()} bullish signal "
            f"based on the above news context."
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt},
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature,
            )

            answer_text = response.choices[0].message.content.strip()
            tokens = {
                'input': response.usage.prompt_tokens,
                'output': response.usage.completion_tokens,
            }

            logger.info('explanation_generated', ticker=ticker, tokens=tokens)

            return Explanation(
                ticker=ticker,
                text=answer_text,
                sources=sources,
                tokens_used=tokens,
            )

        except Exception as e:
            logger.error('explanation_generation_failed', ticker=ticker, error=str(e))
            return Explanation(
                ticker=ticker,
                text=f'Unable to generate explanation: {str(e)}',
                sources=sources,
                tokens_used={'input': 0, 'output': 0},
            )

    def generate_answer(
        self,
        question: str,
        context_chunks: list,
        conversation_history: list[dict] | None = None,
    ) -> RAGAnswer:
        """
        Generate a conversational answer grounded in retrieved context.
        Supports multi-turn conversation via history.
        """
        context_str = self._format_context(context_chunks)
        sources = self._extract_sources(context_chunks)

        system_prompt = (
            "You are an AI financial research assistant for Indian stock markets (BSE/NSE). "
            "Answer the user's question using ONLY the provided context. "
            "If the context doesn't contain relevant information, clearly state that. "
            "Be concise, factual, and cite sources by number [1], [2], etc. "
            "Never provide investment advice or recommendations."
        )

        messages = [{'role': 'system', 'content': system_prompt}]

        # Add conversation history (max 10 turns)
        if conversation_history:
            for turn in conversation_history[-10:]:
                messages.append({
                    'role': turn.get('role', 'user'),
                    'content': turn.get('content', ''),
                })

        # Current question with context
        user_msg = f"Context:\n{context_str}\n\nQuestion: {question}"
        messages.append({'role': 'user', 'content': user_msg})

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
            )

            answer_text = response.choices[0].message.content.strip()
            tokens = {
                'input': response.usage.prompt_tokens,
                'output': response.usage.completion_tokens,
            }

            logger.info('answer_generated', question=question[:50], tokens=tokens)

            return RAGAnswer(
                answer=answer_text,
                sources=sources,
                tokens_used=tokens,
            )

        except Exception as e:
            logger.error('answer_generation_failed', question=question[:50], error=str(e))
            return RAGAnswer(
                answer=f'Unable to generate answer: {str(e)}',
                sources=sources,
                tokens_used={'input': 0, 'output': 0},
            )
