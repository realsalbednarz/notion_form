'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeProvider';
export const dynamic = 'force-dynamic';

interface FormInfo {
  id: string;
  name: string;
  description: string | null;
  mode: string;
  updatedAt: string;
  listTitle?: string;
  createTitle?: string;
  permissions: {
    allowCreate: boolean;
    allowEdit: boolean;
    allowList: boolean;
  };
}

export default function DirectoryPage() {
  const [forms, setForms] = useState<FormInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch('/api/forms/directory')
      .then(res => res.json())
      .then(data => {
        if (data.forms) {
          setForms(data.forms);
        }
      })
      .catch(err => {
        setError(err.message || 'Failed to load forms');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Form Directory</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Browse and access available forms
            </p>
          </div>
          {mounted && <ThemeToggle />}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 dark:text-gray-400">Loading forms...</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && forms.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
            <div className="text-gray-400 dark:text-gray-500 text-5xl mb-4">📋</div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No forms available</h2>
            <p className="text-gray-500 dark:text-gray-400">
              There are no forms published yet.
            </p>
          </div>
        )}

        {/* Forms list */}
        {!loading && !error && forms.length > 0 && (
          <div className="space-y-4">
            {forms.map((form) => (
              <div
                key={form.id}
                className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {form.listTitle || form.name}
                    </h2>
                    {form.description && (
                      <p className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {form.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      {/* Badges showing capabilities */}
                      {form.permissions.allowList && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                          List View
                        </span>
                      )}
                      {form.permissions.allowCreate && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">
                          Create
                        </span>
                      )}
                      {form.permissions.allowEdit && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200">
                          Edit
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {/* Quick create link if only create is allowed */}
                    {form.permissions.allowCreate && !form.permissions.allowList && (
                      <Link
                        href={`/f/${form.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Open Form
                      </Link>
                    )}
                    {/* List view link */}
                    {form.permissions.allowList && (
                      <Link
                        href={`/f/${form.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View List
                      </Link>
                    )}
                    {/* Standalone create link for list-enabled forms */}
                    {form.permissions.allowList && form.permissions.allowCreate && (
                      <Link
                        href={`/f/${form.id}/new`}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                      >
                        New Entry
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
          Powered by Notion Form Builder
        </p>
      </div>
    </main>
  );
}
