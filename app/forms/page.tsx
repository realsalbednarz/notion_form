'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

interface FormConfig {
  id: string;
  name: string;
  description: string | null;
  databaseId: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
}

export default function FormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  async function fetchForms() {
    try {
      const response = await fetch('/api/forms');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to fetch forms');
      }

      setForms(data.forms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(formId: string, formName: string) {
    if (!confirm(`Are you sure you want to delete "${formName}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(formId);

    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete form');
      }

      setForms(forms.filter((f) => f.id !== formId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete form');
    } finally {
      setDeleting(null);
    }
  }

  function copyFormUrl(formId: string) {
    const url = `${window.location.origin}/f/${formId}`;
    navigator.clipboard.writeText(url);
    alert('Form URL copied to clipboard!');
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <TopNav />

      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold dark:text-gray-100">My Forms</h1>
          <Link
            href="/forms/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Create New Form
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && forms.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
            <div className="text-gray-400 dark:text-gray-500 text-5xl mb-4">📝</div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No forms yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Create your first form by selecting a database
            </p>
            <Link
              href="/forms/new"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Create Form
            </Link>
          </div>
        )}

        {!loading && !error && forms.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Updated
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {forms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{form.name}</div>
                        {form.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                            {form.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(form.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => copyFormUrl(form.id)}
                          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Copy form URL"
                        >
                          Copy Link
                        </button>
                        <Link
                          href={`/f/${form.id}`}
                          target="_blank"
                          className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                        >
                          Open
                        </Link>
                        <Link
                          href={`/forms/${form.id}/edit`}
                          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(form.id, form.name)}
                          disabled={deleting === form.id}
                          className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-50"
                        >
                          {deleting === form.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
