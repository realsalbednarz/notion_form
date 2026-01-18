'use client';

import { useState, useEffect } from 'react';
import { FieldConfig, DefaultValue } from '@/types/form';

interface NotionUser {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

interface FormRendererProps {
  name: string;
  description?: string;
  fields: FieldConfig[];
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  submitLabel?: string;
  disabled?: boolean;
  currentUser?: { id: string; email: string; name?: string };
  initialData?: Record<string, any>;  // For edit mode - pre-populate with existing values
}

interface FieldOption {
  id: string;
  name: string;
  color: string;
}

interface FieldWithOptions extends FieldConfig {
  options?: FieldOption[];
}

// Helper to compute default value
function computeDefaultValue(
  defaultValue: DefaultValue | undefined,
  currentUser?: { id: string; email: string; name?: string }
): any {
  if (!defaultValue) return undefined;

  if (defaultValue.type === 'static') {
    return defaultValue.value;
  }

  if (defaultValue.type === 'function') {
    switch (defaultValue.name) {
      case 'today':
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      case 'now':
        return new Date().toISOString();
      case 'current_user':
        return currentUser?.id || '';
      default:
        return undefined;
    }
  }

  return undefined;
}

// Helper to compute all default values for fields
function computeAllDefaults(
  fields: FieldConfig[],
  currentUser?: { id: string; email: string; name?: string }
): Record<string, any> {
  const defaults: Record<string, any> = {};
  fields.forEach(field => {
    const defaultVal = computeDefaultValue(field.defaultValue, currentUser);
    if (defaultVal !== undefined) {
      defaults[field.notionPropertyId] = defaultVal;
    }
  });
  return defaults;
}

export default function FormRenderer({
  name,
  description,
  fields,
  onSubmit,
  submitLabel = 'Submit',
  disabled = false,
  currentUser,
  initialData,
}: FormRendererProps) {
  // Initialize form data with initialData (edit mode) or defaults (create mode)
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const defaults = computeAllDefaults(fields, currentUser);
    // initialData takes precedence over defaults
    return initialData ? { ...defaults, ...initialData } : defaults;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [workspaceUsers, setWorkspaceUsers] = useState<NotionUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Fetch workspace users if there are people fields
  useEffect(() => {
    const hasPeopleField = fields.some(f => f.notionPropertyType === 'people');
    if (hasPeopleField) {
      setUsersLoading(true);
      fetch('/api/notion/users')
        .then(res => res.json())
        .then(data => {
          if (data.users) {
            setWorkspaceUsers(data.users);
          }
        })
        .catch(err => console.error('Failed to fetch users:', err))
        .finally(() => setUsersLoading(false));
    }
  }, [fields]);

  // Re-compute defaults if currentUser changes (e.g., loaded async)
  useEffect(() => {
    const defaults = computeAllDefaults(fields, currentUser);
    if (Object.keys(defaults).length > 0) {
      setFormData(prev => ({ ...defaults, ...prev }));
    }
  }, [fields, currentUser]);

  // Reset form data when initialData changes (edit mode switching between records)
  useEffect(() => {
    if (initialData) {
      const defaults = computeAllDefaults(fields, currentUser);
      setFormData({ ...defaults, ...initialData });
      setErrors({});
    }
  }, [initialData, fields, currentUser]);

  const visibleFields = fields.filter(f => f.visible !== false);

  const updateField = (propertyId: string, value: any) => {
    setFormData({ ...formData, [propertyId]: value });
    // Clear error when field is updated
    if (errors[propertyId]) {
      setErrors({ ...errors, [propertyId]: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    visibleFields.forEach(field => {
      const value = formData[field.notionPropertyId];

      if (field.required) {
        if (value === undefined || value === null || value === '') {
          newErrors[field.notionPropertyId] = `${field.label} is required`;
        }
      }

      // Type-specific validation
      if (value && field.validation) {
        if (field.notionPropertyType === 'number') {
          const numValue = Number(value);
          if (field.validation.min !== undefined && numValue < field.validation.min) {
            newErrors[field.notionPropertyId] = `Minimum value is ${field.validation.min}`;
          }
          if (field.validation.max !== undefined && numValue > field.validation.max) {
            newErrors[field.notionPropertyId] = `Maximum value is ${field.validation.max}`;
          }
        }

        if (field.validation.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(String(value))) {
            newErrors[field.notionPropertyId] = field.validation.message || 'Invalid format';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FieldWithOptions) => {
    const value = formData[field.notionPropertyId] ?? '';
    const error = errors[field.notionPropertyId];
    const isDisabled = disabled || submitting || field.editable === false;

    const inputClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      error ? 'border-red-300' : 'border-gray-300'
    } ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`;

    switch (field.notionPropertyType) {
      case 'title':
      case 'rich_text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateField(field.notionPropertyId, e.target.value)}
            placeholder={field.placeholder}
            disabled={isDisabled}
            className={inputClasses}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateField(field.notionPropertyId, e.target.value)}
            placeholder={field.placeholder || '0'}
            disabled={isDisabled}
            className={inputClasses}
          />
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => updateField(field.notionPropertyId, e.target.checked)}
            disabled={isDisabled}
            className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
          />
        );

      case 'select':
      case 'status':
        return (
          <select
            value={value}
            onChange={(e) => updateField(field.notionPropertyId, e.target.value)}
            disabled={isDisabled}
            className={inputClasses}
          >
            <option value="">{field.placeholder || `Select ${field.label.toLowerCase()}`}</option>
            {field.options?.map((opt) => (
              <option key={opt.id} value={opt.name}>
                {opt.name}
              </option>
            ))}
          </select>
        );

      case 'multi_select':
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(value || []).includes(opt.name)}
                  onChange={(e) => {
                    const current = value || [];
                    if (e.target.checked) {
                      updateField(field.notionPropertyId, [...current, opt.name]);
                    } else {
                      updateField(field.notionPropertyId, current.filter((v: string) => v !== opt.name));
                    }
                  }}
                  disabled={isDisabled}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm">{opt.name}</span>
              </label>
            ))}
            {(!field.options || field.options.length === 0) && (
              <input
                type="text"
                value={Array.isArray(value) ? value.join(', ') : value}
                onChange={(e) => updateField(field.notionPropertyId, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder={field.placeholder || 'Enter values separated by commas'}
                disabled={isDisabled}
                className={inputClasses}
              />
            )}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => updateField(field.notionPropertyId, e.target.value)}
            disabled={isDisabled}
            className={inputClasses}
          />
        );

      case 'url':
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => updateField(field.notionPropertyId, e.target.value)}
            placeholder={field.placeholder || 'https://'}
            disabled={isDisabled}
            className={inputClasses}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => updateField(field.notionPropertyId, e.target.value)}
            placeholder={field.placeholder || 'email@example.com'}
            disabled={isDisabled}
            className={inputClasses}
          />
        );

      case 'phone_number':
        return (
          <input
            type="tel"
            value={value}
            onChange={(e) => updateField(field.notionPropertyId, e.target.value)}
            placeholder={field.placeholder || '+1 (555) 000-0000'}
            disabled={isDisabled}
            className={inputClasses}
          />
        );

      case 'people':
        return (
          <div className="relative">
            <select
              value={value}
              onChange={(e) => updateField(field.notionPropertyId, e.target.value)}
              disabled={isDisabled || usersLoading}
              className={inputClasses}
            >
              <option value="">{field.placeholder || 'Select a person'}</option>
              {workspaceUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}{user.email ? ` (${user.email})` : ''}
                </option>
              ))}
            </select>
            {usersLoading && (
              <span className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                Loading...
              </span>
            )}
          </div>
        );

      case 'files':
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => updateField(field.notionPropertyId, e.target.value)}
            placeholder={field.placeholder || 'Enter file URL'}
            disabled={isDisabled}
            className={inputClasses}
          />
        );

      // Read-only types
      case 'formula':
      case 'rollup':
      case 'created_time':
      case 'created_by':
      case 'last_edited_time':
      case 'last_edited_by':
      case 'unique_id':
        return (
          <input
            type="text"
            value={value || '(auto-generated)'}
            disabled
            className={`${inputClasses} bg-gray-100 text-gray-500`}
          />
        );

      case 'relation':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateField(field.notionPropertyId, e.target.value)}
            placeholder={field.placeholder || 'Enter related page ID'}
            disabled={isDisabled}
            className={inputClasses}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateField(field.notionPropertyId, e.target.value)}
            placeholder={field.placeholder}
            disabled={isDisabled}
            className={inputClasses}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">{name}</h1>
        {description && (
          <p className="text-gray-600 mt-1">{description}</p>
        )}
      </div>

      <div className="space-y-4">
        {visibleFields.map((field) => (
          <div key={field.notionPropertyId}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {renderField(field as FieldWithOptions)}

            {field.helpText && (
              <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
            )}

            {errors[field.notionPropertyId] && (
              <p className="text-xs text-red-500 mt-1">{errors[field.notionPropertyId]}</p>
            )}
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={disabled || submitting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : submitLabel}
      </button>
    </form>
  );
}
