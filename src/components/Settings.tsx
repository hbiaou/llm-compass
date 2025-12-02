
import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { clearCache } from '../services/openRouterService';

interface ArenaInfo {
  lastUpdated: string;
  categories: string[];
  totalModels: number;
}

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  lastUpdated: number | null;
  onRefreshData: () => Promise<void> | void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, lastUpdated, onRefreshData }) => {
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReloadingArena, setIsReloadingArena] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [arenaInfo, setArenaInfo] = useState<ArenaInfo | null>(null);

  // Fetch Arena info on mount
  useEffect(() => {
    fetchArenaInfo();
  }, []);

  const fetchArenaInfo = async () => {
    try {
      const response = await fetch('/api/arena');
      if (response.ok) {
        const data = await response.json();
        setArenaInfo({
          lastUpdated: data.metadata?.lastUpdated || 'Unknown',
          categories: data.categories || [],
          totalModels: data.totalModels || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch Arena info:', error);
    }
  };

  const handleReloadArena = async () => {
    setIsReloadingArena(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/arena/reload', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setStatusMessage('Arena rankings reloaded! Models will show updated badges.');
        await fetchArenaInfo();
        // Also refresh models to get updated Arena data
        await onRefreshData();
      } else {
        setStatusMessage('Failed to reload Arena rankings.');
      }
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      setStatusMessage('Failed to reload Arena rankings. Please try again.');
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsReloadingArena(false);
    }
  };

  // Check if Arena data is stale (> 30 days old)
  const isArenaStale = () => {
    if (!arenaInfo?.lastUpdated) return false;
    const lastUpdate = new Date(arenaInfo.lastUpdated);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 30;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value);
    if (value < 1) value = 1;
    if (value > 10) value = 10;
    
    onUpdateSettings({
      ...settings,
      numRecommendations: value
    });
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    setStatusMessage(null);
    try {
      await clearCache();
      await onRefreshData();
      setStatusMessage('Cache cleared and models refreshed!');
      // Clear message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      setStatusMessage('Failed to refresh models. Please try again.');
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      await onRefreshData();
      setStatusMessage('Models synced successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      setStatusMessage('Failed to sync models. Please try again.');
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-text-primary">Settings</h2>
        <p className="text-text-secondary">Customize your LLM Compass experience.</p>
      </div>

      <div className="bg-base-200 p-6 rounded-xl border border-base-300 space-y-8">
        {/* Preferences */}
        <div>
          <h3 className="text-xl font-bold text-text-primary mb-4">Preferences</h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-base-100 rounded-lg border border-base-300">
            <div>
              <label htmlFor="numRecommendations" className="block font-medium text-text-primary">
                Number of Recommendations
              </label>
              <p className="text-sm text-text-secondary mt-1">
                How many model suggestions to display (1-10).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="10"
                value={settings.numRecommendations}
                onChange={handleChange}
                className="w-32 h-2 bg-base-300 rounded-lg appearance-none cursor-pointer accent-brand-secondary"
              />
              <input
                type="number"
                id="numRecommendations"
                min="1"
                max="10"
                value={settings.numRecommendations}
                onChange={handleChange}
                className="w-16 p-2 text-center bg-base-100 border border-base-300 rounded-md focus:ring-2 focus:ring-brand-secondary focus:outline-none text-text-primary"
              />
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h3 className="text-xl font-bold text-text-primary mb-4">Data Management</h3>
          <div className="p-4 bg-base-100 rounded-lg border border-base-300 space-y-4">
            {/* Model Database */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="font-medium text-text-primary">Model Database</h4>
                <p className="text-sm text-text-secondary mt-1">
                  Local cache of OpenRouter models.
                </p>
                <p className="text-xs text-text-secondary opacity-70 mt-1">
                  Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}
                </p>
              </div>
              <div className="flex gap-2">
                 <button 
                  onClick={handleClearCache}
                  disabled={isClearing || isSyncing || isReloadingArena}
                  className="px-3 py-2 bg-base-100 hover:bg-red-900/10 text-red-500 hover:text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isClearing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Clearing...
                    </>
                  ) : (
                    'Clear Cache'
                  )}
                </button>
                <button 
                  onClick={handleSync}
                  disabled={isClearing || isSyncing || isReloadingArena}
                  className="px-4 py-2 bg-base-200 hover:bg-base-300 text-text-primary text-sm font-medium rounded-lg border border-base-300 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M23 4v6h-6"></path>
                    <path d="M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-base-300"></div>

            {/* LM Arena Rankings */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="font-medium text-text-primary flex items-center gap-2">
                  🏆 LM Arena Rankings
                  {isArenaStale() && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full">
                      Update needed
                    </span>
                  )}
                </h4>
                <p className="text-sm text-text-secondary mt-1">
                  Human-evaluated model rankings from lmarena.ai
                </p>
                {arenaInfo && (
                  <p className="text-xs text-text-secondary opacity-70 mt-1">
                    Last updated: {arenaInfo.lastUpdated} • {arenaInfo.categories.length} categories • {arenaInfo.totalModels} ranked models
                  </p>
                )}
              </div>
              <button 
                onClick={handleReloadArena}
                disabled={isClearing || isSyncing || isReloadingArena}
                className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 text-sm font-medium rounded-lg border border-yellow-500/30 hover:border-yellow-500/50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReloadingArena ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Reloading...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Reload Rankings
                  </>
                )}
              </button>
            </div>

            {/* Status message with animation */}
            {statusMessage && (
              <p className={`text-xs mt-2 animate-pulse ${statusMessage.includes('Failed') ? 'text-red-500' : 'text-green-500'}`}>
                {statusMessage}
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-base-300">
          <div className="flex items-start gap-3 p-4 bg-brand-primary/10 text-brand-secondary rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <p className="text-sm">
              We now analyze input/output modalities (Text, Image, Audio) and image pricing to give you even better recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
