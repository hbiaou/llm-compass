LLM-Compass was originally built online on Google AI Studio. These instructions explicitly address the transition from a simulated web environment to a robust local development environment, specifically solving the storage limitation issue.

---

### **Prompt for AI Developer**

**Role:** Senior Frontend Engineer  
**Task:** Replicate an existing React/TypeScript application locally and upgrade its storage architecture.

**Context:**  
I have the source code for an app called "LLM Compass". It was built in a web sandbox environment. I need to set it up on my local machine using **Vite**. Additionally, the original app had to truncate data to fit into localStorage (5MB limit). Since I am running this locally, I want to upgrade the storage solution to **IndexedDB** so we can store the full OpenRouter model database without truncation.

 I have already copied all the source code to this directory. We are inside the directory.



**Step-by-Step Instructions:**

#### **Phase 1: Project Scaffolding**

1. Initialize a new project using Vite with React and TypeScript:  
   npm create vite@latest llm-compass -- --template react-ts

2. Install the necessary dependencies:
   
   - @google/genai (Google SDK)
   
   - idb-keyval (For easy IndexedDB usage - **Crucial for fixing storage limits**)
   
   - clsx and tailwind-merge (Optional, but good for styling)

3. Set up **Tailwind CSS** locally (do not use the CDN link from the original index.html):
   
   - Install tailwindcss, postcss, autoprefixer.
   
   - Initialize the configuration (npx tailwindcss init -p).
   
   - Configure tailwind.config.js to match the custom colors/variables found in the original index.html.
   
   - Add the @tailwind directives to src/index.css.

#### **Phase 2: File Migration & Code Refactoring**

1. **Environment Variables:**
   
   - Create a .env file in the root.
   
   - Add VITE_API_KEY=your_gemini_api_key_here.
   
   - **Refactor:** Search the codebase for process.env.API_KEY and replace it with import.meta.env.VITE_API_KEY to work with Vite.

2. **File Structure:**
   
   - Move the provided component files into src/components/.
   
   - Move services into src/services/.
   
   - Move types into src/types.ts.
   
   - Ensure App.tsx and main.tsx (formerly index.tsx) are in src/.

#### **Phase 3: Addressing Limitations (Storage Upgrade)**

The original app truncated model descriptions in services/openRouterService.ts because localStorage has a small quota.  
**You must refactor services/openRouterService.ts to:**

1. Import set and get from idb-keyval.

2. Replace all localStorage.setItem calls with await set(...).

3. Replace all localStorage.getItem calls with await get(...).

4. **Crucial:** Remove the data mapping logic that truncates descriptions. We want to store the **full** model object exactly as it comes from the API.
   
   - Remove: description: m.description ? m.description.slice(0, 150) : ''
   
   - Keep: description: m.description || '' (Store the whole string).
   
   - Keep all other fields (tokenizer, per_request_limits) that were previously removed to save space.

#### **Phase 4: Running the App**

1. Ensure the Loader and App components handle the async nature of IndexedDB (since localStorage is synchronous but idb-keyval is asynchronous, the initial load logic in App.tsx might need a small await).

2. Provide the command to start the development server (npm run dev).
