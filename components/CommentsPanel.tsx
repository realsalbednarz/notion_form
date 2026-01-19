'use client';

import { useState, useEffect } from 'react';

interface Comment {
  id: string;
  discussionId: string;
  createdTime: string;
  createdBy: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  plainText: string;
}

interface CommentsPanelProps {
  pageId: string;
  collapsed?: boolean;
}

export default function CommentsPanel({ pageId, collapsed = true }: CommentsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true); // Start true to fetch initial count
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // Fetch comments on mount to know if there are any
  useEffect(() => {
    fetchComments();
  }, [pageId]);

  // Also refetch when expanded (in case new comments were added elsewhere)
  useEffect(() => {
    if (!isCollapsed && initialFetchDone) {
      fetchComments();
    }
  }, [isCollapsed]);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/notion/comments?page_id=${pageId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch comments');
      }

      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
      setInitialFetchDone(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/notion/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          content: newComment.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add comment');
      }

      // Add the new comment to the list
      setComments(prev => [...prev, {
        id: data.comment.id,
        discussionId: data.comment.discussionId,
        createdTime: data.comment.createdTime,
        createdBy: { id: '', name: 'You', avatarUrl: undefined },
        plainText: newComment.trim(),
      }]);
      setNewComment('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show loading state while initial fetch is in progress
  if (loading && !initialFetchDone) {
    return (
      <div className="border-t mt-6 pt-4">
        <div className="text-sm text-gray-500">Loading comments...</div>
      </div>
    );
  }

  // Show error state if fetch failed
  if (error && comments.length === 0) {
    return (
      <div className="border-t mt-6 pt-4">
        <div className="text-sm font-medium text-gray-700 mb-3">Comments</div>
        <div className="text-sm text-red-500 mb-3">{error}</div>
        <button
          onClick={() => fetchComments()}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // If no comments exist, show a simple "No comments" message with add form
  if (initialFetchDone && comments.length === 0) {
    return (
      <div className="border-t mt-6 pt-4">
        <div className="text-sm font-medium text-gray-700 mb-3">Comments</div>
        <div className="text-sm text-gray-500 mb-3">No comments yet</div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '...' : 'Add'}
          </button>
        </form>
      </div>
    );
  }

  // Show collapsible comments panel when comments exist
  return (
    <div className="border-t mt-6 pt-4">
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 w-full"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M6 4l8 6-8 6V4z" />
        </svg>
        <span>Comments</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {comments.length}
        </span>
      </button>

      {!isCollapsed && (
        <div className="mt-4 space-y-4">
          {loading && (
            <div className="text-sm text-gray-500">Loading comments...</div>
          )}

          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}

          {/* Comments list */}
          {comments.length > 0 && (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {comment.createdBy.avatarUrl ? (
                      <img
                        src={comment.createdBy.avatarUrl}
                        alt=""
                        className="w-5 h-5 rounded-full"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                        {comment.createdBy.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-700">
                      {comment.createdBy.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(comment.createdTime)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {comment.plainText}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Add comment form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '...' : 'Add'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Compact version for list view expanded rows
export function CommentPreview({ pageId }: { pageId: string }) {
  const [comment, setComment] = useState<Comment | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/notion/comments?page_id=${pageId}`)
      .then(res => res.json())
      .then(data => {
        if (data.comments && data.comments.length > 0) {
          // Get the latest comment (last in array)
          setComment(data.comments[data.comments.length - 1]);
          setCount(data.comments.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pageId]);

  if (loading) {
    return <span className="text-xs text-gray-400">Loading...</span>;
  }

  if (!comment) {
    return <span className="text-xs text-gray-400 italic">No comments</span>;
  }

  return (
    <div className="text-xs">
      <span className="text-gray-500">{comment.createdBy.name}: </span>
      <span className="text-gray-700">
        {comment.plainText.length > 100
          ? comment.plainText.substring(0, 100) + '...'
          : comment.plainText}
      </span>
      {count > 1 && (
        <span className="text-gray-400 ml-1">(+{count - 1} more)</span>
      )}
    </div>
  );
}

// Hook to fetch comment count
export function useCommentCount(pageId: string) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!pageId) return;

    fetch(`/api/notion/comments?page_id=${pageId}`)
      .then(res => res.json())
      .then(data => {
        setCount(data.count || 0);
      })
      .catch(() => setCount(0));
  }, [pageId]);

  return count;
}
