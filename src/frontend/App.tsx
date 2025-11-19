import React, { useState, useEffect } from 'react';
import { ActivationPage } from './components/ActivationPage';
import { HomePage } from './components/HomePage';
import { AddUserPage } from './components/AddUserPage';
import { api } from './api';

function App() {
  const [isActivated, setIsActivated] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedPan, setSelectedPan] = useState<string | undefined>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    checkActivationStatus();
  }, []);

  const checkActivationStatus = async () => {
    const activated = await api.checkActivation();
    setIsActivated(activated);
  };

  const handleActivation = async (code: string): Promise<boolean> => {
    const isValid = await api.validateActivationCode(code);
    if (isValid) {
      setIsActivated(true);
      return true;
    }
    return false;
  };

  const handleNavigation = (page: string, pan?: string) => {
    setCurrentPage(page);
    setSelectedPan(pan);
  };

  const handleBack = () => {
    setCurrentPage('home');
    setSelectedPan(undefined);
    setRefreshTrigger(prev => prev + 1);
  };

  // if (isActivated === null) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
  //       <div className="flex items-center space-x-3">
  //         <div className="w-8 h-8 border-4 border-amber-400/30 border-t-amber-500 rounded-full animate-spin"></div>
  //         <span className="text-amber-700 font-medium">Loading TaxYatra...</span>
  //       </div>
  //     </div>
  //   );
  // }

  // if (!isActivated) {
  //   return <ActivationPage onActivate={handleActivation} />;
  // }

  // Route to different pages
  switch (currentPage) {
    case 'add-user':
      return <AddUserPage onBack={handleBack} selectedPan={selectedPan} />;
    default:
      return <HomePage onNavigate={handleNavigation} refreshTrigger={refreshTrigger} />;
  }
}

export default App;
