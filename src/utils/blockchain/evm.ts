import { ethers } from 'ethers';
import { BlockchainInterface } from './interface';
import { NFTMetadata, MintResult, WalletConnection } from '../../types/blockchain';
import { getChainConfig } from './chains';

export class EVMBlockchain implements BlockchainInterface {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private currentConnection: WalletConnection | null = null;
  private chainId: string;

  constructor(chainId: string) {
    this.chainId = chainId;
  }

  async connectWallet(walletType: string): Promise<WalletConnection> {
    try {
      if (!this.isWalletAvailable(walletType)) {
        throw new Error(`${walletType} wallet is not available`);
      }

      let provider: ethers.BrowserProvider;

      switch (walletType) {
        case 'metamask':
          if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
          }
          provider = new ethers.BrowserProvider(window.ethereum);
          break;
        
        case 'walletconnect':
          // In production, this would initialize WalletConnect
          throw new Error('WalletConnect not implemented yet');
        
        case 'coinbase':
          // In production, this would initialize Coinbase Wallet
          throw new Error('Coinbase Wallet not implemented yet');
        
        default:
          throw new Error(`Unsupported wallet type: ${walletType}`);
      }

      // Request account access
      await provider.send('eth_requestAccounts', []);
      
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await this.getBalance(address);

      // Check if we're on the correct network
      const network = await provider.getNetwork();
      const chainConfig = getChainConfig(this.chainId);
      
      if (chainConfig && network.chainId.toString() !== this.extractChainIdFromConfig(chainConfig)) {
        await this.switchNetwork(this.chainId);
      }

      this.provider = provider;
      this.signer = signer;
      this.currentConnection = {
        address,
        balance,
        chainId: this.chainId,
        walletType,
      };

      return this.currentConnection;
    } catch (error) {
      console.error('EVM wallet connection failed:', error);
      throw error;
    }
  }

  async disconnectWallet(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.currentConnection = null;
  }

  async mintNFT(metadata: NFTMetadata, imageData: string): Promise<MintResult> {
    if (!this.currentConnection || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      // Upload image and metadata to IPFS
      const imageUrl = await this.uploadImage(imageData);
      const metadataWithImage = { ...metadata, image: imageUrl };
      const metadataUrl = await this.uploadMetadata(metadataWithImage);

      // In production, this would interact with an actual NFT contract
      // For development, we simulate a successful transaction
      const mockTxHash = this.generateMockTransactionHash();

      return {
        success: true,
        transactionHash: mockTxHash,
        tokenId: Math.floor(Math.random() * 10000).toString(),
      };
    } catch (error) {
      console.error('EVM NFT minting failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      // Return mock balance for development
      return '0.1234';
    }
  }

  async switchNetwork(chainId: string): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    try {
      const hexChainId = this.extractChainIdFromConfig(chainConfig);
      
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${parseInt(hexChainId).toString(16)}` }
      ]);
      
      this.chainId = chainId;
    } catch (error: any) {
      // If the chain isn't added to MetaMask, add it
      if (error.code === 4902) {
        await this.addNetwork(chainConfig);
      } else {
        throw error;
      }
    }
  }

  private async addNetwork(chainConfig: any): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const hexChainId = this.extractChainIdFromConfig(chainConfig);
    
    await this.provider.send('wallet_addEthereumChain', [{
      chainId: `0x${parseInt(hexChainId).toString(16)}`,
      chainName: chainConfig.displayName,
      nativeCurrency: chainConfig.nativeCurrency,
      rpcUrls: chainConfig.rpcUrls,
      blockExplorerUrls: chainConfig.blockExplorerUrls,
    }]);
  }

  async uploadMetadata(metadata: NFTMetadata): Promise<string> {
    // In production, this would upload to IPFS/Arweave
    // For development, we return a mock URL
    const mockHash = this.generateMockHash();
    return `https://ipfs.io/ipfs/${mockHash}`;
  }

  async uploadImage(imageData: string): Promise<string> {
    // In production, this would upload to IPFS/Arweave
    // For development, we return a mock URL
    const mockHash = this.generateMockHash();
    return `https://ipfs.io/ipfs/${mockHash}`;
  }

  isWalletAvailable(walletType: string): boolean {
    switch (walletType) {
      case 'metamask':
        return typeof window !== 'undefined' && !!window.ethereum;
      case 'walletconnect':
        return true; // Would check WalletConnect availability
      case 'coinbase':
        return true; // Would check Coinbase Wallet availability
      default:
        return false;
    }
  }

  getSupportedWallets(): string[] {
    return ['metamask', 'walletconnect', 'coinbase'];
  }

  // Helper methods
  private extractChainIdFromConfig(chainConfig: any): string {
    // Extract numeric chain ID from the configuration
    // This is a simplified implementation
    switch (chainConfig.id) {
      case 'ethereum_sepolia':
        return '11155111';
      case 'base_sepolia':
        return '84532';
      case 'polygon_mumbai':
        return '80001';
      default:
        return '1'; // Default to mainnet
    }
  }

  private generateMockTransactionHash(): string {
    return '0x' + Array.from({ length: 64 }, () => 
      '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');
  }

  private generateMockHash(): string {
    return Array.from({ length: 46 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
    ).join('');
  }
}

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}