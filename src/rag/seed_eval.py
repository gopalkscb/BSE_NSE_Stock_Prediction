"""Seed rag_eval.db with 20 baseline evaluation records + per-query breakdown."""
import sqlite3
import os
import json
import random
from datetime import datetime, timedelta

SEED_COUNT = 20
REPLACE_THRESHOLD = 50  # Replace seed data once real evaluations exceed this count
DB_PATH = os.path.join('data', 'rag_eval.db')
EVAL_SET_PATH = os.path.join('data', 'rag_eval_set.json')


def seed_evaluations():
    os.makedirs('data', exist_ok=True)
    db = sqlite3.connect(DB_PATH)

    # Create tables
    db.execute('''CREATE TABLE IF NOT EXISTS evaluation_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        precision_at_k REAL NOT NULL,
        recall_at_k REAL NOT NULL,
        mrr REAL NOT NULL,
        context_relevance REAL NOT NULL,
        answer_faithfulness REAL NOT NULL,
        answer_relevance REAL NOT NULL,
        total_queries INTEGER NOT NULL,
        duration_seconds REAL NOT NULL,
        tokens_consumed INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0.0
    )''')
    db.execute('''CREATE TABLE IF NOT EXISTS evaluation_query_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eval_id INTEGER NOT NULL,
        query TEXT NOT NULL,
        precision_at_k REAL NOT NULL,
        recall_at_k REAL NOT NULL,
        mrr REAL NOT NULL,
        faithfulness REAL NOT NULL,
        answer_relevance REAL NOT NULL,
        context_relevance REAL NOT NULL,
        retrieved_count INTEGER DEFAULT 0,
        tokens_used INTEGER DEFAULT 0,
        FOREIGN KEY (eval_id) REFERENCES evaluation_results(id)
    )''')

    # Check if we should seed or skip
    count = db.execute('SELECT COUNT(*) FROM evaluation_results').fetchone()[0]
    if count >= REPLACE_THRESHOLD:
        print(f'Already have {count} records (threshold={REPLACE_THRESHOLD}). Skipping seed.')
        db.close()
        return

    # Clear existing seed data and re-seed
    db.execute('DELETE FROM evaluation_query_results')
    db.execute('DELETE FROM evaluation_results')

    # Load eval set queries
    queries = []
    try:
        with open(EVAL_SET_PATH, 'r') as f:
            data = json.load(f)
            queries = [s['query'] for s in data.get('samples', [])]
    except FileNotFoundError:
        queries = [f'Sample query {i+1}' for i in range(20)]

    # Use first 20 queries for per-query breakdown
    eval_queries = queries[:20]

    # Generate 20 evaluation results over the past 5 days (every 6 hours)
    base_time = datetime(2026, 7, 18, 2, 0, 0)
    random.seed(42)

    for i in range(SEED_COUNT):
        ts = base_time + timedelta(hours=i * 6)
        progress = i / (SEED_COUNT - 1)  # 0.0 to 1.0

        # Simulate gradual improvement with realistic variance
        precision = 0.45 + progress * 0.25 + random.uniform(-0.03, 0.03)
        recall = 0.40 + progress * 0.28 + random.uniform(-0.04, 0.04)
        mrr = 0.50 + progress * 0.30 + random.uniform(-0.03, 0.03)
        ctx_rel = 0.55 + progress * 0.22 + random.uniform(-0.03, 0.03)
        faithfulness = 0.60 + progress * 0.22 + random.uniform(-0.02, 0.02)
        answer_rel = 0.50 + progress * 0.28 + random.uniform(-0.03, 0.03)

        # Clamp to [0, 1]
        precision = max(0, min(1, precision))
        recall = max(0, min(1, recall))
        mrr = max(0, min(1, mrr))
        ctx_rel = max(0, min(1, ctx_rel))
        faithfulness = max(0, min(1, faithfulness))
        answer_rel = max(0, min(1, answer_rel))

        total_queries = len(eval_queries)
        duration = round(random.uniform(8.0, 25.0), 2)
        tokens = random.randint(12000, 45000)
        cost = round(tokens * 0.0000004, 4)

        cursor = db.execute('''INSERT INTO evaluation_results 
            (timestamp, precision_at_k, recall_at_k, mrr, context_relevance,
             answer_faithfulness, answer_relevance, total_queries,
             duration_seconds, tokens_consumed, cost_usd)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (ts.strftime('%Y-%m-%dT%H:%M:%SZ'),
             round(precision, 4), round(recall, 4), round(mrr, 4),
             round(ctx_rel, 4), round(faithfulness, 4), round(answer_rel, 4),
             total_queries, duration, tokens, cost))

        eval_id = cursor.lastrowid

        # Generate per-query metrics for this evaluation run
        for q_idx, query in enumerate(eval_queries):
            # Per-query metrics vary around the aggregate with some spread
            q_precision = max(0, min(1, precision + random.uniform(-0.15, 0.15)))
            q_recall = max(0, min(1, recall + random.uniform(-0.15, 0.15)))
            q_mrr = max(0, min(1, mrr + random.uniform(-0.20, 0.10)))
            q_faith = max(0, min(1, faithfulness + random.uniform(-0.10, 0.10)))
            q_ans_rel = max(0, min(1, answer_rel + random.uniform(-0.12, 0.12)))
            q_ctx_rel = max(0, min(1, ctx_rel + random.uniform(-0.12, 0.12)))
            q_retrieved = random.randint(5, 10)
            q_tokens = random.randint(400, 1200)

            db.execute('''INSERT INTO evaluation_query_results
                (eval_id, query, precision_at_k, recall_at_k, mrr,
                 faithfulness, answer_relevance, context_relevance,
                 retrieved_count, tokens_used)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (eval_id, query,
                 round(q_precision, 4), round(q_recall, 4), round(q_mrr, 4),
                 round(q_faith, 4), round(q_ans_rel, 4), round(q_ctx_rel, 4),
                 q_retrieved, q_tokens))

    db.commit()

    final_count = db.execute('SELECT COUNT(*) FROM evaluation_results').fetchone()[0]
    query_count = db.execute('SELECT COUNT(*) FROM evaluation_query_results').fetchone()[0]
    latest = db.execute('SELECT * FROM evaluation_results ORDER BY id DESC LIMIT 1').fetchone()
    print(f'Seeded {final_count} evaluation records + {query_count} per-query records into {DB_PATH}')
    print(f'Latest metrics: P@K={latest[2]:.3f}, R@K={latest[3]:.3f}, MRR={latest[4]:.3f}, '
          f'Faith={latest[6]:.3f}, AnsRel={latest[7]:.3f}, CtxRel={latest[5]:.3f}')
    print(f'Replace threshold: {REPLACE_THRESHOLD}')
    db.close()


if __name__ == '__main__':
    seed_evaluations()
