import React, { useState, useEffect } from 'react';
import RegistrationPage from './RegistrationPage';
import { HomePage } from './components/HomePage';
import { AddUserPage } from './components/AddUserPage';

function App() {
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedPan, setSelectedPan] = useState<string | undefined>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    checkRegistration();
  }, []);

  const checkRegistration = async () => {
    try {
      const result = await window.electronAPI.checkRegistration();
      setIsRegistered(result.registered);
    } catch (error) {
      console.error('Failed to check registration:', error);
      setIsRegistered(false);
    }
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

  if (isRegistered === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isRegistered) {
    return <RegistrationPage onRegistered={() => setIsRegistered(true)} />;
  }

  return (
    <div>
      {(() => {
        switch (currentPage) {
          case 'add-user':
            return <AddUserPage onBack={handleBack} selectedPan={selectedPan} />;
          default:
            return <HomePage onNavigate={handleNavigation} refreshTrigger={refreshTrigger} />;
        }
      })()}
    </div>
  );
}

export default App;
