# Cross-MVP Audit Summary

Last audited: 2026-07-23T09:00:00+05:30

---

## Audit Status

| MVP | Specs Complete | Implementation Status | Cross-MVP Sync | Notes |
|---|---|---|---|---|
| **MVP1** | ✅ 11 requirements, 15 tasks, design doc | 🟡 ~85% Deployed | ✅ PASS | Core pipeline works; some observability instrumentation not wired |
| **MVP1a** | ✅ 5 requirements, 9 tasks, design doc | ⬜ 0% (specs only) | ✅ PASS | Ready to build after MVP1 |
| **MVP1b** | ✅ 7 requirements, 8 tasks, design doc | 🟡 T5 only (E2E) | ✅ PASS | 15 Playwright spec files written (~107 tests); rest pending |
| **MVP2** | ✅ 13 requirements, 20 tasks, design doc | ⬜ 0% (specs only) | ✅ PASS | Ready after MVP1a |
| **MVP3** | ✅ 11 requirements, 19 tasks, design doc | ⬜ 0% (specs only) | ✅ PASS | Ready after MVP2 + MVP1b |
| **MVP4** | ✅ 12 requirements, 20 tasks, design doc | ⬜ 0% (specs only) | ✅ PASS | Ready after MVP2 |

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
| MVP1a + MVP2 | MVP4 | MVP1a + MVP2 complete + all tests GREEN |

MVP3 and MVP4 can run **in parallel** after MVP2 is complete.

---

## Implementation vs Spec Deviations (MVP1)

Findings from code-vs-spec audit on 2026-07-23:

### Behavior Deviations

| Area | Spec Says | Code Does | Impact |
|---|---|---|---|
| Results returned | "top-10 ranked" | Returns ALL scored tickers | Low — frontend paginates at 10; more flexible |
| Ticker limit | max_length=200 | AnalyzeRequest max_length=500 | Low — more permissive than spec |
| FAQ categories | 4 categories | 5 categories | Low — additional category is a bonus |
| Logging | structlog (in requirements.txt) | Standard `logging` module | Medium — structlog listed as dep but never imported |

### Unfinished Wiring (code exists but not connected)

| Component | Status | Notes |
|---|---|---|
| `@timed` decorator (`src/observability/timing.py`) | ✅ Defined | ❌ Never applied to any function |
| `update_ticker_health()` (`src/observability/store.py`) | ✅ Defined | ❌ Never called from routes |
| Cache hit/miss instrumentation | ❌ Not implemented | Cache works but doesn't emit metrics |
| structlog configuration | ❌ Not configured | Listed in requirements.txt but uses standard logging |

### Extra Features (not in original spec)

| Feature | Location | Notes |
|---|---|---|
| Ticker presets (NIFTY_50, SENSEX_30, etc.) | `frontend/src/data/tickerPresets.js` | Convenience for users |
| Custom theme styling | `frontend/src/theme.css` | Visual polish |
| BSE fallback in ticker fetch | `src/data/fetch_market_data.py` | Tries `.BO` suffix if primary fetch fails |

### Test Files (actual vs spec)

**Actual test files (8 files):**
- `tests/test_models.py`
- `tests/test_fetch.py`
- `tests/test_indicators.py`
- `tests/test_scorer.py`
- `tests/test_api.py`
- `tests/test_observability_store.py`
- `tests/test_observability_middleware.py`
- `tests/test_faq.py`

**Not yet created (planned for MVP1b):**
- `tests/conftest.py` — shared fixtures
- `tests/test_swagger.py` — Swagger/OpenAPI schema tests
- `tests/test_cache.py` — cache unit tests
- `tests/test_integration_backend.py` — full integration tests

### E2E Tests (ahead of schedule)

15 Playwright spec files exist in `frontend/e2e/` with ~107 tests. These cover MVP1, MVP1a, MVP2, and MVP4 scenarios (written ahead as part of MVP1b Task 5). `@playwright/test` ^1.61.1 is installed.

---

## Integrity Checks

### MVP1 — Bullish Stock Screener

| Check | Result | Notes |
|---|---|---|
| All requirements have tasks | ✅ PASS | Reqs 1–11 all mapped to tasks 1–15 |
| No orphaned MVP2+ references | ✅ PASS | No API keys, Prometheus, OpenAI, Pinecone |
| Testing scope consistent | ⚠️ PARTIAL | 8 smoke test files exist; observability instrumentation not fully wired |
| Time budget achievable | ✅ PASS | ~85% complete in ~2 hrs |
| Code matches spec | ⚠️ DEVIATIONS | See "Implementation vs Spec Deviations" above |

### MVP1a — Live Data Polling

| Check | Result | Notes |
|---|---|---|
| All requirements have tasks | ✅ PASS | Reqs 1–5 all mapped to tasks 1–9 |
| No orphaned MVP2+ references | ✅ PASS | No Pinecone, RAG, OpenAI generation |
| Testing scope consistent | ✅ PASS | Unit tests per provider + integration gate |
| Implementation status | ⬜ NOT STARTED | Specs complete, no code written |

### MVP1b — Test Hardening

| Check | Result | Notes |
|---|---|---|
| Gate rule defined | ✅ PASS | "All T1–T7 GREEN before starting MVP3 mobile" |
| Test coverage targets defined | ✅ PASS | ~10 → ~140 tests across all layers |
| No feature scope creep | ✅ PASS | Only tests + concurrency + Swagger — no new features |
| Partial implementation | 🟡 T5 DONE | 15 E2E spec files written; T1–T4, T6–T7 pending |

### MVP2 — Deep-Dive Analysis

| Check | Result | Notes |
|---|---|---|
| References MVP1 as foundation | ✅ PASS | "extends the MVP1 Bullish Stock Predictor" |
| No MVP3/4 features leaked in | ✅ PASS | No mobile, no RAG, no Pinecone |
| Security scope correct | ✅ PASS | Full OWASP Web+LLM Top 10 |
| API versioning clean | ✅ PASS | `/api/v2/` routes, v1 backward compatible |

### MVP3 — Native Mobile

| Check | Result | Notes |
|---|---|---|
| MVP1b prerequisite stated | ✅ PASS | "All T1–T7 GREEN before starting" |
| No MVP4 features leaked in | ✅ PASS | No RAG, no Pinecone, no live data |
| Monorepo structure defined | ✅ PASS | packages/shared + web + mobile |

### MVP4 — Live Data + RAG

| Check | Result | Notes |
|---|---|---|
| References MVP1a for data providers | ✅ PASS | Depends on MVP1a for live data layer |
| RAG pipeline complete | ✅ PASS | Ingest → Chunk → Embed → Upsert → Retrieve → Generate → Evaluate |
| Pinecone cost control | ✅ PASS | Delete-and-replace strategy for free tier |
| Evaluation metrics defined | ✅ PASS | precision@k, recall@k, MRR, faithfulness, relevance |
| Prerequisite correct | ✅ PASS | "MVP1 + MVP1a + MVP2 complete" |

---

## Steering Files Sync

| File | Last Verified | Status | Notes |
|---|---|---|---|
| `product.md` | 2026-07-23 | ✅ Updated | All results returned (not top-10); 500 ticker limit; paginated at 10 |
| `tech.md` | 2026-07-23 | ✅ Updated | @playwright/test ^1.61.1 installed; vitest/RTL planned for MVP1b |
| `structure.md` | 2026-07-23 | ✅ Updated | Matches actual file layout; 15 e2e specs; 8 test files; 5 FAQ categories |
| `security.md` | 2026-07-23 | ✅ Accurate | OWASP Web+LLM controls, MVP deployment progression |
| `skills.md` | 2026-07-23 | ✅ Updated | Implementation status noted per MVP |
| `README.md` | 2026-07-23 | ✅ Accurate | Journey shows correct scope per MVP |

---

## Remaining MVP1 Gaps (to reach 100%)

These items are coded but not wired, or are minor gaps:

1. **Apply `@timed` decorator** to `analyze` route and data fetch functions
2. **Call `update_ticker_health()`** from the analyze pipeline after scoring
3. **Wire cache hit/miss metrics** in the ticker detail route
4. **Configure structlog** or remove from requirements.txt (currently unused)
5. **Verify all 8 test files pass** (gate rule for MVP1a/MVP1b start)

---

## How to Re-Run This Audit

Re-run this audit whenever:
1. A requirement is added/moved between MVPs
2. A new steering file is created
3. Before starting implementation of any MVP
4. After completing an MVP (to verify nothing was missed)

Audit checks:
- [ ] Every requirement in each MVP has at least one corresponding task
- [ ] No requirement references features from a later MVP
- [ ] Prerequisite chains are unbroken (MVP1→MVP2→MVP3, MVP4 branches after MVP2)
- [ ] steering/skills.md matches the current scope of each MVP
- [ ] steering/structure.md matches the actual file layout
- [ ] steering/tech.md testing strategy matches the current scope
- [ ] README.md Journey At A Glance is accurate
- [ ] No duplicate requirements across MVPs
- [ ] Implementation matches spec (check for deviations)
