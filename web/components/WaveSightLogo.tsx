'use client';

import Link from 'next/link';
import Image from 'next/image';

interface WaveSightLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  linkTo?: string;
  className?: string;
}

export default function WaveSightLogo({ 
  size = 'md', 
  showIcon = true, 
  linkTo,
  className = '' 
}: WaveSightLogoProps) {
  const sizeStyles = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  const logoSizes = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48
  };

  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      {showIcon && (
        <Image
          src="/logo2.png"
          alt="WaveSight Logo"
          width={logoSizes[size]}
          height={logoSizes[size]}
          className="rounded-lg"
          priority
        />
      )}
      <span className={`font-light ${sizeStyles[size]}`}>
        <span className="text-gray-900 dark:text-gray-100">Wave</span>
        <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent font-normal">Sight</span>
      </span>
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="inline-flex items-center hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}