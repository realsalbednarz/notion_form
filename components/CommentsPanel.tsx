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
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
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
    setFetchError(null);
    try {
      const response = await fetch(`/api/notion/comments?page_id=${pageId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch comments');
      }

      setComments(data.comments || []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load comments');
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

  // If no comments exist (or fetch failed), show add form
  if (comments.length === 0) {
    return (
      <div className="border-t mt-6 pt-4">
        <div className="text-sm font-medium text-gray-700 mb-3">Comments</div>
        <div className="text-sm text-gray-500 mb-3">
          {fetchError ? 'Could not load comments' : 'No comments yet'}
        </div>
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

          {fetchError && (
            <div className="text-sm text-gray-500">{fetchError}</div>
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

// Compact version for list view expanded rows - with expandable comments
export function CommentPreview({ pageId }: { pageId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/notion/comments?page_id=${pageId}`)
      .then(res => res.json())
      .then(data => {
        if (data.comments && data.comments.length > 0) {
          setComments(data.comments);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pageId]);

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

  if (loading) {
    return <span className="text-xs text-gray-400">Loading...</span>;
  }

  if (comments.length === 0) {
    return (
      <div>
        <span className="text-xs text-gray-400 italic">No comments</span>
        {expanded ? (
          <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '...' : 'Add'}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-blue-600 hover:text-blue-800 ml-2"
          >
            Add comment
          </button>
        )}
      </div>
    );
  }

  const latestComment = comments[comments.length - 1];
  const count = comments.length;

  // Collapsed view - show latest comment only
  if (!expanded) {
    return (
      <div className="text-xs">
        <span className="text-gray-500">{latestComment.createdBy.name}: </span>
        <span className="text-gray-700">
          {latestComment.plainText.length > 100
            ? latestComment.plainText.substring(0, 100) + '...'
            : latestComment.plainText}
        </span>
        {count > 1 ? (
          <button
            onClick={() => setExpanded(true)}
            className="text-blue-600 hover:text-blue-800 ml-2"
          >
            View all ({count})
          </button>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="text-blue-600 hover:text-blue-800 ml-2"
          >
            Reply
          </button>
        )}
      </div>
    );
  }

  // Expanded view - show all comments
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">All Comments ({count})</span>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Collapse
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-white rounded p-2 border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              {comment.createdBy.avatarUrl ? (
                <img
                  src={comment.createdBy.avatarUrl}
                  alt=""
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-[10px] text-gray-600">
                  {comment.createdBy.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[10px] font-medium text-gray-700">
                {comment.createdBy.name}
              </span>
              <span className="text-[10px] text-gray-400">
                {formatDate(comment.createdTime)}
              </span>
            </div>
            <p className="text-xs text-gray-800 whitespace-pre-wrap">
              {comment.plainText}
            </p>
          </div>
        ))}
      </div>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '...' : 'Add'}
        </button>
      </form>
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
