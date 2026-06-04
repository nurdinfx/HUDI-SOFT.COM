import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if user already dismissed it recently
    const lastDismissed = localStorage.getItem('pwaPromptDismissed');
    if (lastDismissed) {
      const daysSinceDismissed = (new Date() - new Date(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show if dismissed within the last 7 days
      }
    }

    // Detect if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      return;
    }

    // iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent) || (userAgent.includes('mac') && 'ontouchend' in document);
    const isAndroid = /android/.test(userAgent);
    
    if (isIos) {
      setIsIOS(true);
      setShowPrompt(true);
    } else if (isAndroid) {
      // Always show on Android, even if beforeinstallprompt hasn't fired yet
      setShowPrompt(true);
    }

    // Android/Chrome Native Prompt Event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true); // Ensure it shows if the event fires
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If it's a desktop and not Android/iOS, maybe we also want to show it if beforeinstallprompt fires
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback for Android browsers that don't support beforeinstallprompt or haven't fired it
      alert("To install the app, tap your browser's menu button (⋮) and select 'Install app' or 'Add to Home screen'.");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwaPromptDismissed', new Date().toISOString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 right-0 z-[9999] p-4 md:p-6 pb-8 md:pb-6 pointer-events-none flex justify-end animate-slide-up">
      <div className="bg-white border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-[24px] p-5 w-full max-w-[380px] pointer-events-auto relative overflow-hidden flex flex-col gap-5">
        
        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 rounded-full transition-colors"
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        <div className="flex items-start gap-4 pr-4">
          <div className="w-16 h-16 bg-[#1a66ff] rounded-[14px] flex items-center justify-center shrink-0 text-white">
             <Download size={28} strokeWidth={2} />
          </div>
          <div className="flex flex-col pt-0.5">
            <h3 className="font-bold text-[#0f172a] text-[18px] leading-tight mb-1.5">Install HUDIPOS</h3>
            <p className="text-[14px] text-[#64748b] leading-[1.3] pr-2">
              Install our app to get a faster, more secure shopping experience.
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="bg-[#f8fafc] rounded-[16px] p-4 text-center">
            <p className="text-[14px] text-slate-700 font-medium mb-2">
              To install on iOS:
            </p>
            <div className="text-[13px] text-slate-500 flex flex-col gap-1 items-center">
              <span className="flex items-center gap-1">Tap <Share size={14} className="text-[#1a66ff]" /> below</span>
              <span className="flex items-center gap-1">Then 'Add to Home Screen' <PlusSquare size={14} className="text-[#1a66ff]" /></span>
            </div>
            <button 
              onClick={handleDismiss}
              className="w-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] font-bold text-[16px] py-3.5 rounded-[16px] transition-colors mt-3"
            >
              Got it!
            </button>
          </div>
        ) : (
          <button 
            onClick={handleInstallClick}
            className="w-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] font-bold text-[16px] py-3.5 rounded-[16px] transition-colors"
          >
            Got it!
          </button>
        )}
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
