# CLAUDE.md

> Project context for Claude Code sessions on dailybrief.

## What dailybrief is

A static web app deployed to GitHub Pages that curates heavyweight research articles (Chinese sell-side + independent analysts + English sources) and delivers one per day for reading, with optional systematic analysis generation after reading.

**Architecture**: Static HTML/CSS/JS + JSON data files. No build step, no backend. Optional client-side LLM API call for on-demand analysis generation (user provides API key in browser).

## Hard rules — NEVER violate

1. **No backend, no build tools.** GitHub Pages is static-only. No Node.js, no webpack, no Python. Pure HTML/CSS/JS.
2. **No hardcoded API keys.** LLM analysis is optional and client-side. User enters their own key in browser localStorage. Never commit keys to repo.
3. **Article list is curated, not scraped.** We maintain a hand-picked list of 20-60 articles with metadata (title, author, source, date, URL, tags). No RSS/爬虫 automation in MVP.
4. **Self-contained HTML reading layer.** Each article page should be readable offline (once loaded). Markdown/JSON are source of truth, but the rendered HTML is the primary reading experience.

## Stack

- **Frontend**: Vanilla HTML/CSS/JS (no frameworks)
- **Data**: JSON files (`data/articles.json`)
- **Deployment**: GitHub Pages (static hosting)
- **Optional LLM**: Anthropic-format API (client-side fetch, user-provided key)

## Project structure

```
dailybrief/
├── index.html              # Main entry: today's article + navigation
├── article.html            # Article reading page (template)
├── analysis.html           # Analysis generation page (optional LLM)
├── css/
│   └── style.css           # Minimal, readable typography
├── js/
│   ├── main.js             # Core logic: article selection, rendering
│   ├── llm.js              # Optional: client-side LLM API integration
│   └── storage.js          # localStorage helpers (read history, API key)
├── data/
│   └── articles.json       # Curated article list with metadata
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions for Pages deployment (if needed)
└── README.md               # Public-facing project overview
```

## Conventions

- **Minimal closures.** No premature abstractions. Start with 20 articles, vanilla JS, simple JSON schema.
- **One file per responsibility.** `main.js` for core logic, `llm.js` for API calls, `storage.js` for persistence.
- **Mobile-first CSS.** Most reading happens on phones. Typography must be readable at 320px width.
- **Verify before declaring done.** Open the site in a browser. Test article rendering, navigation, and (if implemented) LLM analysis generation.

## Commit hygiene

- **Conventional commits**: `feat:` / `fix:` / `refactor:` / `chore:` / `docs:`
- **Never `git push` without explicit authorization.** Local commits are encouraged; pushing to `origin` requires confirmation.

## Where to look

- `README.md` — public-facing project overview
- `data/articles.json` — curated article list (the "content asset")
- `.trellis/spec/frontend/` — coding guidance for HTML/CSS/JS

## Out of scope

- Server-side rendering or SSR frameworks (Next.js, Astro, etc.)
- Database or backend API
- Automated article scraping/crawling
- Multi-user features (login, shared reading lists)
- Mobile app (PWA is fine, but no React Native / Flutter)
