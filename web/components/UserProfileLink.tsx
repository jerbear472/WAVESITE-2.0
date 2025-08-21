'use client';

import Link from 'next/link';
import { User as UserIcon } from 'lucide-react';

interface UserProfileLinkProps {
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  className?: string;
  showAvatar?: boolean;
  avatarSize?: 'small' | 'medium' | 'large';
  onClick?: (e: React.MouseEvent) => void;
}

export default function UserProfileLink({
  userId,
  username,
  displayName,
  avatarUrl,
  className = '',
  showAvatar = false,
  avatarSize = 'small',
  onClick
}: UserProfileLinkProps) {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-10 h-10'
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick(e);
    }
  };

  const content = (
    <>
      {showAvatar && (
        <div className={`${sizeClasses[avatarSize]} rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500`}>
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName || username || 'User'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UserIcon className="w-3/5 h-3/5 text-white" />
            </div>
          )}
        </div>
      )}
      <span className={`hover:text-blue-400 transition-colors ${className}`}>
        {displayName || username || 'Anonymous'}
      </span>
    </>
  );

  return (
    <Link 
      href={`/user/${userId}`}
      className="flex items-center gap-2 cursor-pointer"
      onClick={handleClick}
    >
      {content}
    </Link>
  );
}