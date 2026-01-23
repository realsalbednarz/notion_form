'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

interface Database {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
}

export default function DatabasesPage() {
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

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <TopNav />

      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold dark:text-gray-100 mb-6">Databases</h1>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 dark:text-gray-400">Loading databases...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && databases.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No databases found. Make sure your Notion integration has access to at least one database.
          </div>
        )}

        {!loading && !error && databases.length > 0 && (
          <div className="grid gap-4">
            {databases.map((db) => (
              <Link
                key={db.id}
                href={`/databases/${db.id}`}
                className="block border dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold dark:text-gray-100">{db.title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Last edited: {new Date(db.lastEditedTime).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    View Schema &rarr;
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-mono">{db.id}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
