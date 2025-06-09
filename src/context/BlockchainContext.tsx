import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BlockchainState, NFTMetadata, MintResult, WalletConnection, ChainConfig } from '../types/blockchain';
import { AlgorandBlockchain } from '../utils/blockchain/algorand';
import { EVMBlockchain } from '../utils/blockchain/evm';
import { BlockchainInterface } from '../utils/blockchain/interface';
import { SUPPORTED_CHAINS, DEFAULT_CHAIN, getChainConfig } from '../utils/blockchain/chains';

type BlockchainContextType = {
  blockchainState: BlockchainState;
  connectWallet: (chainId: string, walletType: string) => Promise<void>;
  disconnectWallet: (chainId?: string) => Promise<void>;
  switchChain: (chainId: string) => Promise<void>;
  mintNFT: (metadata: NFTMetadata, imageData: string) => Promise<MintResult>;
  getActiveConnection: () => WalletConnection | null;
  getActiveChain: () => ChainConfig | null;
  getSupportedChains: () => ChainConfig[];
  isWalletAvailable: (chainId: string, walletType: string) => boolean;
};

const initialState: BlockchainState = {
  isConnected: false,
  activeChain: null,
  connections: {},
  supportedChains: Object.values(SUPPORTED_CHAINS),
  isConnecting: false,
  error: null,
};

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);

export const BlockchainProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [blockchainState, setBlockchainState] = useState<BlockchainState>(initialState);
  const [blockchainInstances, setBlockchainInstances] = useState<Record<string, BlockchainInterface>>({});

  // Initialize blockchain instances
  useEffect(() => {
    const instances: Record<string, BlockchainInterface> = {};
    
    Object.keys(SUPPORTED_CHAINS).forEach(chainId => {
      const chainConfig = SUPPORTED_CHAINS[chainId];
      
      if (chainConfig.name === 'algorand') {
        instances[chainId] = new AlgorandBlockchain(chainConfig.testnet);
      } else {
        instances[chainId] = new EVMBlockchain(chainId);
      }
    });
    
    setBlockchainInstances(instances);
  }, []);

  // Load saved connections from localStorage
  useEffect(() => {
    const savedConnections = localStorage.getItem('blockchain_connections');
    const savedActiveChain = localStorage.getItem('active_chain');
    
    if (savedConnections) {
      try {
        const connections = JSON.parse(savedConnections);
        const activeChain = savedActiveChain || DEFAULT_CHAIN;
        
        setBlockchainState(prev => ({
          ...prev,
          connections,
          activeChain,
          isConnected: Object.keys(connections).length > 0,
        }));
      } catch (error) {
        console.error('Failed to load saved connections:', error);
      }
    }
  }, []);

  // Save connections to localStorage
  const saveConnections = (connections: Record<string, WalletConnection>, activeChain: string | null) => {
    localStorage.setItem('blockchain_connections', JSON.stringify(connections));
    if (activeChain) {
      localStorage.setItem('active_chain', activeChain);
    }
  };

  const connectWallet = async (chainId: string, walletType: string) => {
    setBlockchainState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const blockchainInstance = blockchainInstances[chainId];
      if (!blockchainInstance) {
        throw new Error(`Blockchain instance for ${chainId} not found`);
      }

      const connection = await blockchainInstance.connectWallet(walletType);
      
      const newConnections = {
        ...blockchainState.connections,
        [chainId]: connection,
      };

      const newState = {
        ...blockchainState,
        isConnected: true,
        activeChain: chainId,
        connections: newConnections,
        isConnecting: false,
      };

      setBlockchainState(newState);
      saveConnections(newConnections, chainId);
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setBlockchainState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
      throw error;
    }
  };

  const disconnectWallet = async (chainId?: string) => {
    try {
      if (chainId) {
        // Disconnect specific chain
        const blockchainInstance = blockchainInstances[chainId];
        if (blockchainInstance) {
          await blockchainInstance.disconnectWallet();
        }

        const newConnections = { ...blockchainState.connections };
        delete newConnections[chainId];

        const newActiveChain = chainId === blockchainState.activeChain 
          ? (Object.keys(newConnections)[0] || null)
          : blockchainState.activeChain;

        const newState = {
          ...blockchainState,
          connections: newConnections,
          activeChain: newActiveChain,
          isConnected: Object.keys(newConnections).length > 0,
        };

        setBlockchainState(newState);
        saveConnections(newConnections, newActiveChain);
      } else {
        // Disconnect all chains
        for (const [chainId, instance] of Object.entries(blockchainInstances)) {
          if (blockchainState.connections[chainId]) {
            await instance.disconnectWallet();
          }
        }

        const newState = {
          ...blockchainState,
          isConnected: false,
          activeChain: null,
          connections: {},
        };

        setBlockchainState(newState);
        localStorage.removeItem('blockchain_connections');
        localStorage.removeItem('active_chain');
      }
    } catch (error) {
      console.error('Wallet disconnection failed:', error);
      setBlockchainState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Disconnection failed',
      }));
    }
  };

  const switchChain = async (chainId: string) => {
    if (!blockchainState.connections[chainId]) {
      throw new Error(`Not connected to ${chainId}. Please connect first.`);
    }

    setBlockchainState(prev => ({ ...prev, activeChain: chainId }));
    localStorage.setItem('active_chain', chainId);
  };

  const mintNFT = async (metadata: NFTMetadata, imageData: string): Promise<MintResult> => {
    if (!blockchainState.activeChain || !blockchainState.isConnected) {
      throw new Error('No active blockchain connection');
    }

    const blockchainInstance = blockchainInstances[blockchainState.activeChain];
    if (!blockchainInstance) {
      throw new Error(`Blockchain instance for ${blockchainState.activeChain} not found`);
    }

    return await blockchainInstance.mintNFT(metadata, imageData);
  };

  const getActiveConnection = (): WalletConnection | null => {
    if (!blockchainState.activeChain) return null;
    return blockchainState.connections[blockchainState.activeChain] || null;
  };

  const getActiveChain = (): ChainConfig | null => {
    if (!blockchainState.activeChain) return null;
    return getChainConfig(blockchainState.activeChain) || null;
  };

  const getSupportedChains = (): ChainConfig[] => {
    return blockchainState.supportedChains;
  };

  const isWalletAvailable = (chainId: string, walletType: string): boolean => {
    const blockchainInstance = blockchainInstances[chainId];
    return blockchainInstance ? blockchainInstance.isWalletAvailable(walletType) : false;
  };

  const contextValue: BlockchainContextType = {
    blockchainState,
    connectWallet,
    disconnectWallet,
    switchChain,
    mintNFT,
    getActiveConnection,
    getActiveChain,
    getSupportedChains,
    isWalletAvailable,
  };

  return (
    <BlockchainContext.Provider value={contextValue}>
      {children}
    </BlockchainContext.Provider>
  );
};

export const useBlockchain = () => {
  const context = useContext(BlockchainContext);
  if (context === undefined) {
    throw new Error('useBlockchain must be used within a BlockchainProvider');
  }
  return context;
};