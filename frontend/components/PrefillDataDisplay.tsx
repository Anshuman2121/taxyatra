import React from 'react';

interface PrefillDataDisplayProps {
  data: any;
}

export function PrefillDataDisplay({ data }: PrefillDataDisplayProps) {
  if (!data || data.error) {
    return (
      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">Error: {data?.error || 'Failed to fetch data'}</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800">API Response</h3>
        <button
          onClick={handleCopy}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
        >
          Copy JSON
        </button>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[500px] overflow-auto">
        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
