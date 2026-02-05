"""Quick import script - runs directly, no API timeout"""
import sqlite3, csv, json, re, os, time
from pathlib import Path

DB_DIR = Path("data")
DB_DIR.mkdir(exist_ok=True)
INDEX_DB = DB_DIR / "datachat_index.db"
CHUNK = 100000

def import_csv(filepath, name, columns):
    print(f"[*] Importing {filepath} as '{name}'...")
    db_path = str(DB_DIR / f"{name}.db")
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA cache_size=-200000")
    
    col_defs = ", ".join([f'"{c}" TEXT' for c in columns])
    conn.execute(f'DROP TABLE IF EXISTS "{name}"')
    conn.execute(f'CREATE TABLE "{name}" ({col_defs})')
    
    placeholders = ", ".join(["?" for _ in columns])
    row_count = 0
    batch = []
    start = time.time()
    
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < len(columns): row.extend([''] * (len(columns) - len(row)))
            elif len(row) > len(columns): row = row[:len(columns)]
            batch.append(row)
            row_count += 1
            if len(batch) >= CHUNK:
                conn.executemany(f'INSERT INTO "{name}" VALUES ({placeholders})', batch)
                conn.commit()
                batch = []
                elapsed = time.time() - start
                rate = row_count / elapsed
                print(f"  [{row_count:,} rows] {elapsed:.1f}s ({rate:,.0f} rows/s)")
    
    if batch:
        conn.executemany(f'INSERT INTO "{name}" VALUES ({placeholders})', batch)
        conn.commit()
    
    # Create indexes
    print(f"[*] Creating indexes...")
    for col in columns:
        if any(kw in col for kw in ['nom', 'email', 'telephone', 'code_postal', 'ville']):
            conn.execute(f'CREATE INDEX IF NOT EXISTS "idx_{name}_{col}" ON "{name}" ("{col}")')
            print(f"  Index on {col}")
    conn.commit()
    conn.close()
    
    # Register in index DB
    conn = sqlite3.connect(str(INDEX_DB))
    conn.execute("""CREATE TABLE IF NOT EXISTS databases (
        name TEXT PRIMARY KEY, source_path TEXT, db_path TEXT,
        tables TEXT, row_count INTEGER, status TEXT, imported_at TEXT
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY, title TEXT, created_at TEXT, updated_at TEXT
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT,
        role TEXT, content TEXT, sql_query TEXT, results_count INTEGER,
        created_at TEXT
    )""")
    conn.execute("INSERT OR REPLACE INTO databases VALUES (?,?,?,?,?,?,?)",
        (name, filepath, db_path, json.dumps(columns), row_count, 'ready', time.strftime('%Y-%m-%dT%H:%M:%S')))
    conn.commit()
    conn.close()
    
    elapsed = time.time() - start
    print(f"\n[✓] Done! {row_count:,} rows imported in {elapsed:.1f}s")
    print(f"    DB: {db_path} ({os.path.getsize(db_path)/1024/1024:.1f} MB)")

import_csv(
    "your_file.csv",
    "your_table",
    ["nom", "email", "telephone", "adresse", "complement", "code_postal", "ville", "pays"]
)
