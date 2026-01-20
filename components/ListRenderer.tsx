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
          className="fixed p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl max-w-sm break-words whitespace-normal text-sm dark:text-gray-200"
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
    return <span className="text-gray-400 dark:text-gray-500">-</span>;
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
        <span className={value ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
          {value ? '✓' : '✗'}
        </span>
      );

    case 'select':
    case 'status':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
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
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
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
      return <span className="text-gray-400 dark:text-gray-500">-</span>;

    case 'people':
      if (Array.isArray(value) && value.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((p: any, i: number) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200"
              >
                {p.name || p.email || p.id}
              </span>
            ))}
          </div>
        );
      }
      return <span className="text-gray-400 dark:text-gray-500">-</span>;

    case 'created_time':
    case 'last_edited_time':
      if (value) {
        try {
          return <span className="text-sm text-gray-600 dark:text-gray-400">{new Date(value).toLocaleString()}</span>;
        } catch {
          return <span>{String(value)}</span>;
        }
      }
      return <span className="text-gray-400 dark:text-gray-500">-</span>;

    case 'relation':
      if (Array.isArray(value) && value.length > 0) {
        // Check if we have titles (enriched data) or just IDs
        const hasTitle = value[0] && typeof value[0] === 'object' && value[0].title;
        if (hasTitle) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.slice(0, 3).map((item: any, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  {item.title}
                </span>
              ))}
              {value.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{value.length - 3} more
                </span>
              )}
            </div>
          );
        }
        // Just IDs - show count
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            {value.length} linked
          </span>
        );
      }
      return <span className="text-gray-400 dark:text-gray-500">-</span>;

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

  // Column visibility state
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`listview-hidden-${databaseId}`);
      if (stored) {
        try {
          return new Set(JSON.parse(stored));
        } catch {}
      }
    }
    return new Set();
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ propertyId: string; direction: 'ascending' | 'descending' } | null>(null);

  // Save hidden columns to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`listview-hidden-${databaseId}`, JSON.stringify([...hiddenColumns]));
    }
  }, [hiddenColumns, databaseId]);

  // Close column menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setShowColumnMenu(false);
      }
    };
    if (showColumnMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnMenu]);

  const toggleColumnVisibility = (propertyId: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  };

  // Filter columns based on visibility
  const visibleColumns = columns.filter(col => !hiddenColumns.has(col.propertyId));

  // Handle column sort click
  const handleSortClick = (propertyId: string) => {
    setSortConfig(prev => {
      if (prev?.propertyId === propertyId) {
        // Toggle direction or clear if already descending
        if (prev.direction === 'ascending') {
          return { propertyId, direction: 'descending' };
        } else {
          return null; // Clear sort
        }
      }
      // New sort column - start with ascending
      return { propertyId, direction: 'ascending' };
    });
  };

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
      if (sortConfig) {
        params.set('sort_property', sortConfig.propertyId);
        params.set('sort_direction', sortConfig.direction);
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
  }, [databaseId, pageSize, filters, sortConfig]);

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
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          onClick={refresh}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Column visibility and Create button */}
      <div className="flex justify-between items-center">
        {/* Column visibility dropdown */}
        <div className="relative" ref={columnMenuRef}>
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Columns
            {hiddenColumns.size > 0 && (
              <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                {columns.length - hiddenColumns.size}/{columns.length}
              </span>
            )}
          </button>

          {showColumnMenu && (
            <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                Toggle columns
              </div>
              {columns.map(col => (
                <label
                  key={col.propertyId}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenColumns.has(col.propertyId)}
                    onChange={() => toggleColumnVisibility(col.propertyId)}
                    className="h-4 w-4 text-blue-600 rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{col.label}</span>
                </label>
              ))}
              {hiddenColumns.size > 0 && (
                <div className="border-t dark:border-gray-700 mt-1 pt-1">
                  <button
                    onClick={() => setHiddenColumns(new Set())}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Show all columns
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create button */}
        {allowCreate && onCreateClick && (
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
        )}
      </div>

      {/* No columns visible */}
      {visibleColumns.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg border-dashed">
          {columns.length === 0 ? (
            <>
              <p className="font-medium">No columns configured</p>
              <p className="text-sm mt-1">
                Edit this form and enable "Show in List" on the fields you want to display.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">All columns hidden</p>
              <p className="text-sm mt-1">
                Use the Columns button above to show some columns.
              </p>
            </>
          )}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg">
          <p>No records found</p>
          {filters.length > 0 && (
            <p className="text-sm mt-1">Try adjusting the filters</p>
          )}
        </div>
      ) : (
        <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                {/* Expand arrow column */}
                <col style={{ width: '24px' }} />
                {/* Edit button column */}
                {allowEdit && <col style={{ width: '44px' }} />}
                {/* Data columns - use stored widths or auto */}
                {visibleColumns.map((col) => (
                  <col
                    key={col.propertyId}
                    style={columnWidths[col.propertyId] ? { width: `${columnWidths[col.propertyId]}px` } : undefined}
                  />
                ))}
              </colgroup>
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400"></th>
                  {allowEdit && (
                    <th className="py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400"></th>
                  )}
                  {visibleColumns.map((col) => {
                    const isSorted = sortConfig?.propertyId === col.propertyId;
                    const sortDirection = isSorted ? sortConfig.direction : null;
                    return (
                      <th
                        key={col.propertyId}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate relative border-r border-gray-200 dark:border-gray-700 select-none"
                        style={columnWidths[col.propertyId] ? { width: `${columnWidths[col.propertyId]}px` } : undefined}
                      >
                        <button
                          onClick={() => handleSortClick(col.propertyId)}
                          className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                          title={`Sort by ${col.label}`}
                        >
                          <span className="truncate">{col.label}</span>
                          {/* Sort indicator */}
                          {isSorted ? (
                            <svg
                              className={`w-3 h-3 flex-shrink-0 ${sortDirection === 'descending' ? 'rotate-180' : ''}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M5 10l5-5 5 5H5z" />
                            </svg>
                          ) : (
                            <svg
                              className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-30"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M5 10l5-5 5 5H5z" />
                            </svg>
                          )}
                        </button>
                        {/* Resize handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 bg-transparent -mr-1"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const th = e.currentTarget.parentElement;
                            const currentWidth = th?.offsetWidth || 150;
                            handleResizeStart(e, col.propertyId, currentWidth);
                          }}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((row) => {
                  const isExpanded = expandedRows.has(row.id);
                  const colSpan = visibleColumns.length + 1 + (allowEdit ? 1 : 0);
                  return (
                    <React.Fragment key={row.id}>
                      <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isExpanded ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}`}>
                        <td className="px-1 py-2 align-top">
                          <button
                            onClick={() => toggleRowExpanded(row.id)}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
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
                              className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors whitespace-nowrap"
                            >
                              Edit
                            </button>
                          </td>
                        )}
                        {visibleColumns.map((col) => {
                          const prop = row.properties[col.propertyId];
                          return (
                            <td
                              key={col.propertyId}
                              className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100"
                            >
                              {prop ? formatCellValue(prop.type, prop.value, isExpanded) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50/30 dark:bg-blue-900/20">
                          <td colSpan={colSpan} className="px-4 py-3 border-t border-blue-100 dark:border-blue-800">
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
      {visibleColumns.length > 0 && hasMore && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {/* Row count */}
      {visibleColumns.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {rows.length} record{rows.length !== 1 ? 's' : ''}{hasMore ? '+' : ''} shown
        </div>
      )}
    </div>
  );
}

// Export refresh function type for parent components
export type ListRendererRefreshFn = () => Promise<void>;
