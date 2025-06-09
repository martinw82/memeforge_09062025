import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabaseHelpers } from '../utils/supabase';
import { trackEvent } from '../utils/analytics';
import { MemeWithDetails } from '../types/supabase';
import CommentSection from './CommentSection';
import { 
  Share2, 
  Heart, 
  Bookmark, 
  ArrowDownToLine, 
  Loader2, 
  AlertCircle, 
  User,
  ExternalLink,
  Copy,
  MessageCircle
} from 'lucide-react';

const MemeGallery: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [memes, setMemes] = useState<MemeWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userSaves, setUserSaves] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState<string | null>(null);

  useEffect(() => {
    fetchMemes();
    if (isAuthenticated && user) {
      fetchUserInteractions();
    }
  }, [isAuthenticated, user]);

  const fetchMemes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabaseHelpers.getMemes(20, 0);
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (data) {
        const memesWithDetails: MemeWithDetails[] = data.map(meme => ({
          ...meme,
          creator: meme.creator || undefined,
        }));
        setMemes(memesWithDetails);
        
        // Track gallery view
        await trackEvent('page_viewed', { page: 'gallery' });
      }
    } catch (err) {
      console.error('Error fetching memes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load memes');
      
      // Fallback to mock data in case of error
      const mockMemes: MemeWithDetails[] = [
        {
          id: 'mock-1',
          image_url: 'https://images.pexels.com/photos/1854897/pexels-photo-1854897.jpeg',
          name: 'Debugging Life',
          description: 'When your code works but you don\'t know why',
          creator_id: 'mock-user',
          created_at: new Date().toISOString(),
          likes_count: 42,
          is_nft: true,
          nft_tx_hash: null,
          chain_type: 'algorand',
          chain_id: null,
          contract_address: null,
          top_text: 'MY CODE',
          bottom_text: 'WORKS PERFECTLY',
          creator: { email: 'creator@example.com' },
        },
        {
          id: 'mock-2',
          image_url: 'https://images.pexels.com/photos/1573324/pexels-photo-1573324.jpeg',
          name: 'Coffee Required',
          description: 'The daily developer struggle',
          creator_id: 'mock-user-2',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          likes_count: 28,
          is_nft: false,
          nft_tx_hash: null,
          chain_type: 'algorand',
          chain_id: null,
          contract_address: null,
          top_text: 'BEFORE COFFEE',
          bottom_text: 'AFTER COFFEE',
          creator: { email: 'developer@example.com' },
        },
      ];
      setMemes(mockMemes);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserInteractions = async () => {
    if (!user) return;

    try {
      const [likesResult, savesResult] = await Promise.all([
        supabaseHelpers.getUserLikes(user.id),
        supabaseHelpers.getUserSaves(user.id),
      ]);

      if (likesResult.data) {
        setUserLikes(new Set(likesResult.data));
      }
      if (savesResult.data) {
        setUserSaves(new Set(savesResult.data));
      }
    } catch (err) {
      console.error('Error fetching user interactions:', err);
    }
  };

  const handleLike = async (memeId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to like memes');
      return;
    }

    const meme = memes.find(m => m.id === memeId);
    const isCurrentlyLiked = userLikes.has(memeId);

    setActionLoading(prev => new Set(prev).add(`like-${memeId}`));

    try {
      const { liked, error } = await supabaseHelpers.toggleLike(memeId);
      
      if (error) {
        throw new Error(error.message);
      }

      // Track like/unlike event
      await trackEvent(liked ? 'meme_liked' : 'meme_unliked', {
        meme_id: memeId,
        creator_id: meme?.creator_id,
        is_own_meme: meme?.creator_id === user?.id,
      });

      // Update local state
      setUserLikes(prev => {
        const newSet = new Set(prev);
        if (liked) {
          newSet.add(memeId);
        } else {
          newSet.delete(memeId);
        }
        return newSet;
      });

      // Update meme likes count
      setMemes(prev => prev.map(meme => 
        meme.id === memeId 
          ? { 
              ...meme, 
              likes_count: liked ? meme.likes_count + 1 : meme.likes_count - 1,
              isLiked: liked 
            }
          : meme
      ));
    } catch (err) {
      console.error('Error toggling like:', err);
      alert('Failed to update like. Please try again.');
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(`like-${memeId}`);
        return newSet;
      });
    }
  };

  const handleSave = async (memeId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to save memes');
      return;
    }

    const meme = memes.find(m => m.id === memeId);

    setActionLoading(prev => new Set(prev).add(`save-${memeId}`));

    try {
      const { saved, error } = await supabaseHelpers.toggleSave(memeId);
      
      if (error) {
        throw new Error(error.message);
      }

      // Track save/unsave event
      await trackEvent(saved ? 'meme_saved' : 'meme_unsaved', {
        meme_id: memeId,
        creator_id: meme?.creator_id,
      });

      // Update local state
      setUserSaves(prev => {
        const newSet = new Set(prev);
        if (saved) {
          newSet.add(memeId);
        } else {
          newSet.delete(memeId);
        }
        return newSet;
      });

      // Update meme saved status
      setMemes(prev => prev.map(meme => 
        meme.id === memeId 
          ? { ...meme, isSaved: saved }
          : meme
      ));
    } catch (err) {
      console.error('Error toggling save:', err);
      alert('Failed to update save. Please try again.');
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(`save-${memeId}`);
        return newSet;
      });
    }
  };

  const handleShare = async (meme: MemeWithDetails) => {
    setShowShareModal(meme.id);
    
    await trackEvent('meme_shared', {
      meme_id: meme.id,
      share_method: 'modal_opened',
    });
  };

  const handleDownload = async (meme: MemeWithDetails) => {
    const link = document.createElement('a');
    link.href = meme.image_url;
    link.download = `${meme.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
    link.target = '_blank';
    link.click();
    
    await trackEvent('meme_downloaded', {
      meme_id: meme.id,
      format: 'jpg',
    });
  };

  const toggleComments = (memeId: string) => {
    setOpenComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memeId)) {
        newSet.delete(memeId);
      } else {
        newSet.add(memeId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const formatCreatorEmail = (email?: string) => {
    if (!email) return 'Anonymous';
    const username = email.split('@')[0];
    return username.length > 12 ? `${username.substring(0, 12)}...` : username;
  };

  // Social share functions
  const shareToTwitter = async (meme: MemeWithDetails) => {
    const text = `Check out this awesome meme: "${meme.name}" on MemeForge!`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
    window.open(url, '_blank', 'width=550,height=420');
    
    await trackEvent('meme_shared', {
      meme_id: meme.id,
      share_method: 'twitter',
      platform: 'twitter',
    });
  };

  const shareToFacebook = async (meme: MemeWithDetails) => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(`Check out "${meme.name}" on MemeForge!`)}`;
    window.open(url, '_blank', 'width=550,height=420');
    
    await trackEvent('meme_shared', {
      meme_id: meme.id,
      share_method: 'facebook',
      platform: 'facebook',
    });
  };

  const shareToLinkedIn = async (meme: MemeWithDetails) => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`;
    window.open(url, '_blank', 'width=550,height=420');
    
    await trackEvent('meme_shared', {
      meme_id: meme.id,
      share_method: 'linkedin',
      platform: 'linkedin',
    });
  };

  const copyToClipboard = async (meme: MemeWithDetails) => {
    try {
      await navigator.clipboard.writeText(`${meme.name} - ${window.location.origin}`);
      alert('Link copied to clipboard!');
      setShowShareModal(null);
      
      await trackEvent('meme_shared', {
        meme_id: meme.id,
        share_method: 'clipboard',
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 md:p-6 text-white">
        <h2 className="text-lg md:text-xl font-bold mb-6">Community Memes</h2>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={48} className="animate-spin text-blue-500" />
            <p className="text-gray-400">Loading awesome memes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && memes.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 md:p-6 text-white">
        <h2 className="text-lg md:text-xl font-bold mb-6">Community Memes</h2>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle size={48} className="text-red-400" />
            <div>
              <p className="text-red-400 font-medium">Failed to load memes</p>
              <p className="text-gray-400 text-sm mt-2">{error}</p>
              <button
                onClick={fetchMemes}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 md:p-6 text-white">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg md:text-xl font-bold">Community Memes</h2>
        <button
          onClick={fetchMemes}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      {memes.length === 0 ? (
        <div className="text-center py-12">
          <User size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-400 mb-2">No memes yet!</p>
          <p className="text-gray-500 text-sm">Be the first to create and share a meme.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {memes.map((meme) => (
            <div key={meme.id} className="bg-gray-700 rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
              <div className="relative">
                <img 
                  src={meme.image_url} 
                  alt={meme.name} 
                  className="w-full h-48 md:h-56 object-cover"
                  loading="lazy"
                />
                {meme.is_nft && (
                  <div className="absolute top-2 md:top-3 right-2 md:right-3 bg-blue-600 text-xs font-bold px-2 py-1 rounded-full">
                    NFT
                  </div>
                )}
              </div>
              
              <div className="p-3 md:p-4">
                <div className="mb-2">
                  <h3 className="font-medium text-white truncate">{meme.name}</h3>
                  {meme.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{meme.description}</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 space-y-1 sm:space-y-0">
                  <div className="text-xs text-gray-400 truncate">
                    by {formatCreatorEmail(meme.creator?.email)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(meme.created_at)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:flex sm:justify-between gap-2 sm:gap-1">
                  <button 
                    className={`flex items-center justify-center sm:justify-start text-xs md:text-sm py-2 px-1 rounded transition-colors ${
                      userLikes.has(meme.id) ? 'text-red-500' : 'text-gray-400 hover:text-white'
                    }`}
                    onClick={() => handleLike(meme.id)}
                    disabled={actionLoading.has(`like-${meme.id}`)}
                  >
                    {actionLoading.has(`like-${meme.id}`) ? (
                      <Loader2 size={16} className="animate-spin mr-1" />
                    ) : (
                      <Heart size={16} className={`mr-1 ${userLikes.has(meme.id) ? 'fill-current' : ''}`} />
                    )}
                    <span className="truncate">{meme.likes_count}</span>
                  </button>
                  
                  <button 
                    className={`flex items-center justify-center sm:justify-start text-xs md:text-sm py-2 px-1 rounded transition-colors ${
                      userSaves.has(meme.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-white'
                    }`}
                    onClick={() => handleSave(meme.id)}
                    disabled={actionLoading.has(`save-${meme.id}`) || !isAuthenticated}
                  >
                    {actionLoading.has(`save-${meme.id}`) ? (
                      <Loader2 size={16} className="animate-spin mr-1" />
                    ) : (
                      <Bookmark size={16} className={`mr-1 ${userSaves.has(meme.id) ? 'fill-current' : ''}`} />
                    )}
                    <span className="hidden sm:inline">Save</span>
                  </button>
                  
                  <button 
                    className="flex items-center justify-center sm:justify-start text-xs md:text-sm text-gray-400 hover:text-white py-2 px-1 rounded transition-colors"
                    onClick={() => handleShare(meme)}
                  >
                    <Share2 size={16} className="mr-1" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                  
                  <button 
                    className="flex items-center justify-center sm:justify-start text-xs md:text-sm text-gray-400 hover:text-white py-2 px-1 rounded transition-colors"
                    onClick={() => handleDownload(meme)}
                  >
                    <ArrowDownToLine size={16} className="mr-1" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>

                {/* Comment Section */}
                <CommentSection
                  memeId={meme.id}
                  isOpen={openComments.has(meme.id)}
                  onToggle={() => toggleComments(meme.id)}
                  initialCommentsCount={meme.comments_count || 0}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Share Meme</h3>
              <div className="space-y-3">
                <button
                  onClick={() => shareToTwitter(memes.find(m => m.id === showShareModal)!)}
                  className="w-full flex items-center gap-3 p-3 bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
                >
                  <ExternalLink size={20} />
                  <span>Share on Twitter</span>
                </button>
                <button
                  onClick={() => shareToFacebook(memes.find(m => m.id === showShareModal)!)}
                  className="w-full flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  <ExternalLink size={20} />
                  <span>Share on Facebook</span>
                </button>
                <button
                  onClick={() => shareToLinkedIn(memes.find(m => m.id === showShareModal)!)}
                  className="w-full flex items-center gap-3 p-3 bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
                >
                  <ExternalLink size={20} />
                  <span>Share on LinkedIn</span>
                </button>
                <button
                  onClick={() => copyToClipboard(memes.find(m => m.id === showShareModal)!)}
                  className="w-full flex items-center gap-3 p-3 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
                >
                  <Copy size={20} />
                  <span>Copy Link</span>
                </button>
              </div>
              <button
                onClick={() => setShowShareModal(null)}
                className="w-full mt-4 p-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemeGallery;