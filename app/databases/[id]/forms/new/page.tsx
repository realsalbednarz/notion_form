'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FieldConfig } from '@/types/form';

interface Property {
  id: string;
  name: string;
  type: string;
  options?: { id: string; name: string; color: string }[];
}

interface Database {
  id: string;
  title: string;
  url: string;
  properties: Property[];
}

interface FieldConfigState extends FieldConfig {
  enabled: boolean;
  originalName: string;
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

// Read-only property types that can't be edited in forms
const READ_ONLY_TYPES = ['formula', 'rollup', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by', 'unique_id'];

export default function NewFormPage() {
  const params = useParams();
  const router = useRouter();
  const [database, setDatabase] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState<FieldConfigState[]>([]);
  const [expandedField, setExpandedField] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDatabase() {
      try {
        const response = await fetch(`/api/notion/databases/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch database');
        }

        setDatabase(data);
        setFormName(`${data.title} Form`);

        // Initialize field configs from database properties
        const initialFields: FieldConfigState[] = data.properties.map((prop: Property) => ({
          enabled: prop.type === 'title', // Enable title by default
          originalName: prop.name,
          notionPropertyId: prop.id,
          notionPropertyType: prop.type,
          label: prop.name,
          placeholder: '',
          helpText: '',
          required: prop.type === 'title',
          editable: !READ_ONLY_TYPES.includes(prop.type),
          visible: true,
        }));

        setFields(initialFields);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchDatabase();
    }
  }, [params.id]);

  const toggleField = (propertyId: string) => {
    setFields(fields.map(f =>
      f.notionPropertyId === propertyId ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const updateField = (propertyId: string, updates: Partial<FieldConfigState>) => {
    setFields(fields.map(f =>
      f.notionPropertyId === propertyId ? { ...f, ...updates } : f
    ));
  };

  const enabledFields = fields.filter(f => f.enabled);

  const handleSave = () => {
    const config = {
      name: formName,
      description: formDescription,
      databaseId: params.id,
      fields: enabledFields.map(({ enabled, originalName, ...field }) => field),
    };

    // For now, just log the config - we'll save to DB later
    console.log('Form config:', config);
    alert('Form configuration saved! (Check console for details)\n\nNote: Database persistence coming in a future update.');
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-6">
          <Link
            href={`/databases/${params.id}`}
            className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
          >
            &larr; Back to Database
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

        {!loading && !error && database && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Configuration */}
            <div>
              <div className="bg-white rounded-lg border p-6 mb-6">
                <h1 className="text-2xl font-bold mb-6">Create Form</h1>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Form Name
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Fields ({enabledFields.length} selected)
                </h2>

                <div className="space-y-2">
                  {fields.map((field) => (
                    <div
                      key={field.notionPropertyId}
                      className={`border rounded-lg transition-all ${
                        field.enabled ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer"
                        onClick={() => toggleField(field.notionPropertyId)}
                      >
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={() => {}}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="font-medium flex-1">{field.originalName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            TYPE_BADGES[field.notionPropertyType] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {field.notionPropertyType}
                        </span>
                        {field.enabled && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedField(
                                expandedField === field.notionPropertyId ? null : field.notionPropertyId
                              );
                            }}
                            className="text-gray-400 hover:text-gray-600 px-2"
                          >
                            {expandedField === field.notionPropertyId ? '▼' : '▶'}
                          </button>
                        )}
                      </div>

                      {field.enabled && expandedField === field.notionPropertyId && (
                        <div className="px-3 pb-3 pt-1 border-t bg-white space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Label
                            </label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => updateField(field.notionPropertyId, { label: e.target.value })}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Placeholder
                            </label>
                            <input
                              type="text"
                              value={field.placeholder || ''}
                              onChange={(e) => updateField(field.notionPropertyId, { placeholder: e.target.value })}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Help Text
                            </label>
                            <input
                              type="text"
                              value={field.helpText || ''}
                              onChange={(e) => updateField(field.notionPropertyId, { helpText: e.target.value })}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateField(field.notionPropertyId, { required: e.target.checked })}
                                className="h-4 w-4 text-blue-600 rounded"
                              />
                              Required
                            </label>

                            {!READ_ONLY_TYPES.includes(field.notionPropertyType) && (
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={field.visible}
                                  onChange={(e) => updateField(field.notionPropertyId, { visible: e.target.checked })}
                                  className="h-4 w-4 text-blue-600 rounded"
                                />
                                Visible
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div>
              <div className="bg-white rounded-lg border p-6 sticky top-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Preview</h2>
                  <button
                    onClick={handleSave}
                    disabled={enabledFields.length === 0 || !formName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Form
                  </button>
                </div>

                {enabledFields.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Select fields to see preview
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-b pb-4 mb-4">
                      <h3 className="text-xl font-bold">{formName || 'Untitled Form'}</h3>
                      {formDescription && (
                        <p className="text-gray-600 text-sm mt-1">{formDescription}</p>
                      )}
                    </div>

                    {enabledFields.filter(f => f.visible).map((field) => (
                      <div key={field.notionPropertyId}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>

                        {field.notionPropertyType === 'checkbox' ? (
                          <input
                            type="checkbox"
                            disabled
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                        ) : field.notionPropertyType === 'rich_text' || field.notionPropertyType === 'title' ? (
                          <input
                            type="text"
                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                            disabled
                            className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                          />
                        ) : field.notionPropertyType === 'number' ? (
                          <input
                            type="number"
                            placeholder={field.placeholder || '0'}
                            disabled
                            className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                          />
                        ) : field.notionPropertyType === 'select' || field.notionPropertyType === 'status' ? (
                          <select disabled className="w-full px-3 py-2 border rounded-lg bg-gray-50">
                            <option>{field.placeholder || `Select ${field.label.toLowerCase()}`}</option>
                          </select>
                        ) : field.notionPropertyType === 'multi_select' ? (
                          <div className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-400">
                            {field.placeholder || 'Select multiple options...'}
                          </div>
                        ) : field.notionPropertyType === 'date' ? (
                          <input
                            type="date"
                            disabled
                            className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                          />
                        ) : field.notionPropertyType === 'url' ? (
                          <input
                            type="url"
                            placeholder={field.placeholder || 'https://'}
                            disabled
                            className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                          />
                        ) : field.notionPropertyType === 'email' ? (
                          <input
                            type="email"
                            placeholder={field.placeholder || 'email@example.com'}
                            disabled
                            className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                          />
                        ) : field.notionPropertyType === 'phone_number' ? (
                          <input
                            type="tel"
                            placeholder={field.placeholder || '+1 (555) 000-0000'}
                            disabled
                            className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                          />
                        ) : (
                          <input
                            type="text"
                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                            disabled
                            className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                          />
                        )}

                        {field.helpText && (
                          <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                        )}
                      </div>
                    ))}

                    <button
                      disabled
                      className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg opacity-50 cursor-not-allowed"
                    >
                      Submit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
