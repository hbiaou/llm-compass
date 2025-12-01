
import React from 'react';

const Help: React.FC = () => (
  <div className="max-w-3xl mx-auto space-y-8">
    <h2 className="text-3xl font-bold text-text-primary">Help & Contact</h2>
    
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-text-primary">Frequently Asked Questions</h3>
      
      <div className="bg-base-200 rounded-xl border border-base-300 divide-y divide-base-300">
        <div className="p-6">
          <h4 className="font-bold text-text-primary text-lg mb-2">How do I use LLM Compass?</h4>
          <p className="text-text-secondary">
            Simply navigate to the Home page and type a description of what you want to achieve (e.g., "Summarize medical texts"). 
            Click "Get Recommendations" and the AI will analyze available models to find the best fit for you.
          </p>
        </div>
        <div className="p-6">
          <h4 className="font-bold text-text-primary text-lg mb-2">Is this service free?</h4>
          <p className="text-text-secondary">
            The LLM Compass tool itself is free to use. However, using the recommended models via OpenRouter may incur costs based on their respective pricing.
          </p>
        </div>
        <div className="p-6">
          <h4 className="font-bold text-text-primary text-lg mb-2">Are the recommendations unbiased?</h4>
          <p className="text-text-secondary">
            Yes. Recommendations are generated based solely on the technical specifications and capabilities of the models relative to your described use case.
          </p>
        </div>
      </div>
    </div>

    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-text-primary">Contact Us</h3>
      <p className="text-text-secondary">
        Have a feature request, found a bug, or just want to say hello? We'd love to hear from you.
      </p>
      <div className="bg-brand-primary/10 border border-brand-primary/20 p-6 rounded-xl">
        <p className="font-medium text-text-primary mb-2">Support & Feedback</p>
        <a href="mailto:hbiaou@gmail.com" className="text-brand-secondary font-bold text-lg hover:underline">
          hbiaou@gmail.com
        </a>
      </div>
    </div>
  </div>
);

export default Help;
