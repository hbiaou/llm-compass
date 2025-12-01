
import React from 'react';
import Logo from './Logo';

const Header: React.FC = () => (
  <header className="text-center mb-10">
    <div className="flex justify-center mb-4">
       <Logo className="w-20 h-20 text-text-primary" />
    </div>
    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-purple-500 mb-2">
      LLM Compass
    </h1>
    <p className="text-lg text-text-secondary max-w-2xl mx-auto">
      Discover the perfect AI model for your task. Just describe your use case, and we'll suggest the best options from OpenRouter.
    </p>
  </header>
);

export default Header;
