import React, { useState, useEffect, Suspense } from 'react';
import { MemeProvider } from './context/MemeContext';
import { BlockchainProvider } from './context/BlockchainContext';
import { AuthProvider } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { analytics, trackEvent, trackPageView } from './utils/analytics';
import { monitoring } from './utils/monitoring';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import { Sparkles, Rocket, Baseline as CoinBase, Users, Crown, Settings, Loader2 } from 'lucide-react';

// Lazy load components for better performance
const MemeTemplates = React.lazy(() => import('./components/MemeTemplates'));
const MemeEditor = React.lazy(() => import('./components/MemeEditor'));
const NFTMinter = React.lazy(() => import('./components/NFTMinter'));
const MemeGallery = React.lazy(() => import('./components/MemeGallery'));
const PremiumFeatures = React.lazy(() => import('./components/PremiumFeatures'));
const SubscriptionManager = React.lazy(() => import('./components/SubscriptionManager'));

// Loading component
const LoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex justify-center items-center py-12">
    <div className="flex flex-col items-center gap-4">
      <Loader2 size={32} className="animate-spin text-blue-500" />
      <p className="text-gray-400">{text}</p>
    </div>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'gallery' | 'premium' | 'account'>('create');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Track app initialization and page views
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const startTime = performance.now();

        // Track app load
        await trackEvent('app_loaded', {
          version: '1.0.0',
          platform: 'web',
          user_agent: navigator.userAgent,
          url: window.location.href,
          referrer: document.referrer,
        });

        // Track initial page view
        await trackPageView('home');

        // Track performance metrics
        if ('performance' in window && 'getEntriesByType' in performance) {
          const [navigationEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          if (navigationEntry) {
            await analytics.trackPerformance('page_load_time', navigationEntry.loadEventEnd - navigationEntry.fetchStart, 'ms');
            await analytics.trackPerformance('dom_content_loaded', navigationEntry.domContentLoadedEventEnd - navigationEntry.fetchStart, 'ms');
            await analytics.trackPerformance('time_to_interactive', navigationEntry.domInteractive - navigationEntry.fetchStart, 'ms');
          }
        }

        // Track memory usage
        monitoring.trackMemoryUsage();

        const initTime = performance.now() - startTime;
        await analytics.trackPerformance('app_initialization', initTime, 'ms');

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        await analytics.trackError(error as Error, {
          component: 'App',
          action: 'initialization_error',
        });
        
        // Still allow app to load even if analytics fails
        setIsInitialized(true);
      }
    };

    initializeApp();

    // Set up global error tracking
    const handleError = (event: ErrorEvent) => {
      analytics.trackError(new Error(event.message), {
        component: 'App',
        action: 'global_error_handler',
        additional: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analytics.trackError(new Error(String(event.reason)), {
        component: 'App',
        action: 'unhandled_promise_rejection',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackEvent('page_hidden', { timestamp: Date.now() });
      } else {
        trackEvent('page_visible', { timestamp: Date.now() });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      analytics.destroy();
      monitoring.destroy();
    };
  }, []);

  const handleTabSwitch = async (newTab: 'create' | 'gallery' | 'premium' | 'account') => {
    if (newTab !== activeTab) {
      const startTime = performance.now();
      
      await trackEvent('tab_switched', {
        from_tab: activeTab,
        to_tab: newTab,
        timestamp: Date.now(),
      });
      
      await trackPageView(newTab);
      setActiveTab(newTab);

      // Track tab switch performance
      const switchTime = performance.now() - startTime;
      monitoring.trackUserAction('tab_switch', switchTime, { 
        from: activeTab, 
        to: newTab 
      });
    }
  };

  // Show loading spinner until app is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <LoadingSpinner text="Initializing MemeForge..." />
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SubscriptionProvider>
          <BlockchainProvider>
            <MemeProvider>
              <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
                <Navbar />
                
                <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
                  <div className="flex flex-col space-y-6">
                    {/* Hero Section - responsive */}
                    <div className="text-center mb-6 md:mb-8">
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 px-2">
                        AI-Powered Meme Generator
                      </h1>
                      <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto px-4">
                        Create hilarious memes with AI assistance, customize them to perfection, and mint them as NFTs on multiple blockchains!
                      </p>
                    </div>
                    
                    {/* Tabs - mobile-friendly */}
                    <div className="flex bg-gray-800 rounded-lg p-1 overflow-x-auto">
                      <button
                        className={`flex-1 py-3 px-2 rounded-md flex items-center justify-center gap-2 transition-all text-sm md:text-base whitespace-nowrap ${
                          activeTab === 'create'
                            ? 'bg-gray-700 text-white font-medium'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => handleTabSwitch('create')}
                      >
                        <Rocket size={18} />
                        <span className="hidden sm:inline">Create Meme</span>
                        <span className="sm:hidden">Create</span>
                      </button>
                      <button
                        className={`flex-1 py-3 px-2 rounded-md flex items-center justify-center gap-2 transition-all text-sm md:text-base whitespace-nowrap ${
                          activeTab === 'gallery'
                            ? 'bg-gray-700 text-white font-medium'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => handleTabSwitch('gallery')}
                      >
                        <Users size={18} />
                        <span className="hidden sm:inline">Community Gallery</span>
                        <span className="sm:hidden">Gallery</span>
                      </button>
                      <button
                        className={`flex-1 py-3 px-2 rounded-md flex items-center justify-center gap-2 transition-all text-sm md:text-base whitespace-nowrap ${
                          activeTab === 'premium'
                            ? 'bg-gray-700 text-white font-medium'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => handleTabSwitch('premium')}
                      >
                        <Crown size={18} />
                        <span className="hidden sm:inline">Premium</span>
                        <span className="sm:hidden">Premium</span>
                      </button>
                      <button
                        className={`flex-1 py-3 px-2 rounded-md flex items-center justify-center gap-2 transition-all text-sm md:text-base whitespace-nowrap ${
                          activeTab === 'account'
                            ? 'bg-gray-700 text-white font-medium'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => handleTabSwitch('account')}
                      >
                        <Settings size={18} />
                        <span className="hidden sm:inline">Account</span>
                        <span className="sm:hidden">Account</span>
                      </button>
                    </div>
                    
                    {/* Tab Content with Suspense for lazy loading */}
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingSpinner text="Loading content..." />}>
                        {activeTab === 'create' && (
                          <>
                            {/* App Features Pills - responsive layout */}
                            <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-6 md:mb-8">
                              <div className="flex items-center bg-blue-900 bg-opacity-30 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm">
                                <Sparkles size={14} className="text-blue-400 mr-1 md:mr-2" />
                                <span className="hidden sm:inline">AI-Powered Text Generation</span>
                                <span className="sm:hidden">AI Captions</span>
                              </div>
                              <div className="flex items-center bg-purple-900 bg-opacity-30 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm">
                                <Rocket size={14} className="text-purple-400 mr-1 md:mr-2" />
                                <span className="hidden sm:inline">Multi-Chain Support</span>
                                <span className="sm:hidden">Multi-Chain</span>
                              </div>
                              <div className="flex items-center bg-pink-900 bg-opacity-30 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm">
                                <CoinBase size={14} className="text-pink-400 mr-1 md:mr-2" />
                                <span className="hidden sm:inline">Algorand + EVM NFTs</span>
                                <span className="sm:hidden">NFT Minting</span>
                              </div>
                              <div className="flex items-center bg-yellow-900 bg-opacity-30 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm">
                                <Crown size={14} className="text-yellow-400 mr-1 md:mr-2" />
                                <span className="hidden sm:inline">Premium Features</span>
                                <span className="sm:hidden">Premium</span>
                              </div>
                            </div>
                            
                            {/* Create Section - responsive grid */}
                            <div className="grid grid-cols-1 gap-6">
                              <MemeTemplates />
                              <MemeEditor />
                              <NFTMinter />
                            </div>
                          </>
                        )}

                        {activeTab === 'gallery' && <MemeGallery />}
                        {activeTab === 'premium' && <PremiumFeatures />}
                        {activeTab === 'account' && <SubscriptionManager />}
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                </main>
                
                {/* Footer - responsive */}
                <footer className="mt-16 border-t border-gray-700 py-6 md:py-8">
                  <div className="max-w-6xl mx-auto px-4 text-center text-gray-400">
                    <p className="text-sm md:text-base">MemeForge - AI + Multi-Chain Meme Generator © 2025</p>
                    <p className="text-xs md:text-sm mt-2">Create, customize, and mint your memes as NFTs on Algorand & EVM chains</p>
                    <div className="flex justify-center items-center gap-4 mt-4 text-xs">
                      <a href="mailto:support@memeforge.app" className="hover:text-white transition-colors">Support</a>
                      <a href="mailto:partnerships@memeforge.app" className="hover:text-white transition-colors">Partnerships</a>
                      <span>•</span>
                      <span>Powered by Stripe & Supabase</span>
                      <span>•</span>
                      <span>v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
                    </div>
                  </div>
                </footer>
              </div>
            </MemeProvider>
          </BlockchainProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;