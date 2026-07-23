import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  Button,
  Input,
  Spinner,
  Link,
} from '@cloudscape-design/components';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * AskAIPanel — Inline conversational Q&A for RAG Reference tab.
 * Same logic as AskAIDrawer but rendered as a Container (not an overlay).
 */
export default function AskAIPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');

    const userMsg = { role: 'user', content: question };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const history = updatedMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await axios.post(`${API_BASE}/api/v4/rag/query`, {
        question,
        conversation_history: history.slice(0, -1),
      });

      const assistantMsg = {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources || [],
        tokens: response.data.tokens_used || {},
      };
      setMessages([...updatedMessages, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `Error: ${err.response?.data?.detail || err.message || 'Failed to get response'}`,
        error: true,
      };
      setMessages([...updatedMessages, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="Ask questions about stocks, market trends, or financial news — answers grounded in RAG-retrieved research."
        >
          🤖 Ask AI — Financial Research Assistant
        </Header>
      }
      data-testid="ask-ai-panel"
    >
      <SpaceBetween size="m">
        {/* Chat Messages */}
        <div
          style={{
            minHeight: '350px',
            maxHeight: '500px',
            overflowY: 'auto',
            padding: '8px 0',
          }}
          data-testid="chat-messages"
        >
          {messages.length === 0 && (
            <Box textAlign="center" color="text-status-inactive" padding="xl">
              <Box variant="h3" color="text-status-inactive">No messages yet</Box>
              <Box margin={{ top: 's' }}>
                Try asking:
                <br />
                <em>"Why is RELIANCE bullish?"</em> · <em>"Compare TCS vs INFY outlook"</em> · <em>"What news is driving the market?"</em>
              </Box>
            </Box>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: msg.role === 'user' ? '#e0f2fe' : msg.error ? '#fef2f2' : '#f0fdfa',
                borderLeft: msg.role === 'user' ? '3px solid #0ea5e9' : msg.error ? '3px solid #ef4444' : '3px solid #10b981',
              }}
              data-testid={`chat-msg-${idx}`}
            >
              <Box fontSize="body-s" fontWeight="bold" color="text-status-inactive">
                {msg.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
              </Box>
              <Box margin={{ top: 'xxs' }}>{msg.content}</Box>

              {msg.sources && msg.sources.length > 0 && (
                <Box margin={{ top: 'xs' }} fontSize="body-s" color="text-status-inactive">
                  <strong>Sources:</strong>{' '}
                  {msg.sources.map((src, i) => (
                    <span key={i}>
                      <Link href={src.url} external fontSize="body-s">
                        {src.title || `Source ${i + 1}`}
                      </Link>
                      {i < msg.sources.length - 1 && ' · '}
                    </span>
                  ))}
                </Box>
              )}
            </div>
          ))}

          {loading && (
            <Box textAlign="center" padding="s">
              <Spinner size="normal" /> <em>Retrieving context and generating answer...</em>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <Input
              value={input}
              onChange={({ detail }) => setInput(detail.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about stocks, markets, or financial news..."
              disabled={loading}
              data-testid="chat-input"
            />
          </div>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            data-testid="chat-send"
          >
            Send
          </Button>
        </div>

        {/* Footer */}
        <Box fontSize="body-s" color="text-status-inactive" textAlign="center">
          Powered by RAG hybrid retrieval (OpenAI + BM25) · Answers grounded in financial news · Not investment advice
        </Box>
      </SpaceBetween>
    </Container>
  );
}
