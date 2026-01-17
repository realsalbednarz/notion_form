'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormRenderer from '@/components/FormRenderer';
import { FieldConfig } from '@/types/form';

interface FormConfig {
  name: string;
  description?: string;
  databaseId: string;
  fields: FieldConfig[];
}

interface SubmissionResult {
  mode: 'preview' | 'live';
  data: Record<string, any>;
  pageId?: string;
  pageUrl?: string;
  error?: string;
}

export default function FormPreviewPage() {
  const router = useRouter();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  useEffect(() => {
    // Load form config from sessionStorage
    const stored = sessionStorage.getItem('formPreview');
    if (stored) {
      try {
        setFormConfig(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse form config:', e);
      }
    }
  }, []);

  const handleSubmit = async (data: Record<string, any>) => {
    console.log('Form submitted:', data);

    if (!liveMode) {
      // Preview mode - just show the data
      setResult({ mode: 'preview', data });
      setSubmitted(true);
      return;
    }

    // Live mode - submit to Notion
    try {
      const fields = formConfig!.fields.map(field => ({
        propertyId: field.notionPropertyId,
        propertyType: field.notionPropertyType,
        value: data[field.notionPropertyId],
      }));

      const response = await fetch('/api/notion/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databaseId: formConfig!.databaseId,
          fields,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create page');
      }

      setResult({
        mode: 'live',
        data,
        pageId: responseData.pageId,
        pageUrl: responseData.url,
      });
      setSubmitted(true);
    } catch (error) {
      setResult({
        mode: 'live',
        data,
        error: error instanceof Error ? error.message : 'An error occurred',
      });
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setResult(null);
  };

  if (!formConfig) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Form to Preview</h1>
          <p className="text-gray-600 mb-6">
            Create a form in the form builder to preview it here.
          </p>
          <Link
            href="/databases"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Go to Databases
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLiveMode(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-l-lg border ${
                !liveMode
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setLiveMode(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-r-lg border -ml-3 ${
                liveMode
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Live Mode
            </button>
            {liveMode && (
              <span className="text-xs text-green-600 font-medium">
                Submissions will create real Notion pages
              </span>
            )}
          </div>
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            &larr; Back to Editor
          </button>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-6">
          {submitted && result ? (
            <div className="space-y-6">
              {result.error ? (
                // Error state
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Submission Failed</h2>
                  <p className="text-red-600 mt-2">{result.error}</p>
                </div>
              ) : result.mode === 'live' ? (
                // Live mode success
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Page Created!</h2>
                  <p className="text-gray-600 mt-2">
                    Your submission has been added to Notion.
                  </p>
                  {result.pageUrl && (
                    <a
                      href={result.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Open in Notion &rarr;
                    </a>
                  )}
                </div>
              ) : (
                // Preview mode success
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Preview Submitted</h2>
                  <p className="text-gray-600 mt-2">
                    This is a preview. Switch to Live Mode to create real Notion pages.
                  </p>
                </div>
              )}

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Submitted Data:</h3>
                <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>

              {result.pageId && (
                <div className="text-sm text-gray-500">
                  Page ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{result.pageId}</code>
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Submit Another Response
              </button>
            </div>
          ) : (
            <FormRenderer
              name={formConfig.name}
              description={formConfig.description}
              fields={formConfig.fields}
              onSubmit={handleSubmit}
              submitLabel={liveMode ? 'Submit to Notion' : 'Submit Preview'}
            />
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Database ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{formConfig.databaseId}</code>
        </div>
      </div>
    </main>
  );
}
