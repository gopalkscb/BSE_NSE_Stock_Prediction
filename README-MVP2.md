# MVP2 — Deep-Dive Algorithmic Analysis Engine

> 11 indicators, configurable weights, backtesting, security hardening, observability dashboard

## Status: 📋 Planned

## Spec Files
- [Requirements](.kiro/specs/mvp2-deep-analysis/requirements.md)
- [Design](.kiro/specs/mvp2-deep-analysis/design.md)
- [Tasks](.kiro/specs/mvp2-deep-analysis/tasks.md)
- [Security Baseline](.kiro/steering/security.md)

---

## What's New Over MVP1

- **6 new indicators**: Stochastic(14,3,3), MFI(14), ADX/DMI(14), Supertrend(10,3), OBV, VWAP
- **11 total indicators** with configurable weights via YAML + API + UI sliders
- **Historical backtesting** with win rate, avg return, max drawdown per confidence tier
- **Portfolio simulation** with cumulative return, Sharpe ratio, max drawdown
- **SQLite persistent cache** (4hr TTL, survives server restarts)
- **Rate limiting** (slowapi: 10 req/min analysis, 2 req/min backtest)
- **OWASP Web Top 10** (2021) guardrails — A01–A10 fully mitigated
- **OWASP LLM Top 10** (2025) proactive guardrails — LLM01–LLM10
- **Prometheus metrics** + structlog JSON logging + security events ring buffer
- **Admin dashboard** (5 tabs, 15-point OWASP compliance checklist)
- **Watchlist & browser push alerts** on threshold crossing
- **Enhanced candlestick charts** with overlay toggles, zoom/pan, PNG export
- **Sector & index comparison** (relative strength vs. Nifty sub-indices)

---

## New API Endpoints (v2)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v2/config/weights` | API key | Update scoring weights |
| `POST` | `/api/v2/backtest` | API key | Start async backtest job |
| `GET` | `/api/v2/backtest/{job_id}` | API key | Poll backtest status/results |
| `POST` | `/api/v2/portfolio/simulate` | — | Run portfolio simulation |
| `GET` | `/api/v2/cache/status` | API key | Cache stats |
| `GET` | `/api/v2/security/events` | API key | Last 100 security events |
| `GET` | `/api/v2/security/audit-status` | API key | pip/npm audit results |
| `GET` | `/api/v2/admin/verify` | API key | Verify admin key |
| `GET` | `/metrics` | API key | Prometheus metrics |
| `GET` | `/health` | — | Liveness (always 200) |
| `GET` | `/health/ready` | — | Readiness (200 or 503) |

All `/api/v1/` endpoints remain **fully backward compatible**.

---

## New Dependencies

| Package | Purpose |
|---|---|
| `pandas-ta==0.3.14b` | Extended technical indicators |
| `aiosqlite==0.20.0` | SQLite persistent cache |
| `slowapi==0.1.9` | Rate limiting |
| `prometheus-fastapi-instrumentator==6.1.0` | Prometheus metrics |
| `structlog==24.1.0` | Structured JSON logging |
| `pip-audit==2.7.3` | Python dependency scanning |
| `detect-secrets==1.4.0` | Secret leak prevention |
| `pyyaml==6.0.1` | YAML config loading |
| `pydantic-settings==2.2.1` | Settings management |

---

## Security Commands

```bash
# Python (run before every release)
pip-audit --requirement requirements.txt --fail-on HIGH

# JavaScript (run before every release)
cd frontend && npm audit --audit-level=high
```

---

## Deployment

**Internal network / cloud.** HTTPS terminated at reverse proxy (nginx/ALB). API key auth on admin routes. `DEPLOYMENT_ENV=production` disables Swagger and enables HSTS.

---

[← Back to Journey README](README.md)
