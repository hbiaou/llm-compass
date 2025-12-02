
import { OpenRouterModel } from '../types';
import { get, set, del } from 'idb-keyval';

// Use frontend API to get all models (577+) instead of public API (333)
const OPENROUTER_API_URL = 'https://openrouter.ai/api/frontend/models';
const CACHE_KEY = 'llm_compass_models_cache';
const CACHE_TIMESTAMP_KEY = 'llm_compass_models_timestamp';
const CACHE_TTL = 72 * 60 * 60 * 1000; // 72 hours in milliseconds

// Interface for the raw data from OpenRouter frontend API
interface RawOpenRouterModel {
  slug: string;
  name: string;
  description: string;
  context_length: number;
  input_modalities: string[];
  output_modalities: string[];
  instruct_type: string | null;
  endpoint: {
    pricing: {
      prompt: string;
      completion: string;
      image: string;
      request: string;
    };
    provider_name: string;
    quantization?: string;
  };
}

// Transform raw API data to our OpenRouterModel format
const transformModel = (raw: RawOpenRouterModel): OpenRouterModel => {
  // Build modality string: "input1+input2->output1+output2"
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
      max_retries: 0,
    } : undefined,
    per_request_limits: null,
  };
};

// Get cached models from IndexedDB (async)
export const getCachedModels = async (): Promise<{ models: OpenRouterModel[], timestamp: number } | null> => {
  try {
    const storedModels = await get<string>(CACHE_KEY);
    const storedTimestamp = await get<string>(CACHE_TIMESTAMP_KEY);

    if (!storedModels || !storedTimestamp) return null;

    const timestamp = parseInt(storedTimestamp, 10);
    const now = Date.now();

    // Check if cache is expired
    if (now - timestamp > CACHE_TTL) {
      await del(CACHE_KEY);
      await del(CACHE_TIMESTAMP_KEY);
      return null;
    }

    return {
      models: JSON.parse(storedModels) as OpenRouterModel[],
      timestamp
    };
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
};

// Clear cache from IndexedDB (async)
export const clearCache = async () => {
  await del(CACHE_KEY);
  await del(CACHE_TIMESTAMP_KEY);
};

// Cache models to IndexedDB (async) - Store full model data without truncation
export const cacheModels = async (models: OpenRouterModel[]) => {
  try {
    // Store full model objects without truncation - IndexedDB can handle much larger data than localStorage
    // No need to truncate descriptions or drop fields - store everything as received from API
    await set(CACHE_KEY, JSON.stringify(models));
    await set(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error caching models:', error);
  }
};

export const fetchModels = async (): Promise<OpenRouterModel[]> => {
  const response = await fetch(OPENROUTER_API_URL);
  if (!response.ok) {
    throw new Error('Network response from OpenRouter was not ok');
  }
  const data = await response.json();
  
  // Transform raw API data to our format
  const rawModels = data.data as RawOpenRouterModel[];
  const transformedModels = rawModels.map(transformModel);
  
  console.log(`Fetched and transformed ${transformedModels.length} models from OpenRouter`);
  return transformedModels;
};
