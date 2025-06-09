import React, { useState, useEffect } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../utils/analytics';
import { Cpu, Menu, X, User, LogOut, LogIn } from 'lucide-react';
import ChainSelector from './ChainSelector';
import AuthModal from './AuthModal';

const Navbar: React.FC = () => {
  const { blockchainState, getActiveConnection, getActiveChain } = useBlockchain();
  const { user, signOut, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const activeConnection = getActiveConnection();
  const activeChain = getActiveChain();

  // Track authentication events
  useEffect(() => {
    if (isAuthenticated && user) {
      trackEvent('user_logged_in', {
        auth_method: 'email_password',
      });
    }
  }, [isAuthenticated, user]);

  const handleSignOut = async () => {
    await trackEvent('user_logged_out', {});
    await signOut();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const openAuthModal = async (mode: 'signin' | 'signup') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
    
    await trackEvent('auth_modal_opened', {
      mode,
    });
  };

  return (
    <>
      <nav className="bg-gray-900 bg-opacity-90 backdrop-blur-lg py-3 md:py-4 px-4 md:px-6 sticky top-0 z-10 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          {/* Logo - responsive */}
          <div className="flex items-center">
            <Cpu size={24} className="text-blue-500 mr-2" />
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-white font-bold text-lg md:text-xl">MemeForge</span>
              <span className="ml-0 sm:ml-2 bg-blue-600 text-xs font-medium px-2 py-1 rounded-full text-white self-start">
                AI + Web3
              </span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <ChainSelector />
            
            {/* Authentication Status */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
                >
                  <User size={20} />
                  <span className="text-sm">{user?.email?.split('@')[0] || 'User'}</span>
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-20">
                    <div className="py-1">
                      <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-700">
                        {user?.email}
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openAuthModal('signin')}
                  className="text-white hover:text-gray-300 text-sm flex items-center gap-1"
                >
                  <LogIn size={16} />
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Blockchain Connection Info */}
            {activeConnection && (
              <div className="text-white text-sm">
                <div className="text-gray-400 text-xs">Connected to {activeChain?.displayName}</div>
                <div className="font-mono">
                  {`${activeConnection.address.substring(0, 6)}...${activeConnection.address.substring(activeConnection.address.length - 4)}`}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {blockchainState.isConnected && (
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white focus:outline-none p-1"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 px-4 space-y-4 bg-gray-800 mt-4 rounded-md">
            {/* Authentication Section */}
            <div className="border-b border-gray-700 pb-4">
              {isAuthenticated ? (
                <div className="space-y-2">
                  <div className="text-white text-sm">
                    <div className="text-gray-400 text-xs">Signed in as</div>
                    <div className="font-medium">{user?.email}</div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left text-red-400 hover:text-red-300 text-sm flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => openAuthModal('signin')}
                    className="w-full text-left text-white hover:text-gray-300 text-sm flex items-center gap-2"
                  >
                    <LogIn size={16} />
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md text-sm text-center"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Chain Selector */}
            <div className="flex justify-center">
              <ChainSelector />
            </div>
            
            {/* Blockchain Connection Info */}
            {activeConnection && (
              <div className="text-white text-center p-3 bg-gray-700 rounded-md">
                <div className="text-gray-400 text-sm mb-1">
                  Connected to {activeChain?.displayName}
                </div>
                <div className="font-mono text-sm break-all mb-1">
                  {activeConnection.address}
                </div>
                <div className="text-gray-400 text-sm">
                  {activeConnection.balance} {activeChain?.nativeCurrency.symbol}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Overlay to close dropdowns */}
        {(userMenuOpen || mobileMenuOpen) && (
          <div 
            className="fixed inset-0 z-5" 
            onClick={() => {
              setUserMenuOpen(false);
              setMobileMenuOpen(false);
            }}
          />
        )}
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  );
};

export default Navbar;