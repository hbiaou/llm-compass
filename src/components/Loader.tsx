
import React from 'react';
import Logo from './Logo';
import { ProgressStage } from '../types';

interface LoaderProps {
  message?: string;
  stage?: ProgressStage | null;
}

const Loader: React.FC<LoaderProps> = ({ message = "Loading...", stage }) => {
  
  // If no stage is provided, show simple spinner (e.g. for initial load)
  if (!stage) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in">
        <div className="relative mb-6">
          <Logo className="w-16 h-16 text-brand-secondary animate-spin" />
        </div>
        <p className="text-text-secondary font-medium animate-pulse">{message}</p>
      </div>
    );
  }

  // Progress Bar Logic
  const getProgressDetails = (s: ProgressStage) => {
    switch (s) {
      case 'analyzing':
        return { percent: 30, text: "Extracting Requirements (Stage 1)...", step: 1 };
      case 'filtering':
        return { percent: 60, text: "Filtering Database...", step: 2 };
      case 'ranking':
        return { percent: 90, text: "Semantic Analysis & Ranking (Stage 2)...", step: 3 };
      default:
        return { percent: 0, text: "Initializing...", step: 0 };
    }
  };

  const { percent, text, step } = getProgressDetails(stage);

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center animate-fade-in w-full max-w-2xl mx-auto">
      <div className="relative mb-8">
        <Logo className="w-16 h-16 text-brand-secondary animate-spin" />
      </div>
      
      <div className="w-full bg-base-300 rounded-full h-4 mb-4 overflow-hidden relative">
        <div 
          className="bg-brand-secondary h-4 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
          style={{ width: `${percent}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>

      <div className="flex justify-between w-full text-xs text-text-secondary font-mono mb-2 px-1">
        <span className={step >= 1 ? "text-brand-secondary font-bold" : "opacity-50"}>1. Analyze</span>
        <span className={step >= 2 ? "text-brand-secondary font-bold" : "opacity-50"}>2. Filter</span>
        <span className={step >= 3 ? "text-brand-secondary font-bold" : "opacity-50"}>3. Rank</span>
      </div>

      <p className="text-text-primary font-medium text-lg animate-fade-in key-{text}">
        {text}
      </p>
    </div>
  );
};

export default Loader;
