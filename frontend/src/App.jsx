import React, { useState } from 'react';
import '@cloudscape-design/global-styles/index.css';
import './theme.css';
import { AppLayout, Tabs, Box } from '@cloudscape-design/components';
import AnalysisPage from './pages/AnalysisPage';
import LiveDataPage from './pages/LiveDataPage';
import ObservabilityPage from './pages/ObservabilityPage';
import FaqPanel from './components/FaqPanel';
import RAGDashboardTab from './components/RAGDashboardTab';
import AskAIPanel from './components/AskAIPanel';

/**
 * App - Root component with branded header and top-level tabs.
 * Tabs:
 *   1. Analysis — yfinance bulk scoring (5 indicators, ranked table)
 *   2. Live Data — single ticker live lookup with indicator details
 *   3. RAG Reference — AI Q&A + evaluation dashboard
 *   4. Observability — metrics + error log
 *   5. FAQ — help & guide
 */
export default function App() {
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');

  return (
    <AppLayout
      content={
        <Box padding="l">
          {/* Branded Header */}
          <div className="app-header">
            <h1>📈 Bullish Stock Predictor</h1>
            <p>BSE &amp; NSE Technical Analysis — yfinance Scoring · Live Data · RAG Intelligence</p>
          </div>

          {/* Main Tabs */}
          <Tabs
            activeTabId={activeTab}
            onChange={({ detail }) => {
              if (analysisLoading && detail.activeTabId !== 'analysis') {
                return;
              }
              setActiveTab(detail.activeTabId);
            }}
            tabs={[
              {
                id: 'analysis',
                label: '🔍 Analysis',
                content: <AnalysisPage onLoadingChange={setAnalysisLoading} />,
              },
              {
                id: 'live-data',
                label: analysisLoading ? '⚡ Live Data (locked)' : '⚡ Live Data',
                disabled: analysisLoading,
                content: <LiveDataPage />,
              },
              {
                id: 'rag-reference',
                label: analysisLoading ? '📚 RAG Reference (locked)' : '📚 RAG Reference',
                disabled: analysisLoading,
                content: <RAGReferencePage />,
              },
              {
                id: 'observability',
                label: analysisLoading ? '📊 Observability (locked)' : '📊 Observability',
                disabled: analysisLoading,
                content: <ObservabilityPage />,
              },
              {
                id: 'faq',
                label: analysisLoading ? '💡 FAQ (locked)' : '💡 FAQ & Guide',
                disabled: analysisLoading,
                content: <FaqPanel />,
              },
            ]}
            data-testid="app-tabs"
          />
        </Box>
      }
      navigationHide
      toolsHide
      data-testid="app-layout"
    />
  );
}

/**
 * RAGReferencePage — Sub-tabs for RAG-powered reference data:
 *   - Ask AI: conversational Q&A grounded in financial news
 *   - RAG Performance: evaluation metrics dashboard (disabled while chat in progress)
 */
function RAGReferencePage() {
  const [ragChatLoading, setRagChatLoading] = useState(false);

  return (
    <Tabs
      tabs={[
        {
          id: 'ask-ai',
          label: '🤖 Ask AI',
          content: <AskAIPanel onLoadingChange={setRagChatLoading} />,
        },
        {
          id: 'rag-dashboard',
          label: ragChatLoading ? '📈 RAG Performance (waiting...)' : '📈 RAG Performance',
          disabled: ragChatLoading,
          content: <RAGDashboardTab />,
        },
      ]}
      data-testid="rag-tabs"
    />
  );
}
