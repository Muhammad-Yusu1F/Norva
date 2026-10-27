import React from 'react';
import { motion } from 'motion/react';
import { Grid2X2, ReceiptText, BarChart3, User, Info } from 'lucide-react';
import { AccentTheme, ACCENT_THEMES } from '../types';

export type TabType = 'home' | 'history' | 'insights' | 'profile' | 'about';

interface LiquidGlassNavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  accentTheme?: AccentTheme;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Asosiy', icon: Grid2X2 },
  { id: 'history', label: 'Tarix', icon: ReceiptText },
  { id: 'insights', label: 'Tahlil', icon: BarChart3 },
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'about', label: 'Ilova', icon: Info },
];

export const LiquidGlassNavbar: React.FC<LiquidGlassNavbarProps> = ({
  activeTab,
  setActiveTab,
  accentTheme = 'blue',
}) => {
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.blue;

  return (
    <div className="fixed bottom-1.5 left-3 right-3 z-40 max-w-lg mx-auto pointer-events-auto">
      {/* Translucent Liquid Glass Capsule Bar */}
      <nav 
        className="relative flex items-center justify-between p-1.5 rounded-full bg-white/85 dark:bg-[#0c1628]/85 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_10px_30px_rgba(31,38,135,0.1),_0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition-all overflow-hidden"
        aria-label="Liquid Glass Navigation Bar"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className="relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-full transition-all cursor-pointer select-none group min-w-0 z-10"
              id={`nav-${item.id}-tab`}
            >
              {/* Sliding Liquid Glass Active Circle Bubble */}
              {isActive && (
                <motion.div
                  layoutId="liquid-active-pill"
                  className={`absolute inset-0 rounded-full bg-gradient-to-b ${currentAccent.pillGradient} text-white ${currentAccent.pillShadow} border border-white/60 overflow-hidden`}
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 34,
                  }}
                >
                  {/* Specular Liquid Glass Top Glossy Highlight */}
                  <div className="absolute top-0 left-2 right-2 h-2 rounded-full bg-gradient-to-b from-white/40 via-white/10 to-transparent pointer-events-none" />
                </motion.div>
              )}

              {/* Icon & Label */}
              <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-200 group-active:scale-90">
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <Icon
                    size={19}
                    className={`transition-colors duration-200 ${
                      isActive
                        ? 'text-white drop-shadow-[0_2px_6px_rgba(255,255,255,0.7)]'
                        : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-gray-100'
                    }`}
                  />
                </motion.div>

                <span
                  className={`text-[10px] font-extrabold mt-0.5 tracking-tight whitespace-nowrap transition-colors duration-200 ${
                    isActive
                      ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-gray-100'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
