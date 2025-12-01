
import React from 'react';
import { HistoryItem } from '../types';

interface HistoryProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}

const History: React.FC<HistoryProps> = ({ items, onSelect }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-base-200 rounded-xl border border-base-300">
        <p className="text-text-secondary text-lg">No interaction history for this session yet.</p>
        <p className="text-sm text-text-secondary opacity-70 mt-2">Go to Home to start searching for models.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-text-primary mb-8">Session History</h2>
      <div className="space-y-6">
        {items.map((item) => (
          <div 
            key={item.id} 
            onClick={() => onSelect(item)}
            className="group bg-base-200 p-6 rounded-xl border border-base-300 hover:border-brand-secondary hover:shadow-lg cursor-pointer transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-mono text-text-secondary bg-base-300 px-2 py-1 rounded">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-xs text-brand-secondary opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                Click to restore results →
              </span>
            </div>
            
            <div className="mb-4">
               <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-1">Use Case</h4>
               <p className="text-text-primary italic line-clamp-2">"{item.useCase}"</p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">Recommendations</h4>
              {item.recommendations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {item.recommendations.map((rec, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-1 text-sm bg-base-100 border border-base-300 rounded text-text-primary font-medium"
                    >
                      {rec.model?.name || rec.model_id}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-red-400 text-sm">No recommendations found</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
