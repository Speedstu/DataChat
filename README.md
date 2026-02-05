
```
     ____        _        ____ _           _   
    |  _ \  __ _| |_ __ _/ ___| |__   __ _| |_ 
    | | | |/ _` | __/ _` | |   | '_ \ / _` | __|
    | |_| | (_| | || (_| | |___| | | | (_| | |_ 
    |____/ \__,_|\__\__,_|\____|_| |_|\__,_|\__|
```

### AI-Powered Database Intelligence Platform

DataChat is a local-first intelligence tool that lets you query databases using natural language and run deep OSINT enrichment on person records. Everything runs on your machine. No data leaves your network.

---

### Features

**Database Engine**
- Natural language to SQL conversion (zero external API)
- Supports CSV, JSON, SQLite, TXT imports
- Sub-second query execution on million-row datasets
- Auto-detection of schema, columns, and data types

**OSINT Engine**
- Real-time Google scraping (6 parallel dork queries)
- Social media profile verification (GitHub, Instagram, Twitter/X)
- French directory lookup (PagesJaunes / Pages Blanches)
- Email breach detection via XposedOrNot API + Google dorks
- Email provider analysis and username derivation
- Phone number classification (mobile/landline, carrier guess)
- Parallel execution across all sources

**AI Summary**
- Ollama integration for structured OSINT report generation
- Local fallback when Ollama is unavailable
- Markdown-formatted intelligence reports

**Interface**
- Dark-themed React frontend
- Two modes: DB Search (fast) and AI OSINT (deep)
- Bilingual support (FR / EN)
- Clickable social profiles with real verification status
- Data breach panel with source links
- Google results browser by category
- Google Maps integration for location data
- Conversation history

---

### Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python / Flask |
| Frontend | React / Vite / TailwindCSS |
| Database | SQLite |
| NLP | Local regex-based parser |
| AI | Ollama (optional) |
| Scraping | httpx / BeautifulSoup / lxml |
| OSINT | ThreadPoolExecutor (parallel) |

---

### Setup

**Requirements**
- Python 3.10+
- Node.js 18+
- Ollama (optional, for AI summaries)

**Backend**

```bash
cd server
pip install flask flask-cors httpx beautifulsoup4 lxml
python app.py
```

Server starts on `http://localhost:8000`

**Frontend**

```bash
cd admin
npm install
npm run dev
```

Frontend starts on `http://localhost:5173`

**Demo Database**

A demo dataset with 50 fake records is included for testing:

```bash
cd server
python import_demo.py
```

**Your Own Data**

Place your CSV/JSON/SQLite files in `H:\databases` (configurable in `app.py`), then import them through the Databases page in the UI.

---

### Usage

**DB Mode** -- Type a natural language query. The engine converts it to SQL and returns results instantly.

```
JOHN DOE
How many people in Paris?
Find john.doe@gmail.com
List people in 75001
```

**OSINT Mode** -- Toggle "AI OSINT Mode" in the chat. The engine searches the database, then runs a full OSINT scan:

1. Google scraping across 6 query categories
2. Social profile existence checks (real HTTP verification)
3. Email breach lookup
4. French directory search
5. Ollama generates a structured intelligence report

---

### Project Structure

```
DataChat/
  server/
    app.py              # Flask API + NLP engine
    osint_engine.py     # Deep OSINT scraping engine
    import_demo.py      # Demo data importer
    demo_data.csv       # 50 fake person records
  admin/
    src/
      App.jsx           # Root component
      components/
        Sidebar.jsx     # Navigation + language toggle
      pages/
        ChatPage.jsx    # Chat interface + OSINT panel
        DatabasesPage.jsx # Database management
```

---

### Configuration

Edit `server/app.py`:

```python
DATABASES_PATH = Path(r"H:\databases")   # where your data files live
OLLAMA_URL = "http://localhost:11434"     # Ollama endpoint
OLLAMA_MODEL = "qwen2.5:7b"             # model for AI summaries
```

---

### Disclaimer

This tool is provided for educational and authorized security research purposes only. The OSINT capabilities query publicly available information. Users are responsible for ensuring compliance with applicable laws and regulations in their jurisdiction. Do not use this tool to access, collect, or process personal data without proper authorization.

---

### License

MIT
