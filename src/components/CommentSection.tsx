import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabaseHelpers } from '../utils/supabase';
import { trackEvent } from '../utils/analytics';
import { CommentWithAuthor } from '../types/supabase';
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  Trash2, 
  AlertCircle, 
  User,
  RefreshCw 
} from 'lucide-react';

interface CommentSectionProps {
  memeId: string;
  isOpen: boolean;
  onToggle: () => void;
  initialCommentsCount?: number;
}

const CommentSection: React.FC<CommentSectionProps> = ({ 
  memeId, 
  isOpen, 
  onToggle, 
  initialCommentsCount = 0 
}) => {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const COMMENTS_LIMIT = 10;

  useEffect(() => {
    if (isOpen && comments.length === 0) {
      fetchComments();
    }
  }, [isOpen, memeId]);

  const fetchComments = async (offset = 0, append = false) => {
    try {
      if (offset === 0) setIsLoading(true);
      else setLoadingMore(true);
      
      setError(null);

      const { data, error: fetchError } = await supabaseHelpers.getComments(
        memeId, 
        COMMENTS_LIMIT, 
        offset
      );

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (data) {
        const formattedComments: CommentWithAuthor[] = data.map(comment => ({
          ...comment,
          author: comment.author || { email: undefined },
        }));

        if (append) {
          setComments(prev => [...prev, ...formattedComments]);
        } else {
          setComments(formattedComments);
        }

        setHasMore(data.length === COMMENTS_LIMIT);
      }

      // Update comments count
      const { count } = await supabaseHelpers.getCommentsCount(memeId);
      setCommentsCount(count);

    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Please sign in to comment');
      return;
    }

    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    if (newComment.length > 1000) {
      setError('Comment is too long (max 1000 characters)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const { data, error: submitError } = await supabaseHelpers.createComment(
        memeId,
        newComment
      );

      if (submitError) {
        throw new Error(submitError.message);
      }

      if (data) {
        const newCommentWithAuthor: CommentWithAuthor = {
          ...data,
          author: data.author || { email: undefined },
        };

        // Add new comment to the top of the list
        setComments(prev => [newCommentWithAuthor, ...prev]);
        setCommentsCount(prev => prev + 1);
        setNewComment('');

        // Track comment creation
        await trackEvent('comment_created', {
          meme_id: memeId,
          comment_length: newComment.length,
        });
      }

    } catch (err) {
      console.error('Error submitting comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabaseHelpers.deleteComment(commentId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Remove comment from list
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      setCommentsCount(prev => Math.max(0, prev - 1));

      // Track comment deletion
      await trackEvent('comment_deleted', {
        comment_id: commentId,
        meme_id: memeId,
      });

    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment. Please try again.');
    }
  };

  const loadMoreComments = () => {
    if (!loadingMore && hasMore) {
      fetchComments(comments.length, true);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }).format(date);
  };

  const formatUsername = (email?: string) => {
    if (!email) return 'Anonymous';
    const username = email.split('@')[0];
    return username.length > 15 ? `${username.substring(0, 15)}...` : username;
  };

  return (
    <div className="border-t border-gray-600">
      {/* Comments Toggle Button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-600 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <MessageCircle size={16} />
          <span>
            {commentsCount === 0 
              ? 'Be the first to comment' 
              : `${commentsCount} comment${commentsCount !== 1 ? 's' : ''}`
            }
          </span>
        </div>
        <div className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </div>
      </button>

      {/* Comments Content */}
      {isOpen && (
        <div className="p-3 space-y-4 bg-gray-750">
          {/* Comment Form */}
          {isAuthenticated ? (
            <form onSubmit={handleSubmitComment} className="space-y-2">
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                    rows={2}
                    maxLength={1000}
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">
                      {newComment.length}/1000 characters
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmitting || !newComment.trim()}
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      {isSubmitting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      {isSubmitting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm">
                Sign in to join the conversation
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-900 bg-opacity-30 border border-red-700 rounded text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Comments List */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-200">
                          {formatUsername(comment.author?.email)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {formatDate(comment.created_at)}
                          </span>
                          {user && comment.user_id === user.id && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-gray-400 hover:text-red-400 transition-colors"
                              title="Delete comment"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center">
                  <button
                    onClick={loadMoreComments}
                    disabled={loadingMore}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mx-auto"
                  >
                    {loadingMore ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    {loadingMore ? 'Loading...' : 'Load more comments'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <MessageCircle size={32} className="mx-auto text-gray-500 mb-2" />
              <p className="text-gray-400 text-sm">No comments yet</p>
              <p className="text-gray-500 text-xs">Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSection;