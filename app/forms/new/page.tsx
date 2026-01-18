'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

interface Database {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
}

export default function NewFormPage() {
  const router = useRouter();
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDatabases() {
      try {
        const response = await fetch('/api/notion/databases');
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error(data.error || 'Failed to fetch databases');
        }

        setDatabases(data.databases);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchDatabases();
  }, [router]);

  const handleSelectDatabase = (databaseId: string) => {
    router.push(`/databases/${databaseId}/forms/new`);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Create New Form</h1>
          <p className="text-gray-600 mt-1">Select a database to create a form for</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading databases...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && databases.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <div className="text-gray-400 text-5xl mb-4">📊</div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">No databases found</h2>
            <p className="text-gray-500 mb-6">
              Make sure your Notion integration has access to at least one database.
            </p>
            <a
              href="https://www.notion.so/my-integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Manage Notion Integrations
            </a>
          </div>
        )}

        {!loading && !error && databases.length > 0 && (
          <div className="grid gap-3">
            {databases.map((db) => (
              <button
                key={db.id}
                onClick={() => handleSelectDatabase(db.id)}
                className="block w-full text-left bg-white border rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{db.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Last edited: {new Date(db.lastEditedTime).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-blue-600 text-sm font-medium">
                    Select &rarr;
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
