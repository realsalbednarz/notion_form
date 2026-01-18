'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
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

interface FormConfigData {
  id: string;
  name: string;
  description: string | null;
  databaseId: string;
  mode: string;
  config: {
    fields: FieldConfig[];
  };
}

interface FieldConfigState extends FieldConfig {
  enabled: boolean;
  originalName: string;
  options?: { id: string; name: string; color: string }[];
  defaultValueType?: 'none' | 'static' | 'current_user' | 'current_date' | 'current_time';
  defaultValueStatic?: string;
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

const READ_ONLY_TYPES = ['formula', 'rollup', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by', 'unique_id'];

export default function EditFormPage() {
  const params = useParams();
  const router = useRouter();
  const [database, setDatabase] = useState<Database | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState<FieldConfigState[]>([]);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // First fetch the form config
        const formResponse = await fetch(`/api/forms/${params.id}`);
        const formData = await formResponse.json();

        if (!formResponse.ok) {
          if (formResponse.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error(formData.error || 'Failed to fetch form');
        }

        setFormConfig(formData.form);
        setFormName(formData.form.name);
        setFormDescription(formData.form.description || '');

        // Then fetch the database schema
        const dbResponse = await fetch(`/api/notion/databases/${formData.form.databaseId}`);
        const dbData = await dbResponse.json();

        if (!dbResponse.ok) {
          throw new Error(dbData.error || 'Failed to fetch database');
        }

        setDatabase(dbData);

        // Merge database properties with saved form config
        const savedFieldIds = new Set(formData.form.config.fields.map((f: FieldConfig) => f.notionPropertyId));
        const savedFieldMap = new Map(formData.form.config.fields.map((f: FieldConfig) => [f.notionPropertyId, f]));

        const initialFields: FieldConfigState[] = dbData.properties.map((prop: Property) => {
          const savedField = savedFieldMap.get(prop.id);
          if (savedField) {
            return {
              ...savedField,
              enabled: true,
              originalName: prop.name,
              options: prop.options,
            };
          }
          return {
            enabled: false,
            originalName: prop.name,
            notionPropertyId: prop.id,
            notionPropertyType: prop.type,
            label: prop.name,
            placeholder: '',
            helpText: '',
            required: false,
            editable: !READ_ONLY_TYPES.includes(prop.type),
            visible: true,
            options: prop.options,
          };
        });

        setFields(initialFields);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchData();
    }
  }, [params.id, router]);

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

  const moveFieldUp = (propertyId: string) => {
    const index = fields.findIndex(f => f.notionPropertyId === propertyId);
    if (index <= 0) return;
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    setFields(newFields);
  };

  const moveFieldDown = (propertyId: string) => {
    const index = fields.findIndex(f => f.notionPropertyId === propertyId);
    if (index < 0 || index >= fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    setFields(newFields);
  };

  const enabledFields = fields.filter(f => f.enabled);

  const getFormConfig = () => ({
    name: formName,
    description: formDescription,
    databaseId: formConfig?.databaseId,
    fields: enabledFields.map(({ enabled, originalName, defaultValueType, defaultValueStatic, options, ...field }) => {
      // Convert defaultValue to the expected format
      let defaultValue = undefined;
      if (defaultValueType === 'static' && defaultValueStatic) {
        defaultValue = { type: 'static' as const, value: defaultValueStatic };
      } else if (defaultValueType === 'current_user') {
        defaultValue = { type: 'function' as const, name: 'current_user' as const };
      } else if (defaultValueType === 'current_date') {
        defaultValue = { type: 'function' as const, name: 'today' as const };
      } else if (defaultValueType === 'current_time') {
        defaultValue = { type: 'function' as const, name: 'now' as const };
      }
      return { ...field, defaultValue, options };
    }),
  });

  const handleSave = async () => {
    const updatedConfig = getFormConfig();
    setSaving(true);

    try {
      const response = await fetch(`/api/forms/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedConfig.name,
          description: updatedConfig.description,
          config: {
            databaseId: updatedConfig.databaseId,
            fields: updatedConfig.fields,
            filters: [],
            sorts: [],
            pageSize: 20,
            layout: { showTitle: true },
            permissions: { allowCreate: true, allowEdit: false, allowDelete: false },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save form');
      }

      router.push('/forms');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    const config = getFormConfig();
    sessionStorage.setItem('formPreview', JSON.stringify(config));
    window.open('/forms/preview', '_blank');
  };

  const [showSchema, setShowSchema] = useState(false);

  return (
    <main className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/forms"
            className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
          >
            &larr; Back to Forms
          </Link>
          {database && (
            <button
              onClick={() => setShowSchema(!showSchema)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              {showSchema ? 'Hide' : 'View'} Schema
              <span className="text-xs">{showSchema ? '▲' : '▼'}</span>
            </button>
          )}
        </div>

        {/* Collapsible Schema View */}
        {showSchema && database && (
          <div className="mb-6 bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Database Schema: {database.title}</h3>
              <a
                href={database.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Open in Notion
              </a>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              {database.properties.length} properties
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {database.properties.map((prop) => (
                <div key={prop.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      TYPE_BADGES[prop.type] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {prop.type}
                  </span>
                  <span className="truncate">{prop.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                <h1 className="text-2xl font-bold mb-6">Edit Form</h1>

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
                        {field.enabled && (
                          <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => moveFieldUp(field.notionPropertyId)}
                              className="text-gray-400 hover:text-gray-600 p-0.5 hover:bg-gray-100 rounded"
                              title="Move up"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveFieldDown(field.notionPropertyId)}
                              className="text-gray-400 hover:text-gray-600 p-0.5 hover:bg-gray-100 rounded"
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                        )}
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

                          {/* Default Value Configuration */}
                          <div className="border-t pt-3 mt-3">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Default Value
                            </label>
                            <select
                              value={field.defaultValueType || 'none'}
                              onChange={(e) => updateField(field.notionPropertyId, {
                                defaultValueType: e.target.value as any,
                                defaultValueStatic: e.target.value === 'static' ? field.defaultValueStatic : undefined
                              })}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="none">No default</option>
                              <option value="static">Static value</option>
                              {field.notionPropertyType === 'people' && (
                                <option value="current_user">Current user</option>
                              )}
                              {field.notionPropertyType === 'date' && (
                                <>
                                  <option value="current_date">Current date</option>
                                  <option value="current_time">Current date & time</option>
                                </>
                              )}
                            </select>

                            {field.defaultValueType === 'static' && (
                              <input
                                type={field.notionPropertyType === 'number' ? 'number' : 'text'}
                                value={field.defaultValueStatic || ''}
                                onChange={(e) => updateField(field.notionPropertyId, { defaultValueStatic: e.target.value })}
                                placeholder="Enter default value"
                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 mt-2"
                              />
                            )}

                            {field.defaultValueType === 'current_user' && (
                              <p className="text-xs text-gray-500 mt-1">Will be set to the logged-in user</p>
                            )}
                            {field.defaultValueType === 'current_date' && (
                              <p className="text-xs text-gray-500 mt-1">Will be set to today's date</p>
                            )}
                            {field.defaultValueType === 'current_time' && (
                              <p className="text-xs text-gray-500 mt-1">Will be set to current date and time</p>
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
                  <div className="flex gap-2">
                    <button
                      onClick={handlePreview}
                      disabled={enabledFields.length === 0 || !formName.trim()}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Test Form
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={enabledFields.length === 0 || !formName.trim() || saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
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
