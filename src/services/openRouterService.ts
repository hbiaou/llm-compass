
import { OpenRouterModel } from '../types';
import { get, set, del } from 'idb-keyval';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/models';
const CACHE_KEY = 'llm_compass_models_cache';
const CACHE_TIMESTAMP_KEY = 'llm_compass_models_timestamp';
const CACHE_TTL = 72 * 60 * 60 * 1000; // 72 hours in milliseconds

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
  return data.data as OpenRouterModel[];
};
