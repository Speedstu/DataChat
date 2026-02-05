from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json
import os
import csv
import io
import re
import time
import hashlib
import httpx
import threading
import urllib.parse
from datetime import datetime
from pathlib import Path
from osint_engine import run_deep_osint, analyze_email, analyze_phone

OLLAMA_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen2.5:7b"

app = Flask(__name__)
CORS(app)

DB_DIR = Path("data")
DB_DIR.mkdir(exist_ok=True)
INDEX_DB = DB_DIR / "datachat_index.db"
DATABASES_PATH = Path(r"H:\databases")

def init_db():
    conn = sqlite3.connect(str(INDEX_DB))
    conn.execute("""CREATE TABLE IF NOT EXISTS databases (
        name TEXT PRIMARY KEY, source_path TEXT, db_path TEXT,
        tables TEXT, row_count INTEGER, status TEXT, imported_at TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY, title TEXT, created_at TEXT, updated_at TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT,
        role TEXT, content TEXT, sql_query TEXT, results_count INTEGER, created_at TEXT)""")
    conn.commit()
    conn.close()

init_db()

databases = {}

def load_databases():
    global databases
    databases = {}
    conn = sqlite3.connect(str(INDEX_DB))
    rows = conn.execute("SELECT name, source_path, db_path, tables, row_count, status FROM databases").fetchall()
    for name, source_path, db_path, tables, row_count, status in rows:
        if db_path and os.path.exists(db_path):
            databases[name] = {
                "source_path": source_path, "db_path": db_path,
                "columns": json.loads(tables) if tables else [],
                "row_count": row_count, "status": status
            }
    conn.close()

load_databases()

def scan_files():
    found = []
    if not DATABASES_PATH.exists():
        return found
    for f in DATABASES_PATH.iterdir():
        ext = f.suffix.lower()
        if ext in ['.json', '.csv', '.db', '.sqlite', '.sqlite3', '.txt', '.rar', '.7z']:
            size_mb = f.stat().st_size / (1024 * 1024)
            found.append({
                "name": f.stem, "filename": f.name, "path": str(f),
                "size_mb": round(size_mb, 1), "type": ext,
                "imported": f.stem in databases,
                "status": databases.get(f.stem, {}).get("status", "not_imported")
            })
    return found

def parse_query(user_msg, db_name, columns):
    q = user_msg.lower()
    
    if any(kw in q for kw in ['combien', 'nombre', 'count', 'total', 'nb ', 'how many', 'how much']):
        dept = re.search(r'\b(\d{2})\b', user_msg)
        cp = re.search(r'\b(\d{5})\b', user_msg)
        
        if cp:
            cp_cols = [c for c in columns if any(k in c for k in ['code_postal', 'cp', 'postal', 'adresse_code_postal'])]
            if cp_cols:
                return f'SELECT COUNT(*) as total FROM "{db_name}" WHERE "{cp_cols[0]}" = \'{cp.group(1)}\''
        
        if dept:
            cp_cols = [c for c in columns if any(k in c for k in ['code_postal', 'cp', 'postal', 'adresse_code_postal'])]
            if cp_cols:
                return f'SELECT COUNT(*) as total FROM "{db_name}" WHERE "{cp_cols[0]}" LIKE \'{dept.group(1)}%\''
        
        city_match = re.search(r'(?:à|a|de|dans|sur|in|from|at)\s+([A-ZÀ-Üa-zà-ü\s\-]+)', q)
        if city_match:
            city = city_match.group(1).strip().upper()
            if city not in ['LE', 'LA', 'LES', 'UN', 'UNE', 'DES', 'THE', 'A']:
                city_cols = [c for c in columns if any(k in c for k in ['ville', 'commune', 'city'])]
                if city_cols:
                    return f'SELECT COUNT(*) as total FROM "{db_name}" WHERE UPPER("{city_cols[0]}") LIKE \'%{city}%\''
        
        return f'SELECT COUNT(*) as total FROM "{db_name}"'
    
    email = re.search(r'[\w.\-]+@[\w.\-]+\.\w+', user_msg)
    if email:
        email_cols = [c for c in columns if any(k in c for k in ['email', 'mail', 'courriel'])]
        if email_cols:
            return f'SELECT * FROM "{db_name}" WHERE UPPER("{email_cols[0]}") = UPPER(\'{email.group()}\') LIMIT 50'
    
    phone = re.search(r'(\+33|0[67])\s*\d[\d\s]{7,}', user_msg)
    if phone:
        ph = re.sub(r'\s', '', phone.group())
        phone_cols = [c for c in columns if any(k in c for k in ['tel', 'phone', 'telephone'])]
        if phone_cols:
            return f'SELECT * FROM "{db_name}" WHERE "{phone_cols[0]}" LIKE \'%{ph}%\' LIMIT 50'
    
    cp = re.search(r'\b(\d{5})\b', user_msg)
    if cp and not any(kw in q for kw in ['combien', 'nombre']):
        cp_cols = [c for c in columns if any(k in c for k in ['code_postal', 'cp', 'postal', 'adresse_code_postal'])]
        if cp_cols:
            return f'SELECT * FROM "{db_name}" WHERE "{cp_cols[0]}" = \'{cp.group(1)}\' LIMIT 50'
    
    caps_words = [w for w in user_msg.split() if w.isupper() and len(w) > 1 and not w.isdigit()]
    
    common_lower = {
            'cherche','trouve','recherche','moi','les','des','dans','la','le','un','une',
            'qui','que','est','sont','avec','pour','sur','de','du','au','aux','info',
            'informations','donne','montre','affiche','tout','tous','toutes','base',
            'données','database','personnes','personne','gens','liste','boulanger','caf',
            'fait','faire','approfondie','aprofondie','profonde','rechercher','cherhce',
            'details','detail','fiche','profil','osint','analyse','analyser','rapport',
            'propos','infos','chercher','trouver','donner','montrer','afficher','lister',
            'combien','nombre','total','count','email','telephone','adresse','ville',
            'code','postal','nom','prenom','where','from','select',
            'find','search','look','lookup','get','show','give','tell','about',
            'the','and','for','with','this','that','what','who','how','many',
            'people','person','user','users','information','data','deep',
            'scan','report','profile','investigate','investigation','check',
            'all','any','some','please','can','you','me','his','her','their',
            'address','city','phone','name','first','last','number','results',
            'much','more','list','display','fetch','query','run'}
    
    if caps_words:
        words = caps_words
    else:
        words = [w for w in user_msg.split() if w.lower() not in common_lower and len(w) > 1 and not w.isdigit()]
    
    if words:
        name_cols = [c for c in columns if any(k in c for k in ['nom', 'name', 'prenom', 'nom_complet'])]
        if name_cols and len(words) >= 2:
            word_conds = []
            for w in words:
                w_cond = " OR ".join([f'UPPER("{c}") LIKE UPPER(\'%{w}%\')' for c in name_cols])
                word_conds.append(f"({w_cond})")
            conds_and = " AND ".join(word_conds)
            return f'SELECT * FROM "{db_name}" WHERE {conds_and} LIMIT 50'
        elif name_cols:
            search = words[0]
            conds = " OR ".join([f'UPPER("{c}") LIKE UPPER(\'%{search}%\')' for c in name_cols])
            return f'SELECT * FROM "{db_name}" WHERE {conds} LIMIT 50'
        else:
            search = words[0]
            conds = " OR ".join([f'UPPER("{c}") LIKE UPPER(\'%{search}%\')' for c in columns[:5]])
            return f'SELECT * FROM "{db_name}" WHERE {conds} LIMIT 50'
    
    return f'SELECT * FROM "{db_name}" LIMIT 20'

def detect_db(query):
    q = query.lower()
    for name in databases:
        if name.lower() in q:
            return name
    if any(kw in q for kw in ['caf', 'allocataire', 'aah', 'organisme']):
        for name, info in databases.items():
            if any('matricule' in c for c in info["columns"]):
                return name
    ready = [n for n in databases if databases[n]["status"] == "ready"]
    return ready[0] if ready else None

def format_response(query, results, db_name, elapsed):
    count = results["count"]
    rows = results["rows"]
    
    if count == 0:
        return f"Aucun résultat trouvé dans **{db_name}**. Essayez avec d'autres termes."
    
    if len(rows) == 1 and 'total' in rows[0]:
        total = rows[0]['total']
        return f"**{total:,}** enregistrements trouvés dans **{db_name}** ({elapsed}s)"
    
    response = f"**{count} résultat{'s' if count > 1 else ''}** dans **{db_name}** ({elapsed}s)\n\n"
    for i, row in enumerate(rows[:5]):
        response += f"### Résultat {i+1}\n"
        for key, val in row.items():
            if val and str(val).strip() and str(val) != 'None':
                display_key = key.replace('_', ' ').title()
                response += f"- **{display_key}**: {val}\n"
        response += "\n"
    if count > 5:
        response += f"\n*...et {count - 5} autres résultats dans le tableau.*"
    return response

def run_query(db_name, sql, limit=100):
    if db_name not in databases:
        raise ValueError(f"Database '{db_name}' not found")
    conn = sqlite3.connect(databases[db_name]["db_path"])
    conn.row_factory = sqlite3.Row
    if not sql.strip().upper().startswith("SELECT"):
        raise ValueError("Only SELECT allowed")
    if "LIMIT" not in sql.upper():
        sql += f" LIMIT {limit}"
    cursor = conn.execute(sql)
    cols = [d[0] for d in cursor.description]
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"columns": cols, "rows": rows, "count": len(rows)}

@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "databases": len(databases)})

@app.route('/api/databases')
def list_databases():
    load_databases()
    dbs = []
    for name, info in databases.items():
        dbs.append({"name": name, "columns": info["columns"], "row_count": info["row_count"], "status": info["status"], "source": info["source_path"]})
    return jsonify(dbs)

@app.route('/api/databases/scan')
def api_scan():
    load_databases()
    return jsonify(scan_files())

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    msg = data.get("message", "").strip()
    conv_id = data.get("conversation_id")
    ai_mode = data.get("ai_mode", False)
    
    if not msg:
        return jsonify({"error": "Empty message"}), 400
    
    if not conv_id:
        conv_id = hashlib.md5(f"{msg}{time.time()}".encode()).hexdigest()[:12]
        conn = sqlite3.connect(str(INDEX_DB))
        conn.execute("INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?,?,?,?)",
            (conv_id, msg[:50], datetime.now().isoformat(), datetime.now().isoformat()))
        conn.commit()
        conn.close()
    
    start = time.time()
    
    db_name = detect_db(msg)
    if not db_name:
        return jsonify({"response": "Aucune base importée. Importez d'abord vos fichiers.", "sql": None, "results": None, "time": 0, "conversation_id": conv_id})
    
    columns = databases[db_name]["columns"]
    sql = parse_query(msg, db_name, columns)
    
    try:
        results = run_query(db_name, sql)
    except Exception as e:
        return jsonify({"response": f"Erreur SQL: {e}", "sql": sql, "results": None, "time": 0, "conversation_id": conv_id})
    
    elapsed = round(time.time() - start, 3)
    
    if not ai_mode:
        response = format_response(msg, results, db_name, elapsed)
        conn = sqlite3.connect(str(INDEX_DB))
        conn.execute("INSERT INTO messages (conversation_id, role, content, sql_query, results_count, created_at) VALUES (?,?,?,?,?,?)",
            (conv_id, "user", msg, None, None, datetime.now().isoformat()))
        conn.execute("INSERT INTO messages (conversation_id, role, content, sql_query, results_count, created_at) VALUES (?,?,?,?,?,?)",
            (conv_id, "assistant", response, sql, results["count"], datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return jsonify({"response": response, "sql": sql, "results": results, "database": db_name, "time": elapsed, "conversation_id": conv_id, "osint": None})
    
    osint = None
    if results["count"] > 0:
        person = results["rows"][0]
        osint = run_deep_osint(person, results["rows"][:5])
        
        if osint:
            stats = osint.get("stats", {})
            scan_time = osint.get("scan_time", 0)
            
            summary = None
            try:
                person_json = json.dumps(person, ensure_ascii=False, indent=2)[:1000]
                social_found = [p for p in osint.get("social_profiles", []) if p.get("exists")]
                social_str = ", ".join([f"{p['platform']} ({p['url']})" for p in social_found]) if social_found else "Aucun profil confirmé"
                breach_str = f"{stats.get('breaches', 0)} breach(es) trouvée(s)" if stats.get('breaches') else "Aucune breach connue"
                google_str = f"{stats.get('google_hits', 0)} résultats Google"
                
                prompt = f"""Analyse OSINT complète pour cette personne.

Données DB:
{person_json}

Résultats du scan OSINT ({scan_time}s):
- Google: {google_str}
- Réseaux sociaux confirmés: {social_str}
- Data breaches: {breach_str}
- Pages blanches: {stats.get('pages_blanches', 0)} résultat(s)
- Email provider: {osint.get('email_info', {}).get('provider', 'N/A')}
- Username dérivé: {osint.get('username', 'N/A')}
- Téléphone: {osint.get('phone_info', {}).get('type', 'N/A')}

Génère un rapport OSINT professionnel en markdown:
1. **Identité** - Résumé
2. **Contact** - Email, téléphone, analyse
3. **Localisation** - Adresse complète
4. **Empreinte numérique** - Présence en ligne réelle trouvée
5. **Fuites de données** - Breaches connues
6. **Évaluation** - Niveau d'exposition numérique (faible/moyen/élevé)

Sois factuel et concis."""
                
                summary = ollama_generate(prompt, "Tu es un analyste OSINT senior. Rapports structurés, factuels, markdown.", timeout=20)
            except:
                pass
            
            if not summary:
                name = osint.get("name", "")
                email = osint.get("email", "")
                phone = osint.get("phone", "")
                city = osint.get("city", "")
                address = osint.get("address", "")
                cp = osint.get("code_postal", "")
                ei = osint.get("email_info", {})
                pi = osint.get("phone_info", {})
                social_found = [p for p in osint.get("social_profiles", []) if p.get("exists")]
                
                summary = f"""## Rapport OSINT - {name}

### Identité
- **Nom**: {name}
- **Email**: {email or 'N/A'}
- **Téléphone**: {phone or 'N/A'} ({pi.get('type', '?')})

### Localisation
- **Adresse**: {address or 'N/A'}
- **Code Postal**: {cp or 'N/A'}
- **Ville**: {city or 'N/A'}

### Empreinte Numérique
- **Provider email**: {ei.get('provider', 'N/A')}
- **Username dérivé**: {osint.get('username', 'N/A')}
- **Type email**: {'Personnel' if ei.get('is_personal') else 'Professionnel'}
- **Google**: {stats.get('google_hits', 0)} résultats trouvés
- **Réseaux sociaux**: {len(social_found)} profil(s) confirmé(s)

### Fuites de données
- **{stats.get('breaches', 0)}** breach(es) connue(s)

### Scan
- **Temps**: {scan_time}s
- **{results['count']}** entrée(s) en base de données"""
            
            osint["summary"] = summary
            elapsed = round(time.time() - start, 3)
            response = f"*{results['count']} entrée(s) en base • Scan OSINT: {scan_time}s • Total: {elapsed}s*\n\n{summary}"
        else:
            response = format_response(msg, results, db_name, elapsed)
    else:
        response = f"Aucun résultat en base pour cette recherche dans **{db_name}**. Essayez un autre nom."
    
    conn = sqlite3.connect(str(INDEX_DB))
    conn.execute("INSERT INTO messages (conversation_id, role, content, sql_query, results_count, created_at) VALUES (?,?,?,?,?,?)",
        (conv_id, "user", msg, None, None, datetime.now().isoformat()))
    conn.execute("INSERT INTO messages (conversation_id, role, content, sql_query, results_count, created_at) VALUES (?,?,?,?,?,?)",
        (conv_id, "assistant", response, sql, results["count"], datetime.now().isoformat()))
    conn.commit()
    conn.close()
    
    return jsonify({"response": response, "sql": sql, "results": results, "database": db_name, "time": elapsed, "conversation_id": conv_id, "osint": osint})

def ollama_generate(prompt, system="", timeout=15):
    try:
        r = httpx.post(f"{OLLAMA_URL}/api/generate", json={
            "model": OLLAMA_MODEL, "prompt": prompt, "system": system,
            "stream": False, "options": {"temperature": 0.3, "num_predict": 2048}
        }, timeout=timeout)
        if r.status_code == 200:
            return r.json().get("response", "")
    except:
        pass
    return None

@app.route('/api/query', methods=['POST'])
def raw_query():
    data = request.json
    try:
        return jsonify(run_query(data["database"], data["sql"]))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/conversations')
def list_conversations():
    conn = sqlite3.connect(str(INDEX_DB))
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 50").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/conversations/<conv_id>/messages')
def get_messages(conv_id):
    conn = sqlite3.connect(str(INDEX_DB))
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC", (conv_id,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/stats')
def get_stats():
    load_databases()
    total_rows = sum(d["row_count"] for d in databases.values())
    conn = sqlite3.connect(str(INDEX_DB))
    total_queries = conn.execute("SELECT COUNT(*) FROM messages WHERE role='user'").fetchone()[0]
    total_convs = conn.execute("SELECT COUNT(*) FROM conversations").fetchone()[0]
    conn.close()
    return jsonify({"total_databases": len(databases), "total_records": total_rows, "total_queries": total_queries, "total_conversations": total_convs})

if __name__ == "__main__":
    print(f"""
    ╔═══════════════════════════════════════════════════════════╗
    ║                  DataChat Server                          ║
    ║            Ultra-Fast Local Engine                        ║
    ╠═══════════════════════════════════════════════════════════╣
    ║  [*] API: http://localhost:8000                          ║
    ║  [*] Databases loaded: {str(len(databases)):<30s}  ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    app.run(host="0.0.0.0", port=8000, debug=False)
