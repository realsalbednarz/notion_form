'use client';

import { useState, useEffect, useRef } from 'react';

interface RelationPage {
  id: string;
  title: string;
}

interface RelationPickerProps {
  databaseId: string;
  value: string | string[]; // Page ID(s)
  onChange: (value: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function RelationPicker({
  databaseId,
  value,
  onChange,
  multiple = false,
  disabled = false,
  placeholder = 'Select related page...',
}: RelationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pages, setPages] = useState<RelationPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState<RelationPage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize value to array
  const selectedIds = Array.isArray(value) ? value : value ? [value] : [];

  // Fetch pages on mount and when search changes
  useEffect(() => {
    if (!databaseId) return;

    const fetchPages = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        params.set('page_size', '50');

        const response = await fetch(`/api/notion/databases/${databaseId}/pages?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch pages');
        }

        setPages(data.pages || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load options');
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(fetchPages, search ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [databaseId, search]);

  // Load selected page titles on initial render
  useEffect(() => {
    if (selectedIds.length > 0 && selectedPages.length === 0) {
      // Try to find in loaded pages first
      const found = pages.filter(p => selectedIds.includes(p.id));
      if (found.length === selectedIds.length) {
        setSelectedPages(found);
      }
      // If not found, we'll show IDs until pages load
    }
  }, [pages, selectedIds]);

  // Update selected pages when value changes
  useEffect(() => {
    if (pages.length > 0) {
      const found = pages.filter(p => selectedIds.includes(p.id));
      setSelectedPages(found);
    }
  }, [value, pages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (page: RelationPage) => {
    if (multiple) {
      // Toggle selection
      if (selectedIds.includes(page.id)) {
        onChange(selectedIds.filter(id => id !== page.id));
      } else {
        onChange([...selectedIds, page.id]);
      }
    } else {
      // Single select
      onChange([page.id]);
      setIsOpen(false);
    }
  };

  const handleRemove = (pageId: string) => {
    onChange(selectedIds.filter(id => id !== pageId));
  };

  const getDisplayText = () => {
    if (selectedPages.length === 0) {
      // Show IDs if we have values but haven't loaded titles yet
      if (selectedIds.length > 0) {
        return selectedIds.length === 1 ? '1 selected' : `${selectedIds.length} selected`;
      }
      return placeholder;
    }
    if (selectedPages.length === 1) {
      return selectedPages[0].title;
    }
    return `${selectedPages.length} selected`;
  };

  const inputClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600 ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'cursor-pointer'}`;

  return (
    <div ref={containerRef} className="relative">
      {/* Selected value display / trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={inputClasses}
      >
        <div className="flex items-center justify-between">
          <span className={selectedPages.length === 0 && selectedIds.length === 0 ? 'text-gray-400 dark:text-gray-500' : ''}>
            {getDisplayText()}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Selected items (for multiple selection) */}
      {multiple && selectedPages.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedPages.map(page => (
            <span
              key={page.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded text-sm"
            >
              {page.title}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(page.id);
                }}
                className="hover:text-blue-600 dark:hover:text-blue-300"
                disabled={disabled}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {loading && (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
            )}

            {error && (
              <div className="px-3 py-2 text-sm text-red-500 dark:text-red-400">{error}</div>
            )}

            {!loading && !error && pages.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No pages found</div>
            )}

            {!loading && !error && pages.map(page => {
              const isSelected = selectedIds.includes(page.id);
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => handleSelect(page)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <span className="truncate">{page.title}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
