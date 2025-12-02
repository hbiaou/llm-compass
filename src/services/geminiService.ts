
import { Recommendation, ProgressStage, RecommendationResult, RecommendationMetadata } from '../types';

// Call backend API for model recommendations
// The backend handles all Gemini API interactions securely
// Models are cached server-side - we only send the use case
export const getModelRecommendations = async (
  useCase: string,
  count: number = 3,
  onProgress?: (stage: ProgressStage) => void
): Promise<RecommendationResult> => {
  // Update progress stages as we make the API call
  if (onProgress) onProgress('analyzing');
  
  try {
    // Simulate progress updates during the request
    // Backend does: constraint extraction (instant) -> filtering -> Gemini ranking
    if (onProgress) {
      setTimeout(() => {
        if (onProgress) onProgress('filtering');
      }, 100); // Fast - rule-based extraction is instant
      
      setTimeout(() => {
        if (onProgress) onProgress('ranking');
      }, 200);
    }

    // Only send useCase and count - backend uses its own cached models
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        useCase,
        count,
      }),
    });

    // Read response body only once - clone if we need to read it multiple ways
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorData.details || errorMessage;
      } catch {
        // Response is not JSON, use text directly
        errorMessage = responseText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText) as RecommendationResult;
    return result;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
};
