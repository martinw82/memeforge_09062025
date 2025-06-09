import { ChainConfig } from '../../types/blockchain';

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  // Algorand (Primary)
  algorand_testnet: {
    id: 'algorand_testnet',
    name: 'algorand',
    displayName: 'Algorand TestNet',
    nativeCurrency: {
      name: 'Algorand',
      symbol: 'ALGO',
      decimals: 6,
    },
    rpcUrls: ['https://testnet-api.algonode.cloud'],
    blockExplorerUrls: ['https://testnet.algoexplorer.io'],
    testnet: true,
    logo: '🔵',
    walletTypes: ['pera', 'myalgo', 'defly'],
  },
  algorand_mainnet: {
    id: 'algorand_mainnet',
    name: 'algorand',
    displayName: 'Algorand MainNet',
    nativeCurrency: {
      name: 'Algorand',
      symbol: 'ALGO',
      decimals: 6,
    },
    rpcUrls: ['https://mainnet-api.algonode.cloud'],
    blockExplorerUrls: ['https://algoexplorer.io'],
    testnet: false,
    logo: '🔵',
    walletTypes: ['pera', 'myalgo', 'defly'],
  },

  // EVM Chains
  ethereum_sepolia: {
    id: 'ethereum_sepolia',
    name: 'ethereum',
    displayName: 'Ethereum Sepolia',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    testnet: true,
    logo: '⟠',
    walletTypes: ['metamask', 'walletconnect', 'coinbase'],
    contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
  },
  base_sepolia: {
    id: 'base_sepolia',
    name: 'base',
    displayName: 'Base Sepolia',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    testnet: true,
    logo: '🔵',
    walletTypes: ['metamask', 'walletconnect', 'coinbase'],
    contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
  },
  polygon_mumbai: {
    id: 'polygon_mumbai',
    name: 'polygon',
    displayName: 'Polygon Mumbai',
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
    blockExplorerUrls: ['https://mumbai.polygonscan.com'],
    testnet: true,
    logo: '🟣',
    walletTypes: ['metamask', 'walletconnect', 'coinbase'],
    contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
  },
};

export const DEFAULT_CHAIN = 'algorand_testnet';

export const getChainConfig = (chainId: string): ChainConfig | undefined => {
  return SUPPORTED_CHAINS[chainId];
};

export const getChainsByType = (type: 'algorand' | 'ethereum' | 'base' | 'polygon'): ChainConfig[] => {
  return Object.values(SUPPORTED_CHAINS).filter(chain => chain.name === type);
};

export const getAllChains = (): ChainConfig[] => {
  return Object.values(SUPPORTED_CHAINS);
};

export const getTestnetChains = (): ChainConfig[] => {
  return Object.values(SUPPORTED_CHAINS).filter(chain => chain.testnet);
};