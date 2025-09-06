'use client';

import WaveSightLogo from './WaveSightLogo';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-start items-center h-16">
          <WaveSightLogo size="md" linkTo="/" />
        </div>
      </div>
    </header>
  );
}