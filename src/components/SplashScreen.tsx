import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

const appLogoImg = '/src/assets/images/norva_blue_wallet_icon.jpg';

interface SplashScreenProps {
  isVisible: boolean;
  onFinish?: () => void;
  userName?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  isVisible, 
  onFinish 
}) => {
  // Auto-dismiss splash screen after 2.8 seconds
  React.useEffect(() => {
    if (isVisible && onFinish) {
      const timer = setTimeout(() => {
        onFinish();
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(4px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          onClick={onFinish}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-gradient-to-b from-[#0F4CBA] via-[#1570F1] to-[#0B3882] text-white overflow-hidden select-none cursor-pointer py-12 px-6"
        >
          {/* Subtle Classic Ambient Background Grid Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          
          {/* Ambient Glowing Center Light */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Filler for Centering */}
          <div className="w-full h-8" />

          {/* Main Logo & Title Container */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-xs w-full">
            
            {/* Logo Wrapper with Gentle Pulsing Aura */}
            <div className="relative flex items-center justify-center mb-6">
              
              {/* Expanding Soft Pulsing Waves */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.35, 1.5], opacity: [0.5, 0.2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-3xl bg-white/30 blur-md pointer-events-none"
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.2, 1.35], opacity: [0.6, 0.3, 0] }}
                transition={{ duration: 2, delay: 0.4, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-3xl bg-blue-200/30 blur-sm pointer-events-none"
              />

              {/* Main App Icon Container */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.215, 0.61, 0.355, 1] }}
                className="relative z-10 w-32 h-32 sm:w-36 sm:h-36 rounded-3xl overflow-hidden shadow-2xl shadow-blue-950/60 ring-4 ring-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center p-1"
              >
                <img 
                  src={appLogoImg} 
                  alt="NORVA Logo" 
                  className="w-full h-full object-cover rounded-[22px] drop-shadow-md"
                  onError={(e) => {
                    // Fallback to vector icon if image path issue occurs
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </motion.div>
            </div>

            {/* Brand Title: NORVA */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              className="flex items-center justify-center tracking-[0.25em] text-white font-sans drop-shadow-md"
            >
              <span className="text-3xl sm:text-4xl font-black uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-blue-100">
                NORVA
              </span>
            </motion.div>

            {/* Elegant Accent Line */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "60px", opacity: 0.8 }}
              transition={{ duration: 0.6, delay: 0.6, ease: "easeInOut" }}
              className="h-0.5 bg-gradient-to-r from-transparent via-white to-transparent my-3.5 rounded-full"
            />

            {/* Subtitle / Slogan */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.9, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="text-xs sm:text-sm font-medium text-blue-100/80 tracking-wide"
            >
              Aqliy va Aqlli Moliya Boshqaruvi
            </motion.p>
          </div>

          {/* Bottom Classic Footer / Loading Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="relative z-10 flex flex-col items-center gap-2"
          >
            {/* Minimalist Progress Loader */}
            <div className="w-24 h-1 bg-white/15 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 1.8, delay: 0.5, ease: "easeInOut" }}
                className="w-full h-full bg-gradient-to-r from-blue-300 via-white to-blue-200 rounded-full"
              />
            </div>
            <span className="text-[10px] text-blue-200/60 font-semibold tracking-widest uppercase">
              Yuklanmoqda...
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};



