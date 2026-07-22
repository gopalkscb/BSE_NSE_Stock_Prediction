import React from 'react';
import { Tabs, SpaceBetween, Header } from '@cloudscape-design/components';
import MetricsPanel from '../components/MetricsPanel';
import ErrorLogPanel from '../components/ErrorLogPanel';

/**
 * ObservabilityPage - 2-panel layout: Metrics, Error Log.
 * FAQ has been moved to its own top-level tab.
 */
export default function ObservabilityPage() {
  return (
    <SpaceBetween size="l">
      <Header variant="h1">Observability Dashboard</Header>
      <Tabs
        tabs={[
          {
            id: 'metrics',
            label: '📊 Live Metrics',
            content: <MetricsPanel />,
          },
          {
            id: 'errors',
            label: '⚠️ Error Log',
            content: <ErrorLogPanel />,
          },
        ]}
        data-testid="observability-tabs"
      />
    </SpaceBetween>
  );
}
