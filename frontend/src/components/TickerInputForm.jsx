import React, { useState } from 'react';
import {
  Form,
  FormField,
  Textarea,
  Button,
  SpaceBetween,
  Alert,
  Select,
  Container,
  Header,
  ColumnLayout,
  Box,
} from '@cloudscape-design/components';
import { TICKER_PRESETS } from '../data/tickerPresets';

// Allow: SYMBOL.NS, SYMBOL.BO, 123456.BO, symbols with & and -
const TICKER_PATTERN = /^[A-Z0-9&-]{1,20}(\.(NS|BO))?$/;
const MAX_TICKERS = 500;

const PRESET_OPTIONS = [
  { label: '— Select a preset list —', value: '' },
  ...TICKER_PRESETS.map((p) => ({
    label: `${p.label} (${p.tickers.length} tickers)`,
    value: p.value,
    description: p.description,
  })),
];

/**
 * TickerInputForm - Accepts tickers via preset dropdown or manual input, validates, and submits.
 */
export default function TickerInputForm({ onSubmit, onClear, loading }) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);

  function handlePresetChange({ detail }) {
    const selected = detail.selectedOption;
    setSelectedPreset(selected);
    setError('');

    if (!selected || !selected.value) {
      return;
    }

    const preset = TICKER_PRESETS.find((p) => p.value === selected.value);
    if (preset) {
      setInputValue(preset.tickers.join(', '));
    }
  }

  function validate(raw) {
    const tickers = raw
      .split(/[,\n]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    if (tickers.length === 0) {
      return { valid: false, error: 'Enter at least one ticker symbol or select a preset list.' };
    }
    if (tickers.length > MAX_TICKERS) {
      return { valid: false, error: `Maximum ${MAX_TICKERS} tickers allowed.` };
    }

    const invalid = tickers.filter((t) => !TICKER_PATTERN.test(t));
    if (invalid.length > 0) {
      return {
        valid: false,
        error: `Invalid ticker(s): ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? '...' : ''}. Use format: RELIANCE.NS (NSE) or TCS.BO (BSE)`,
      };
    }

    return { valid: true, tickers };
  }

  function handleSubmit(e) {
    e.preventDefault();
    const result = validate(inputValue);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    setError('');
    onSubmit(result.tickers);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Container
        header={
          <Header
            variant="h2"
            description="Select a preset list or enter tickers manually to analyze"
          >
            Stock Ticker Analysis
          </Header>
        }
      >
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="primary"
                loading={loading}
                formAction="submit"
                data-testid="analyze-button"
              >
                Analyze Stocks
              </Button>
              <Button
                variant="normal"
                onClick={() => { setInputValue(''); setSelectedPreset(null); setError(''); if (onClear) onClear(); }}
                disabled={loading}
                data-testid="clear-button"
              >
                Clear
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            {error && (
              <Alert type="error" data-testid="input-error">
                {error}
              </Alert>
            )}

            <ColumnLayout columns={2}>
              <FormField
                label="Quick Select"
                description="Choose a curated list of validated tickers"
              >
                <Select
                  selectedOption={selectedPreset}
                  onChange={handlePresetChange}
                  options={PRESET_OPTIONS}
                  placeholder="Select BSE or NSE preset..."
                  data-testid="preset-selector"
                />
              </FormField>

              <Box padding={{ top: 'l' }}>
                <SpaceBetween size="xxs">
                  <Box variant="awsui-key-label">Available Presets:</Box>
                  <Box color="text-body-secondary" fontSize="body-s">
                    • BSE Top 100 — Bombay Stock Exchange<br />
                    • NSE Top 100 — National Stock Exchange<br />
                    • BSE Sensex 30 — Blue-chip index<br />
                    • NSE Nifty 50 — Benchmark index
                  </Box>
                </SpaceBetween>
              </Box>
            </ColumnLayout>

            <FormField
              label="Tickers"
              description="Comma-separated ticker symbols. All tickers are yfinance-validated."
              constraintText={`${inputValue ? inputValue.split(/[,\n]+/).filter(Boolean).length : 0} ticker(s) entered — max ${MAX_TICKERS}`}
            >
              <Textarea
                value={inputValue}
                onChange={({ detail }) => setInputValue(detail.value)}
                placeholder="RELIANCE.NS, TCS.NS, HDFCBANK.BO, INFY.BO..."
                rows={5}
                data-testid="ticker-input"
              />
            </FormField>
          </SpaceBetween>
        </Form>
      </Container>
    </form>
  );
}
