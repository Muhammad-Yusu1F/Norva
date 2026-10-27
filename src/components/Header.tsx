/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, Moon, Wallet } from 'lucide-react';
import { AccentTheme, ACCENT_THEMES } from '../types';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  avatarUrl: string;
  userName: string;
  userEmail?: string;
  onAdminClick?: () => void;
  onLogoClick?: () => void;
  accentTheme?: AccentTheme;
}

export const Header: React.FC<HeaderProps> = ({ 
  theme, 
  onToggleTheme, 
  avatarUrl, 
  userName,
  userEmail,
  onAdminClick,
  onLogoClick,
  accentTheme = 'blue'
}) => {
  const isAdminUser = userEmail?.trim().toLowerCase() === 'muhayusuf105@gmail.com';
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.blue;

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#faf8ff] dark:bg-[#131b2e]/95 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-white/10 flex justify-between items-center px-5 h-16 transition-colors duration-200">
      {/* Left side: NORVA Logo and Name */}
      <div 
        onClick={onLogoClick}
        className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all select-none"
        title="NORVA Bosh Sahifasi"
      >
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${currentAccent.headerIconGradient} flex items-center justify-center shadow-md shadow-sky-500/15 dark:shadow-sky-500/5 shrink-0 transition-all duration-300`}>
          <Wallet size={18} className="text-white" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            NORVA
          </h1>
          {onAdminClick && isAdminUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdminClick();
              }}
              className="p-1.5 text-teal-600 bg-teal-500/10 dark:text-teal-400 dark:bg-teal-400/10 rounded-full border border-teal-500/20 dark:border-teal-400/20 cursor-pointer hover:scale-110 active:scale-90 transition-all flex items-center justify-center shrink-0"
              title="Admin Panelga Kirish (Parol Bilan)"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>
          )}
        </div>
      </div>
      
      {/* Right side: Profile details + Theme Switch */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Info (Avatar + Name) */}
        <div className="flex items-center gap-2 max-w-[140px] sm:max-w-[240px]">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-primary/20 dark:border-white/10 flex items-center justify-center overflow-hidden bg-primary-container shrink-0">
            <img 
              className="w-full h-full object-cover select-none" 
              src={avatarUrl} 
              alt={userName}
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="inline-block text-xs font-extrabold text-gray-700 dark:text-gray-300 truncate max-w-[60px] xs:max-w-[100px] sm:max-w-[160px]">
            {userName || 'Moliya'}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button 
          onClick={onToggleTheme}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-primary dark:text-primary-fixed-dim transition-all active:scale-95 duration-100 cursor-pointer shrink-0"
          aria-label="Toggle theme"
          id="theme-toggle-btn"
        >
          {theme === 'dark' ? (
            <Sun size={18} className="animate-pulse" />
          ) : (
            <Moon size={18} />
          )}
        </button>
      </div>
    </header>
  );
};
