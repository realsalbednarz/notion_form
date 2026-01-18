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
    <main className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Forms</h1>
          <Link
            href="/forms/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Create New Form
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && forms.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <div className="text-gray-400 text-5xl mb-4">📝</div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h2>
            <p className="text-gray-500 mb-6">
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
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Mode
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Updated
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {forms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{form.name}</div>
                        {form.description && (
                          <div className="text-sm text-gray-500 truncate max-w-md">
                            {form.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 capitalize">
                        {form.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(form.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => copyFormUrl(form.id)}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                          title="Copy form URL"
                        >
                          Copy Link
                        </button>
                        <Link
                          href={`/f/${form.id}`}
                          target="_blank"
                          className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        >
                          Open
                        </Link>
                        <Link
                          href={`/forms/${form.id}/edit`}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(form.id, form.name)}
                          disabled={deleting === form.id}
                          className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
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
