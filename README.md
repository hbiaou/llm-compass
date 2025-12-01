# LLM Compass

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

An intelligent tool that helps you find the perfect LLM model for your specific use case. LLM Compass analyzes your requirements and recommends the best models from OpenRouter's extensive database.

## Features

- **Smart Recommendations**: AI-powered analysis of your use case to recommend the best LLM models
- **Comprehensive Database**: Access to 500+ models from OpenRouter
- **Modality Support**: Detects and filters models based on input/output modalities (text, image, audio, video, file)
- **Context-Aware**: Considers context length requirements for your tasks
- **Cost-Conscious**: Filters models based on pricing when budget constraints are specified
- **Local Storage**: Uses IndexedDB for efficient local caching (no 5MB localStorage limit)
- **Secure Backend**: API keys are securely handled server-side, never exposed to the browser

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (locally configured)
- **Storage**: IndexedDB (via idb-keyval)
- **Backend**: Node.js + Express
- **AI**: Google Gemini API (via backend proxy)

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Google Gemini API key

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**Important**: The API key does NOT need the `VITE_` prefix because it's only used in the backend server, not in the frontend. The frontend communicates with the backend proxy, which securely handles all Gemini API calls.

### 3. Run the Application

Start both the frontend and backend servers:

```bash
npm run dev
```

This will start:
- **Frontend**: Vite dev server on `http://localhost:3000`
- **Backend**: Express server on `http://localhost:3001`

The frontend automatically proxies `/api` requests to the backend.

### Alternative: Run Servers Separately

If you prefer to run them separately:

```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run client
```

## Project Structure

```
llm-compass/
├── src/
│   ├── components/      # React components
│   ├── services/        # API services (OpenRouter, Gemini)
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   ├── types.ts         # TypeScript type definitions
│   └── index.css        # Tailwind CSS styles
├── server/
│   └── index.js         # Express backend server
├── .env                 # Environment variables (not in git)
├── vite.config.ts       # Vite configuration with proxy
├── tailwind.config.js   # Tailwind CSS configuration
└── package.json         # Dependencies and scripts
```

## Key Features Explained

### Storage Upgrade: IndexedDB

The app was migrated from `localStorage` (5MB limit) to IndexedDB, allowing storage of the complete OpenRouter model database without truncation. All model descriptions and metadata are now stored in full.

### Backend Proxy Pattern

Direct browser calls to the Gemini API are blocked by security restrictions. The app uses a backend proxy pattern:
- Frontend makes requests to `/api/recommend`
- Backend securely handles Gemini API calls
- API key never exposed to the browser

### Two-Stage Recommendation Process

1. **Constraint Extraction**: Analyzes your use case to extract technical requirements (modalities, context length, pricing)
2. **Semantic Ranking**: Filters and ranks models based on the extracted constraints

## Development

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Migration Notes

This project was migrated from Google AI Studio to a local development environment. Key changes:

- Replaced CDN Tailwind with local installation
- Upgraded storage from localStorage to IndexedDB
- Added backend proxy for secure API key handling
- Reorganized file structure to standard React/Vite conventions

See `docs/MIGRATION_LESSONS.md` for detailed migration notes.

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
