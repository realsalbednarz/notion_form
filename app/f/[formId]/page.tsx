'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import FormRenderer from '@/components/FormRenderer';
import ListRenderer from '@/components/ListRenderer';
import SlideOver from '@/components/SlideOver';
import CommentsPanel from '@/components/CommentsPanel';
import { ThemeToggle } from '@/components/ThemeProvider';
import { FieldConfig, DesignTimeFilter, ListConfig } from '@/types/form';

interface FormConfig {
  fields: FieldConfig[];
  permissions?: {
    allowCreate?: boolean;
    allowEdit?: boolean;
    allowList?: boolean;
  };
  listConfig?: ListConfig;
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

interface EditingRecord {
  id: string;
  properties: Record<string, { type: string; value: any }>;
}

export default function PublicFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Slide-over state
  const [slideOverMode, setSlideOverMode] = useState<'create' | 'edit' | null>(null);
  const [editingRecord, setEditingRecord] = useState<EditingRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  // Success state for non-list forms
  const [submitted, setSubmitted] = useState(false);

  // List refresh trigger
  const [listKey, setListKey] = useState(0);

  // Derived state from URL
  const editId = searchParams.get('edit');
  const isNewMode = searchParams.get('new') === 'true';

  // Fetch form config
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

  // Handle URL-driven mode changes
  useEffect(() => {
    if (!form) return;

    if (editId) {
      // Edit mode - fetch record and open slide-over
      setSlideOverMode('edit');
      fetchRecordForEdit(editId);
    } else if (isNewMode && form.config.permissions?.allowList) {
      // Create mode with list view - open slide-over
      setSlideOverMode('create');
      setEditingRecord(null);
    } else {
      // Close slide-over
      setSlideOverMode(null);
      setEditingRecord(null);
    }
  }, [editId, isNewMode, form]);

  // Fetch record for editing
  const fetchRecordForEdit = async (recordId: string) => {
    setLoadingRecord(true);
    try {
      const response = await fetch(`/api/notion/pages/${recordId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch record');
      }

      setEditingRecord({
        id: data.id,
        properties: data.properties,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load record');
      closeSlideOver();
    } finally {
      setLoadingRecord(false);
    }
  };

  // Navigation helpers
  const openCreate = () => {
    router.push(`/f/${params.formId}?new=true`);
  };

  const openEdit = (recordId: string) => {
    router.push(`/f/${params.formId}?edit=${recordId}`);
  };

  const closeSlideOver = () => {
    router.push(`/f/${params.formId}`);
  };

  // Submit handlers
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

      // If list view exists, close slide-over and refresh list
      if (form.config.permissions?.allowList) {
        closeSlideOver();
        setListKey((k) => k + 1); // Trigger list refresh
      } else {
        // No list view - show success state
        setSubmitted(true);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create record');
    }
  };

  const handleEdit = async (formData: Record<string, any>) => {
    if (!form || !editingRecord) return;

    try {
      const fields = form.config.fields
        .filter((field) => field.visible !== false && formData[field.notionPropertyId] !== undefined)
        .map((field) => ({
          propertyId: field.notionPropertyId,
          propertyType: field.notionPropertyType,
          value: formData[field.notionPropertyId],
        }));

      const response = await fetch(`/api/notion/pages/${editingRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update record');
      }

      // Close slide-over and refresh list
      closeSlideOver();
      setListKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update record');
    }
  };

  // Build initial form data from record for editing
  const getEditInitialData = (): Record<string, any> => {
    if (!editingRecord || !form) return {};

    const initialData: Record<string, any> = {};
    form.config.fields.forEach((field) => {
      const prop = editingRecord.properties[field.notionPropertyId];
      if (prop) {
        initialData[field.notionPropertyId] = prop.value;
      }
    });
    return initialData;
  };

  // Get columns for list view
  const getListColumns = () => {
    if (!form) return [];
    return form.config.fields
      .filter((f) => f.showInList)
      .map((f) => ({
        propertyId: f.notionPropertyId,
        label: f.label,
        type: f.notionPropertyType,
      }));
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Form Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!form) return null;

  const { permissions = {}, listConfig, displayTitles = {} } = form.config;
  const { allowCreate = true, allowEdit = false, allowList = false } = permissions;
  const { listTitle, createTitle, editTitle } = displayTitles;

  // Success state for create-only forms
  if (submitted && !allowList) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-8 text-center transition-colors">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Thank you!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Your response has been submitted successfully.</p>
            <button
              onClick={() => setSubmitted(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit another response
            </button>
          </div>
        </div>
      </main>
    );
  }

  // List view mode
  if (allowList) {
    const columns = getListColumns();

    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 md:px-8 transition-colors">
        <div className="w-full">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{listTitle || form.name}</h1>
              {form.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">{form.description}</p>
              )}
            </div>
            <ThemeToggle />
          </div>

          {/* List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 overflow-hidden transition-colors">
            <ListRenderer
              key={listKey}
              databaseId={form.databaseId}
              columns={columns}
              filters={listConfig?.filters || []}
              pageSize={listConfig?.pageSize || 20}
              defaultSort={listConfig?.defaultSort}
              allowEdit={allowEdit}
              allowCreate={allowCreate}
              onEditClick={openEdit}
              onCreateClick={openCreate}
            />
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
            Powered by Notion Form Builder
          </p>
        </div>

        {/* Create Slide-over */}
        <SlideOver
          isOpen={slideOverMode === 'create'}
          onClose={closeSlideOver}
          title={createTitle || 'Create New Record'}
        >
          {slideOverMode === 'create' && (
            <FormRenderer
              key={`create-${listKey}`}
              name=""
              fields={form.config.fields.filter(f => f.visible !== false)}
              onSubmit={handleCreate}
              submitLabel="Create"
              currentUser={currentUser || undefined}
            />
          )}
        </SlideOver>

        {/* Edit Slide-over */}
        <SlideOver
          isOpen={slideOverMode === 'edit'}
          onClose={closeSlideOver}
          title={editTitle || 'Edit Record'}
        >
          {loadingRecord ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : editingRecord ? (
            <>
              <FormRenderer
                name=""
                fields={form.config.fields.filter(f => f.visible !== false)}
                onSubmit={handleEdit}
                submitLabel="Save Changes"
                currentUser={currentUser || undefined}
                initialData={getEditInitialData()}
              />
              <CommentsPanel pageId={editingRecord.id} />
            </>
          ) : null}
        </SlideOver>
      </main>
    );
  }

  // Create-only mode (no list)
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 transition-colors">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 md:p-8 transition-colors">
          <FormRenderer
            name={createTitle || form.name}
            description={form.description || undefined}
            fields={form.config.fields}
            onSubmit={handleCreate}
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
