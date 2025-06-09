import React, { useState } from 'react';
import { useMeme } from '../context/MemeContext';
import { useBlockchain } from '../context/BlockchainContext';
import { useAuth } from '../context/AuthContext';
import { supabaseHelpers } from '../utils/supabase';
import { trackEvent, measurePerformance } from '../utils/analytics';
import { Baseline as CoinBase, CircleDollarSign, Loader2, CheckCircle, XCircle, ExternalLink, AlertCircle } from 'lucide-react';

const NFTMinter: React.FC = () => {
  const { memeState } = useMeme();
  const { blockchainState, mintNFT, getActiveConnection, getActiveChain } = useBlockchain();
  const { user, isAuthenticated } = useAuth();
  const { generatedMeme, topText, bottomText } = memeState;
  
  const [memeName, setMemeName] = useState('My Awesome Meme');
  const [memeDescription, setMemeDescription] = useState('A hilarious meme created with AI MemeForge');
  const [isMinting, setIsMinting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mintStatus, setMintStatus] = useState<{
    success?: boolean;
    message?: string;
    txHash?: string;
    tokenId?: string;
    memeId?: string;
  } | null>(null);

  const activeConnection = getActiveConnection();
  const activeChain = getActiveChain();

  const handleMint = async () => {
    if (!generatedMeme || !blockchainState.isConnected || !activeConnection) return;
    
    if (!isAuthenticated || !user) {
      alert('Please sign in to mint NFTs');
      return;
    }

    setIsMinting(true);
    setMintStatus(null);
    
    try {
      // Track mint attempt
      await trackEvent('nft_mint_attempt', {
        chain_type: activeChain?.name || 'unknown',
        chain_id: activeChain?.id || 'unknown',
        wallet_type: activeConnection.walletType,
      });

      const metadata = {
        name: memeName,
        description: memeDescription,
        image: '', // Will be set by the blockchain implementation
        external_url: 'https://memeforge.app',
        attributes: [
          {
            trait_type: 'Platform',
            value: 'MemeForge'
          },
          {
            trait_type: 'Blockchain',
            value: activeChain?.displayName || 'Unknown'
          },
          {
            trait_type: 'Created',
            value: new Date().toISOString().split('T')[0]
          },
          ...(topText ? [{ trait_type: 'Top Text', value: topText }] : []),
          ...(bottomText ? [{ trait_type: 'Bottom Text', value: bottomText }] : []),
        ]
      };

      // Mint NFT on blockchain
      const result = await measurePerformance('nft_mint_blockchain', async () => {
        return await mintNFT(metadata, generatedMeme);
      });
      
      if (result.success) {
        // Track successful mint
        await trackEvent('nft_mint_success', {
          chain_type: activeChain?.name || 'unknown',
          chain_id: activeChain?.id || 'unknown',
          transaction_hash: result.transactionHash || 'unknown',
          token_id: result.tokenId,
        });

        // Save meme to Supabase database
        setIsSaving(true);
        
        try {
          const { data: savedMeme, error: saveError } = await measurePerformance('meme_save_database', async () => {
            return await supabaseHelpers.createMeme({
              image_url: generatedMeme,
              name: memeName,
              description: memeDescription,
              top_text: topText || null,
              bottom_text: bottomText || null,
              is_nft: true,
              nft_tx_hash: result.transactionHash,
              chain_type: activeChain?.name || 'algorand',
              chain_id: activeChain?.id || null,
              contract_address: activeChain?.contractAddress || null,
            });
          });

          if (saveError) {
            console.error('Error saving meme to database:', saveError);
            // Don't fail the whole process if database save fails
          }

          setMintStatus({
            success: true,
            message: `NFT minted successfully on ${activeChain?.displayName}!`,
            txHash: result.transactionHash,
            tokenId: result.tokenId,
            memeId: savedMeme?.id,
          });

          // Update blockchain preferences with current wallet
          await supabaseHelpers.updateBlockchainPreferences({
            preferred_chain: activeChain?.id,
            algorand_wallet_type: activeChain?.name === 'algorand' ? activeConnection.walletType : undefined,
            evm_wallet_type: activeChain?.name !== 'algorand' ? activeConnection.walletType : undefined,
            wallet_address: activeConnection.address,
          });

        } catch (error) {
          console.error('Error saving to database:', error);
          setMintStatus({
            success: true,
            message: `NFT minted successfully on ${activeChain?.displayName}! (Database save failed)`,
            txHash: result.transactionHash,
            tokenId: result.tokenId,
          });
        } finally {
          setIsSaving(false);
        }
      } else {
        // Track failed mint
        await trackEvent('nft_mint_failure', {
          chain_type: activeChain?.name || 'unknown',
          chain_id: activeChain?.id || 'unknown',
          error_message: result.error || 'Unknown error',
        });

        setMintStatus({
          success: false,
          message: result.error || 'Failed to mint NFT'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Track failed mint
      await trackEvent('nft_mint_failure', {
        chain_type: activeChain?.name || 'unknown',
        chain_id: activeChain?.id || 'unknown',
        error_message: errorMessage,
      });

      setMintStatus({
        success: false,
        message: errorMessage
      });
    } finally {
      setIsMinting(false);
    }
  };

  const getExplorerUrl = (txHash: string) => {
    if (!activeChain || !txHash) return null;
    
    const baseUrl = activeChain.blockExplorerUrls[0];
    
    if (activeChain.name === 'algorand') {
      return `${baseUrl}/tx/${txHash}`;
    } else {
      return `${baseUrl}/tx/${txHash}`;
    }
  };

  // Show authentication prompt if not signed in
  if (!isAuthenticated) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 md:p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <CoinBase size={24} className="text-yellow-400" />
          <h2 className="text-lg md:text-xl font-bold">Mint as NFT</h2>
        </div>
        
        <div className="text-center py-6">
          <AlertCircle size={48} className="mx-auto text-yellow-400 mb-4" />
          <p className="mb-4 text-gray-300 text-sm md:text-base">
            Sign in to mint your memes as NFTs and save them to your profile
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Create an account to track your memes, mint NFTs, and connect with the community
          </p>
          <div className="text-sm text-blue-400">
            👆 Use the sign in button in the navigation bar
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 md:p-6 text-white">
      <div className="flex items-center gap-2 mb-4">
        <CoinBase size={24} className="text-yellow-400" />
        <h2 className="text-lg md:text-xl font-bold">Mint as NFT</h2>
        {activeChain && (
          <span className="text-xs bg-gray-700 px-2 py-1 rounded">
            {activeChain.logo} {activeChain.displayName}
          </span>
        )}
      </div>
      
      {!blockchainState.isConnected ? (
        <div className="text-center py-6">
          <p className="mb-4 text-gray-300 text-sm md:text-base">
            Connect your wallet to mint this meme as an NFT
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Choose from Algorand (low fees) or EVM chains (Ethereum, Base, Polygon)
          </p>
          <div className="text-sm text-blue-400">
            👆 Use the chain selector in the navigation bar to connect
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* User Info */}
          <div className="bg-gray-700 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between text-sm text-gray-300">
              <span>Signed in as</span>
              <span className="font-medium">{user?.email}</span>
            </div>
          </div>

          {/* Connection Info */}
          <div className="bg-gray-700 rounded-lg p-3 md:p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-lg">{activeChain?.logo}</span>
                <span className="font-medium">{activeChain?.displayName}</span>
                {activeChain?.testnet && (
                  <span className="text-xs bg-orange-600 px-1 rounded">Testnet</span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {activeConnection.walletType}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-1">
              <CircleDollarSign size={16} />
              <span className="font-mono text-xs md:text-sm truncate">
                {activeConnection.address}
              </span>
            </div>
            <div className="text-xs md:text-sm text-gray-300">
              Balance: {activeConnection.balance} {activeChain?.nativeCurrency.symbol}
            </div>
          </div>
          
          {/* NFT Metadata Form */}
          <div>
            <label className="block text-sm font-medium mb-1">NFT Name</label>
            <input
              type="text"
              value={memeName}
              onChange={(e) => setMemeName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 md:px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
              placeholder="Give your NFT a name"
              disabled={isMinting || isSaving}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={memeDescription}
              onChange={(e) => setMemeDescription(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 md:px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20 md:h-24 resize-none text-sm md:text-base"
              placeholder="Describe your meme NFT"
              disabled={isMinting || isSaving}
            />
          </div>

          {/* Blockchain-specific information */}
          {activeChain && (
            <div className="bg-blue-900 bg-opacity-30 p-3 rounded-md">
              <div className="text-sm font-medium text-blue-400 mb-1">
                {activeChain.name === 'algorand' ? '🌟 Algorand Benefits:' : '⚡ EVM Chain:'}
              </div>
              <div className="text-xs text-gray-300">
                {activeChain.name === 'algorand' 
                  ? '• Ultra-low fees (~$0.001) • Instant finality • Carbon neutral'
                  : `• Standard ERC-721 NFT • ${activeChain.displayName} network • View on OpenSea`
                }
              </div>
            </div>
          )}
          
          {/* Mint Button */}
          <button 
            onClick={handleMint}
            disabled={!generatedMeme || isMinting || isSaving}
            className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-md font-medium transition-all text-sm md:text-base ${
              !generatedMeme 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isMinting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Minting NFT...
              </>
            ) : isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving to profile...
              </>
            ) : (
              <>
                <CoinBase size={18} />
                Mint as NFT on {activeChain?.displayName}
              </>
            )}
          </button>
          
          {/* Mint Status */}
          {mintStatus && (
            <div className={`mt-4 p-3 md:p-4 rounded-md ${
              mintStatus.success ? 'bg-green-900 bg-opacity-30' : 'bg-red-900 bg-opacity-30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {mintStatus.success ? (
                  <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle size={18} className="text-red-400 flex-shrink-0" />
                )}
                <p className="font-medium text-sm md:text-base">{mintStatus.message}</p>
              </div>
              
              {mintStatus.success && mintStatus.txHash && (
                <div className="space-y-2">
                  {mintStatus.tokenId && (
                    <p className="text-xs md:text-sm text-gray-300">
                      Token ID: {mintStatus.tokenId}
                    </p>
                  )}
                  {mintStatus.memeId && (
                    <p className="text-xs md:text-sm text-gray-300">
                      Saved to your profile with ID: {mintStatus.memeId}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <p className="text-xs md:text-sm text-gray-300 break-all">
                      Transaction: {mintStatus.txHash}
                    </p>
                    {getExplorerUrl(mintStatus.txHash) && (
                      <a
                        href={getExplorerUrl(mintStatus.txHash)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                      >
                        <ExternalLink size={12} />
                        View
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NFTMinter;