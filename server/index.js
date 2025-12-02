import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
// Reduced JSON limit since we no longer receive models from frontend
app.use(express.json({ limit: '1mb' }));

// Validate API key on startup
// Accept both GEMINI_API_KEY and GOOGLE_API_KEY for compatibility
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY or GOOGLE_API_KEY must be set in .env file');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// ============================================
// SERVER-SIDE MODEL CACHE
// ============================================
let cachedModels = null;
let cacheTimestamp = null;
const MODEL_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// Transform raw API data to our format
const transformModel = (raw) => {
  const inputModality = raw.input_modalities?.join('+') || 'text';
  const outputModality = raw.output_modalities?.join('+') || 'text';
  const modalityString = `${inputModality}->${outputModality}`;

  return {
    id: raw.slug,
    name: raw.name,
    description: raw.description || '',
    pricing: {
      prompt: raw.endpoint?.pricing?.prompt || '0',
      completion: raw.endpoint?.pricing?.completion || '0',
      request: raw.endpoint?.pricing?.request || '0',
      image: raw.endpoint?.pricing?.image || '0',
    },
    context_length: raw.context_length || 0,
    architecture: {
      modality: modalityString,
      tokenizer: raw.endpoint?.quantization || 'unknown',
      instruct_type: raw.instruct_type,
    },
    top_provider: raw.endpoint?.provider_name ? {
      name: raw.endpoint.provider_name,
    } : undefined,
  };
};

// Fetch and cache models from OpenRouter
const getModels = async () => {
  const now = Date.now();
  
  // Return cached models if valid
  if (cachedModels && cacheTimestamp && (now - cacheTimestamp < MODEL_CACHE_TTL)) {
    console.log(`Using cached models: ${cachedModels.length} models`);
    return cachedModels;
  }
  
  // Fetch fresh models
  console.log('Fetching fresh models from OpenRouter...');
  const response = await fetch('https://openrouter.ai/api/frontend/models');
  if (!response.ok) {
    throw new Error(`OpenRouter API returned ${response.status}`);
  }
  const data = await response.json();
  
  // Transform and cache
  cachedModels = data.data.map(transformModel);
  cacheTimestamp = now;
  console.log(`Cached ${cachedModels.length} models from OpenRouter`);
  
  return cachedModels;
};

// ============================================
// STAGE 1: LLM-BASED CONSTRAINT EXTRACTION
// Uses small/cheap model (Gemini 2.0 Flash) for semantic understanding
// ============================================

// Constraint extraction prompt for the LLM
const CONSTRAINT_EXTRACTION_PROMPT = `You are a constraint extractor for an LLM recommendation system.

Given a user's use case description, extract structured constraints to filter models from a database.

## Available Model Fields for Filtering
- architecture.modality: format "input->output" (e.g., "text->text", "text+image->text", "text->embeddings")
- context_length: number of tokens (e.g., 4096, 32000, 128000, 200000)
- pricing.prompt: cost per token as string (e.g., "0.000001" means $1 per million tokens)
- id: "provider/model-name" format (e.g., "openai/gpt-4o", "anthropic/claude-3-5-sonnet", "meta-llama/llama-3.1-70b")
- name: human-readable model name
- description: model description text

## Output Schema
Return a JSON object with these fields:
{
  "input_modalities": ["text"],        // Required inputs: "text", "image", "audio", "video", "file"
  "output_modalities": ["text"],       // Required outputs: "text", "image", "embeddings"
  "min_context": 0,                    // Minimum context window in tokens (0 = any)
  "max_price_per_million": null,       // Max $/M input tokens (null = any price)
  "preferred_providers": [],           // Provider prefixes to prefer (empty = any)
  "excluded_providers": [],            // Provider prefixes to exclude
  "capability_keywords": [],           // Words that SHOULD appear in model name/description
  "exclude_keywords": [],              // Words that should NOT appear in name/description
  "speed_preference": "any"            // "fast" (small models), "balanced", "powerful" (large models), "any"
}

## Guidelines
1. For chat/conversational use cases: add "chat" or "instruct" to capability_keywords, exclude "embedding", "base"
2. For coding tasks: add "code" to capability_keywords
3. For creative writing: don't over-constrain, most models work
4. For "quick/fast responses": set speed_preference to "fast"
5. For "best quality/accuracy": set speed_preference to "powerful"
6. For budget constraints: set max_price_per_million (e.g., 1 for cheap, 0.5 for very cheap)
7. For "open source" requests: prefer meta-llama, mistral, qwen; exclude openai, anthropic, google
8. For multimodal (images, audio, video): set appropriate input_modalities
9. Default to minimal constraints if unclear - don't over-filter

## Examples

User: "A chatbot for customer support with quick responses"
{
  "input_modalities": ["text"],
  "output_modalities": ["text"],
  "min_context": 8000,
  "max_price_per_million": null,
  "preferred_providers": [],
  "excluded_providers": [],
  "capability_keywords": ["chat", "instruct"],
  "exclude_keywords": ["embedding", "base", "completion"],
  "speed_preference": "fast"
}

User: "Analyze images of receipts and extract amounts"
{
  "input_modalities": ["text", "image"],
  "output_modalities": ["text"],
  "min_context": 0,
  "max_price_per_million": null,
  "preferred_providers": [],
  "excluded_providers": [],
  "capability_keywords": ["vision"],
  "exclude_keywords": ["embedding"],
  "speed_preference": "any"
}

User: "Code review for a large TypeScript codebase"
{
  "input_modalities": ["text"],
  "output_modalities": ["text"],
  "min_context": 128000,
  "max_price_per_million": null,
  "preferred_providers": [],
  "excluded_providers": [],
  "capability_keywords": ["code"],
  "exclude_keywords": ["embedding"],
  "speed_preference": "powerful"
}

User: "I want something like ChatGPT but open source and cheap"
{
  "input_modalities": ["text"],
  "output_modalities": ["text"],
  "min_context": 0,
  "max_price_per_million": 1,
  "preferred_providers": ["meta-llama", "mistral", "qwen"],
  "excluded_providers": ["openai", "anthropic", "google"],
  "capability_keywords": ["chat", "instruct"],
  "exclude_keywords": ["embedding"],
  "speed_preference": "any"
}

User: "Generate embeddings for RAG system"
{
  "input_modalities": ["text"],
  "output_modalities": ["embeddings"],
  "min_context": 0,
  "max_price_per_million": null,
  "preferred_providers": [],
  "excluded_providers": [],
  "capability_keywords": ["embedding"],
  "exclude_keywords": [],
  "speed_preference": "any"
}

Now extract constraints for this use case:
`;

// Default constraints (used as fallback)
const DEFAULT_CONSTRAINTS = {
  input_modalities: ['text'],
  output_modalities: ['text'],
  min_context: 0,
  max_price_per_million: null,
  preferred_providers: [],
  excluded_providers: [],
  capability_keywords: [],
  exclude_keywords: ['embedding', 'base'],
  speed_preference: 'any',
};

// Extract constraints using LLM (Stage 1)
const extractConstraintsWithLLM = async (useCase) => {
  console.log('Stage 1: Extracting constraints with LLM...');
  const startTime = Date.now();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",  // Fast, cheap model for extraction
      contents: CONSTRAINT_EXTRACTION_PROMPT + `"${useCase}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            input_modalities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Required input modalities"
            },
            output_modalities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Required output modalities"
            },
            min_context: {
              type: Type.NUMBER,
              description: "Minimum context length in tokens"
            },
            max_price_per_million: {
              type: Type.NUMBER,
              nullable: true,
              description: "Max price per million input tokens"
            },
            preferred_providers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Preferred provider prefixes"
            },
            excluded_providers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Excluded provider prefixes"
            },
            capability_keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Keywords that should appear in model name/description"
            },
            exclude_keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Keywords that should not appear"
            },
            speed_preference: {
              type: Type.STRING,
              description: "Speed preference: fast, balanced, powerful, any"
            }
          },
          required: ["input_modalities", "output_modalities", "min_context", "capability_keywords", "exclude_keywords", "speed_preference"]
        },
      },
    });

    const jsonStr = response.text.trim();
    const constraints = JSON.parse(jsonStr);
    
    const elapsed = Date.now() - startTime;
    console.log(`Stage 1 completed in ${elapsed}ms. Constraints:`, JSON.stringify(constraints, null, 2));
    
    return constraints;
  } catch (error) {
    console.error('Stage 1 failed, using defaults:', error.message);
    return DEFAULT_CONSTRAINTS;
  }
};

// ============================================
// STAGE 2: DETERMINISTIC FILTERING
// Fast regex/keyword filtering based on extracted constraints
// ============================================

// Helper: Parse modality string from model data
const parseModalityString = (modality) => {
  const [inputStr, outputStr] = modality.toLowerCase().split('->');
  const inputs = inputStr ? inputStr.split('+') : ['text'];
  const outputs = outputStr ? outputStr.split('+') : ['text'];
  return { inputs, outputs };
};

// Speed preference keywords (for soft filtering)
const SPEED_KEYWORDS = {
  fast: ['mini', 'flash', 'haiku', 'small', 'lite', 'tiny', '7b', '8b', '1b', '3b', 'instant'],
  powerful: ['opus', 'pro', 'large', 'ultra', '70b', '72b', '405b', 'o1', 'reasoning'],
};

// Filter models based on LLM-extracted constraints (Stage 2)
const filterModels = (models, constraints, relaxLevel = 0) => {
  console.log(`Stage 2: Filtering with relax level ${relaxLevel}...`);
  
  return models.filter(m => {
    const { inputs, outputs } = parseModalityString(m.architecture.modality);
    const modelText = (m.name + ' ' + m.description + ' ' + m.id).toLowerCase();
    
    // 1. INPUT MODALITY FILTER (strict - relax at level 2)
    if (relaxLevel < 2 && constraints.input_modalities && constraints.input_modalities.length > 0) {
      const needsNonText = constraints.input_modalities.some(mod => mod !== 'text');
      if (needsNonText) {
        const supportsAllInputs = constraints.input_modalities.every(req => 
          inputs.includes(req.toLowerCase())
        );
        if (!supportsAllInputs) return false;
      }
    }
    
    // 2. OUTPUT MODALITY FILTER (strict - relax at level 2)
    if (relaxLevel < 2 && constraints.output_modalities && constraints.output_modalities.length > 0) {
      const needsNonText = constraints.output_modalities.some(mod => mod !== 'text');
      if (needsNonText) {
        const supportsAllOutputs = constraints.output_modalities.every(req => 
          outputs.includes(req.toLowerCase())
        );
        if (!supportsAllOutputs) return false;
      }
    }
    
    // 3. CONTEXT LENGTH FILTER (relax at level 1)
    if (relaxLevel < 1 && constraints.min_context && constraints.min_context > 0) {
      if (m.context_length < constraints.min_context) return false;
    }
    
    // 4. PRICE FILTER (relax at level 1)
    if (relaxLevel < 1 && constraints.max_price_per_million !== null && constraints.max_price_per_million !== undefined) {
      const pricePerMillion = parseFloat(m.pricing.prompt) * 1000000;
      if (pricePerMillion > constraints.max_price_per_million) return false;
    }
    
    // 5. PROVIDER PREFERENCE FILTER (soft - relax at level 1)
    if (relaxLevel < 1 && constraints.preferred_providers && constraints.preferred_providers.length > 0) {
      const matchesPreferred = constraints.preferred_providers.some(prov => 
        m.id.toLowerCase().startsWith(prov.toLowerCase())
      );
      if (!matchesPreferred) return false;
    }
    
    // 6. PROVIDER EXCLUSION FILTER (strict - relax at level 2)
    if (relaxLevel < 2 && constraints.excluded_providers && constraints.excluded_providers.length > 0) {
      const matchesExcluded = constraints.excluded_providers.some(prov => 
        m.id.toLowerCase().startsWith(prov.toLowerCase())
      );
      if (matchesExcluded) return false;
    }
    
    // 7. CAPABILITY KEYWORD FILTER (soft - at least one match, relax at level 1)
    if (relaxLevel < 1 && constraints.capability_keywords && constraints.capability_keywords.length > 0) {
      const hasCapability = constraints.capability_keywords.some(kw => 
        modelText.includes(kw.toLowerCase())
      );
      if (!hasCapability) return false;
    }
    
    // 8. EXCLUDE KEYWORD FILTER (strict - relax at level 2)
    if (relaxLevel < 2 && constraints.exclude_keywords && constraints.exclude_keywords.length > 0) {
      const hasExcluded = constraints.exclude_keywords.some(kw => 
        modelText.includes(kw.toLowerCase())
      );
      if (hasExcluded) return false;
    }
    
    return true;
  });
};

// Apply filtering with progressive relaxation if needed
const filterModelsWithFallback = (models, constraints, minCandidates = 10) => {
  // Try strict filtering first
  let candidates = filterModels(models, constraints, 0);
  console.log(`  Level 0 (strict): ${candidates.length} candidates`);
  
  if (candidates.length >= minCandidates) {
    return { candidates, relaxLevel: 0 };
  }
  
  // Relax level 1: Remove context, price, provider preference, capability keywords
  candidates = filterModels(models, constraints, 1);
  console.log(`  Level 1 (relaxed): ${candidates.length} candidates`);
  
  if (candidates.length >= minCandidates) {
    return { candidates, relaxLevel: 1 };
  }
  
  // Relax level 2: Only keep modality requirements for non-text
  candidates = filterModels(models, constraints, 2);
  console.log(`  Level 2 (minimal): ${candidates.length} candidates`);
  
  if (candidates.length >= minCandidates) {
    return { candidates, relaxLevel: 2 };
  }
  
  // Final fallback: All text-capable models
  candidates = models.filter(m => {
    const modality = m.architecture?.modality || 'text->text';
    return modality.includes('text');
  });
  console.log(`  Fallback (text-capable): ${candidates.length} candidates`);
  
  return { candidates, relaxLevel: 3 };
};

// API endpoint for getting model recommendations
app.post('/api/recommend', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { useCase, count = 3 } = req.body;

    if (!useCase) {
      return res.status(400).json({ error: 'Invalid request: useCase is required' });
    }

    // Get models from server cache (not from frontend request)
    const models = await getModels();
    const totalModels = models.length;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: "${useCase.substring(0, 60)}..."`);
    console.log(`Database: ${totalModels} models`);

    // STAGE 1: Extract Constraints with LLM (semantic understanding)
    const constraints = await extractConstraintsWithLLM(useCase);
    const stage1Time = Date.now() - startTime;

    // STAGE 2: Deterministic Filtering with progressive relaxation
    const stage2Start = Date.now();
    const { candidates: filteredCandidates, relaxLevel } = filterModelsWithFallback(models, constraints);
    let candidates = filteredCandidates;
    const afterFiltering = candidates.length;
    const stage2Time = Date.now() - stage2Start;
    
    console.log(`Filtering: ${totalModels} -> ${afterFiltering} candidates (relax level: ${relaxLevel})`);

    // Limit candidates for Stage 3 (ranking)
    if (candidates.length > 50) {
      // Sort by a simple heuristic before truncating (popular providers first)
      candidates.sort((a, b) => {
        const providerOrder = ['openai', 'anthropic', 'google', 'meta-llama', 'mistral'];
        const aIdx = providerOrder.findIndex(p => a.id.toLowerCase().startsWith(p));
        const bIdx = providerOrder.findIndex(p => b.id.toLowerCase().startsWith(p));
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });
      candidates = candidates.slice(0, 50);
    }

    // STAGE 3: Semantic Ranking with LLM
    const stage3Start = Date.now();
    const modelListForAI = candidates.map(m => {
      const { inputs, outputs } = parseModalityString(m.architecture.modality);
      return {
        id: m.id,
        name: m.name,
        desc: m.description ? m.description.slice(0, 300) : "",
        ctx: m.context_length,
        price: {
          in: m.pricing.prompt,
          out: m.pricing.completion,
          img: parseFloat(m.pricing.image) > 0 ? m.pricing.image : undefined,
        },
        inputs: inputs,
        outputs: outputs,
        prov: m.top_provider?.name || "Unknown",
      };
    });
    
    const modelListJsonString = JSON.stringify(modelListForAI);

    const rankingPrompt = `
You are an expert AI model selector. Recommend the top ${count} models from the provided JSON list for this use case: "${useCase}".

Data Key:
- id: Model ID
- desc: Description
- ctx: Context Length
- price: { in: Input cost per token, out: Output cost per token, img: Image cost }
- inputs: Supported Input types (text, image, audio, video, file)
- outputs: Supported Output types (text, image, embeddings)
- prov: Provider

Ranking criteria:
1. Semantic fit: How well does the model's description match the use case?
2. Capability match: Does it support required modalities?
3. Cost-effectiveness: Balance quality with price for the use case
4. Provider reliability: Prefer established providers for production use cases

Output JSON only with your top ${count} recommendations.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: rankingPrompt + "\n\nCANDIDATE MODELS:\n" + modelListJsonString,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  model_id: {
                    type: Type.STRING,
                    description: "The unique ID of the recommended model."
                  },
                  reason: {
                    type: Type.STRING,
                    description: "A concise sentence explaining the fit, mentioning specific relevant modalities or pricing."
                  }
                },
                required: ["model_id", "reason"]
              }
            }
          },
          required: ["recommendations"]
        },
      },
    });

    // Get text from response - read only once to avoid stream already read error
    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    const stage3Time = Date.now() - stage3Start;
    
    // Build metadata for frontend display
    const processingTimeMs = Date.now() - startTime;
    const metadata = {
      totalModels,
      constraints: {
        input_modalities: constraints.input_modalities || [],
        output_modalities: constraints.output_modalities || [],
        min_context: constraints.min_context || 0,
        max_price_per_million: constraints.max_price_per_million,
        preferred_providers: constraints.preferred_providers || [],
        excluded_providers: constraints.excluded_providers || [],
        capability_keywords: constraints.capability_keywords || [],
        exclude_keywords: constraints.exclude_keywords || [],
        speed_preference: constraints.speed_preference || 'any',
      },
      afterFiltering,
      relaxLevel,
      candidatesRanked: modelListForAI.length,
      timing: {
        stage1_extraction_ms: stage1Time,
        stage2_filtering_ms: stage2Time,
        stage3_ranking_ms: stage3Time,
        total_ms: processingTimeMs,
      },
    };
    
    console.log(`\nTiming: Stage1=${stage1Time}ms, Stage2=${stage2Time}ms, Stage3=${stage3Time}ms, Total=${processingTimeMs}ms`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Return both recommendations and metadata
    res.json({
      recommendations: result.recommendations,
      metadata,
    });
  } catch (error) {
    console.error('Error in /api/recommend:', error);
    res.status(500).json({ error: 'Failed to generate recommendations', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LLM Compass backend is running' });
});

// Proxy endpoint to fetch models from OpenRouter (avoids CORS issues)
// Returns already-transformed models from server cache
app.get('/api/models', async (req, res) => {
  try {
    const models = await getModels();
    // Return in same format as OpenRouter API for frontend compatibility
    res.json({ data: models });
  } catch (error) {
    console.error('Error fetching models from OpenRouter:', error);
    res.status(500).json({ error: 'Failed to fetch models', details: error.message });
  }
});

// Root endpoint - provide API information
app.get('/', (req, res) => {
  res.json({
    message: 'LLM Compass Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      recommend: {
        path: '/api/recommend',
        method: 'POST',
        description: 'Get LLM model recommendations based on use case',
        body: {
          useCase: 'string (required)',
          models: 'array (required)',
          count: 'number (optional, default: 3)'
        }
      }
    },
    note: 'This is the backend API server. Access the frontend at http://localhost:3000'
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

