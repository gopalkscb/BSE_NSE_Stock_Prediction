import React, { useState, useEffect } from 'react';
import {
  SpaceBetween,
  Input,
  ExpandableSection,
  Container,
  Header,
  Box,
  Spinner,
  StatusIndicator,
  Badge,
  ColumnLayout,
} from '@cloudscape-design/components';
import { getFaq } from '../api/observabilityApi';

/**
 * FaqPanel - Searchable FAQ accordion grouped by category with light green-blue theme.
 */
export default function FaqPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getFaq();
        setCategories(data.categories || []);
      } catch (err) {
        setError(err.message || 'Failed to load FAQ');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Box textAlign="center" padding="xl">
        <Spinner size="large" data-testid="faq-loading" />
        <Box variant="p" color="text-body-secondary" padding={{ top: 's' }}>
          Loading FAQ...
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <StatusIndicator type="error" data-testid="faq-error">
        {error}
      </StatusIndicator>
    );
  }

  const query = searchQuery.toLowerCase();

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      entries: cat.entries.filter(
        (entry) =>
          !query ||
          entry.question.toLowerCase().includes(query) ||
          entry.answer.toLowerCase().includes(query) ||
          (entry.tags || []).some((t) => t.toLowerCase().includes(query))
      ),
    }))
    .filter((cat) => cat.entries.length > 0);

  const totalEntries = filteredCategories.reduce((sum, cat) => sum + cat.entries.length, 0);

  return (
    <div className="faq-panel">
      <SpaceBetween size="l">
        {/* Search + Stats Header */}
        <Container
          header={
            <Header
              variant="h2"
              description="Find answers to common questions about the stock predictor"
              counter={`(${totalEntries} entries)`}
            >
              💡 FAQ &amp; Debug Guide
            </Header>
          }
        >
          <ColumnLayout columns={2}>
            <Input
              value={searchQuery}
              onChange={({ detail }) => setSearchQuery(detail.value)}
              placeholder="🔍 Search questions, answers, or tags..."
              type="search"
              data-testid="faq-search"
            />
            <Box variant="p" color="text-body-secondary" padding={{ top: 'xs' }}>
              {categories.length} categories •{' '}
              {categories.reduce((sum, c) => sum + c.entries.length, 0)} total entries
            </Box>
          </ColumnLayout>
        </Container>

        {/* Empty State */}
        {filteredCategories.length === 0 && (
          <Box textAlign="center" color="inherit" padding="xl" data-testid="faq-empty">
            <Box variant="h3">No results found</Box>
            <Box variant="p" color="text-body-secondary">
              Try different search terms or clear the filter.
            </Box>
          </Box>
        )}

        {/* FAQ Categories */}
        {filteredCategories.map((category) => (
          <Container
            key={category.id}
            header={
              <Header
                variant="h3"
                counter={`(${category.entries.length})`}
              >
                {getCategoryIcon(category.id)} {category.name}
              </Header>
            }
          >
            <SpaceBetween size="s">
              {category.entries.map((entry) => (
                <div key={entry.id} className="faq-entry">
                  <ExpandableSection
                    headerText={entry.question}
                    data-testid={`faq-entry-${entry.id}`}
                  >
                    <div className="faq-answer">
                      <SpaceBetween size="xs">
                        <Box variant="p">{entry.answer}</Box>
                        {entry.tags && entry.tags.length > 0 && (
                          <Box>
                            {entry.tags.map((tag) => (
                              <span key={tag} className="faq-tag">
                                {tag}
                              </span>
                            ))}
                          </Box>
                        )}
                        {entry.related_metric && (
                          <Box fontSize="body-s" color="text-body-secondary">
                            📊 Related metric: <code>{entry.related_metric}</code>
                          </Box>
                        )}
                      </SpaceBetween>
                    </div>
                  </ExpandableSection>
                </div>
              ))}
            </SpaceBetween>
          </Container>
        ))}
      </SpaceBetween>
    </div>
  );
}

/** Map category IDs to icons */
function getCategoryIcon(categoryId) {
  const icons = {
    general: '📋',
    indicators: '📈',
    scoring: '🎯',
    troubleshooting: '🔧',
    data: '📦',
    api: '🔌',
    performance: '⚡',
    setup: '🛠️',
  };
  return icons[categoryId] || '📄';
}
