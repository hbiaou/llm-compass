
import React from 'react';

const About: React.FC = () => (
  <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
    <div className="space-y-4">
      <h2 className="text-3xl font-bold text-text-primary">About LLM Compass</h2>
      <p className="text-lg text-text-secondary leading-relaxed">
        LLM Compass is an intelligent tool designed to navigate the complex landscape of Large Language Models. 
        Leveraging the power of Google's Gemini API and the vast model directory of OpenRouter, we analyze your specific needs 
        to recommend the most suitable, cost-effective, and capable models for your tasks.
      </p>
    </div>

    <div className="bg-base-200 p-6 rounded-xl border border-base-300">
      <h3 className="text-xl font-bold text-text-primary mb-4">How It Works (Two-Stage Retrieval)</h3>
      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-secondary text-white flex items-center justify-center font-bold">1</div>
          <div>
            <h4 className="font-bold text-text-primary">Data Retrieval</h4>
            <p className="text-text-secondary text-sm mt-1">
              The app connects to OpenRouter's API to fetch the complete list of available LLMs (500+ models). This data is cached locally to ensure instant load times.
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-secondary text-white flex items-center justify-center font-bold">2</div>
          <div>
            <h4 className="font-bold text-text-primary">Constraint Extraction (Stage 1)</h4>
            <p className="text-text-secondary text-sm mt-1">
              We first ask Gemini to analyze your request and extract "hard constraints". This includes price limits, context size, and specific modalities (e.g., if you need <strong>Audio</strong> analysis, <strong>Video</strong> inputs, or <strong>PDF/File</strong> handling).
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-secondary text-white flex items-center justify-center font-bold">3</div>
          <div>
            <h4 className="font-bold text-text-primary">Smart Filtering & Semantic Ranking (Stage 2)</h4>
            <p className="text-text-secondary text-sm mt-1">
              We filter the database mathematically based on these constraints. Then, we send the <strong>full descriptions</strong> and specific capability lists (inputs/outputs) of the remaining candidates to Gemini. The AI uses this to find the best semantic match for your task.
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-secondary text-white flex items-center justify-center font-bold">4</div>
          <div>
            <h4 className="font-bold text-text-primary">Recommendation</h4>
            <p className="text-text-secondary text-sm mt-1">
              The system selects the top models that offer the best balance and presents them with clear reasoning.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-base-200 p-6 rounded-xl border border-base-300">
      <h3 className="text-xl font-bold text-text-primary mb-4">Key Features</h3>
      <ul className="space-y-3 text-text-secondary">
        <li className="flex items-start">
          <span className="mr-2 text-brand-secondary">✓</span>
          <span><strong>Two-Stage Precision:</strong> Combines rigid technical filtering with fluid semantic analysis.</span>
        </li>
        <li className="flex items-start">
          <span className="mr-2 text-brand-secondary">✓</span>
          <span><strong>Full Multi-Modal Support:</strong> Automatically detects if you need models for Text, Images, Audio, Video, Files, or Embeddings.</span>
        </li>
        <li className="flex items-start">
          <span className="mr-2 text-brand-secondary">✓</span>
          <span><strong>Real-time Data:</strong> Access to the latest models and pricing from OpenRouter.</span>
        </li>
      </ul>
    </div>

    <div className="space-y-2">
      <h3 className="text-xl font-bold text-text-primary">Author</h3>
      <div className="bg-base-200 p-6 rounded-xl border border-base-300 flex items-center space-x-4">
        <div className="flex-1">
          <p className="font-semibold text-text-primary text-lg">Prof. BIAOU Samadori S. Honoré</p>
          <p className="text-text-secondary">Université de Parakou, Bénin</p>
          <a href="mailto:hbiaou@gmail.com" className="text-brand-secondary hover:underline mt-2 inline-block">
            hbiaou@gmail.com
          </a>
        </div>
      </div>
    </div>
  </div>
);

export default About;
