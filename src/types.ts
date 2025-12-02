
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

// Constraints extracted by LLM from user's use case
// Maps directly to filterable OpenRouter model fields
export interface ExtractedConstraints {
  input_modalities: string[];       // Required inputs: text, image, audio, video, file
  output_modalities: string[];      // Required outputs: text, image, embeddings
  min_context: number;              // Minimum context window in tokens (0 = any)
  max_price_per_million?: number;   // Max $/M input tokens (null = any)
  preferred_providers: string[];    // Provider prefixes to prefer
  excluded_providers: string[];     // Provider prefixes to exclude
  capability_keywords: string[];    // Keywords that SHOULD appear in model name/description
  exclude_keywords: string[];       // Keywords that should NOT appear
  speed_preference: string;         // "fast", "balanced", "powerful", or "any"
}

// Timing breakdown for each stage of the pipeline
export interface PipelineTiming {
  stage1_extraction_ms: number;     // LLM constraint extraction time
  stage2_filtering_ms: number;      // Deterministic filtering time
  stage3_ranking_ms: number;        // LLM semantic ranking time
  total_ms: number;                 // Total processing time
}

// Metadata returned from the recommendation API
// Provides insight into the filtering and ranking process
export interface RecommendationMetadata {
  totalModels: number;              // Total models in the database
  constraints: ExtractedConstraints; // LLM-extracted constraints used for filtering
  afterFiltering: number;           // Models remaining after constraint filtering
  relaxLevel: number;               // How much filtering was relaxed (0=strict, 3=fallback)
  candidatesRanked: number;         // Models sent to AI for ranking
  timing: PipelineTiming;           // Timing breakdown by stage
}

// Combined result from the recommendation API
export interface RecommendationResult {
  recommendations: Recommendation[];
  metadata: RecommendationMetadata;
}
