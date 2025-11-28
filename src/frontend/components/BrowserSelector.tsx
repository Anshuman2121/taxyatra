import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Globe } from 'lucide-react';
import { BrowserInfo } from '../../types/electron';

export function BrowserSelector() {
  const [browsers, setBrowsers] = useState<BrowserInfo[]>([]);
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadBrowsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const [detectResult, selectedResult] = await Promise.all([
        window.electronAPI.detectBrowsers(),
        window.electronAPI.getSelectedBrowser(),
      ]);

      if (detectResult.success) {
        setBrowsers(detectResult.browsers);
      }

      if (selectedResult.success && selectedResult.browser) {
        setSelectedBrowser(selectedResult.browser);
      }
    } catch (err) {
      console.error('Failed to load browsers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrowsers();
  }, [loadBrowsers]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover]);

  const handleBrowserSelect = async (browser: BrowserInfo) => {
    try {
      const result = await window.electronAPI.selectBrowser(browser.path);
      if (result.success) {
        setSelectedBrowser(browser);
      }
    } catch (err) {
      console.error('Failed to select browser:', err);
    }
    setShowPopover(false);
  };

  const getBrowserIcon = (browserId: string) => {
    const icons: Record<string, string> = {
      chrome: '🌐',
      edge: '🔷',
      brave: '🦁',
      chromium: '⚪',
      opera: '🔴',
      vivaldi: '🔶',
      custom: '🌍',
    };
    return icons[browserId] || '🌐';
  };

  const getStatusColor = () => {
    if (isLoading) return 'bg-gray-400';
    if (selectedBrowser) return 'bg-green-500 shadow-green-500/50';
    if (browsers.length > 0) return 'bg-yellow-500 shadow-yellow-500/50';
    return 'bg-red-500 shadow-red-500/50';
  };

  const getStatusText = () => {
    if (isLoading) return 'Loading...';
    if (selectedBrowser) return selectedBrowser.name;
    if (browsers.length > 0) return 'Not Set';
    return 'No Browser';
  };

  return (
    <div className="relative" ref={popoverRef}>
      <div
        className="flex items-center space-x-1 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setShowPopover(!showPopover)}
      >
        <div className="relative">
          <Globe className="w-4 h-4 text-amber-700/70" />
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${getStatusColor()} ${
              !isLoading ? 'shadow-lg' : ''
            }`}
          />
        </div>
        <span className="text-xs text-amber-700/70 hidden sm:inline max-w-[80px] truncate">
          {getStatusText()}
        </span>
      </div>

      {/* Popover */}
      {showPopover && (
        <div className="absolute top-full mt-2 right-0 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 min-w-[200px] overflow-hidden">
          <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 rotate-45"></div>
          
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-700 font-medium">
            Browser for Automation
          </div>

          {/* Browser List */}
          <div className="max-h-[200px] overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-4 text-center text-gray-400">
                Detecting browsers...
              </div>
            ) : browsers.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-400">
                No compatible browsers found
              </div>
            ) : (
              browsers.map((browser) => (
                <div
                  key={browser.path}
                  className={`px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-800 transition-colors ${
                    selectedBrowser?.path === browser.path ? 'bg-gray-800' : ''
                  }`}
                  onClick={() => handleBrowserSelect(browser)}
                >
                  <span className="text-sm">{getBrowserIcon(browser.id)}</span>
                  <span className="flex-1">{browser.name}</span>
                  {selectedBrowser?.path === browser.path && (
                    <span className="text-green-400">✓</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          {browsers.length > 0 && !selectedBrowser && (
            <div className="px-3 py-2 border-t border-gray-700 text-gray-400 text-[10px]">
              Select a browser for web automation
            </div>
          )}

          {/* Refresh button */}
          <div
            className="px-3 py-2 border-t border-gray-700 text-center text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              loadBrowsers();
            }}
          >
            ↻ Refresh
          </div>
        </div>
      )}
    </div>
  );
}
