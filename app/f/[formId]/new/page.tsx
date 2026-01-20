'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import FormRenderer from '@/components/FormRenderer';
import { ThemeToggle } from '@/components/ThemeProvider';
import { FieldConfig } from '@/types/form';

interface FormConfig {
  fields: FieldConfig[];
  permissions?: {
    allowCreate?: boolean;
    allowEdit?: boolean;
    allowList?: boolean;
  };
  displayTitles?: {
    listTitle?: string;
    createTitle?: string;
    editTitle?: string;
  };
}

interface FormData {
  id: string;
  name: string;
  description: string | null;
  databaseId: string;
  config: FormConfig;
}

interface CurrentUser {
  id: string;
  email: string;
  name?: string;
}

export default function StandaloneCreatePage() {
  const params = useParams();
  const router = useRouter();

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [createdPageUrl, setCreatedPageUrl] = useState<string | null>(null);

  // Fetch form config
  useEffect(() => {
    async function fetchForm() {
      try {
        const response = await fetch(`/api/forms/${params.formId}/public`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Form not found');
        }

        // Check if create is allowed
        if (data.form.config.permissions?.allowCreate === false) {
          throw new Error('This form does not allow creating new records');
        }

        setForm(data.form);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form');
      } finally {
        setLoading(false);
      }
    }

    if (params.formId) {
      fetchForm();
    }
  }, [params.formId]);

  // Fetch current user
  useEffect(() => {
    fetch('/api/auth/email/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setCurrentUser({
            id: data.notionUserId || data.id,
            email: data.email,
            name: data.name,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleCreate = async (formData: Record<string, any>) => {
    if (!form) return;

    try {
      const fields = form.config.fields
        .filter((field) => formData[field.notionPropertyId] !== undefined)
        .map((field) => ({
          propertyId: field.notionPropertyId,
          propertyType: field.notionPropertyType,
          value: formData[field.notionPropertyId],
        }));

      const response = await fetch('/api/notion/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databaseId: form.databaseId,
          fields,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create record');
      }

      setCreatedPageUrl(result.url);
      setSubmitted(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create record');
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-gray-500 dark:text-gray-400">Loading form...</div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-8 text-center transition-colors">
            <div className="text-red-500 dark:text-red-400 text-5xl mb-4">!</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Error</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Link
              href={`/f/${params.formId}`}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            >
              Go to form
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!form) return null;

  const { permissions = {}, displayTitles = {} } = form.config;
  const { allowList = false } = permissions;
  const { createTitle } = displayTitles;

  // Success state
  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-8 text-center transition-colors">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Success!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Your record has been created.</p>

            <div className="space-y-3">
              {createdPageUrl && (
                <a
                  href={createdPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View in Notion
                </a>
              )}

              <button
                onClick={() => {
                  setSubmitted(false);
                  setCreatedPageUrl(null);
                }}
                className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors"
              >
                Create another
              </button>

              {allowList && (
                <Link
                  href={`/f/${params.formId}`}
                  className="block w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
                >
                  View all records
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Create form
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 transition-colors">
      <div className="max-w-2xl mx-auto">
        {/* Header with back link and theme toggle */}
        <div className="flex items-center justify-between mb-4">
          {allowList ? (
            <Link
              href={`/f/${params.formId}`}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to list
            </Link>
          ) : (
            <div />
          )}
          <ThemeToggle />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 md:p-8 transition-colors">
          <FormRenderer
            name={createTitle || form.name}
            description={form.description || undefined}
            fields={form.config.fields.filter(f => f.visible !== false)}
            onSubmit={handleCreate}
            submitLabel="Create"
            currentUser={currentUser || undefined}
          />
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Powered by Notion Form Builder
        </p>
      </div>
    </main>
  );
}
