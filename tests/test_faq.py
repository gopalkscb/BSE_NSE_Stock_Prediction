"""Smoke test for docs/faq.json — validates structure and content."""

import json
from pathlib import Path


def test_faq_valid_structure():
    """FAQ file has 4 categories with entries containing required fields."""
    faq_path = Path("docs/faq.json")
    assert faq_path.exists(), "docs/faq.json not found"

    with open(faq_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    categories = data["categories"]
    assert len(categories) == 5

    expected_ids = {"data-fetch-errors", "scoring-indicators", "infrastructure-config", "metrics-explained", "indicator-guide"}
    actual_ids = {c["id"] for c in categories}
    assert actual_ids == expected_ids

    # Check all entries have required fields and minimum count
    all_ids = set()
    total_entries = 0
    for cat in categories:
        assert len(cat["entries"]) >= 7, f"Category {cat['id']} has fewer than 7 entries"
        for entry in cat["entries"]:
            assert "id" in entry
            assert "question" in entry
            assert "answer" in entry
            assert "tags" in entry
            assert entry["answer"].strip(), f"Entry {entry['id']} has empty answer"
            assert entry["id"] not in all_ids, f"Duplicate ID: {entry['id']}"
            all_ids.add(entry["id"])
            total_entries += 1

    assert total_entries >= 36, f"Only {total_entries} entries (need >=36)"
