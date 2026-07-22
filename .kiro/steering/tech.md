# Tech Stack

## Language
- Python 3.x

## Key Libraries (expected)
- **Data fetching**: `yfinance`, `nsepy`, or `jugaad-data` for BSE/NSE market data
- **Data processing**: `pandas`, `numpy`
- **Machine learning**: `scikit-learn`, `xgboost`, or `lightgbm`
- **Deep learning**: `tensorflow`/`keras` or `pytorch` for time-series models (LSTM, Transformer)
- **Visualization**: `matplotlib`, `plotly`
- **UI**: `streamlit` (`.streamlit/secrets.toml` is gitignored, indicating Streamlit is used)
- **Notebooks**: `jupyter` for exploration and prototyping

## Package Management
- Use `pip` with a `requirements.txt`, or `uv`/`pipenv`/`poetry` if a lockfile is present
- Virtual environment: `.venv/` or `venv/` (gitignored — always activate before running)

## Task Queue / Caching (optional/future)
- `celery` for async job scheduling (celerybeat config is gitignored)
- `redis` for caching or as a Celery broker (`.rdb`/`.aof` files gitignored)

## Code Quality
- `ruff` for linting and formatting (`.ruff_cache/` is gitignored)
- `mypy` or `pytype` for static type checking (configs gitignored)
- `pytest` for testing (`.pytest_cache/` gitignored)

## Common Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run the Streamlit app
streamlit run app.py

# Run tests
pytest

# Lint and format with ruff
ruff check .
ruff format .

# Launch Jupyter notebook
jupyter notebook

# Type checking
mypy .
```

## Notes
- Never commit `.env` or `.streamlit/secrets.toml` — use environment variables for API keys and secrets
- Jupyter notebook checkpoints (`.ipynb_checkpoints/`) are gitignored; keep notebooks clean before committing
