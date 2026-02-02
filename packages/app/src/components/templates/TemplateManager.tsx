/**
 * TemplateManager Component
 * Main component that integrates FormBuilder, TemplateGallery, and PDF functionality
 */

import React, { useState, useCallback } from 'react';
import FormBuilder from '../forms/FormBuilder';
import FormPreview from '../forms/FormPreview';
import TemplateGallery from './TemplateGallery';
import { FormDefinition } from '../forms/FormBuilder';
import { templateService, FormTemplate } from '../../services/templateService';
import { pdfFieldMapper, PDFFieldInfo, FieldMapping } from '../../services/pdfFieldMapper';

interface TemplateManagerProps {
  onExportPDF?: (data: any) => void;
}

type ViewMode = 'gallery' | 'builder' | 'preview' | 'mapping';

const TemplateManager: React.FC<TemplateManagerProps> = ({ onExportPDF }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [currentForm, setCurrentForm] = useState<FormDefinition | null>(null);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [pdfFields, setPdfFields] = useState<PDFFieldInfo[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateTags, setTemplateTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Handle template selection from gallery
  const handleSelectTemplate = useCallback((template: FormTemplate) => {
    setCurrentForm(template);
    setCurrentTemplateId(template.id);
    setViewMode('builder');
  }, []);

  // Handle creating new template
  const handleCreateNew = useCallback(() => {
    setCurrentForm({
      name: 'New Form',
      description: '',
      fields: [],
      submitButtonText: 'Submit',
      successMessage: 'Thank you for your submission!',
    });
    setCurrentTemplateId(null);
    setViewMode('builder');
  }, []);

  // Handle form changes in builder
  const handleFormChange = useCallback((updatedForm: FormDefinition) => {
    setCurrentForm(updatedForm);
  }, []);

  // Handle saving form as template
  const handleSaveForm = useCallback((form: FormDefinition) => {
    setCurrentForm(form);
    setShowSaveDialog(true);
  }, []);

  // Save template to storage
  const saveTemplate = useCallback(() => {
    if (!currentForm || !templateName) return;

    setIsSaving(true);

    try {
      const tags = templateTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      if (currentTemplateId) {
        // Update existing template
        templateService.updateTemplate(currentTemplateId, {
          ...currentForm,
          name: templateName,
          category: templateCategory,
          tags,
        });
      } else {
        // Save as new template
        const newTemplate = templateService.saveTemplate({
          ...currentForm,
          name: templateName,
          category: templateCategory,
          tags,
        });
        setCurrentTemplateId(newTemplate.id);
      }

      setShowSaveDialog(false);
      setTemplateName('');
      setTemplateCategory('');
      setTemplateTags('');
      alert('Template saved successfully!');
    } catch (error) {
      alert(`Error saving template: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  }, [currentForm, currentTemplateId, templateName, templateCategory, templateTags]);

  // Handle PDF file upload
  const handlePDFUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const fields = await pdfFieldMapper.extractPDFFields(arrayBuffer);
      setPdfFields(fields);

      // Auto-generate form if no current form
      if (!currentForm || currentForm.fields.length === 0) {
        const generatedForm = pdfFieldMapper.createFormFromPDF(fields);
        setCurrentForm(generatedForm);
      }

      // Auto-map fields if form exists
      if (currentForm && currentForm.fields.length > 0) {
        const mappings = pdfFieldMapper.autoMapFields(currentForm.fields, fields);
        setFieldMappings(mappings);
        setViewMode('mapping');
      }
    } catch (error) {
      alert(`Error processing PDF: ${(error as Error).message}`);
    }
  }, [currentForm]);

  // Handle form submission
  const handleFormSubmit = useCallback((data: Record<string, any>) => {
    setFormData(data);

    // If we have PDF field mappings, fill the PDF
    if (fieldMappings.length > 0 && onExportPDF) {
      onExportPDF({
        formData: data,
        mappings: fieldMappings,
      });
    }

    alert('Form submitted successfully!');
  }, [fieldMappings, onExportPDF]);

  // Render navigation tabs
  const renderNavigation = () => (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8" aria-label="Tabs">
        <button
          onClick={() => setViewMode('gallery')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            viewMode === 'gallery'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Templates
        </button>
        {currentForm && (
          <>
            <button
              onClick={() => setViewMode('builder')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'builder'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Form Builder
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'preview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Preview
            </button>
            {pdfFields.length > 0 && (
              <button
                onClick={() => setViewMode('mapping')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  viewMode === 'mapping'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                PDF Mapping
              </button>
            )}
          </>
        )}
      </nav>
    </div>
  );

  // Render PDF mapping interface
  const renderPDFMapping = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">PDF Field Mapping</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload PDF to map fields
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={handlePDFUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {fieldMappings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Form Field
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PDF Field
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fieldMappings.map((mapping, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {mapping.formFieldName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mapping.pdfFieldName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Mapped
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pdfFields.length > 0 && fieldMappings.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No fields mapped yet. Build your form first to enable auto-mapping.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Form Template Manager</h1>
          <p className="mt-2 text-gray-600">Create, manage, and fill PDF forms with ease</p>
        </div>

        {/* Navigation */}
        {renderNavigation()}

        {/* Main Content */}
        <div className="mt-6">
          {viewMode === 'gallery' && (
            <TemplateGallery
              onSelectTemplate={handleSelectTemplate}
              onCreateNew={handleCreateNew}
              currentFormId={currentTemplateId || undefined}
            />
          )}

          {viewMode === 'builder' && currentForm && (
            <FormBuilder
              form={currentForm}
              onChange={handleFormChange}
              onSave={handleSaveForm}
            />
          )}

          {viewMode === 'preview' && currentForm && (
            <div className="bg-gray-100 p-6 rounded-lg">
              <FormPreview
                form={currentForm}
                onSubmit={handleFormSubmit}
                initialData={formData}
              />
            </div>
          )}

          {viewMode === 'mapping' && renderPDFMapping()}
        </div>

        {/* Save Template Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Save Template</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Enter template name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    placeholder="e.g., Registration, Survey, Application"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={templateTags}
                    onChange={(e) => setTemplateTags(e.target.value)}
                    placeholder="e.g., customer, feedback, required"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={!templateName || isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateManager;