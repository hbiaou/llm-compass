
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer Ring */}
    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" className="text-brand-primary opacity-80" />
    
    {/* Cardinal Points */}
    <path d="M50 5 L50 15 M50 85 L50 95 M5 50 L15 50 M85 50 L95 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-brand-secondary"/>
    
    {/* Tech Circuit Nodes */}
    <circle cx="50" cy="5" r="3" fill="currentColor" className="text-brand-secondary" />
    <circle cx="95" cy="50" r="3" fill="currentColor" className="text-brand-secondary" />
    <circle cx="50" cy="95" r="3" fill="currentColor" className="text-brand-secondary" />
    <circle cx="5" cy="50" r="3" fill="currentColor" className="text-brand-secondary" />

    {/* Compass Needle */}
    <path d="M50 20 L65 50 L50 80 L35 50 Z" fill="currentColor" className="text-brand-secondary opacity-90" />
    <path d="M50 20 L65 50 L50 50 Z" fill="currentColor" className="text-brand-primary" />
    
    {/* Center Brain Node */}
    <circle cx="50" cy="50" r="6" fill="currentColor" className="text-base-100" />
    <circle cx="50" cy="50" r="3" fill="currentColor" className="text-brand-primary" />
  </svg>
);

export default Logo;
