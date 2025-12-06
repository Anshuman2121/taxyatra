import React from 'react';

export function BottomBar() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 backdrop-blur-md border-t border-amber-200/30">
      <div className="w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm space-y-1 sm:space-y-0">
          <div className="text-amber-700/70">
            © 2024 TaxYatra. All rights reserved.
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 text-amber-700/70">
            <span>🔒 Secure</span>
            <span className="hidden sm:inline">•</span>
            <span>🇮🇳 Made in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
