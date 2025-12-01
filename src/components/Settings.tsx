
import React from 'react';
import { AppSettings } from '../types';
import { clearCache } from '../services/openRouterService';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  lastUpdated: number | null;
  onRefreshData: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, lastUpdated, onRefreshData }) => {
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
      await clearCache();
      onRefreshData();
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
                  className="px-3 py-2 bg-base-100 hover:bg-red-900/10 text-red-500 hover:text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:border-red-300 transition-colors"
                >
                  Clear Cache
                </button>
                <button 
                  onClick={onRefreshData}
                  className="px-4 py-2 bg-base-200 hover:bg-base-300 text-text-primary text-sm font-medium rounded-lg border border-base-300 transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                  Sync Now
                </button>
              </div>
            </div>
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
