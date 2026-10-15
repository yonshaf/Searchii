# Searchii 🚀
### Autonomous AI Job Aggregator & Real-Time Resume Matcher

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?logo=javascript&logoColor=black)](app.js)
[![HTML5 / CSS3](https://img.shields.io/badge/HTML5%20%2F%20CSS3-Glassmorphism-E34F26?logo=html5&logoColor=white)](style.css)
[![Powered by TinyFish](https://img.shields.io/badge/AI%20Engine-TinyFish%20API-6366f1)](https://tinyfish.ai)

**Searchii** is a modern, high-performance web application that aggregates verified job opportunities across the tech ecosystem and calculates your personalized hiring odds against every listing in real time.

Powered by **TinyFish Web Agents and Search API**, Searchii bypasses fragmented job portals to crawl and extract live postings directly from **Y Combinator (Work at a Startup), Greenhouse, Lever, Ashby, LinkedIn, and RemoteOK**.

---

## 📸 Key Highlights

- 🎯 **AI Resume Match & Hiring Odds**: Upload or paste your resume to receive instant match percentages, interview odds (e.g. *Top 5% Interview Probability*), and custom cover letter tips.
- ⚡ **Multi-Platform Scraping**: Extract verified listings from tech companies without manual copy-pasting.
- 🌐 **Three Search Modes**: Instant API queries, autonomous cloud browser agents, or direct company career URL scraping.
- 🔒 **100% Privacy-First**: Resumes are parsed entirely inside your browser and stored only in private `localStorage`—no resume data is sent to external servers.
- 🎨 **Cyberpunk Glassmorphism UI**: Deep dark aesthetic with glowing neon accents, custom gradients, micro-animations, and styled scrollbars.
- 💾 **1-Click Export**: Save bookmarks and export opportunities directly into structured **JSON** or **CSV** spreadsheets.

---

## 🌟 Core Features

### 1. 🧠 AI Resume Matcher & Hiring Probability Engine
- **Dynamic Scoring Algorithm**: Evaluates required skill overlap (50%), role title keywords (25%), experience level alignment (15%), and remote/workstyle alignment (10%).
- **Interactive Circular Gauge**: Displays calculated match percentage with conic-gradient progress meters.
- **Matched Skills vs. Skill Gaps**: Highlights which qualifications you already satisfy and flags missing competencies you should target.
- **AI Application Advice**: Provides actionable tips recommending specific achievements or technologies to emphasize in your application note.
- **One-Click Presets & File Dropzone**: Quickly test with built-in personas (*Full Stack Engineer*, *AI/ML Engineer*, *Product Designer*) or drag and drop your own `.txt`, `.pdf`, or `.docx` resume.

### 2. 🤖 Three Search & Extraction Modes
| Mode | How It Works | TinyFish Endpoint |
| :--- | :--- | :--- |
| **Fast Multi-Platform Search** | Rapid query across indexed tech career boards. *(100% Free)* | `api.search.tinyfish.ai` |
| **Autonomous Web Agent** | Deploys a headless browser in the cloud to navigate real DOMs and extract job postings. | `agent.tinyfish.ai/v1/automation/run` |
| **Direct URL Crawler** | Target any specific careers URL (e.g. `jobs.lever.co/company` or `boards.greenhouse.io/company`) to scrape active openings. | `agent.tinyfish.ai/v1/automation/run` |

### 3. 🔍 Smart Filters & Sorters
- **Sort by Highest Resume Match %**: Automatically bubbles up jobs where your qualifications are strongest.
- **Sort by Salary or Recency**: Rank by compensation packages or newly posted roles.
- **Quick Platform Chips**: Narrow results to specific sources (YC, Greenhouse, Lever, Ashby, RemoteOK, LinkedIn).
- **Remote & Experience Toggles**: Filter instantly for remote-first positions and Senior / Lead / Mid / Entry roles.

---

## 📂 Project Architecture

```
Searchii/
├── index.html          # Semantic HTML5 layout, modals, drawers & accessibility markup
├── style.css           # Glassmorphism design system, neon scrollbars & responsive CSS
├── app.js              # Application logic, resume matching algorithm & DOM state
├── server.py           # Python 3 CORS proxy server with .env integration
├── start-server.ps1    # Native Windows PowerShell HTTP listener & proxy (no node required)
├── start.bat           # 1-Click Windows launch script
├── .env.example        # Environment variable template for API credentials
├── .env                # Local secrets file (git-ignored)
├── .gitignore          # Excludes API keys, logs, and cache files
└── README.md           # Project documentation
```

---

## ⚡ Quick Start

### Option 1: 1-Click Launch (Windows - Recommended)
Simply double-click:
```bat
start.bat
```
*Or run via PowerShell:*
```powershell
powershell -ExecutionPolicy Bypass -File .\start-server.ps1
```
This boots the local proxy on **`http://localhost:8080`** using native Windows `.NET HttpListener` (no `npm` or `node` required) and automatically opens your browser.

### Option 2: Python 3 Server (Cross-Platform)
```bash
python server.py
```
Open **`http://localhost:8080`** in your browser.

### Option 3: Direct File Opening
You can open `index.html` directly in any web browser. In the **Settings** menu (top-right gear icon), you can toggle between **Local Server Proxy** or **Direct Browser Fetch**.

---

## 🔑 TinyFish API Setup

To protect your API credentials, keys are **never hardcoded in tracked files**:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and insert your TinyFish key:
   ```env
   TINYFISH_API_KEY=sk-tinyfish-your-key-here
   ```
   *(The `.env` file is automatically excluded in `.gitignore` so your key will never leak to GitHub).*

3. Alternatively, enter your key inside the web application via the **Settings** modal. The key will be saved safely in your browser's private `localStorage`.

---

## 💳 Credit & Pricing Information

- **Fast Multi-Platform Search**: Calls to `api.search.tinyfish.ai` are **100% free** under TinyFish's generous rate limits (up to 30 req/min) and **do not consume any wallet credits**.
- **Cloud Browser Agent Modes**: Running the autonomous headless browser agent or scraping specific URLs deploys cloud browser instances, which draw from your TinyFish pay-as-you-go wallet balance.

---

## 🛡️ Privacy & Security

- **Local Resume Parsing**: Your resume text is stored solely in client-side `localStorage`. It is never uploaded to third-party databases.
- **Git Leak Prevention**: Pre-configured `.gitignore` prevents `.env`, tokens, or personal resumes from being accidentally committed.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Feel free to use, fork, and adapt for your own workflows!
