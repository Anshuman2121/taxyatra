import React, { useState, useEffect } from 'react';

export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  const checkConnectivity = async () => {
    try {
      await fetch('https://1.1.1.1', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000)
      });
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkConnectivity();
    
    // Check every 5 seconds
    const interval = setInterval(checkConnectivity, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <div 
        className="flex items-center space-x-1 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div 
          className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
            isOnline 
              ? 'bg-green-500 shadow-green-500/50' 
              : 'bg-orange-500 shadow-orange-500/50'
          } shadow-lg animate-pulse`}
        />
        <span className="text-xs text-amber-700/70 hidden sm:inline">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      
      {/* Custom tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-2 right-0 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50">
          {isOnline ? "You are connected to the internet" : "You are not connected to the internet"}
          <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      )}
    </div>
  );
}
