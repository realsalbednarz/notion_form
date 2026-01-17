'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Database {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
}

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDatabases() {
      try {
        const response = await fetch('/api/notion/databases');
        const data = await response.json();

        if (!response.ok) {
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
  }, []);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Notion Databases</h1>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Back to Home
          </Link>
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
          <div className="text-center py-12 text-gray-500">
            No databases found. Make sure your Notion integration has access to at least one database.
          </div>
        )}

        {!loading && !error && databases.length > 0 && (
          <div className="grid gap-4">
            {databases.map((db) => (
              <div
                key={db.id}
                className="border rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{db.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Last edited: {new Date(db.lastEditedTime).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={db.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Open in Notion
                  </a>
                </div>
                <p className="text-xs text-gray-400 mt-2 font-mono">{db.id}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
