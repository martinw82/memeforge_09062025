import algosdk from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';
import { useWalletClient } from '@algorandfoundation/liquid-auth-use-wallet-client';
import WalletConnect from '@walletconnect/client';
import { BlockchainInterface } from './interface';
import { NFTMetadata, MintResult, WalletConnection } from '../../types/blockchain';

export class AlgorandBlockchain implements BlockchainInterface {
  private algodClient: algosdk.Algodv2;
  private currentConnection: WalletConnection | null = null;
  private isTestnet: boolean;
  private peraWallet: PeraWalletConnect | null = null;
  private walletConnectClient: WalletConnect | null = null;
  private liquidWalletClient: any = null;

  constructor(isTestnet: boolean = true) {
    this.isTestnet = isTestnet;
    const server = isTestnet 
      ? 'https://testnet-api.algonode.cloud'
      : 'https://mainnet-api.algonode.cloud';
    
    this.algodClient = new algosdk.Algodv2('', server, '');
    this.initializeWallets();
  }

  private async initializeWallets() {
    try {
      // Initialize Pera Wallet
      this.peraWallet = new PeraWalletConnect({
        chainId: this.isTestnet ? 416002 : 416001,
      });

      // Initialize WalletConnect
      this.walletConnectClient = new WalletConnect({
        bridge: 'https://bridge.walletconnect.org',
        qrcodeModal: {
          open: () => console.log('WalletConnect QR Code should open'),
          close: () => console.log('WalletConnect QR Code should close'),
        },
      });

      // Liquid Wallet is initialized through the hook in components
    } catch (error) {
      console.error('Failed to initialize Algorand wallets:', error);
    }
  }

  async connectWallet(walletType: string): Promise<WalletConnection> {
    try {
      if (!this.isWalletAvailable(walletType)) {
        throw new Error(`${walletType} wallet is not available`);
      }

      let address: string;
      let balance: string;

      switch (walletType) {
        case 'pera':
          address = await this.connectPeraWallet();
          break;
        case 'liquid':
          address = await this.connectLiquidWallet();
          break;
        case 'walletconnect':
          address = await this.connectWalletConnect();
          break;
        default:
          throw new Error(`Unsupported Algorand wallet type: ${walletType}`);
      }

      balance = await this.getBalance(address);

      this.currentConnection = {
        address,
        balance,
        chainId: this.isTestnet ? 'algorand_testnet' : 'algorand_mainnet',
        walletType,
      };

      return this.currentConnection;
    } catch (error) {
      console.error('Algorand wallet connection failed:', error);
      throw error;
    }
  }

  private async connectPeraWallet(): Promise<string> {
    if (!this.peraWallet) {
      throw new Error('Pera Wallet not initialized');
    }

    try {
      const accounts = await this.peraWallet.connect();
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from Pera Wallet');
      }
      return accounts[0];
    } catch (error) {
      if (error instanceof Error && error.message.includes('rejected')) {
        throw new Error('Connection rejected by user');
      }
      throw error;
    }
  }

  private async connectLiquidWallet(): Promise<string> {
    // This would typically be handled in the component using the hook
    // For now, we'll simulate the connection
    throw new Error('Liquid Wallet connection should be handled in component');
  }

  private async connectWalletConnect(): Promise<string> {
    if (!this.walletConnectClient) {
      throw new Error('WalletConnect not initialized');
    }

    return new Promise((resolve, reject) => {
      if (this.walletConnectClient!.connected) {
        const accounts = this.walletConnectClient!.accounts;
        if (accounts && accounts.length > 0) {
          resolve(accounts[0]);
          return;
        }
      }

      this.walletConnectClient!.on('connect', (error, payload) => {
        if (error) {
          reject(error);
          return;
        }
        const { accounts } = payload.params[0];
        if (accounts && accounts.length > 0) {
          resolve(accounts[0]);
        } else {
          reject(new Error('No accounts returned from WalletConnect'));
        }
      });

      this.walletConnectClient!.createSession().catch(reject);
    });
  }

  async disconnectWallet(): Promise<void> {
    try {
      if (this.currentConnection) {
        switch (this.currentConnection.walletType) {
          case 'pera':
            if (this.peraWallet) {
              await this.peraWallet.disconnect();
            }
            break;
          case 'walletconnect':
            if (this.walletConnectClient && this.walletConnectClient.connected) {
              await this.walletConnectClient.killSession();
            }
            break;
          case 'liquid':
            // Liquid wallet disconnection would be handled in component
            break;
        }
      }
    } catch (error) {
      console.error('Error disconnecting Algorand wallet:', error);
    } finally {
      this.currentConnection = null;
    }
  }

  async mintNFT(metadata: NFTMetadata, imageData: string): Promise<MintResult> {
    if (!this.currentConnection) {
      throw new Error('Wallet not connected');
    }

    try {
      // Upload image and metadata to IPFS
      const imageUrl = await this.uploadImage(imageData);
      const metadataWithImage = { ...metadata, image: imageUrl };
      const metadataUrl = await this.uploadMetadata(metadataWithImage);

      // Create Algorand Standard Asset (ASA)
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      
      const asaCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        from: this.currentConnection.address,
        suggestedParams,
        defaultFrozen: false,
        unitName: 'MEME',
        assetName: metadata.name,
        manager: this.currentConnection.address,
        reserve: this.currentConnection.address,
        freeze: this.currentConnection.address,
        clawback: this.currentConnection.address,
        total: 1, // NFT has only 1 unit
        decimals: 0,
        assetURL: metadataUrl,
        assetMetadataHash: new Uint8Array(32), // Would contain actual metadata hash
      });

      // Sign transaction based on wallet type
      let signedTxn: Uint8Array;

      switch (this.currentConnection.walletType) {
        case 'pera':
          if (!this.peraWallet) {
            throw new Error('Pera Wallet not available');
          }
          const txnGroup = [{ txn: asaCreateTxn, signers: [this.currentConnection.address] }];
          const signedTxns = await this.peraWallet.signTransaction([txnGroup]);
          signedTxn = signedTxns[0];
          break;

        case 'walletconnect':
          if (!this.walletConnectClient) {
            throw new Error('WalletConnect not available');
          }
          const txnToSign = [{
            txn: Buffer.from(algosdk.encodeUnsignedTransaction(asaCreateTxn)).toString('base64'),
          }];
          const result = await this.walletConnectClient.sendCustomRequest({
            id: Date.now(),
            jsonrpc: '2.0',
            method: 'algo_signTxn',
            params: [txnToSign],
          });
          signedTxn = new Uint8Array(Buffer.from(result[0], 'base64'));
          break;

        default:
          // For development, simulate a successful transaction
          const mockTxId = this.generateMockTransactionId();
          return {
            success: true,
            transactionHash: mockTxId,
            tokenId: '12345678', // Mock ASA ID
          };
      }

      // Submit transaction
      const { txId } = await this.algodClient.sendRawTransaction(signedTxn).do();
      
      // Wait for confirmation
      await algosdk.waitForConfirmation(this.algodClient, txId, 4);

      // Get asset ID from transaction
      const ptx = await this.algodClient.pendingTransactionInformation(txId).do();
      const assetId = ptx['asset-index'];

      return {
        success: true,
        transactionHash: txId,
        tokenId: assetId?.toString(),
      };
    } catch (error) {
      console.error('Algorand NFT minting failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      const accountInfo = await this.algodClient.accountInformation(address).do();
      const balance = accountInfo.amount / 1000000; // Convert microAlgos to Algos
      return balance.toFixed(6);
    } catch (error) {
      console.error('Failed to get Algorand balance:', error);
      // Return mock balance for development
      return '1.234567';
    }
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
      case 'pera':
        return !!this.peraWallet;
      case 'liquid':
        return true; // Would check if liquid wallet client is available
      case 'walletconnect':
        return !!this.walletConnectClient;
      default:
        return false;
    }
  }

  getSupportedWallets(): string[] {
    return ['pera', 'liquid', 'walletconnect'];
  }

  // Helper methods for development
  private generateMockTransactionId(): string {
    return Array.from({ length: 52 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
    ).join('');
  }

  private generateMockHash(): string {
    return Array.from({ length: 46 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
    ).join('');
  }
}