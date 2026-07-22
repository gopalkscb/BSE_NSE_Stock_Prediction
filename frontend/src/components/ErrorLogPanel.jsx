import React, { useState, useEffect } from 'react';
import {
  Table,
  Header,
  Pagination,
  StatusIndicator,
  SpaceBetween,
  Select,
  Spinner,
} from '@cloudscape-design/components';
import { getErrors } from '../api/observabilityApi';

const PAGE_SIZE = 20;

/**
 * ErrorLogPanel - Paginated error/warning log table with level filter.
 */
export default function ErrorLogPanel() {
  const [entries, setEntries] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [levelFilter, setLevelFilter] = useState(null);

  async function loadErrors(page) {
    setLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const data = await getErrors(PAGE_SIZE, offset);
      setEntries(data.entries || []);
      setTotalCount(data.total_count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load errors');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadErrors(currentPage);
  }, [currentPage]);

  const filteredEntries = levelFilter
    ? entries.filter((e) => e.level === levelFilter.value)
    : entries;

  const levelOptions = [
    { label: 'All Levels', value: '' },
    { label: 'ERROR', value: 'ERROR' },
    { label: 'WARNING', value: 'WARNING' },
    { label: 'INFO', value: 'INFO' },
  ];

  if (loading && entries.length === 0) {
    return <Spinner size="large" data-testid="errors-loading" />;
  }

  return (
    <SpaceBetween size="m">
      <Select
        selectedOption={levelFilter || levelOptions[0]}
        onChange={({ detail }) =>
          setLevelFilter(detail.selectedOption.value ? detail.selectedOption : null)
        }
        options={levelOptions}
        placeholder="Filter by level"
        data-testid="error-level-filter"
      />

      <Table
        header={
          <Header variant="h3" counter={`(${totalCount})`}>
            Error & Warning Log
          </Header>
        }
        columnDefinitions={[
          { id: 'timestamp', header: 'Time', cell: (item) => item.timestamp, width: 180 },
          {
            id: 'level',
            header: 'Level',
            cell: (item) => (
              <StatusIndicator type={item.level === 'ERROR' ? 'error' : item.level === 'WARNING' ? 'warning' : 'info'}>
                {item.level}
              </StatusIndicator>
            ),
            width: 100,
          },
          { id: 'source', header: 'Source', cell: (item) => item.source_module, width: 150 },
          { id: 'message', header: 'Message', cell: (item) => item.message },
        ]}
        items={filteredEntries}
        loading={loading}
        data-testid="error-log-table"
        empty="No errors or warnings recorded."
        pagination={
          <Pagination
            currentPageIndex={currentPage}
            pagesCount={Math.ceil(totalCount / PAGE_SIZE) || 1}
            onChange={({ detail }) => setCurrentPage(detail.currentPageIndex)}
            data-testid="error-log-pagination"
          />
        }
      />
    </SpaceBetween>
  );
}
