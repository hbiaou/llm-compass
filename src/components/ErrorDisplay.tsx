
import React from 'react';

interface ErrorDisplayProps {
  message: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => (
  <div className="my-6 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-center">
    <p>{message}</p>
  </div>
);

export default ErrorDisplay;
