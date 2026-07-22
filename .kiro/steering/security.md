# Security Baseline

This file defines the security guardrails applied from MVP2 onward. All controls are mapped to OWASP risk IDs.

## Deployment Progression

| MVP | Deployment | Security Level |
|---|---|---|
| MVP1 | Local dev only | Input validation, no hardcoded secrets, dep scanning (manual) |
| MVP2 | Internal / cloud | Full OWASP Web + LLM guardrails, API key auth, rate limiting, security headers |
| MVP3 | Public mobile | MVP2 controls + cert pinning, Secure Store, biometric, root detection |

## OWASP Web Top 10 (2021) — Applies from MVP2

| ID | Risk | Primary Guardrail |
|---|---|---|
| A01 | Broken Access Control | API key on admin endpoints; responses contain only requested data |
| A02 | Cryptographic Failures | ADMIN_API_KEY >= 32 chars; HSTS in production; .env never committed |
| A03 | Injection | Ticker regex allowlist `^[A-Z0-9]{1,10}(\\.(NS|BO))?$`; parameterised SQL; no innerHTML |
| A04 | Insecure Design | Rate limiting; 64KB body cap; 200-ticker limit at Pydantic layer |
| A05 | Security Misconfiguration | No CORS wildcard; Swagger disabled in prod; generic 500 messages |
| A06 | Vulnerable Components | `pip-audit --fail-on HIGH`; `npm audit --audit-level=high`; pinned versions with hashes |
| A07 | Auth Failures | Constant-time key comparison; key redacted in logs; rate limit on admin |
| A08 | Data Integrity | Hash-verified pip installs; yfinance data validation; Pydantic Literal labels |
| A09 | Logging Failures | structlog JSON; 401/422/429 at WARNING; security events endpoint |
| A10 | SSRF | Ticker allowlist; 30s timeout; egress firewall in deployment |

## OWASP LLM Top 10 (2025) — Proactive from MVP2

| ID | Risk | Primary Guardrail |
|---|---|---|
| LLM01 | Prompt Injection | No LLM client in core modules (enforced by test) |
| LLM02 | Sensitive Info Disclosure | No raw OHLCV in logs/errors; responses scoped to request |
| LLM03 | Supply Chain | Hash-verified deps; exact version pins; typosquat check |
| LLM04 | Data Poisoning | yfinance validation (>50% moves flagged, negative volume rejected) |
| LLM05 | Improper Output Handling | Cloudscape textContent rendering; Pydantic Literal labels |
| LLM06 | Excessive Agency | DataFetcher calls only yfinance; bounded ThreadPool; writes only to data/ and logs/ |
| LLM07 | System Prompt Leakage | No internal paths in OpenAPI; config endpoint returns values only |
| LLM08 | Vector Weaknesses | Exact-match cache lookups only; no fuzzy matching |
| LLM09 | Misinformation | Disclaimer in every response; data_as_of timestamp; confidence tooltips |
| LLM10 | Unbounded Consumption | 200-ticker Pydantic limit; rate limiting; batch timeout; active-request gauge |

## Security Response Headers (all responses, MVP2+)

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains  (production only)
```

## Admin Authentication

- Method: `X-API-Key` header
- Key source: `ADMIN_API_KEY` environment variable
- Minimum length: 32 characters (rejected at startup otherwise)
- Comparison: `hmac.compare_digest` (constant-time)
- Log handling: redacted to `[REDACTED]` in all log output
- Frontend storage: `sessionStorage` only (cleared on tab close)

## Dependency Scanning Commands

```bash
# Python (run before every release)
pip-audit --requirement requirements.txt --fail-on HIGH

# JavaScript — Web (run before every release)
cd frontend && npm audit --audit-level=high

# JavaScript — Mobile (run before every release)
cd packages/mobile && npm audit --audit-level=high
```

## Secrets Management

- `.env` at project root — NEVER committed
- `.env.example` committed with placeholder values
- `.secrets.baseline` committed (detect-secrets baseline)
- `data/cache.db` gitignored
- `logs/` gitignored
- `reports/` gitignored (audit output)
