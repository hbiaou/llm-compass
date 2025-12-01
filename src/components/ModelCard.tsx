
import React from 'react';
import { Recommendation } from '../types';

interface ModelCardProps {
  recommendation: Recommendation;
}

const formatPrice = (price: string): string => {
  const p = parseFloat(price);
  if (!p || p === 0) return "Free";
  const pricePerM = p * 1_000_000;
  if (pricePerM < 0.01) return `$${pricePerM.toFixed(4)}`;
  return `$${pricePerM.toFixed(2)}`;
}

const formatImagePrice = (price: string): string => {
   const p = parseFloat(price);
   if (!p || p === 0) return "0";
   return `$${(p * 1000).toFixed(4)} / 1k imgs`;
}

// Helper to parse "text+image->text" into badges
const getModalities = (modalityString: string) => {
  const [input, output] = modalityString.toLowerCase().split('->');
  const inputs = input ? input.split('+') : ['text'];
  const outputs = output ? output.split('+') : ['text'];
  return { inputs, outputs };
};

const ModalityBadge: React.FC<{ type: string, isInput?: boolean }> = ({ type, isInput }) => {
  const colors: Record<string, string> = {
    text: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    image: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    audio: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    video: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    file: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    embeddings: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  };
  
  const defaultColor = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const colorClass = colors[type.toLowerCase()] || defaultColor;

  return (
    <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded capitalize ${colorClass}`}>
      {type}
    </span>
  );
};

const ModelCard: React.FC<ModelCardProps> = ({ recommendation }) => {
  const { model, reason } = recommendation;

  if (!model) {
    return null;
  }

  const { inputs, outputs } = getModalities(model.architecture.modality);
  const hasImageCost = parseFloat(model.pricing.image) > 0;
  const hasRequestCost = parseFloat(model.pricing.request) > 0;

  return (
    <div className="bg-base-200 p-6 rounded-xl border border-base-300 flex flex-col justify-between transition-all duration-300 hover:border-brand-secondary hover:shadow-2xl hover:-translate-y-1">
      <div>
        <div className="mb-4">
          <div className="flex justify-between items-start">
             <h3 className="text-xl font-bold text-text-primary leading-tight mr-2 break-words">{model.name}</h3>
             {model.top_provider && (
               <span className="text-[10px] uppercase tracking-wider font-bold text-brand-secondary border border-brand-secondary px-1.5 py-0.5 rounded whitespace-nowrap">
                 {model.top_provider.name}
               </span>
             )}
          </div>
          <p className="text-xs text-text-secondary font-mono opacity-70 mt-1 truncate" title={model.id}>{model.id}</p>
        </div>

        {/* Modalities Section */}
        <div className="mb-4 flex flex-col gap-2">
           <div className="flex items-start gap-2 flex-wrap">
             <span className="text-xs text-text-secondary font-semibold mt-0.5">In:</span>
             <div className="flex flex-wrap gap-1">
               {inputs.map((m, i) => <ModalityBadge key={`in-${i}`} type={m} isInput />)}
             </div>
           </div>
           <div className="flex items-start gap-2 flex-wrap">
             <span className="text-xs text-text-secondary font-semibold mt-0.5">Out:</span>
             <div className="flex flex-wrap gap-1">
               {outputs.map((m, i) => <ModalityBadge key={`out-${i}`} type={m} />)}
             </div>
           </div>
        </div>

        <div className="mb-4 p-3 bg-base-100 rounded-lg border border-base-300">
          <p className="text-sm text-text-primary italic">"{reason}"</p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center py-1 border-b border-base-300/50">
            <span className="text-text-secondary">Context</span>
            <span className="font-mono text-text-primary font-bold">{model.context_length.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-base-300/50">
            <span className="text-text-secondary">Input Cost</span>
            <span className="text-text-primary">{formatPrice(model.pricing.prompt)} <span className="text-[10px] text-text-secondary">/1M</span></span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-base-300/50">
            <span className="text-text-secondary">Output Cost</span>
            <span className="text-text-primary">{formatPrice(model.pricing.completion)} <span className="text-[10px] text-text-secondary">/1M</span></span>
          </div>
          
          {hasImageCost && (
            <div className="flex justify-between items-center py-1 border-b border-base-300/50">
              <span className="text-text-secondary">Image Cost</span>
              <span className="text-text-primary">{formatImagePrice(model.pricing.image)}</span>
            </div>
          )}

          {hasRequestCost && (
            <div className="flex justify-between items-center py-1 border-b border-base-300/50">
               <span className="text-text-secondary">Request Fee</span>
               <span className="text-text-primary">{formatPrice(model.pricing.request)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelCard;
