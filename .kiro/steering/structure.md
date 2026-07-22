# Project Structure

## Expected Layout

```
BSE_NSE_Stock_Prediction/
├── data/                   # Raw and processed datasets
│   ├── raw/                # Downloaded market data (gitignored)
│   └── processed/          # Cleaned, feature-engineered data
├── notebooks/              # Jupyter notebooks for EDA and experimentation
├── src/                    # Core application source code
│   ├── data/               # Data fetching and preprocessing modules
│   ├── features/           # Feature engineering logic
│   ├── models/             # Model definitions, training, and evaluation
│   └── utils/              # Shared helpers and utilities
├── app.py                  # Streamlit app entry point
├── tests/                  # pytest test suite
├── requirements.txt        # Python dependencies
├── .env                    # Local secrets/config (gitignored)
└── .streamlit/
    └── secrets.toml        # Streamlit secrets (gitignored)
```

## Conventions

- **Source code** lives in `src/` as importable Python modules; avoid putting business logic directly in notebooks or `app.py`
- **Notebooks** are for exploration only — production-ready logic must be moved to `src/`
- **Tests** mirror the `src/` structure (e.g., `tests/models/test_lstm.py` for `src/models/lstm.py`)
- **Data files** (CSVs, Parquet, HDF5) should not be committed; use `data/raw/` locally and document the fetch process
- **Model artifacts** (`.pkl`, `.h5`, `.pt`) should not be committed; store in a dedicated `models/` or `artifacts/` directory and gitignore them
- **Configuration** (hyperparameters, ticker lists, date ranges) should be externalized into config files (YAML/JSON) or environment variables, not hardcoded

## Module Naming
- Use `snake_case` for all Python files and directories
- Prefix data pipeline scripts with their stage: `fetch_`, `clean_`, `feature_`, `train_`, `evaluate_`
