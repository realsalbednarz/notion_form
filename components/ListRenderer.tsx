'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DesignTimeFilter } from '@/types/form';
import { CommentPreview } from './CommentsPanel';

interface ListColumn {
  propertyId: string;
  label: string;
  type: string;
}

interface RowData {
  id: string;
  url: string;
  properties: Record<string, { type: string; value: any }>;
}


interface ListRendererProps {
  databaseId: string;
  columns: ListColumn[];
  filters?: DesignTimeFilter[];
  pageSize?: number;
  allowEdit?: boolean;
  allowCreate?: boolean;
  onEditClick?: (rowId: string) => void;
  onCreateClick?: () => void;
}

// Truncated cell with expand on hover - uses portal to escape table overflow
function TruncatedCell({ children }: { children: React.ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setNeedsTruncation(contentRef.current.scrollWidth > contentRef.current.clientWidth);
    }
  }, [children]);

  const handleMouseEnter = () => {
    if (needsTruncation && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top + window.scrollY - 8,
        left: rect.left + window.scrollX,
      });
      setIsHovered(true);
    }
  };

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className="truncate cursor-default"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </div>
      {isHovered && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed p-3 bg-white border rounded-lg shadow-xl max-w-sm break-words whitespace-normal text-sm"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translateY(-100%)',
            zIndex: 99999,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}

// Format cell value for display
function formatCellValue(type: string, value: any, expanded: boolean = false): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">-</span>;
  }

  switch (type) {
    case 'title':
    case 'rich_text':
    case 'url':
    case 'email':
    case 'phone_number':
      if (expanded) {
        return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
      }
      return <TruncatedCell>{String(value)}</TruncatedCell>;

    case 'number':
      return <span>{typeof value === 'number' ? value.toLocaleString() : value}</span>;

    case 'checkbox':
      return (
        <span className={value ? 'text-green-600' : 'text-gray-400'}>
          {value ? '✓' : '✗'}
        </span>
      );

    case 'select':
    case 'status':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
          {String(value)}
        </span>
      );

    case 'multi_select':
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((v, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
              >
                {String(v)}
              </span>
            ))}
          </div>
        );
      }
      return <span>{String(value)}</span>;

    case 'date':
      if (value) {
        try {
          return <span>{new Date(value).toLocaleDateString()}</span>;
        } catch {
          return <span>{String(value)}</span>;
        }
      }
      return <span className="text-gray-400">-</span>;

    case 'people':
      if (Array.isArray(value) && value.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((p: any, i: number) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {p.name || p.email || p.id}
              </span>
            ))}
          </div>
        );
      }
      return <span className="text-gray-400">-</span>;

    case 'created_time':
    case 'last_edited_time':
      if (value) {
        try {
          return <span className="text-sm text-gray-600">{new Date(value).toLocaleString()}</span>;
        } catch {
          return <span>{String(value)}</span>;
        }
      }
      return <span className="text-gray-400">-</span>;

    case 'relation':
      if (Array.isArray(value) && value.length > 0) {
        return <span className="text-sm text-gray-600">{value.length} linked</span>;
      }
      return <span className="text-gray-400">-</span>;

    default:
      return <span>{String(value)}</span>;
  }
}

export default function ListRenderer({
  databaseId,
  columns,
  filters = [],
  pageSize = 20,
  allowEdit = false,
  allowCreate = false,
  onEditClick,
  onCreateClick,
}: ListRendererProps) {
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Column widths state (in pixels, null means auto)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ columnId: string; startX: number; startWidth: number } | null>(null);

  // Handle column resize
  const handleResizeStart = (e: React.MouseEvent, columnId: string, currentWidth: number) => {
    e.preventDefault();
    resizingRef.current = { columnId, startX: e.clientX, startWidth: currentWidth };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { columnId, startX, startWidth } = resizingRef.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(80, startWidth + diff); // Min 80px
    setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

  const toggleRowExpanded = (rowId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const fetchRows = useCallback(async (cursor?: string) => {
    try {
      const params = new URLSearchParams();
      params.set('page_size', String(pageSize));
      if (cursor) {
        params.set('start_cursor', cursor);
      }
      if (filters.length > 0) {
        params.set('filters', JSON.stringify(filters));
      }

      const response = await fetch(
        `/api/notion/databases/${databaseId}/rows?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch rows');
      }

      return data;
    } catch (err) {
      throw err;
    }
  }, [databaseId, pageSize, filters]);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchRows();
        if (!cancelled) {
          setRows(data.rows);
          setHasMore(data.hasMore);
          setNextCursor(data.nextCursor);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [fetchRows]);

  // Load more
  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const data = await fetchRows(nextCursor);
      setRows((prev) => [...prev, ...data.rows]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more data');
    } finally {
      setLoadingMore(false);
    }
  };

  // Refresh function (can be called after edit)
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRows();
      setRows(data.rows);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  }, [fetchRows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-700">{error}</p>
        <button
          onClick={refresh}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create button */}
      {allowCreate && onCreateClick && (
        <div className="flex justify-end">
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
        </div>
      )}

      {/* No columns configured */}
      {columns.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border rounded-lg border-dashed">
          <p className="font-medium">No columns configured</p>
          <p className="text-sm mt-1">
            Edit this form and enable "Show in List" on the fields you want to display.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border rounded-lg">
          <p>No records found</p>
          {filters.length > 0 && (
            <p className="text-sm mt-1">Try adjusting the filters</p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                {/* Expand arrow column */}
                <col style={{ width: '32px' }} />
                {/* Edit button column */}
                {allowEdit && <col style={{ width: '50px' }} />}
                {/* Data columns - use stored widths or auto */}
                {columns.map((col) => (
                  <col
                    key={col.propertyId}
                    style={columnWidths[col.propertyId] ? { width: `${columnWidths[col.propertyId]}px` } : undefined}
                  />
                ))}
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500"></th>
                  {allowEdit && (
                    <th className="px-1 py-2 text-left text-xs font-medium text-gray-500"></th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.propertyId}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate relative group"
                      title={col.label}
                      style={columnWidths[col.propertyId] ? { width: `${columnWidths[col.propertyId]}px` } : undefined}
                    >
                      {col.label}
                      {/* Resize handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100"
                        onMouseDown={(e) => {
                          const th = e.currentTarget.parentElement;
                          const currentWidth = th?.offsetWidth || 150;
                          handleResizeStart(e, col.propertyId, currentWidth);
                        }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => {
                  const isExpanded = expandedRows.has(row.id);
                  const colSpan = columns.length + 1 + (allowEdit ? 1 : 0);
                  return (
                    <React.Fragment key={row.id}>
                      <tr className={`hover:bg-gray-50 ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-1 py-2 align-top">
                          <button
                            onClick={() => toggleRowExpanded(row.id)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                            title={isExpanded ? 'Collapse row' : 'Expand row'}
                          >
                            <svg
                              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M6 4l8 6-8 6V4z" />
                            </svg>
                          </button>
                        </td>
                        {allowEdit && onEditClick && (
                          <td className="px-1 py-2 align-top">
                            <button
                              onClick={() => onEditClick(row.id)}
                              className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors whitespace-nowrap"
                            >
                              Edit
                            </button>
                          </td>
                        )}
                        {columns.map((col) => {
                          const prop = row.properties[col.propertyId];
                          return (
                            <td
                              key={col.propertyId}
                              className="px-4 py-3 text-sm text-gray-900"
                            >
                              {prop ? formatCellValue(prop.type, prop.value, isExpanded) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50/30">
                          <td colSpan={colSpan} className="px-4 py-3 border-t border-blue-100">
                            <div className="text-xs text-gray-500 font-medium mb-1">Latest Comment:</div>
                            <CommentPreview pageId={row.id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {columns.length > 0 && hasMore && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {/* Row count */}
      {columns.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          {rows.length} record{rows.length !== 1 ? 's' : ''}{hasMore ? '+' : ''} shown
        </div>
      )}
    </div>
  );
}

// Export refresh function type for parent components
export type ListRendererRefreshFn = () => Promise<void>;
