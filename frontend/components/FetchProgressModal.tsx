import React, { useState, useEffect } from 'react';

interface FetchProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  status: string;
  isComplete: boolean;
  isError: boolean;
}

export function FetchProgressModal({ isOpen, onClose, onCancel, status, isComplete, isError }: FetchProgressModalProps) {
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen || isComplete || isError) {
      setElapsed(0);
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(seconds);
      setProgress(Math.min((seconds / 60) * 100, 95));
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isComplete, isError]);

  useEffect(() => {
    if (isComplete || isError) {
      setProgress(100);
    }
  }, [isComplete, isError]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">Fetching Profile Data</h3>
          <button
            onClick={isComplete || isError ? onClose : onCancel}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-600">Progress</span>
              <span className="text-xs font-medium text-gray-600">{elapsed}s</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isError ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              {!isComplete && !isError && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent flex-shrink-0"></div>
              )}
              {isComplete && (
                <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {isError && (
                <div className="flex-shrink-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <p className={`text-sm font-medium ${isError ? 'text-red-700' : isComplete ? 'text-green-700' : 'text-gray-700'}`}>
                {status}
              </p>
            </div>
          </div>

          {(isComplete || isError) && (
            <div className="mt-6">
              <button
                onClick={onClose}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  isError
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isError ? 'Close' : 'View Data'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
