import { NFTMetadata, MintResult, WalletConnection } from '../../types/blockchain';

export interface BlockchainInterface {
  /**
   * Connect to a wallet for this blockchain
   */
  connectWallet(walletType: string): Promise<WalletConnection>;

  /**
   * Disconnect from the current wallet
   */
  disconnectWallet(): Promise<void>;

  /**
   * Mint an NFT with the given metadata
   */
  mintNFT(metadata: NFTMetadata, imageData: string): Promise<MintResult>;

  /**
   * Get the balance for a given address
   */
  getBalance(address: string): Promise<string>;

  /**
   * Switch to a different network (for EVM chains)
   */
  switchNetwork?(chainId: string): Promise<void>;

  /**
   * Upload metadata to IPFS/Arweave
   */
  uploadMetadata(metadata: NFTMetadata): Promise<string>;

  /**
   * Upload image to IPFS/Arweave
   */
  uploadImage(imageData: string): Promise<string>;

  /**
   * Check if a wallet is available
   */
  isWalletAvailable(walletType: string): boolean;

  /**
   * Get supported wallet types for this blockchain
   */
  getSupportedWallets(): string[];
}