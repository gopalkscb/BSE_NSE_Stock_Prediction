# BSE/NSE Bullish Stock Predictor

A full-stack application that analyses BSE and NSE stock tickers using technical indicators and ranks the **top 10 most bullish stocks** for a 30-day outlook.

---

## Product Journey

This project evolves across six MVPs, each building on the previous:

| MVP | Focus | Status | README |
|---|---|---|---|
| **MVP1** | Rules-based web screener (5 indicators) | 🟡 In Progress | [README-MVP1.md](README-MVP1.md) |
| **MVP1a** | Live data polling (multi-source, admin, consumption) | ✅ Specs Complete | [README-MVP1a.md](README-MVP1a.md) |
| **MVP1b** | Test hardening (property + unit + integration + E2E) | 📋 Planned | [README-MVP1b.md](README-MVP1b.md) |
| **MVP2** | Deep-dive analysis (11 indicators, security, observability) | 📋 Planned | [README-MVP2.md](README-MVP2.md) |
| **MVP3** | Native mobile app (Android + iOS) | 📋 Planned | [README-MVP3.md](README-MVP3.md) |
| **MVP4** | Live data + RAG intelligence (Pinecone, OpenAI, hybrid retrieval) | 📋 Planned | [README-MVP4.md](README-MVP4.md) |

---

## MVP Prerequisite Chain

```
MVP1 (2.5 hrs) → MVP1a (2 hrs, live polling) → MVP2 (extends MVP1+MVP1a)
                                               ↘ MVP1b (test hardening)
               MVP2 → MVP3 (extends MVP2 + MVP1b)
                    ↘ MVP4 (RAG only, branches after MVP2, needs MVP1a)
```

| From | To | Gate Rule |
|---|---|---|
| MVP1 | MVP1a | All MVP1 smoke tests GREEN |
| MVP1 | MVP1b | All MVP1 smoke tests GREEN |
| MVP1a | MVP2 | MVP1a Tasks 1-9 complete |
| MVP1b | MVP3 | All T1–T7 tests GREEN (~140 tests) |
| MVP2 | MVP3 | MVP2 Tasks 16–35 complete + all tests GREEN |
| MVP1a + MVP2 | MVP4 | MVP1a + MVP2 tasks complete + all tests GREEN |

MVP3 and MVP4 can run **in parallel** after MVP2 is complete.

---

## Journey At A Glance

```
MVP1 (Local Dev)             MVP1a (Local Dev)                MVP2 (Internal/Cloud)           MVP3 (Public Mobile)
─────────────────────        ─────────────────────────────    ─────────────────────────────   ──────────────────────────────
Web only                     Web only                         Web (enhanced)                  Web + Android + iOS
5 indicators                 5 indicators + live prices       11 indicators + weights config  Same 11, mobile-optimized
Rule-based equal weights     Same scoring engine              Weighted configurable scoring   Same engine, shared package
In-memory cache              In-memory cache                  SQLite + 4hr TTL                MMKV offline-first
No auth                      No auth                          API key (admin)                 API key in Secure Store + bio
No alerts                    No alerts                        Web push + polling              FCM/APNs native push
Observability UI + FAQ       + data source health panel       Prometheus + structlog + admin  Sentry + in-app admin
No security hardening        No security hardening            OWASP Web+LLM Top 10           + cert pinning + root detect
FastAPI v1                   FastAPI v1 + /api/v1/sources     FastAPI v1 + v2                 + Celery + Redis
React + Cloudscape           + source selector + usage panel  + enhanced charts + /admin      React Native + Expo
pytest (smoke tests)         Same + provider unit tests       Same + test_security.py         + hypothesis + Playwright + Detox
```

---

## Spec Files

| MVP | Requirements | Design | Tasks |
|---|---|---|---|
| MVP1 | [requirements.md](.kiro/specs/mvp1-bullish-screener/requirements.md) | [design.md](.kiro/specs/mvp1-bullish-screener/design.md) | [tasks.md](.kiro/specs/mvp1-bullish-screener/tasks.md) |
| MVP1a | [requirements.md](.kiro/specs/mvp1a-live-polling/requirements.md) | [design.md](.kiro/specs/mvp1a-live-polling/design.md) | [tasks.md](.kiro/specs/mvp1a-live-polling/tasks.md) |
| MVP1b | [requirements.md](.kiro/specs/mvp1b-test-hardening/requirements.md) | [design.md](.kiro/specs/mvp1b-test-hardening/design.md) | [tasks.md](.kiro/specs/mvp1b-test-hardening/tasks.md) |
| MVP2 | [requirements.md](.kiro/specs/mvp2-deep-analysis/requirements.md) | [design.md](.kiro/specs/mvp2-deep-analysis/design.md) | [tasks.md](.kiro/specs/mvp2-deep-analysis/tasks.md) |
| MVP3 | [requirements.md](.kiro/specs/mvp3-mobile/requirements.md) | [design.md](.kiro/specs/mvp3-mobile/design.md) | [tasks.md](.kiro/specs/mvp3-mobile/tasks.md) |
| MVP4 | [requirements.md](.kiro/specs/mvp4-live-rag/requirements.md) | [design.md](.kiro/specs/mvp4-live-rag/design.md) | [tasks.md](.kiro/specs/mvp4-live-rag/tasks.md) |

---

## Steering & Conventions

| File | Purpose |
|---|---|
| [product.md](.kiro/steering/product.md) | Product vision and core purpose |
| [tech.md](.kiro/steering/tech.md) | Tech stack and common commands |
| [structure.md](.kiro/steering/structure.md) | Project layout and conventions |
| [security.md](.kiro/steering/security.md) | OWASP guardrails (Web + LLM Top 10) |
| [skills.md](.kiro/steering/skills.md) | MVP skill definitions for agent context |
| [audit.md](.kiro/steering/audit.md) | Cross-MVP audit summary and integrity checks |

---

## Quick Start (MVP1)

```bash
# Backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.api.main:app --reload
# → http://localhost:8000 (Swagger: /docs)

# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

---

## Security Baseline

| MVP | Deployment | Security Level |
|---|---|---|
| MVP1 | Local dev | Input validation, no hardcoded secrets, manual dep scan |
| MVP2 | Internal/cloud | Full OWASP Web+LLM, API key auth, rate limiting, security headers |
| MVP3 | Public mobile | + cert pinning, Secure Store, biometric, root detection |

See [security.md](.kiro/steering/security.md) for the full OWASP control mapping.

---

## Running Tests

```bash
# Python (all MVPs)
pytest tests/ -v
pytest tests/ --cov=src --cov-report=term-missing

# JavaScript (MVP1/MVP2 web)
cd frontend && npx vitest run

# E2E (MVP1b test hardening / MVP2 web — deferred from MVP1)
cd frontend && npx playwright test

# Mobile E2E (MVP3)
cd packages/mobile && npx detox test

# Security (MVP2+)
pip-audit --requirement requirements.txt --fail-on HIGH
npm audit --audit-level=high
```

---

## Environment Variables

| Variable | Default | MVP | Description |
|---|---|---|---|
| `FRONTEND_ORIGIN` | `http://localhost:5173` | 1+ | CORS allowed origin |
| `VITE_API_URL` | `http://localhost:8000` | 1+ | Backend URL for frontend |
| `LOG_LEVEL` | `INFO` | 1+ | Logging level (DEBUG/INFO/WARNING/ERROR) |
| `ADMIN_API_KEY` | — | 2+ | Admin endpoint auth (≥32 chars) |
| `DEPLOYMENT_ENV` | `development` | 2+ | Controls debug/Swagger/HSTS |
| `BATCH_TIMEOUT_SECONDS` | `90` | 2+ | yfinance batch timeout |
| `TICKER_TIMEOUT_SECONDS` | `15` | 2+ | Per-ticker fetch timeout |
| `API_MONTHLY_BUDGET_USD` | `10.0` | 1a+ | Monthly API cost alert threshold |
| `ALPHA_VANTAGE_API_KEY` | — | 1a+ | Alpha Vantage data source |
| `BSE_API_BASE_URL` | `https://api.bseindia.com` | 1a+ | BSE India API base URL |
| `NSE_API_BASE_URL` | `https://www.nseindia.com/api` | 1a+ | NSE India API base URL |
| `YFINANCE_RATE_LIMIT_PER_MIN` | `100` | 1a+ | yfinance rate limit |
| `BSE_RATE_LIMIT_PER_MIN` | `10` | 1a+ | BSE India rate limit |
| `NSE_RATE_LIMIT_PER_MIN` | `5` | 1a+ | NSE India rate limit |
| `SENTRY_DSN` | — | 3 | Sentry crash reporting DSN |
| `PINECONE_API_KEY` | — | 4 | Pinecone vector DB API key |
| `OPENAI_API_KEY` | — | 4 | OpenAI embeddings + generation |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | 4 | Embedding model |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | 4 | LLM for generation |
| `RAG_BM25_WEIGHT` | `0.3` | 4 | BM25 weight in hybrid fusion |
| `RAG_INGEST_INTERVAL_HOURS` | `6` | 4 | Ingestion schedule |
| `PINECONE_MULTI_INDEX` | `false` | 4 | Multi-index mode (paid tier) |
| `ENABLE_RAG_EXPLANATIONS` | `true` | 4 | Toggle AI explanations |

Create a `.env` file at the project root — never commit it.

---

## Ticker Format

- **NSE**: `RELIANCE.NS`, `TCS.NS`, `INFY.NS`
- **BSE**: `500325.BO`, `RELIANCE.BO`
- Max 200 tickers per request
- Min 50 trading days of data required per ticker

---

## License

Private — not open source.
