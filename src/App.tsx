
import React, { useState, useEffect, useCallback } from 'react';
import { OpenRouterModel, Recommendation, HistoryItem, View, AppSettings, ProgressStage } from './types';
import { fetchModels, getCachedModels, cacheModels } from './services/openRouterService';
import { getModelRecommendations } from './services/geminiService';
import Header from './components/Header';
import UseCaseForm from './components/UseCaseForm';
import Loader from './components/Loader';
import ErrorDisplay from './components/ErrorDisplay';
import ModelCard from './components/ModelCard';
import Sidebar from './components/Sidebar';
import History from './components/History';
import About from './components/About';
import Help from './components/Help';
import Settings from './components/Settings';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentView, setCurrentView] = useState<View>('home');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ numRecommendations: 3 });
  
  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStage, setLoadingStage] = useState<ProgressStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Lifted state for UseCaseForm
  const [useCaseInput, setUseCaseInput] = useState('');

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const loadModels = useCallback(async (forceRefresh = false) => {
    setError(null);

    // Force Refresh Strategy
    if (forceRefresh) {
      setIsLoading(true);
      setLoadingStage(null); // Simple loader for initialization
      try {
        const models = await fetchModels();
        setAllModels(models);
        await cacheModels(models);
        setLastUpdated(Date.now());
      } catch (err) {
        setError('Failed to refresh models from OpenRouter.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Cache-First Strategy - Only fetch when cache is expired or missing
    // No background revalidation to avoid unnecessary API calls
    const cached = await getCachedModels();
    
    if (cached) {
      // Use cached data - no background fetch
      setAllModels(cached.models);
      setLastUpdated(cached.timestamp);
      setIsLoading(false);
      console.log(`Using cached models: ${cached.models.length} models, cached at ${new Date(cached.timestamp).toLocaleString()}`);
    } else {
      // No cache or expired, fetch fresh data
      setIsLoading(true);
      setLoadingStage(null);
      try {
        const models = await fetchModels();
        setAllModels(models);
        await cacheModels(models);
        setLastUpdated(Date.now());
        console.log(`Fetched fresh models: ${models.length} models`);
      } catch (err) {
        setError('Failed to fetch models from OpenRouter. Please try refreshing the page.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetRecommendations = async (useCase: string) => {
    if (!useCase.trim() || allModels.length === 0) {
      setError('Please enter a use case description.');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      setLoadingStage('analyzing'); // Initial Stage
      setRecommendations([]);
      
      // Pass the progress callback - models are cached server-side
      const recommended = await getModelRecommendations(
        useCase, 
        settings.numRecommendations,
        (stage) => setLoadingStage(stage)
      );

      // Enrich recommendations with full model data
      const enrichedRecommendations = recommended
        .map((rec): Recommendation | null => {
          const fullModel = allModels.find(m => m.id === rec.model_id);
          return fullModel ? { ...rec, model: fullModel } : null;
        })
        .filter((rec): rec is Recommendation => rec !== null);

      setRecommendations(enrichedRecommendations);

      // Add to history
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        useCase,
        recommendations: enrichedRecommendations
      };
      setHistory(prev => [newHistoryItem, ...prev]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Sorry, we could not generate recommendations: ${errorMessage}. Please try again.`);
      console.error('Recommendation error:', err);
    } finally {
      setIsLoading(false);
      setLoadingStage(null);
    }
  };

  const handleRestoreSession = (item: HistoryItem) => {
    setUseCaseInput(item.useCase);
    setRecommendations(item.recommendations);
    setCurrentView('home');
    setError(null);
  };

  return (
    <div className={theme}>
      <div className="min-h-screen bg-base-100 text-text-primary flex flex-col md:flex-row transition-colors duration-300 font-sans">
        
        <Sidebar 
          currentView={currentView} 
          setView={setCurrentView} 
          theme={theme} 
          toggleTheme={toggleTheme} 
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto h-screen">
          <div className="max-w-5xl mx-auto">
            {currentView === 'home' && (
              <>
                <Header />
                <UseCaseForm 
                  value={useCaseInput}
                  onChange={setUseCaseInput}
                  onSubmit={handleGetRecommendations} 
                  isLoading={isLoading}
                  modelCount={allModels.length}
                />
                {error && <ErrorDisplay message={error} />}
                
                {isLoading && (
                  <Loader 
                    message={recommendations.length > 0 ? "Navigating the LLM landscape..." : "Initializing Compass..."} 
                    stage={loadingStage}
                  />
                )}
                
                {!isLoading && recommendations.length > 0 && (
                  <div className="mt-12 animate-fade-in">
                    <h2 className="text-2xl font-bold text-center text-text-primary mb-6">Top {recommendations.length} Recommendations</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {recommendations.map((rec) => (
                        <ModelCard key={rec.model_id} recommendation={rec} />
                      ))}
                    </div>
                  </div>
                )}

                {!isLoading && recommendations.length === 0 && allModels.length > 0 && (
                   <div className="text-center mt-12 p-8 bg-base-200 rounded-lg border border-base-300">
                      <p className="text-text-secondary">Your recommended models will appear here once you describe your use case.</p>
                      <p className="text-xs text-text-secondary opacity-50 mt-4">
                        Database: {allModels.length} models loaded 
                        {lastUpdated && ` • Updated: ${new Date(lastUpdated).toLocaleTimeString()}`}
                      </p>
                   </div>
                )}
              </>
            )}

            {currentView === 'history' && (
              <History items={history} onSelect={handleRestoreSession} />
            )}
            
            {currentView === 'about' && <About />}
            
            {currentView === 'help' && <Help />}

            {currentView === 'settings' && (
              <Settings 
                settings={settings} 
                onUpdateSettings={setSettings} 
                lastUpdated={lastUpdated}
                onRefreshData={() => loadModels(true)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
