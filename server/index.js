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
app.use(express.json());

// Validate API key on startup
// Accept both GEMINI_API_KEY and GOOGLE_API_KEY for compatibility
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY or GOOGLE_API_KEY must be set in .env file');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Helper: Extract constraints from use case
const extractConstraints = async (useCase) => {
  const prompt = `
    Analyze this use case and extract technical constraints for an LLM.
    Use Case: "${useCase}"
    
    Return JSON with:
    - required_modalities: array of strings. Detect implied inputs:
       - "image": for "vision", "OCR", "describe photo", "read text from image", "diagram analysis".
       - "audio": for "transcribe", "speech to text", "listen", "voice analysis", "meeting recording".
       - "video": for "watch video", "video summary", "youtube analysis".
       - "file": for "PDF", "CSV", "Excel", "upload document", "analyze file", "large codebase".
       - [] (empty): for standard text-only input.
    - output_modalities: array of strings. Detect implied outputs:
       - "image": for "generate image", "create logo", "draw", "illustration".
       - "embeddings": for "vector search", "RAG", "semantic similarity", "text embedding".
       - [] (empty): for standard text generation.
    - min_context: number. Estimate required tokens based on task scale:
       - 128000: for "summarize book", "entire codebase", "long legal docs", "novel".
       - 32000: for "articles", "reports", "essays".
       - 0: default/small tasks.
    - max_price: number (USD). Only set if user explicitly asks for "cheap", "free", "budget", "low cost".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            required_modalities: { type: Type.ARRAY, items: { type: Type.STRING } },
            output_modalities: { type: Type.ARRAY, items: { type: Type.STRING } },
            min_context: { type: Type.INTEGER },
            max_price: { type: Type.NUMBER },
          }
        }
      }
    });
    
    // Get text from response - read only once to avoid stream already read error
    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (e) {
    console.warn("Constraint extraction failed, proceeding with all models.", e);
  }
  return {};
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
    const { useCase, models, count = 3 } = req.body;

    if (!useCase || !models || !Array.isArray(models)) {
      return res.status(400).json({ error: 'Invalid request: useCase and models array required' });
    }

    // STAGE 1: Extract Constraints & Filter
    const constraints = await extractConstraints(useCase);
    let candidates = filterModels(models, constraints);

    // Fallback: If filtering is too aggressive (0 results), revert to full list
    if (candidates.length === 0) {
      console.log("Filtering returned 0 models. Reverting to full list.");
      candidates = models;
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

