"""Tests for src/rag/orchestrator.py — scheduler + circuit breaker."""

import pytest
import time
from src.rag.orchestrator import CircuitBreakerState, PipelineOrchestrator, get_orchestrator


class TestCircuitBreaker:
    def test_initial_state_closed(self):
        cb = CircuitBreakerState()
        assert cb.is_open is False
        assert cb.can_proceed() is True

    def test_opens_after_threshold(self):
        cb = CircuitBreakerState(threshold=3)
        cb.record_failure()
        cb.record_failure()
        assert cb.is_open is False
        cb.record_failure()
        assert cb.is_open is True
        assert cb.can_proceed() is False

    def test_resets_on_success(self):
        cb = CircuitBreakerState(threshold=3)
        cb.record_failure()
        cb.record_failure()
        cb.record_success()
        assert cb.failure_count == 0
        assert cb.is_open is False

    def test_half_open_after_cooldown(self):
        cb = CircuitBreakerState(threshold=1, cooldown_seconds=0)
        cb.record_failure()
        assert cb.is_open is True
        # With 0 cooldown, should immediately allow
        time.sleep(0.01)
        assert cb.can_proceed() is True

    def test_blocked_during_cooldown(self):
        cb = CircuitBreakerState(threshold=1, cooldown_seconds=9999)
        cb.record_failure()
        assert cb.is_open is True
        assert cb.can_proceed() is False


class TestPipelineOrchestrator:
    def test_get_status_initial(self):
        orch = PipelineOrchestrator()
        status = orch.get_status()
        assert status['pipeline_running'] is False
        assert status['last_run_time'] is None

    def test_singleton(self):
        orch1 = get_orchestrator()
        orch2 = get_orchestrator()
        assert orch1 is orch2

    def test_blocked_when_circuit_open(self):
        orch = PipelineOrchestrator()
        orch.circuit_breaker = CircuitBreakerState(threshold=1, cooldown_seconds=9999)
        orch.circuit_breaker.record_failure()
        result = orch.run_pipeline()
        assert result['status'] == 'circuit_open'
        assert 'retry_after_seconds' in result
