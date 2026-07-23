# Tech Stack

## Languages
- **Backend**: Python 3.x
- **Frontend**: JavaScript (React 18 + JSX)

## Backend Libraries (pinned in `requirements.txt`)

| Purpose | Library | Version |
|---|---|---|
| API framework | `fastapi` | 0.111.0 |
| ASGI server | `uvicorn[standard]` | 0.29.0 |
| Data validation | `pydantic` | 2.7.1 |
| Market data | `yfinance` | 0.2.40 |
| Data processing | `pandas` | 2.2.2 |
| Numerical ops | `numpy` | 1.26.4 |
| HTTP test client | `httpx` | 0.27.0 |
| Unit testing | `pytest` | 8.2.0 |
| Async test support | `pytest-asyncio` | 0.23.6 |
| Property-based tests | `hypothesis` | 6.100.1 |

## Frontend Libraries (in `frontend/package.json`)

| Purpose | Library | Version | Status |
|---|---|---|---|
| UI framework | `react` + `react-dom` | ^18.3.0 | ✅ Installed |
| Build tool | `vite` | ^5.x | ✅ Installed |
| UI component library | `@cloudscape-design/components` | ^3.0.0 | ✅ Installed |
| Cloudscape global styles | `@cloudscape-design/global-styles` | ^1.0.0 | ✅ Installed |
| Charts | `recharts` | ^2.12.0 | ✅ Installed |
| HTTP client | `axios` | ^1.7.0 | ✅ Installed |
| E2E / browser tests | `@playwright/test` | ^1.61.1 | ✅ Installed |
| JS unit tests | `vitest` | ^1.6.0 | 📋 Planned (MVP1b) |
| Component testing | `@testing-library/react` | ^15.0.0 | 📋 Planned (MVP1b) |
| User interaction testing | `@testing-library/user-event` | ^14.0.0 | 📋 Planned (MVP1b) |
| DOM environment | `jsdom` | ^24.0.0 | 📋 Planned (MVP1b) |

## API Documentation
- **Swagger UI** is available at `http://localhost:8000/docs` when the backend is running
- **ReDoc** is available at `http://localhost:8000/redoc`
- **OpenAPI schema** is served at `http://localhost:8000/openapi.json`
- Every route must have `summary`, `description`, `response_description`, and example error `responses` annotations so Swagger UI renders them usefully

## Testing Strategy

### Current state (as of 2026-07-23)
- **Python**: 8 test files (smoke tests, 1–3 per module) — all GREEN
- **Playwright E2E**: 15 spec files with ~107 tests written (covers MVP1, MVP1a, MVP2, MVP4 scenarios) — `@playwright/test` ^1.61.1 installed
- **Vitest / React Testing Library**: NOT yet installed — planned for MVP1b

### MVP1 scope (basic smoke tests only)
MVP1 uses basic pytest smoke tests (1–3 per module) with a lite gate rule: each module needs at least 1 passing test before proceeding. No property-based tests, no frontend unit tests in MVP1.

### MVP1b / MVP2+ scope (full test infrastructure)
The following full testing stack is used from MVP1b (test hardening, tracked in MVP3 scope) onward:

### Gate rule (strictly enforced — MVP1b+)
Unit tests must be GREEN before proceeding to the next unit. Integration tests must ALL be GREEN before proceeding to the next module. Playwright E2E tests must ALL be GREEN before the frontend is complete.

### Python (pytest)
- Unit tests: one `tests/test_<module>.py` per source module
- Property-based tests (MVP1b+): use `hypothesis` for mathematical invariants (scoring functions, indicator bounds)
- Integration tests (MVP1b+): `tests/test_integration_backend.py` using `httpx.AsyncClient` with `ASGITransport`
- Run: `pytest tests/ -v`

### JavaScript (Vitest) — MVP1b+
- Unit tests: co-located `*.test.jsx` / `*.test.js` files
- Component tests: Vitest + React Testing Library
- Run: `cd frontend && npx vitest run`

### E2E (Playwright) — MVP1b+
- Test files in `frontend/e2e/`
- Requires both backend (`uvicorn`) and frontend (`vite`) dev servers running
- Use Playwright route interception (`page.route(...)`) to mock API responses in isolation tests
- Run: `cd frontend && npx playwright test`
- First-time setup: `npx playwright install --with-deps`

## Package Management
- **Python**: `pip` with `requirements.txt` (pinned versions); activate `.venv` before running
- **JavaScript**: `npm` with `frontend/package.json`; run commands from inside `frontend/`
- Virtual environment: `.venv/` (gitignored — always activate before running Python commands)

## Common Commands

```bash
# ── Backend ──────────────────────────────────────────────
# Activate virtual environment (Windows)
.venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI backend (with hot reload)
uvicorn src.api.main:app --reload
# → API: http://localhost:8000
# → Swagger UI: http://localhost:8000/docs

# Run all Python tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=term-missing

# Lint and format
ruff check .
ruff format .

# Type checking
mypy src/

# ── Frontend ─────────────────────────────────────────────
# Install JS dependencies
cd frontend && npm install

# Start dev server
npm run dev
# → http://localhost:5173

# Run Vitest unit tests
npx vitest run

# Build for production
npm run build

# ── Playwright E2E ────────────────────────────────────────
# Install browser binaries (first time only)
npx playwright install --with-deps

# Run all E2E tests (both servers must be running)
npx playwright test

# Interactive UI mode
npx playwright test --ui

# View HTML test report
npx playwright show-report
```

## Code Quality
- `ruff` for Python linting and formatting (`.ruff_cache/` is gitignored)
- `mypy` for Python static type checking
- ESLint for JavaScript linting (configured in `frontend/`)
- Never commit `.env` — use environment variables for all secrets and config
- Jupyter notebook checkpoints (`.ipynb_checkpoints/`) are gitignored; keep notebooks clean before committing
