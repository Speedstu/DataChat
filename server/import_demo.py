"""Import demo database with fake data"""
import sqlite3, csv, json, os, time
from pathlib import Path

DB_DIR = Path("data")
DB_DIR.mkdir(exist_ok=True)
INDEX_DB = DB_DIR / "datachat_index.db"

def import_csv(filepath, name, columns):
    print(f"[*] Importing {filepath} as '{name}'...")
    db_path = str(DB_DIR / f"{name}.db")
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    
    col_defs = ", ".join([f'"{c}" TEXT' for c in columns])
    conn.execute(f'DROP TABLE IF EXISTS "{name}"')
    conn.execute(f'CREATE TABLE "{name}" ({col_defs})')
    
    placeholders = ", ".join(["?" for _ in columns])
    row_count = 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < len(columns): row.extend([''] * (len(columns) - len(row)))
            elif len(row) > len(columns): row = row[:len(columns)]
            conn.execute(f'INSERT INTO "{name}" VALUES ({placeholders})', row)
            row_count += 1
    
    for col in columns:
        if any(kw in col for kw in ['nom', 'email', 'telephone', 'code_postal', 'ville']):
            conn.execute(f'CREATE INDEX IF NOT EXISTS "idx_{name}_{col}" ON "{name}" ("{col}")')
    conn.commit()
    conn.close()
    
    conn = sqlite3.connect(str(INDEX_DB))
    conn.execute("""CREATE TABLE IF NOT EXISTS databases (
        name TEXT PRIMARY KEY, source_path TEXT, db_path TEXT,
        tables TEXT, row_count INTEGER, status TEXT, imported_at TEXT)""")
    conn.execute("INSERT OR REPLACE INTO databases VALUES (?,?,?,?,?,?,?)",
        (name, filepath, db_path, json.dumps(columns), row_count, 'ready', time.strftime('%Y-%m-%dT%H:%M:%S')))
    conn.commit()
    conn.close()
    print(f"[✓] Done! {row_count} rows imported")

import_csv("demo_data.csv", "demo_users", ["nom", "email", "telephone", "adresse", "complement", "code_postal", "ville", "pays"])
