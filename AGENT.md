# LLM Compass - AI Agent Maintenance Guide

This document provides essential information for AI agents (Claude, GPT, etc.) to maintain and continue developing this codebase.

## Project Overview

**LLM Compass** is a React/TypeScript application that recommends LLM models based on user use cases. It uses a 3-stage pipeline: constraint extraction → filtering → semantic ranking.

## Directory Structure

```
llm-compass/
├── src/                          # Frontend React application
│   ├── components/               # UI components
│   │   ├── ModelCard.tsx         # Displays recommended model with Arena badges
│   │   ├── Settings.tsx          # App settings (cache, sync, Arena update)
│   │   ├── Loader.tsx            # Loading spinner with progress stages
│   │   ├── UseCaseForm.tsx       # Main input form
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   └── ...                   # Other UI components
│   ├── services/
│   │   ├── geminiService.ts      # Calls /api/recommend backend
│   │   └── openRouterService.ts  # Fetches/caches models from OpenRouter
│   ├── App.tsx                   # Main app state & logic
│   ├── types.ts                  # TypeScript interfaces
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind CSS styles
│
├── server/
│   └── index.js                  # Express backend server
│                                 # - /api/recommend: 3-stage recommendation
│                                 # - /api/models: Proxy to OpenRouter
│                                 # - /api/arena: Arena rankings endpoint
│                                 # - Loads arena-rankings.json on startup
│
├── data/
│   └── arena-rankings.json       # LM Arena leaderboard data
│                                 # ⚠️ UPDATE MONTHLY (see below)
│
├── assets/                       # Static images
│   ├── llm-compass-logo.png
│   ├── llm-compass-banner.png
│   └── llm-compass-screenshot*.png
│
├── .env                          # API keys (GITIGNORED)
├── vite.config.ts                # Vite + proxy config
├── tailwind.config.js            # Tailwind CSS config
├── package.json                  # Dependencies & scripts
└── README.md                     # User-facing documentation
```

## Key Files to Understand

| File | Purpose |
|------|---------|
| `server/index.js` | Backend logic: constraint extraction, filtering, ranking |
| `src/App.tsx` | Frontend state management, API calls |
| `src/types.ts` | All TypeScript interfaces |
| `src/components/ModelCard.tsx` | Model display with Arena badges |
| `data/arena-rankings.json` | Static Arena leaderboard data |

## Data Flow

```
User Input → Frontend → /api/recommend → Backend
                                           ↓
                        Stage 1: extractConstraintsWithLLM() [Gemini 2.0 Flash]
                                           ↓
                        Stage 2: filterModelsWithFallback() [No LLM]
                                           ↓
                        Stage 3: Semantic Ranking [Gemini 2.5 Flash]
                                           ↓
                        Response with recommendations + metadata
```

## Maintenance Tasks

### 1. Updating LM Arena Rankings (MONTHLY)

The `data/arena-rankings.json` file contains static rankings from [lmarena.ai](https://lmarena.ai/leaderboard/).

**When to update**: Check the `lastUpdated` field in the JSON. Update if > 30 days old.

**How to update**:
1. Visit https://lmarena.ai/leaderboard/
2. For each category (Text, WebDev, Vision, Coding, Math, etc.):
   - Copy the top 10 models
   - Update the corresponding section in `arena-rankings.json`
3. Update the `lastUpdated` field to current date (YYYY-MM-DD)
4. Map Arena model names to OpenRouter IDs in `openRouterIdMapping`

**JSON structure**:
```json
{
  "metadata": {
    "lastUpdated": "2025-12-02",  // ← UPDATE THIS
    "source": "https://lmarena.ai/leaderboard/"
  },
  "categories": {
    "text": {
      "models": [
        { "rank": 1, "name": "...", "openRouterId": "...", "score": 1491 }
      ]
    }
  }
}
```

### 2. Adding New Features

**Frontend components**: Add to `src/components/`, import in `App.tsx`

**New API endpoints**: Add to `server/index.js`, proxy in `vite.config.ts` if needed

**New types**: Add to `src/types.ts`

### 3. Updating Dependencies

```bash
npm update           # Update minor versions
npm outdated         # Check for updates
npm audit            # Security check
```

### 4. Environment Variables

Required in `.env` (gitignored):
```
GEMINI_API_KEY=your_key_here
# OR
GOOGLE_API_KEY=your_key_here
```

## Common Tasks

### Add a new Arena category

1. Add category to `data/arena-rankings.json` under `categories`
2. Add short name mapping in `src/components/ModelCard.tsx` → `shortNames`
3. Server auto-loads on restart

### Change recommendation count

- Default is 3, configurable in Settings UI
- Stored in `src/App.tsx` → `settings.numRecommendations`

### Modify constraint extraction

- Edit `CONSTRAINT_EXTRACTION_PROMPT` in `server/index.js`
- Add new fields to `ExtractedConstraints` in `src/types.ts`

### Modify filtering logic

- Edit `filterModels()` in `server/index.js`
- Relaxation levels: 0 (strict) → 3 (fallback)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/recommend` | POST | Get model recommendations |
| `/api/models` | GET | Get all OpenRouter models |
| `/api/arena` | GET | Get Arena rankings data |
| `/api/health` | GET | Health check |

## Testing Checklist

Before committing changes:
- [ ] `npm run dev` starts without errors
- [ ] Recommendations work for text queries
- [ ] Recommendations work for multimodal queries (image, code)
- [ ] Arena badges display on relevant models
- [ ] Settings page functions (clear cache, sync, Arena update)
- [ ] No TypeScript errors (`npm run build`)

## Debugging Tips

1. **Check server logs**: Terminal running `npm run dev` shows Stage 1/2/3 timing
2. **Constraint extraction issues**: Look at `Extracted constraints:` in logs
3. **Filtering too aggressive**: Check `relaxLevel` in response metadata
4. **Arena badges not showing**: Verify `openRouterId` mapping in JSON

## Security Notes

- API keys are **backend-only** (never in frontend code)
- `.env` is in `.gitignore`
- `docs/` folder is in `.gitignore` (development notes)
- No hardcoded secrets in codebase

## Useful Commands

```bash
npm run dev       # Start frontend + backend
npm run client    # Start frontend only
npm run server    # Start backend only
npm run build     # Production build
npm run preview   # Preview production build
```

---

*Last updated: 2025-12-02*

