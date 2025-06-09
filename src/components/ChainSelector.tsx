import React, { useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import { trackEvent } from '../utils/analytics';
import { ChevronDown, Check, Wallet, ExternalLink } from 'lucide-react';
import AlgorandWalletSelector from './AlgorandWalletSelector';

const ChainSelector: React.FC = () => {
  const { 
    blockchainState, 
    switchChain, 
    connectWallet, 
    disconnectWallet,
    getActiveChain,
    getSupportedChains,
    isWalletAvailable 
  } = useBlockchain();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [algorandWalletError, setAlgorandWalletError] = useState<string | null>(null);

  const activeChain = getActiveChain();
  const supportedChains = getSupportedChains();
  const activeConnection = blockchainState.activeChain 
    ? blockchainState.connections[blockchainState.activeChain] 
    : null;

  const handleChainSwitch = async (chainId: string) => {
    try {
      if (blockchainState.connections[chainId]) {
        // Switch to existing connection
        await switchChain(chainId);
        
        await trackEvent('chain_switched', {
          from_chain: blockchainState.activeChain || 'none',
          to_chain: chainId,
        });
      } else {
        // Need to connect to this chain first
        const chainConfig = supportedChains.find(c => c.id === chainId);
        if (!chainConfig) return;

        // Show wallet options for this chain
        setIsConnecting(chainId);
        setAlgorandWalletError(null);
        return;
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch chain:', error);
    }
  };

  const handleWalletConnect = async (chainId: string, walletType: string) => {
    try {
      await connectWallet(chainId, walletType);
      
      const chainConfig = supportedChains.find(c => c.id === chainId);
      await trackEvent('wallet_connected', {
        chain_type: chainConfig?.name || 'unknown',
        chain_id: chainId,
        wallet_type: walletType,
      });
      
      setIsConnecting(null);
      setIsOpen(false);
      setAlgorandWalletError(null);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setAlgorandWalletError(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const handleAlgorandConnect = async (address: string, walletType: string) => {
    const algorandChainId = isConnecting === 'algorand_mainnet' ? 'algorand_mainnet' : 'algorand_testnet';
    await handleWalletConnect(algorandChainId, walletType);
  };

  const handleAlgorandError = (error: string) => {
    setAlgorandWalletError(error);
  };

  const handleDisconnect = async (chainId: string) => {
    try {
      const chainConfig = supportedChains.find(c => c.id === chainId);
      const connection = blockchainState.connections[chainId];
      
      await disconnectWallet(chainId);
      
      await trackEvent('wallet_disconnected', {
        chain_type: chainConfig?.name || 'unknown',
        chain_id: chainId,
        wallet_type: connection?.walletType || 'unknown',
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  return (
    <div className="relative">
      {/* Main Chain Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-md transition-colors text-sm"
      >
        <span className="text-lg">{activeChain?.logo || '🔗'}</span>
        <span className="hidden sm:inline">
          {activeChain?.displayName || 'Select Chain'}
        </span>
        {activeConnection && (
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        )}
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold text-white mb-2">Select Blockchain</h3>
            <p className="text-xs text-gray-400">
              Choose your preferred blockchain for minting NFTs
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {/* Algorand Section (Primary) */}
            <div className="p-2">
              <div className="text-xs font-medium text-blue-400 mb-2 px-2">
                🌟 PRIMARY - ALGORAND
              </div>
              {supportedChains
                .filter(chain => chain.name === 'algorand')
                .map(chain => (
                  <ChainOption
                    key={chain.id}
                    chain={chain}
                    isActive={activeChain?.id === chain.id}
                    isConnected={!!blockchainState.connections[chain.id]}
                    connection={blockchainState.connections[chain.id]}
                    isConnecting={isConnecting === chain.id}
                    onSelect={() => handleChainSwitch(chain.id)}
                    onConnect={(walletType) => handleWalletConnect(chain.id, walletType)}
                    onDisconnect={() => handleDisconnect(chain.id)}
                    onCancelConnect={() => {
                      setIsConnecting(null);
                      setAlgorandWalletError(null);
                    }}
                    isWalletAvailable={isWalletAvailable}
                    algorandWalletSelector={
                      isConnecting === chain.id ? (
                        <AlgorandWalletSelector
                          onConnect={handleAlgorandConnect}
                          onError={handleAlgorandError}
                          isConnecting={false}
                          connectedWallet={null}
                        />
                      ) : null
                    }
                    algorandError={algorandWalletError}
                  />
                ))}
            </div>

            {/* EVM Section */}
            <div className="p-2 border-t border-gray-700">
              <div className="text-xs font-medium text-gray-400 mb-2 px-2">
                EVM COMPATIBLE
              </div>
              {supportedChains
                .filter(chain => chain.name !== 'algorand')
                .map(chain => (
                  <ChainOption
                    key={chain.id}
                    chain={chain}
                    isActive={activeChain?.id === chain.id}
                    isConnected={!!blockchainState.connections[chain.id]}
                    connection={blockchainState.connections[chain.id]}
                    isConnecting={isConnecting === chain.id}
                    onSelect={() => handleChainSwitch(chain.id)}
                    onConnect={(walletType) => handleWalletConnect(chain.id, walletType)}
                    onDisconnect={() => handleDisconnect(chain.id)}
                    onCancelConnect={() => setIsConnecting(null)}
                    isWalletAvailable={isWalletAvailable}
                  />
                ))}
            </div>
          </div>

          <div className="p-3 border-t border-gray-700 text-xs text-gray-400">
            <p>💡 Tip: Algorand offers low fees and fast transactions!</p>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsOpen(false);
            setIsConnecting(null);
            setAlgorandWalletError(null);
          }}
        />
      )}
    </div>
  );
};

interface ChainOptionProps {
  chain: any;
  isActive: boolean;
  isConnected: boolean;
  connection?: any;
  isConnecting: boolean;
  onSelect: () => void;
  onConnect: (walletType: string) => void;
  onDisconnect: () => void;
  onCancelConnect: () => void;
  isWalletAvailable: (chainId: string, walletType: string) => boolean;
  algorandWalletSelector?: React.ReactNode;
  algorandError?: string | null;
}

const ChainOption: React.FC<ChainOptionProps> = ({
  chain,
  isActive,
  isConnected,
  connection,
  isConnecting,
  onSelect,
  onConnect,
  onDisconnect,
  onCancelConnect,
  isWalletAvailable,
  algorandWalletSelector,
  algorandError,
}) => {
  if (isConnecting) {
    return (
      <div className="p-3 bg-gray-700 rounded-lg m-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{chain.logo}</span>
            <span className="font-medium text-white">{chain.displayName}</span>
          </div>
          <button
            onClick={onCancelConnect}
            className="text-gray-400 hover:text-white text-xs"
          >
            Cancel
          </button>
        </div>

        {chain.name === 'algorand' ? (
          <div className="space-y-2">
            {algorandWalletSelector}
            {algorandError && (
              <div className="text-red-400 text-xs p-2 bg-red-900 bg-opacity-30 rounded">
                {algorandError}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-2">Choose a wallet:</p>
            {chain.walletTypes.map((walletType: string) => (
              <button
                key={walletType}
                onClick={() => onConnect(walletType)}
                disabled={!isWalletAvailable(chain.id, walletType)}
                className={`w-full flex items-center gap-2 p-2 rounded text-sm transition-colors ${
                  isWalletAvailable(chain.id, walletType)
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Wallet size={14} />
                <span className="capitalize">{walletType}</span>
                {!isWalletAvailable(chain.id, walletType) && (
                  <span className="text-xs">(Not Available)</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`p-3 rounded-lg m-1 cursor-pointer transition-colors ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'hover:bg-gray-700 text-gray-300'
      }`}
      onClick={isConnected ? onSelect : () => {}}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{chain.logo}</span>
          <div>
            <div className="font-medium">{chain.displayName}</div>
            {chain.testnet && (
              <div className="text-xs text-gray-400">Testnet</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <div className="text-right">
                <div className="text-xs text-gray-400">
                  {connection?.address.substring(0, 6)}...{connection?.address.substring(-4)}
                </div>
                <div className="text-xs">
                  {connection?.balance} {chain.nativeCurrency.symbol}
                </div>
              </div>
              {isActive && <Check size={16} className="text-green-400" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDisconnect();
                }}
                className="text-xs text-gray-400 hover:text-white"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {isConnected && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <a
            href={`${chain.blockExplorerUrls[0]}/address/${connection?.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            View on Explorer <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  );
};

export default ChainSelector;