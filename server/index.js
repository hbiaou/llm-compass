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
// FAST RULE-BASED CONSTRAINT EXTRACTION
// (Replaces slow Gemini API call)
// ============================================
const extractConstraints = (useCase) => {
  const text = useCase.toLowerCase();
  const constraints = {
    required_modalities: [],
    output_modalities: [],
    min_context: 0,
    max_price: undefined,
  };

  // Detect INPUT modalities
  const imageInputKeywords = ['image', 'photo', 'picture', 'vision', 'ocr', 'screenshot', 'diagram', 'chart', 'visual', 'see', 'look at', 'describe this'];
  const audioInputKeywords = ['audio', 'transcribe', 'speech', 'voice', 'listen', 'recording', 'podcast', 'meeting'];
  const videoInputKeywords = ['video', 'youtube', 'watch', 'movie', 'clip'];
  const fileInputKeywords = ['pdf', 'csv', 'excel', 'document', 'file', 'upload', 'codebase', 'repository'];

  if (imageInputKeywords.some(k => text.includes(k))) constraints.required_modalities.push('image');
  if (audioInputKeywords.some(k => text.includes(k))) constraints.required_modalities.push('audio');
  if (videoInputKeywords.some(k => text.includes(k))) constraints.required_modalities.push('video');
  if (fileInputKeywords.some(k => text.includes(k))) constraints.required_modalities.push('file');

  // Detect OUTPUT modalities
  const imageOutputKeywords = ['generate image', 'create image', 'draw', 'illustration', 'create logo', 'make a picture'];
  const embeddingKeywords = ['embedding', 'vector', 'rag', 'semantic search', 'similarity'];

  if (imageOutputKeywords.some(k => text.includes(k))) constraints.output_modalities.push('image');
  if (embeddingKeywords.some(k => text.includes(k))) constraints.output_modalities.push('embeddings');

  // Detect context length needs
  const longContextKeywords = ['book', 'novel', 'entire codebase', 'full repository', 'long document', 'legal document', 'thesis'];
  const mediumContextKeywords = ['article', 'report', 'essay', 'paper', 'chapter'];

  if (longContextKeywords.some(k => text.includes(k))) {
    constraints.min_context = 128000;
  } else if (mediumContextKeywords.some(k => text.includes(k))) {
    constraints.min_context = 32000;
  }

  // Detect price constraints
  const cheapKeywords = ['cheap', 'free', 'budget', 'low cost', 'affordable', 'inexpensive'];
  if (cheapKeywords.some(k => text.includes(k))) {
    constraints.max_price = 1; // $1 per million tokens
  }

  console.log('Extracted constraints:', constraints);
  return constraints;
};

// Helper: Parse modality string
const parseModalityString = (modality) => {
  const [inputStr, outputStr] = modality.toLowerCase().split('->');
  const inputs = inputStr ? inputStr.split('+') : ['text'];
  const outputs = outputStr ? outputStr.split('+') : ['text'];
  return { inputs, outputs };
};

// Helper: Filter models based on constraints
const filterModels = (models, constraints) => {
  return models.filter(m => {
    // Context Filter
    if (constraints.min_context && m.context_length < constraints.min_context) {
      return false;
    }
    
    const { inputs, outputs } = parseModalityString(m.architecture.modality);

    // Input Modality Filter
    if (constraints.required_modalities && constraints.required_modalities.length > 0) {
      const supportsAllInputs = constraints.required_modalities.every(req => {
        return inputs.includes(req.toLowerCase());
      });
      if (!supportsAllInputs) return false;
    }

    // Output Modality Filter
    if (constraints.output_modalities && constraints.output_modalities.length > 0) {
      const supportsAllOutputs = constraints.output_modalities.every(req => {
        return outputs.includes(req.toLowerCase());
      });
      if (!supportsAllOutputs) return false;
    }

    // Price Filter
    if (constraints.max_price !== undefined) {
      const price = parseFloat(m.pricing.prompt) * 1000000;
      if (price > constraints.max_price) return false;
    }

    return true;
  });
};

// API endpoint for getting model recommendations
app.post('/api/recommend', async (req, res) => {
  try {
    const { useCase, count = 3 } = req.body;

    if (!useCase) {
      return res.status(400).json({ error: 'Invalid request: useCase is required' });
    }

    // Get models from server cache (not from frontend request)
    const models = await getModels();
    console.log(`Processing recommendation for: "${useCase.substring(0, 50)}..." with ${models.length} models`);

    // STAGE 1: Extract Constraints & Filter (fast, rule-based - no API call)
    const constraints = extractConstraints(useCase);
    let candidates = filterModels(models, constraints);
    console.log(`Filtering: ${models.length} -> ${candidates.length} candidates`);

    // Fallback: If filtering is too aggressive (0 results), use text-only models
    if (candidates.length === 0) {
      console.log("Filtering returned 0 models. Using text-only models as fallback.");
      // Get models that support at least text input/output
      candidates = models.filter(m => {
        const modality = m.architecture?.modality || 'text->text';
        return modality.includes('text');
      });
      // If still empty, use all models
      if (candidates.length === 0) {
        candidates = models;
      }
    }

    // Limit candidates for Stage 2
    if (candidates.length > 50) {
      candidates = candidates.slice(0, 50);
    }

    // STAGE 2: Semantic Ranking
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

    const prompt = `
You are an expert AI model selector. Recommend the top ${count} models from the provided JSON list for this use case: "${useCase}".

Data Key:
- id: Model ID
- desc: Description
- ctx: Context Length
- price: { in: Input cost, out: Output cost, img: Image cost }
- inputs: Supported Input types (text, image, audio, video, file)
- outputs: Supported Output types (text, image, embeddings)
- prov: Provider

Consider the user's need for specific modalities (e.g., if they need to analyze video or generate embeddings) alongside cost and context.

Output JSON only.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt + "\n\nCANDIDATE MODELS:\n" + modelListJsonString,
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
    res.json(result.recommendations);
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

