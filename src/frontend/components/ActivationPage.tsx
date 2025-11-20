import React, { useState } from 'react';
import { Button } from './ui/button';
import { TopNavBar } from './TopNavBar';
import { BottomBar } from './BottomBar';

interface ActivationPageProps {
  onActivate: (code: string) => Promise<boolean>;
}

export function ActivationPage({ onActivate }: ActivationPageProps) {
  const [activationCode, setActivationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleActivation = async () => {
    setIsLoading(true);
    setError('');
    
    const isValid = await onActivate(activationCode);
    if (!isValid) {
      setError('Invalid activation code. Please try again.');
    }
    
    setIsLoading(false);
  };

  const features = [
    { icon: '🇮🇳', text: 'Filing taxes in India made super easy' },
    { icon: '⚡', text: 'Fast, simple, and hassle-free filing experience' },
    { icon: '🔄', text: 'Always updated with latest tax rules' },
    { icon: '💻', text: 'Clean, modern UI built for everyone' },
    { icon: '🤝', text: 'Real people, real support — whenever you need it' },
    { icon: '🔒', text: 'Secure. Reliable. 100% digital.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100/40 via-yellow-100/30 to-amber-50/50 relative overflow-hidden">
      <TopNavBar />
      
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-amber-200/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-40 h-40 sm:w-80 sm:h-80 bg-yellow-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 pt-16 sm:pt-20 md:pt-24 pb-16 sm:pb-20 px-3 sm:px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Main content */}
          <div className="text-center mb-6 sm:mb-8 md:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 text-amber-800 leading-tight">
              Welcome to TaxYatra
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-amber-700/90 mb-1 sm:mb-2 font-medium">Your Smart Tax Filing Partner</p>
            <p className="text-sm sm:text-base md:text-lg text-amber-600/80">Fast • Easy • Reliable</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 items-start">
            {/* Features */}
            <div className="space-y-3 sm:space-y-4 order-2 lg:order-1">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-amber-200/50 hover:bg-white/60 transition-all duration-300"
                >
                  <span className="text-lg sm:text-xl md:text-2xl flex-shrink-0">{feature.icon}</span>
                  <p className="text-sm sm:text-base text-amber-800/90 font-medium leading-relaxed">{feature.text}</p>
                </div>
              ))}
            </div>

            {/* Activation form */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-amber-300/40 p-4 sm:p-6 md:p-8 shadow-2xl order-1 lg:order-2">
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                  <span className="text-white text-lg sm:text-xl md:text-2xl">🔑</span>
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-amber-900 mb-2">Activate Your License</h2>
                <p className="text-sm sm:text-base text-amber-700/80">Enter your activation code to get started</p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <input
                    type="text"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="Enter activation code"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-amber-300/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200 text-amber-900 placeholder-amber-500/50 text-sm sm:text-base"
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="p-2 sm:p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-xs sm:text-sm">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleActivation}
                  disabled={!activationCode.trim() || isLoading}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Activating...</span>
                    </div>
                  ) : (
                    'Activate TaxYatra'
                  )}
                </Button>
              </div>

              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-amber-300/30">
                <p className="text-xs sm:text-sm text-amber-800/70 font-medium mb-3 text-center">Need Help?</p>
                <div className="space-y-2 text-xs sm:text-sm text-amber-700/80">
                  <div className="flex items-center justify-center space-x-2">
                    <span>📧</span>
                    <span>support@taxyatra.com</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <span>📞</span>
                    <span>+91 1800-XXX-XXXX</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <span>🕐</span>
                    <span>Mon-Sat, 9 AM - 6 PM IST</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomBar />
    </div>
  );
}
