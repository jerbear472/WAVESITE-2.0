import React from 'react';

// Memoized trend card component
export const TrendCard = React.memo(({ trend, onVote }: any) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-2">
        {trend.title || trend.description || 'Untitled Trend'}
      </h3>
      {trend.thumbnail_url && (
        <img 
          src={trend.thumbnail_url} 
          alt="" 
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
      )}
      <p className="text-gray-600 mb-4">{trend.description}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onVote('nah')}
          className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Nah
        </button>
        <button
          onClick={() => onVote('wave')}
          className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Wave
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if trend ID changes
  return prevProps.trend.id === nextProps.trend.id;
});

TrendCard.displayName = 'TrendCard';

// Memoized stats card
export const StatsCard = React.memo(({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: {
  title: string;
  value: number | string;
  icon: any;
  color: string;
}) => {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-lg shadow-lg p-6 text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-white/60" />
      </div>
    </div>
  );
});

StatsCard.displayName = 'StatsCard';

// Memoized navigation item
export const NavItem = React.memo(({ 
  href, 
  label, 
  icon, 
  isActive, 
  onHover 
}: {
  href: string;
  label: string;
  icon: string;
  isActive: boolean;
  onHover: (href: string) => void;
}) => {
  return (
    <a
      href={href}
      onMouseEnter={() => onHover(href)}
      className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </a>
  );
});

NavItem.displayName = 'NavItem';

// Memoized list item with virtualization support
export const VirtualListItem = React.memo(({ 
  item, 
  style 
}: {
  item: any;
  style: React.CSSProperties;
}) => {
  return (
    <div style={style} className="p-4 border-b border-gray-200">
      <h4 className="font-medium">{item.title}</h4>
      <p className="text-sm text-gray-600">{item.description}</p>
    </div>
  );
});

VirtualListItem.displayName = 'VirtualListItem';

// Memoized loading skeleton
export const LoadingSkeleton = React.memo(() => {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
    </div>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';