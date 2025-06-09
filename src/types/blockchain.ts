export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface MintResult {
  success: boolean;
  transactionHash?: string;
  tokenId?: string;
  error?: string;
}

export interface WalletConnection {
  address: string;
  balance: string;
  chainId: string;
  walletType: string;
}

export interface ChainConfig {
  id: string;
  name: string;
  displayName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  testnet: boolean;
  logo: string;
  walletTypes: string[];
  contractAddress?: string; // For EVM chains
}

export interface BlockchainState {
  isConnected: boolean;
  activeChain: string | null;
  connections: Record<string, WalletConnection>;
  supportedChains: ChainConfig[];
  isConnecting: boolean;
  error: string | null;
}

export type WalletType = 
  // Algorand wallets
  | 'pera'
  | 'myalgo'
  | 'defly'
  // EVM wallets
  | 'metamask'
  | 'walletconnect'
  | 'coinbase';