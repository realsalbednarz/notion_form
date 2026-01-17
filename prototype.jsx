import React, { useState } from 'react';
import { Plus, Trash2, Settings, Eye, Edit, Database, Grid, ChevronDown, Check } from 'lucide-react';

// Mock data for demonstration
const mockDatabases = [
  { id: 'db1', name: 'Customer Requests', icon: '📋' },
  { id: 'db2', name: 'Project Tracker', icon: '📊' },
  { id: 'db3', name: 'Team Directory', icon: '👥' },
];

const mockProperties = {
  db1: [
    { id: 'prop1', name: 'Name', type: 'title' },
    { id: 'prop2', name: 'Email', type: 'email' },
    { id: 'prop3', name: 'Request Type', type: 'select' },
    { id: 'prop4', name: 'Priority', type: 'select' },
    { id: 'prop5', name: 'Status', type: 'select' },
    { id: 'prop6', name: 'Description', type: 'rich_text' },
    { id: 'prop7', name: 'Assigned To', type: 'people' },
    { id: 'prop8', name: 'Due Date', type: 'date' },
  ],
};

export default function NotionFormBuilder() {
  const [step, setStep] = useState('database'); // database, fields, configure, preview
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [formName, setFormName] = useState('');
  const [formMode, setFormMode] = useState('create');
  const [selectedFields, setSelectedFields] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState({});

  const properties = selectedDatabase ? mockProperties[selectedDatabase.id] || [] : [];

  const toggleField = (field) => {
    if (selectedFields.find(f => f.id === field.id)) {
      setSelectedFields(selectedFields.filter(f => f.id !== field.id));
    } else {
      setSelectedFields([...selectedFields, field]);
      setFieldConfigs({
        ...fieldConfigs,
        [field.id]: {
          label: field.name,
          required: false,
          editable: true,
          visible: true,
        }
      });
    }
  };

  const updateFieldConfig = (fieldId, key, value) => {
    setFieldConfigs({
      ...fieldConfigs,
      [fieldId]: {
        ...fieldConfigs[fieldId],
        [key]: value,
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Notion Form Builder</h1>
                <p className="text-sm text-slate-500">Create custom forms for your Notion databases</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all shadow-sm hover:shadow-md">
                Save Form
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-12">
          {['Database', 'Fields', 'Configure', 'Preview'].map((stepName, idx) => (
            <React.Fragment key={stepName}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step === stepName.toLowerCase() 
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg scale-110' 
                    : 'bg-white text-slate-400 border-2 border-slate-200'
                }`}>
                  {idx + 1}
                </div>
                <span className={`font-medium ${
                  step === stepName.toLowerCase() ? 'text-slate-900' : 'text-slate-400'
                }`}>
                  {stepName}
                </span>
              </div>
              {idx < 3 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  idx < ['database', 'fields', 'configure', 'preview'].indexOf(step) 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600' 
                    : 'bg-slate-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step: Database Selection */}
        {step === 'database' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Select a Notion Database</h2>
              <p className="text-slate-600 mb-8">Choose the database you want to create a form for</p>
              
              <div className="space-y-3 mb-8">
                {mockDatabases.map((db) => (
                  <button
                    key={db.id}
                    onClick={() => setSelectedDatabase(db)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                      selectedDatabase?.id === db.id
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="text-3xl">{db.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{db.name}</div>
                      <div className="text-sm text-slate-500">Notion Database</div>
                    </div>
                    {selectedDatabase?.id === db.id && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Form Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Customer Request Form"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Form Mode</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['create', 'edit', 'view'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setFormMode(mode)}
                        className={`p-3 rounded-xl border-2 transition-all capitalize ${
                          formMode === mode
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {mode === 'create' && <Plus className="w-4 h-4 inline mr-1" />}
                        {mode === 'edit' && <Edit className="w-4 h-4 inline mr-1" />}
                        {mode === 'view' && <Eye className="w-4 h-4 inline mr-1" />}
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('fields')}
                disabled={!selectedDatabase || !formName}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                Continue to Fields
              </button>
            </div>
          </div>
        )}

        {/* Step: Field Selection */}
        {step === 'fields' && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Fields</h2>
              <p className="text-slate-600 mb-8">Choose which properties to include in your form</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {properties.map((prop) => {
                  const isSelected = selectedFields.find(f => f.id === prop.id);
                  return (
                    <button
                      key={prop.id}
                      onClick={() => toggleField(prop)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">{prop.name}</span>
                        {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                      </div>
                      <span className="text-sm text-slate-500 capitalize">{prop.type.replace('_', ' ')}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('database')}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:border-slate-400 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('configure')}
                  disabled={selectedFields.length === 0}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  Continue to Configure ({selectedFields.length} fields)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Field Configuration */}
        {step === 'configure' && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Configure Fields</h2>
              <p className="text-slate-600 mb-8">Customize labels, validation, and behavior for each field</p>
              
              <div className="space-y-4 mb-8">
                {selectedFields.map((field) => (
                  <div key={field.id} className="p-6 border-2 border-slate-200 rounded-xl hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-lg">{field.name}</h3>
                        <p className="text-sm text-slate-500 capitalize">{field.type.replace('_', ' ')}</p>
                      </div>
                      <button className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Label</label>
                        <input
                          type="text"
                          value={fieldConfigs[field.id]?.label || ''}
                          onChange={(e) => updateFieldConfig(field.id, 'label', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Placeholder</label>
                        <input
                          type="text"
                          value={fieldConfigs[field.id]?.placeholder || ''}
                          onChange={(e) => updateFieldConfig(field.id, 'placeholder', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      
                      <div className="col-span-2 flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fieldConfigs[field.id]?.required || false}
                            onChange={(e) => updateFieldConfig(field.id, 'required', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-600"
                          />
                          <span className="text-sm font-medium text-slate-700">Required</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fieldConfigs[field.id]?.editable !== false}
                            onChange={(e) => updateFieldConfig(field.id, 'editable', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-600"
                          />
                          <span className="text-sm font-medium text-slate-700">Editable</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fieldConfigs[field.id]?.visible !== false}
                            onChange={(e) => updateFieldConfig(field.id, 'visible', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-600"
                          />
                          <span className="text-sm font-medium text-slate-700">Visible</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('fields')}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:border-slate-400 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('preview')}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                  Preview Form
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">{formName}</h2>
                  <p className="text-slate-600">Preview of your form</p>
                </div>
                <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium capitalize">
                  {formMode} Mode
                </div>
              </div>
              
              <form className="space-y-6">
                {selectedFields.filter(f => fieldConfigs[f.id]?.visible !== false).map((field) => {
                  const config = fieldConfigs[field.id];
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {config?.label || field.name}
                        {config?.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.type === 'rich_text' || field.type === 'title' ? (
                        <textarea
                          placeholder={config?.placeholder}
                          disabled={formMode === 'view' || !config?.editable}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-500"
                          rows={3}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          disabled={formMode === 'view' || !config?.editable}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-500"
                        >
                          <option value="">Select an option...</option>
                          <option value="option1">Option 1</option>
                          <option value="option2">Option 2</option>
                        </select>
                      ) : field.type === 'date' ? (
                        <input
                          type="date"
                          disabled={formMode === 'view' || !config?.editable}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      ) : (
                        <input
                          type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
                          placeholder={config?.placeholder}
                          disabled={formMode === 'view' || !config?.editable}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      )}
                    </div>
                  );
                })}
              </form>

              <div className="mt-8 pt-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setStep('configure')}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:border-slate-400 transition-all"
                >
                  Back to Configure
                </button>
                {formMode !== 'view' && (
                  <button className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg">
                    {formMode === 'create' ? 'Create Entry' : 'Update Entry'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
