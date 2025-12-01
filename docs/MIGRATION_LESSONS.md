# Migration Lessons: Google AI Studio to Local Development

## Overview

This document summarizes the key lessons learned while migrating an App from a simulated web environment (Google AI Studio) to a robust local development environment using Vite, React, and Node.js.

## Key Challenges & Solutions

### 1. API Key Security & Client-Side Restrictions

**Issue:** 
When running the application locally via Vite, calls to the Google Gemini API directly from the browser (client-side) failed with a `400 INVALID_ARGUMENT` error stating "API key not valid", even though the key was correct and working with `curl`.

**Root Cause:**

* **Browser Restrictions:** The Google Gen AI SDK and the API endpoints have security measures that often block direct calls from browser environments to prevent API key leakage.
* **Environment Variables:** Client-side code in Vite requires environment variables to be prefixed with `VITE_` to be exposed, but exposing high-privilege API keys to the browser is a security risk.

**Solution: Backend Proxy Pattern**
Instead of calling the API directly from React:

1. **Created a lightweight Node.js/Express backend** (`server/index.js`).
2. **Moved the SDK logic** to the backend. The backend securely loads the API key from the `.env` file (using `dotenv`).
3. **Configured a Proxy:** Updated `vite.config.ts` to proxy requests from `/api` to the local backend (`http://localhost:3001`).
4. **Frontend Update:** The React frontend now uses `fetch('/api/convert')` to talk to the local backend, which then communicates with Google.

### 2. Environment Variable Management

**Lesson:**

* **Vite (Frontend):** Variables must start with `VITE_` (e.g., `VITE_GOOGLE_API_KEY`) to be accessible via `import.meta.env`.
* **Node.js (Backend):** Variables are accessed via `process.env`.
* **Shared .env:** We configured the backend to read from the root `.env` file (`dotenv.config({ path: '../.env' })`), allowing a single source of truth for configuration.

### 3. Tailwind CSS Configuration

**Issue:**
The original code used CDN links for Tailwind, which is not ideal for production or offline local development.

**Solution:**

* Installed `tailwindcss`, `postcss`, and `autoprefixer` as dev dependencies.
* Generated `tailwind.config.js` and `postcss.config.js`.
* Replaced CDN links in `index.html` with standard CSS imports (`@tailwind base; ...`) in `src/index.css`.

## Recommendations for Future Migrations

1. **Start with a Backend:** For any AI app involving API keys, assume you will need a simple backend proxy immediately. Do not try to make direct calls from the browser.
2. **Secure Keys:** Never commit `.env` files. Add them to `.gitignore` immediately.
3. **Verify with Curl:** If an API key seems "invalid", test it with a raw `curl` command to rule out account/billing issues before debugging the code.
