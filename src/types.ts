
export type View = 'home' | 'history' | 'about' | 'help' | 'settings';

export type ProgressStage = 'analyzing' | 'filtering' | 'ranking';

export interface AppSettings {
  numRecommendations: number;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
  top_provider?: {
    name: string;
    max_retries: number;
  };
  per_request_limits: {
    prompt_tokens: number;
    completion_tokens: number;
  } | null;
}

export interface Recommendation {
  model_id: string;
  reason: string;
  model?: OpenRouterModel; // Optional full model details
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  useCase: string;
  recommendations: Recommendation[];
}
