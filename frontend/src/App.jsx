import React, { useState } from 'react';
import '@cloudscape-design/global-styles/index.css';
import './theme.css';
import { AppLayout, Tabs, Box } from '@cloudscape-design/components';
import AnalysisPage from './pages/AnalysisPage';
import ObservabilityPage from './pages/ObservabilityPage';
import FaqPanel from './components/FaqPanel';

/**
 * App - Root component with branded header and top-level tabs.
 * Disables Observability and FAQ tabs while analysis is in progress.
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
            <p>BSE &amp; NSE Technical Analysis — Top 100 yfinance-validated tickers</p>
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
