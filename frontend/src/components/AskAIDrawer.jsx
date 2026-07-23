import React, { useState, useRef, useEffect } from 'react';
import {
  Drawer,
  Header,
  SpaceBetween,
  Box,
  Button,
  Input,
  Spinner,
  Link,
  StatusIndicator,
} from '@cloudscape-design/components';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * AskAIDrawer — Conversational Q&A panel for financial research.
 * Maintains up to 10 turns of conversation history per session.
 */
export default function AskAIDrawer({ visible, onClose }) {
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

    // Add user message
    const userMsg = { role: 'user', content: question };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Build conversation history (last 10 turns)
      const history = updatedMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await axios.post(`${API_BASE}/api/v4/rag/query`, {
        question,
        conversation_history: history.slice(0, -1), // Exclude current question
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
    <Drawer
      header={<Header variant="h2">🤖 Ask AI</Header>}
      visible={visible}
      onDismiss={onClose}
      size="medium"
      data-testid="ask-ai-drawer"
    >
      <SpaceBetween size="m">
        {/* Chat Messages */}
        <div
          style={{
            minHeight: '300px',
            maxHeight: '500px',
            overflowY: 'auto',
            padding: '8px 0',
          }}
          data-testid="chat-messages"
        >
          {messages.length === 0 && (
            <Box textAlign="center" color="text-status-inactive" padding="xl">
              Ask a question about stocks, market trends, or financial news.
              <br />
              <em>e.g., "Why is RELIANCE bullish?" or "Compare TCS vs INFY outlook"</em>
            </Box>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: msg.role === 'user' ? '#e0f2fe' : msg.error ? '#fef2f2' : '#f0fdfa',
                borderLeft: msg.role === 'user' ? '3px solid #0ea5e9' : msg.error ? '3px solid #ef4444' : '3px solid #10b981',
              }}
              data-testid={`chat-msg-${idx}`}
            >
              <Box fontSize="body-s" fontWeight="bold" color="text-status-inactive">
                {msg.role === 'user' ? 'You' : 'AI Assistant'}
              </Box>
              <Box margin={{ top: 'xxs' }}>{msg.content}</Box>

              {/* Sources */}
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
              <Spinner size="normal" /> <em>Thinking...</em>
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
              placeholder="Ask about stocks, markets, or news..."
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
          AI responses are grounded in financial news. Not investment advice.
        </Box>
      </SpaceBetween>
    </Drawer>
  );
}
