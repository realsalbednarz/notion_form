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

export default function FormPreviewPage() {
  const router = useRouter();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<Record<string, any> | null>(null);

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
    // For preview, just show the submitted data
    console.log('Form submitted:', data);
    setSubmittedData(data);
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmittedData(null);
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
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
              Preview Mode
            </span>
          </div>
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            &larr; Back to Editor
          </button>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-6">
          {submitted ? (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Form Submitted!</h2>
                <p className="text-gray-600 mt-2">
                  This is a preview. In production, data would be sent to Notion.
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Submitted Data:</h3>
                <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-auto">
                  {JSON.stringify(submittedData, null, 2)}
                </pre>
              </div>

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
