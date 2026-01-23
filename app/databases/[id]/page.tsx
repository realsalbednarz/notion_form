'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TopNav from '@/components/TopNav';

interface Property {
  id: string;
  name: string;
  type: string;
  options?: { id: string; name: string; color: string }[];
  relation?: { database_id: string };
  format?: string;
}

interface Database {
  id: string;
  title: string;
  url: string;
  properties: Property[];
}

const TYPE_BADGES: Record<string, string> = {
  title: 'bg-purple-100 text-purple-800',
  rich_text: 'bg-gray-100 text-gray-800',
  number: 'bg-blue-100 text-blue-800',
  select: 'bg-green-100 text-green-800',
  multi_select: 'bg-emerald-100 text-emerald-800',
  date: 'bg-orange-100 text-orange-800',
  people: 'bg-pink-100 text-pink-800',
  files: 'bg-yellow-100 text-yellow-800',
  checkbox: 'bg-indigo-100 text-indigo-800',
  url: 'bg-cyan-100 text-cyan-800',
  email: 'bg-teal-100 text-teal-800',
  phone_number: 'bg-lime-100 text-lime-800',
  formula: 'bg-violet-100 text-violet-800',
  relation: 'bg-rose-100 text-rose-800',
  rollup: 'bg-amber-100 text-amber-800',
  created_time: 'bg-slate-100 text-slate-800',
  created_by: 'bg-slate-100 text-slate-800',
  last_edited_time: 'bg-slate-100 text-slate-800',
  last_edited_by: 'bg-slate-100 text-slate-800',
  status: 'bg-green-100 text-green-800',
  unique_id: 'bg-gray-100 text-gray-800',
};

export default function DatabaseSchemaPage() {
  const params = useParams();
  const router = useRouter();
  const [database, setDatabase] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDatabase() {
      try {
        const response = await fetch(`/api/notion/databases/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error(data.error || 'Failed to fetch database');
        }

        setDatabase(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchDatabase();
    }
  }, [params.id, router]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <TopNav />

      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <Link
            href="/forms/new"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-sm"
          >
            &larr; Back to New Form
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 dark:text-gray-400">Loading database schema...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && database && (
          <>
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold dark:text-gray-100">{database.title}</h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 font-mono mt-1">{database.id}</p>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href={database.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                >
                  Open in Notion
                </a>
                <Link
                  href={`/databases/${database.id}/forms/new`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Create Form
                </Link>
              </div>
            </div>

            <h2 className="text-xl font-semibold dark:text-gray-100 mb-4">
              Properties ({database.properties.length})
            </h2>

            <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Type</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700 bg-white dark:bg-gray-800/50">
                  {database.properties.map((prop) => (
                    <tr key={prop.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <span className="font-medium dark:text-gray-100">{prop.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            TYPE_BADGES[prop.type] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {prop.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {prop.options && (
                          <div className="flex flex-wrap gap-1">
                            {prop.options.slice(0, 5).map((opt) => (
                              <span
                                key={opt.id}
                                className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs dark:text-gray-300"
                              >
                                {opt.name}
                              </span>
                            ))}
                            {prop.options.length > 5 && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                +{prop.options.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                        {prop.format && <span>Format: {prop.format}</span>}
                        {prop.relation && (
                          <span className="text-xs font-mono">
                            Related to: {prop.relation.database_id.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
