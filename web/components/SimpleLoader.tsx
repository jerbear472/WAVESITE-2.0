import React from 'react';

interface SimpleLoaderProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const SimpleLoader: React.FC<SimpleLoaderProps> = ({ 
  size = 'medium', 
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-6 h-6 border-2',
    medium: 'w-8 h-8 border-3', 
    large: 'w-12 h-12 border-4'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div 
        className={`${sizeClasses[size]} border-blue-200 border-t-blue-500 rounded-full animate-wave-loading`}
        style={{
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.3), inset 0 0 10px rgba(59, 130, 246, 0.1)'
        }}
      />
    </div>
  );
};

export default SimpleLoader;