import React, { useState } from 'react';
import { OnlineStatus } from './OnlineStatus';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ASSESSMENT_YEARS, DEFAULT_ASSESSMENT_YEAR } from '../constants';

interface TopNavBarProps {
  pageName?: string;
  onBack?: () => void;
}

export function TopNavBar({ pageName, onBack }: TopNavBarProps) {
  const [selectedYear, setSelectedYear] = useState(DEFAULT_ASSESSMENT_YEAR);
  const showAssessmentYear = pageName === 'Inventory';
  const showBackButton = onBack && pageName !== 'Inventory';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 backdrop-blur-md border-b border-amber-200/30">
      <div className="w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {showBackButton && (
              <button 
                onClick={onBack}
                className="flex items-center space-x-1 text-amber-700 hover:text-amber-800 transition-colors"
              >
                <span className="text-lg">←</span>
                <span className="text-xs">Back to Inventory</span>
              </button>
            )}
            {!showBackButton && (
              <>
                <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs sm:text-sm">T</span>
                </div>
                <h1 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                  TaxYatra
                </h1>
              </>
            )}
          </div>
          
          {/* Centered page name */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            {pageName && (
              <div className="text-sm sm:text-base md:text-lg font-semibold text-amber-800">
                {pageName}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {showAssessmentYear && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-amber-700">Assessment Year</span>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32 h-8 !bg-white border-amber-200/50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSESSMENT_YEARS.map((year) => (
                      <SelectItem key={year} value={year} className="text-xs">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <OnlineStatus />
          </div>
        </div>
      </div>
    </nav>
  );
}
