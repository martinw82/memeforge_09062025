import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom'; // Import routing components
import { MemeProvider } from './context/MemeContext';
import { BlockchainProvider } from './context/BlockchainContext';
import { AuthProvider } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { analytics, trackEvent, trackPageView } from './utils/analytics';
import { monitoring } from './utils/monitoring';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar'; // Main app Navbar
import { Sparkles, Rocket, Baseline as CoinBase, Users, Crown, Settings, Loader2 } from 'lucide-react';

// Admin components
const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboardPage = React.lazy(() => import('./components/admin/AdminDashboardPage'));

// Main app components (already lazy loaded)
const MemeTemplates = React.lazy(() => import('./components/MemeTemplates'));
const MemeEditor = React.lazy(() => import('./components/MemeEditor'));
const NFTMinter = React.lazy(() => import('./components/NFTMinter'));
const MemeGallery = React.lazy(() => import('./components/MemeGallery'));
const PremiumFeatures = React.lazy(() => import('./components/PremiumFeatures'));
const SubscriptionManager = React.lazy(() => import('./components/SubscriptionManager'));

const LoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex justify-center items-center py-12">
    <div className="flex flex-col items-center gap-4">
      <Loader2 size={32} className="animate-spin text-blue-500" />
      <p className="text-gray-400">{text}</p>
    </div>
  </div>
);

// Component for the main application layout and content
const MainAppLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'gallery' | 'premium' | 'account'>('create');
  const location = useLocation(); // For tracking page views on tab switch

  useEffect(() => {
     // Track initial page view for the current tab if not already tracked by App's main useEffect
     // This ensures that direct navigation to a tab is also tracked.
     const currentPath = location.pathname.substring(1) || 'create'; // Default to 'create'
     if (['create', 'gallery', 'premium', 'account'].includes(currentPath) && activeTab !== currentPath) {
         setActiveTab(currentPath as any);
         trackPageView(currentPath);
     } else if (location.pathname === '/') {
          setActiveTab('create');
          trackPageView('create');
     }
  }, [location, activeTab]);


  const handleTabSwitch = async (newTab: 'create' | 'gallery' | 'premium' | 'account') => {
    if (newTab !== activeTab) {
      const startTime = performance.now();
      await trackEvent('tab_switched', { from_tab: activeTab, to_tab: newTab, timestamp: Date.now() });
      await trackPageView(newTab); // Track page view on tab switch
      setActiveTab(newTab);
      const switchTime = performance.now() - startTime;
      monitoring.trackUserAction('tab_switch', switchTime, { from: activeTab, to: newTab });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <Navbar /> {/* This is the main app's Navbar */}
      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* ... (rest of the main app UI: Hero, Tabs, Tab Content, Footer) ... */}
        {/* This is a simplified version of the existing content in App.tsx */}
         <div className="text-center mb-6 md:mb-8">
           <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 px-2">
             AI-Powered Meme Generator
           </h1>
           <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto px-4">
             Create hilarious memes with AI assistance, customize them to perfection, and mint them as NFTs on multiple blockchains!
           </p>
         </div>
         <div className="flex bg-gray-800 rounded-lg p-1 overflow-x-auto">
             {/* Tab buttons */}
             <button onClick={() => handleTabSwitch('create')} className={`flex-1 py-3 px-2 rounded-md flex items-center justify-center gap-2 transition-all text-sm md:text-base whitespace-nowrap ${activeTab === 'create' ? 'bg-gray-700 text-white font-medium' : 'text-gray-400 hover:text-white'}`}><Rocket size={18} /> <span className="hidden sm:inline">Create Meme</span><span className="sm:hidden">Create</span></button>
             <button onClick={() => handleTabSwitch('gallery')} className={`flex-1 py-3 px-2 rounded-md flex items-center justify-center gap-2 transition-all text-sm md:text-base whitespace-nowrap ${activeTab === 'gallery' ? 'bg-gray-700 text-white font-medium' : 'text-gray-400 hover:text-white'}`}><Users size={18} /> <span className="hidden sm:inline">Community Gallery</span><span className="sm:hidden">Gallery</span></button>
             <button onClick={() => handleTabSwitch('premium')} className={`flex-1 py-3 px-2 rounded-md flex items-center justify-center gap-2 transition-all text-sm md:text-base whitespace-nowrap ${activeTab === 'premium' ? 'bg-gray-700 text-white font-medium' : 'text-gray-400 hover:text-white'}`}><Crown size={18} /> <span className="hidden sm:inline">Premium</span><span className="sm:hidden">Premium</span></button>
             <button onClick={() => handleTabSwitch('account')} className={`flex-1 py-3 px-2 rounded-md flex items-center justify-center gap-2 transition-all text-sm md:text-base whitespace-nowrap ${activeTab === 'account' ? 'bg-gray-700 text-white font-medium' : 'text-gray-400 hover:text-white'}`}><Settings size={18} /> <span className="hidden sm:inline">Account</span><span className="sm:hidden">Account</span></button>
         </div>
          <ErrorBoundary>
             <Suspense fallback={<LoadingSpinner text="Loading content..." />}>
               {activeTab === 'create' && (
                 <>
                   <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-6 md:mb-8">
                     <div className="flex items-center bg-blue-900 bg-opacity-30 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm"><Sparkles size={14} className="text-blue-400 mr-1 md:mr-2" /> <span className="hidden sm:inline">AI-Powered Text Generation</span><span className="sm:hidden">AI Captions</span></div>
                     <div className="flex items-center bg-purple-900 bg-opacity-30 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm"><Rocket size={14} className="text-purple-400 mr-1 md:mr-2" /> <span className="hidden sm:inline">Multi-Chain Support</span><span className="sm:hidden">Multi-Chain</span></div>
                     <div className="flex items-center bg-pink-900 bg-opacity-30 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm"><CoinBase size={14} className="text-pink-400 mr-1 md:mr-2" /> <span className="hidden sm:inline">Algorand + EVM NFTs</span><span className="sm:hidden">NFT Minting</span></div>
                     <div className="flex items-center bg-yellow-900 bg-opacity-30 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm"><Crown size={14} className="text-yellow-400 mr-1 md:mr-2" /> <span className="hidden sm:inline">Premium Features</span><span className="sm:hidden">Premium</span></div>
                   </div>
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
      </main>
    </div>
  );
};

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const location = useLocation(); // Get location here for initial page view tracking

  useEffect(() => {
    const initializeApp = async () => {
      // Track app load
      await trackEvent('app_loaded', {
        version: '1.0.0', // Replace with actual app version if available
        platform: 'web',
        user_agent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
      });

      // IMPORTANT: The initial trackPageView should be more dynamic based on the current route
      // For simplicity in this step, we'll assume it's handled by MainAppLayout or specific page components.
      // A more robust solution would involve a top-level effect that reacts to route changes.

      // Example: Track initial page view based on path
      const path = location.pathname === '/' ? 'create' : location.pathname.substring(1);
      if (!path.startsWith('admin')) { // Only track for non-admin pages here
         await trackPageView(path);
      }

      setIsInitialized(true);

      // Set up global error tracking (simplified from original)
      const handleError = (event: ErrorEvent) => {
        analytics.trackError(new Error(event.message), {
          component: 'AppGlobal',
          action: 'global_error_handler',
          additional: { filename: event.filename, lineno: event.lineno, colno: event.colno },
        });
      };
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        analytics.trackError(new Error(String(event.reason)), {
          component: 'AppGlobal',
          action: 'unhandled_promise_rejection',
        });
      };
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        // analytics.destroy(); // Potentially destroy analytics on app unmount if needed
        // monitoring.destroy(); // Potentially destroy monitoring on app unmount
      };
    };
    initializeApp();
  }, [location]); // Add location to dependency array

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <LoadingSpinner text="Initializing MemeForge..." />
      </div>
    );
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <BlockchainProvider>
          <MemeProvider>
            <ErrorBoundary>
              <Suspense fallback={<LoadingSpinner text="Loading application..." />}>
                <Routes>
                  <Route path="/admin/*" element={
                    <Suspense fallback={<LoadingSpinner text="Loading Admin..." />}>
                      <AdminLayout />
                    </Suspense>
                  }>
                    <Route index element={
                        <Suspense fallback={<LoadingSpinner text="Loading Dashboard..." />}>
                            <AdminDashboardPage />
                        </Suspense>
                    } />
                    {/* More admin routes will be nested here */}
                  </Route>
                  <Route path="/*" element={<MainAppLayout />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </MemeProvider>
        </BlockchainProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;