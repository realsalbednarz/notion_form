'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FormRenderer from '@/components/FormRenderer';
import { FieldConfig } from '@/types/form';

interface FormData {
  id: string;
  name: string;
  description: string | null;
  databaseId: string;
  mode: string;
  config: {
    fields: FieldConfig[];
  };
}

export default function PublicFormPage() {
  const params = useParams();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ pageId: string; url: string } | null>(null);

  useEffect(() => {
    async function fetchForm() {
      try {
        const response = await fetch(`/api/forms/${params.formId}/public`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Form not found');
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

  const handleSubmit = async (formData: Record<string, any>) => {
    if (!form) return;

    try {
      // Convert form data to the format expected by the API
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
        throw new Error(result.error || 'Failed to submit form');
      }

      setSubmissionResult(result);
      setSubmitted(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit form');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading form...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg border p-8 text-center">
            <div className="text-red-500 text-5xl mb-4">!</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Form Not Found</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg border p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
            <p className="text-gray-600 mb-6">Your response has been submitted successfully.</p>

            <button
              onClick={() => {
                setSubmitted(false);
                setSubmissionResult(null);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit another response
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!form) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border p-6 md:p-8">
          <FormRenderer
            name={form.name}
            description={form.description || undefined}
            fields={form.config.fields}
            onSubmit={handleSubmit}
          />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Notion Form Builder
        </p>
      </div>
    </main>
  );
}
