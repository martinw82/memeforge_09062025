import React, { useState, useEffect } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import WalletConnect from '@walletconnect/client';
import QRCodeModal from '@walletconnect/qrcode-modal';
import { Wallet, CheckCircle, AlertCircle, RefreshCw, Star, Info } from 'lucide-react';

// Mock implementation for useWalletClient
const useWalletClient = () => {
  // console.warn('Using mock useWalletClient. For full functionality, integrate with a real wallet client provider.');
  return {
    walletClient: null, // Or a mock client object if specific properties are accessed
    // Example:
    // walletClient: {
    //   isConnected: false,
    //   connect: async () => console.log('Mock connect called'),
    //   disconnect: async () => console.log('Mock disconnect called'),
    //   getAddress: async () => null,
    //   // Add other methods/properties if they are accessed by the component
    // },
  };
};

interface AlgorandWalletSelectorProps {
  onConnect: (address: string, walletType: string) => void;
  onError: (error: string) => void;
  isConnecting: boolean;
  connectedWallet?: string | null;
}

interface WalletOption {
  id: string;
  name: string;
  description: string;
  logo: string;
  recommended?: boolean;
  available: boolean;
}

const AlgorandWalletSelector: React.FC<AlgorandWalletSelectorProps> = ({
  onConnect,
  onError,
  isConnecting,
  connectedWallet
}) => {
  const [peraWallet, setPeraWallet] = useState<PeraWalletConnect | null>(null);
  const [walletConnectClient, setWalletConnectClient] = useState<WalletConnect | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'idle' | 'connecting' | 'connected' | 'error'>>({});
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  
  const { walletClient: liquidWalletClient } = useWalletClient();

  const walletOptions: WalletOption[] = [
    {
      id: 'pera',
      name: 'Pera Wallet',
      description: 'Official Algorand mobile wallet with seamless dApp integration',
      logo: '🟦', // Placeholder - would use actual Pera Wallet logo
      recommended: true,
      available: true,
    },
    {
      id: 'liquid',
      name: 'Algorand Foundation Wallet',
      description: 'Secure web-based wallet by the Algorand Foundation',
      logo: '🔷', // Placeholder - would use actual AF Wallet logo
      available: !!liquidWalletClient,
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      description: 'Connect with any WalletConnect-compatible Algorand wallet',
      logo: '🔗', // Placeholder - would use actual WalletConnect logo
      available: true,
    },
  ];

  // Initialize wallet providers on mount
  useEffect(() => {
    initializeWallets();
    loadPersistedConnection();
  }, []);

  const initializeWallets = async () => {
    try {
      // Initialize Pera Wallet
      const pera = new PeraWalletConnect({
        chainId: 416002, // Algorand TestNet
      });
      setPeraWallet(pera);

      // Initialize WalletConnect
      const connector = new WalletConnect({
        bridge: 'https://bridge.walletconnect.org',
        qrcodeModal: QRCodeModal,
      });
      setWalletConnectClient(connector);

      // Set up WalletConnect event listeners
      connector.on('connect', (error, payload) => {
        if (error) {
          handleConnectionError('walletconnect', error.message);
          return;
        }
        const { accounts } = payload.params[0];
        if (accounts && accounts.length > 0) {
          handleConnectionSuccess('walletconnect', accounts[0]);
        }
      });

      connector.on('session_update', (error, payload) => {
        if (error) {
          handleConnectionError('walletconnect', error.message);
          return;
        }
        const { accounts } = payload.params[0];
        if (accounts && accounts.length > 0) {
          handleConnectionSuccess('walletconnect', accounts[0]);
        }
      });

      connector.on('disconnect', (error) => {
        if (error) {
          console.error('WalletConnect disconnect error:', error);
        }
        handleDisconnection('walletconnect');
      });

    } catch (error) {
      console.error('Failed to initialize wallets:', error);
      onError('Failed to initialize wallet providers');
    }
  };

  const loadPersistedConnection = () => {
    const savedWallet = localStorage.getItem('algorand_connected_wallet');
    const savedAddress = localStorage.getItem('algorand_wallet_address');
    
    if (savedWallet && savedAddress) {
      setConnectionStatus(prev => ({ ...prev, [savedWallet]: 'connected' }));
      // Attempt automatic reconnection
      attemptReconnection(savedWallet, savedAddress);
    }
  };

  const attemptReconnection = async (walletType: string, savedAddress: string) => {
    try {
      switch (walletType) {
        case 'pera':
          if (peraWallet) {
            const accounts = await peraWallet.reconnectSession();
            if (accounts.length > 0 && accounts[0] === savedAddress) {
              handleConnectionSuccess('pera', accounts[0]);
            }
          }
          break;
        case 'walletconnect':
          if (walletConnectClient && walletConnectClient.connected) {
            handleConnectionSuccess('walletconnect', savedAddress);
          }
          break;
        case 'liquid':
          if (liquidWalletClient && liquidWalletClient.isConnected) {
            const address = await liquidWalletClient.getAddress();
            if (address === savedAddress) {
              handleConnectionSuccess('liquid', address);
            }
          }
          break;
      }
    } catch (error) {
      console.error('Auto-reconnection failed:', error);
      clearPersistedConnection();
    }
  };

  const connectWallet = async (walletId: string) => {
    if (retryCount[walletId] >= 3) {
      onError(`Maximum retry attempts reached for ${walletId}`);
      return;
    }

    setSelectedWallet(walletId);
    setConnectionStatus(prev => ({ ...prev, [walletId]: 'connecting' }));

    try {
      switch (walletId) {
        case 'pera':
          await connectPeraWallet();
          break;
        case 'liquid':
          await connectLiquidWallet();
          break;
        case 'walletconnect':
          await connectWalletConnect();
          break;
        default:
          throw new Error(`Unknown wallet type: ${walletId}`);
      }
    } catch (error) {
      handleConnectionError(walletId, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const connectPeraWallet = async () => {
    if (!peraWallet) {
      throw new Error('Pera Wallet not initialized');
    }

    const newAccounts = await peraWallet.connect();
    if (newAccounts && newAccounts.length > 0) {
      handleConnectionSuccess('pera', newAccounts[0]);
    } else {
      throw new Error('No accounts returned from Pera Wallet');
    }
  };

  const connectLiquidWallet = async () => {
    if (!liquidWalletClient) {
      throw new Error('Algorand Foundation Wallet not available');
    }

    await liquidWalletClient.connect();
    const address = await liquidWalletClient.getAddress();
    if (address) {
      handleConnectionSuccess('liquid', address);
    } else {
      throw new Error('No address returned from Algorand Foundation Wallet');
    }
  };

  const connectWalletConnect = async () => {
    if (!walletConnectClient) {
      throw new Error('WalletConnect not initialized');
    }

    if (!walletConnectClient.connected) {
      await walletConnectClient.createSession();
    } else {
      const { accounts } = walletConnectClient;
      if (accounts && accounts.length > 0) {
        handleConnectionSuccess('walletconnect', accounts[0]);
      }
    }
  };

  const handleConnectionSuccess = (walletType: string, address: string) => {
    setConnectionStatus(prev => ({ ...prev, [walletType]: 'connected' }));
    setRetryCount(prev => ({ ...prev, [walletType]: 0 }));
    
    // Persist connection
    localStorage.setItem('algorand_connected_wallet', walletType);
    localStorage.setItem('algorand_wallet_address', address);
    
    onConnect(address, walletType);
    setSelectedWallet(null);
  };

  const handleConnectionError = (walletType: string, errorMessage: string) => {
    setConnectionStatus(prev => ({ ...prev, [walletType]: 'error' }));
    setRetryCount(prev => ({ ...prev, [walletType]: (prev[walletType] || 0) + 1 }));
    
    console.error(`${walletType} connection error:`, errorMessage);
    onError(`Failed to connect ${walletType}: ${errorMessage}`);
    setSelectedWallet(null);
  };

  const handleDisconnection = (walletType: string) => {
    setConnectionStatus(prev => ({ ...prev, [walletType]: 'idle' }));
    clearPersistedConnection();
  };

  const disconnectWallet = async () => {
    try {
      if (connectedWallet) {
        switch (connectedWallet) {
          case 'pera':
            if (peraWallet) {
              await peraWallet.disconnect();
            }
            break;
          case 'liquid':
            if (liquidWalletClient) {
              await liquidWalletClient.disconnect();
            }
            break;
          case 'walletconnect':
            if (walletConnectClient) {
              await walletConnectClient.killSession();
            }
            break;
        }
      }
      
      clearPersistedConnection();
      setShowDisconnectModal(false);
    } catch (error) {
      console.error('Disconnect error:', error);
      onError('Failed to disconnect wallet');
    }
  };

  const clearPersistedConnection = () => {
    localStorage.removeItem('algorand_connected_wallet');
    localStorage.removeItem('algorand_wallet_address');
    setConnectionStatus({});
  };

  const retryConnection = (walletId: string) => {
    setRetryCount(prev => ({ ...prev, [walletId]: 0 }));
    connectWallet(walletId);
  };

  const getStatusIcon = (walletId: string) => {
    const status = connectionStatus[walletId];
    switch (status) {
      case 'connecting':
        return <RefreshCw size={16} className="animate-spin text-blue-500" />;
      case 'connected':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  const isWalletConnected = (walletId: string) => {
    return connectionStatus[walletId] === 'connected';
  };

  const isWalletConnecting = (walletId: string) => {
    return connectionStatus[walletId] === 'connecting' || (isConnecting && selectedWallet === walletId);
  };

  if (connectedWallet) {
    const connectedWalletOption = walletOptions.find(w => w.id === connectedWallet);
    return (
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{connectedWalletOption?.logo}</span>
            <div>
              <div className="font-medium text-white">{connectedWalletOption?.name}</div>
              <div className="text-sm text-gray-400">Connected</div>
            </div>
          </div>
          <button
            onClick={() => setShowDisconnectModal(true)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Disconnect
          </button>
        </div>
        
        {showDisconnectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-medium text-white mb-4">Disconnect Wallet</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to disconnect your {connectedWalletOption?.name}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDisconnectModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={disconnectWallet}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-300 mb-3">
        Choose your Algorand wallet:
      </div>
      
      {walletOptions.map((wallet) => (
        <div
          key={wallet.id}
          className={`relative border rounded-lg p-4 transition-all cursor-pointer ${
            !wallet.available
              ? 'border-gray-600 bg-gray-800 opacity-50 cursor-not-allowed'
              : isWalletConnected(wallet.id)
              ? 'border-green-500 bg-green-900 bg-opacity-30'
              : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600'
          }`}
          onClick={() => wallet.available && !isWalletConnecting(wallet.id) && connectWallet(wallet.id)}
        >
          {wallet.recommended && (
            <div className="absolute -top-2 left-3 bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <Star size={12} />
              Recommended
            </div>
          )}
          
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 flex items-center justify-center text-2xl bg-gray-600 rounded-lg">
              {wallet.logo}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-white">{wallet.name}</h3>
                {getStatusIcon(wallet.id)}
                {!wallet.available && (
                  <div className="group relative">
                    <Info size={14} className="text-gray-400" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Wallet not available
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-400 leading-relaxed">
                {wallet.description}
              </p>
              
              {connectionStatus[wallet.id] === 'error' && retryCount[wallet.id] < 3 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    retryConnection(wallet.id);
                  }}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <RefreshCw size={12} />
                  Retry ({3 - (retryCount[wallet.id] || 0)} attempts left)
                </button>
              )}
            </div>
            
            {isWalletConnecting(wallet.id) && (
              <div className="flex items-center justify-center w-8 h-8">
                <RefreshCw size={16} className="animate-spin text-blue-500" />
              </div>
            )}
          </div>
        </div>
      ))}
      
      <div className="text-xs text-gray-400 mt-4 p-3 bg-gray-800 rounded">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-blue-400">Tip:</strong> Pera Wallet offers the best mobile experience with push notifications and seamless transaction signing.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlgorandWalletSelector;