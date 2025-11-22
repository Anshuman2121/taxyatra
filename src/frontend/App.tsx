import React, { useState, useEffect } from 'react';
import RegistrationPage from './pages/registration/page';
import { Loader2 } from 'lucide-react';
import { HomePage } from './pages/home/page';
import { AddUserPage } from './pages/add-user/page';
import { UserDetailsPage } from './pages/user-details/page';

function App() {
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null); // null = loading
  const [checking, setChecking] = useState(true);

  const checkRegistrationStatus = async () => {
    try {
      const result = await window.electronAPI.checkRegistration();
      setIsRegistered(result.registered);
    } catch (error) {
      console.error("Failed to check registration:", error);
      setIsRegistered(false);
    } finally {
      setChecking(false);
    }
  };

  const [currentPage, setCurrentPage] = useState('home');
  const [selectedPan, setSelectedPan] = useState<string | undefined>(undefined);

  useEffect(() => {
    checkRegistrationStatus();
  }, []);

  const handleRegistrationSuccess = () => {
    setIsRegistered(true);
  };

  const handleNavigate = (page: string, pan?: string) => {
    setCurrentPage(page);
    setSelectedPan(pan);
  };

  if (checking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <RegistrationPage onRegistered={handleRegistrationSuccess} />
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-gold-200 selection:text-gold-900">
      {currentPage === 'home' && (
        <HomePage onNavigate={handleNavigate} />
      )}
      {currentPage === 'add-user' && (
        <AddUserPage
          onBack={() => handleNavigate('home')}
          selectedPan={selectedPan}
        />
      )}
      {currentPage === 'user-details' && selectedPan && (
        <UserDetailsPage
          pan={selectedPan}
          onBack={() => handleNavigate('home')}
        />
      )}
    </div>
  );
}

export default App;
