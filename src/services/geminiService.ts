
import { OpenRouterModel, Recommendation, ProgressStage } from '../types';

// Call backend API for model recommendations
// The backend handles all Gemini API interactions securely
export const getModelRecommendations = async (
  useCase: string,
  models: OpenRouterModel[],
  count: number = 3,
  onProgress?: (stage: ProgressStage) => void
): Promise<Recommendation[]> => {
  // Update progress stages as we make the API call
  if (onProgress) onProgress('analyzing');
  
  try {
    // The backend handles both constraint extraction and ranking
    // We simulate progress updates during the request
    if (onProgress) {
      // Simulate filtering stage after a short delay
      setTimeout(() => {
        if (onProgress) onProgress('filtering');
      }, 500);
      
      // Simulate ranking stage after another delay
      setTimeout(() => {
        if (onProgress) onProgress('ranking');
      }, 1000);
    }

    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        useCase,
        models,
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

    const recommendations = JSON.parse(responseText);
    return recommendations as Recommendation[];
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
};
