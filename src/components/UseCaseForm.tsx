
import React from 'react';

interface UseCaseFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (useCase: string) => void;
  isLoading: boolean;
  modelCount?: number;
}

const UseCaseForm: React.FC<UseCaseFormProps> = ({ value, onChange, onSubmit, isLoading, modelCount }) => {
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value);
  };

  return (
    <div className="p-6 bg-base-200 rounded-xl shadow-lg border border-base-300">
      <form onSubmit={handleSubmit}>
        <label htmlFor="useCase" className="block text-lg font-medium text-text-primary mb-2">
          Describe Your Use Case
        </label>
        <textarea
          id="useCase"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., 'A chatbot for customer support that can handle complex queries in Spanish', 'Generate creative blog post ideas about sustainable travel', or 'Summarize long legal documents and extract key entities...'"
          className="w-full h-32 p-3 bg-base-100 border border-base-300 rounded-md focus:ring-2 focus:ring-brand-secondary focus:outline-none text-text-primary placeholder-text-secondary transition-shadow duration-200"
          disabled={isLoading}
        />
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          {modelCount && modelCount > 0 ? (
            <span className="text-xs text-text-secondary opacity-70">
              ({modelCount} models available from OpenRouter)
            </span>
          ) : <span></span>}
          
          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg hover:opacity-90 disabled:bg-base-300 disabled:text-text-secondary disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
          >
            {isLoading ? 'Analyzing...' : 'Get Recommendations'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UseCaseForm;
