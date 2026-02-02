/**
 * TemplateGallery Component
 * Browse, search, and manage form templates
 */

import React, { useState, useEffect, useRef } from 'react';
import { templateService, FormTemplate } from '../../services/templateService';
import { FormDefinition } from '../forms/FormBuilder';

interface TemplateGalleryProps {
  onSelectTemplate: (template: FormTemplate) => void;
  onCreateNew: () => void;
  currentFormId?: string;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  onSelectTemplate,
  onCreateNew,
  currentFormId,
}) => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ used: 0, limit: 0, percentage: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTemplates();
    loadMetadata();
    updateStorageInfo();
  }, []);

  useEffect(() => {
    const filtered = templateService.searchTemplates(searchQuery, selectedCategory, selectedTags);
    setTemplates(filtered);
  }, [searchQuery, selectedCategory, selectedTags]);

  const loadTemplates = () => {
    const allTemplates = templateService.getAllTemplates();
    setTemplates(allTemplates);
  };

  const loadMetadata = () => {
    setCategories(templateService.getCategories());
    setAllTags(templateService.getAllTags());
  };

  const updateStorageInfo = () => {
    setStorageInfo(templateService.getStorageInfo());
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this template?')) {
      templateService.deleteTemplate(id);
      loadTemplates();
      updateStorageInfo();
    }
  };

  const handleDuplicateTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicated = templateService.duplicateTemplate(id);
    if (duplicated) {
      loadTemplates();
      updateStorageInfo();
    }
  };

  const handleExportTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const template = templateService.getTemplate(id);
    const json = templateService.exportTemplate(id);

    if (json && template) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/[^a-z0-9]/gi, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportAll = () => {
    const json = templateService.exportAllTemplates();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rightflow_templates_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        templateService.importTemplates(json);
        loadTemplates();
        loadMetadata();
        updateStorageInfo();
        setShowImportDialog(false);
        alert('Templates imported successfully!');
      } catch (error) {
        alert(`Import failed: ${(error as Error).message}`);
      }
    };
    reader.readAsText(file);

    // Clear the input for next use
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectTemplate = (template: FormTemplate) => {
    templateService.trackUsage(template.id);
    onSelectTemplate(template);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Form Templates</h2>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              title={view === 'grid' ? 'List view' : 'Grid view'}
            >
              {view === 'grid' ? '☰' : '⊞'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Create New Template
          </button>

          <button
            onClick={() => setShowImportDialog(true)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Import Templates
          </button>

          {templates.length > 0 && (
            <button
              onClick={handleExportAll}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Export All
            </button>
          )}
        </div>
      </div>

      {/* Storage Info */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Storage Used</span>
          <span>{formatFileSize(storageInfo.used)} / {formatFileSize(storageInfo.limit)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              storageInfo.percentage > 80 ? 'bg-red-500' :
              storageInfo.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Templates Grid/List */}
      {templates.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600 mb-4">Create your first template to get started</p>
          <button
            onClick={onCreateNew}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className={
          view === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-2'
        }>
          {templates.map(template => (
            <div
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className={`
                border border-gray-200 rounded-lg p-4 hover:border-blue-400
                hover:shadow-md transition-all cursor-pointer
                ${currentFormId === template.id ? 'border-blue-500 bg-blue-50' : ''}
                ${view === 'list' ? 'flex items-center justify-between' : ''}
              `}
            >
              <div className={view === 'list' ? 'flex-1' : ''}>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {template.name}
                  {template.isDefault && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                </h3>
                {template.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {template.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs text-gray-500">
                    {template.fields.length} fields
                  </span>
                  {template.category && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {template.category}
                    </span>
                  )}
                  {template.usageCount && template.usageCount > 0 && (
                    <span className="text-xs text-gray-500">
                      Used {template.usageCount}x
                    </span>
                  )}
                </div>
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {template.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  Updated {formatDate(template.updatedAt)}
                </div>
              </div>

              <div className={`flex gap-1 ${view === 'list' ? '' : 'mt-3'}`}>
                <button
                  onClick={(e) => handleDuplicateTemplate(template.id, e)}
                  className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  title="Duplicate"
                >
                  📋
                </button>
                <button
                  onClick={(e) => handleExportTemplate(template.id, e)}
                  className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  title="Export"
                >
                  💾
                </button>
                {!template.isDefault && (
                  <button
                    onClick={(e) => handleDeleteTemplate(template.id, e)}
                    className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Import Templates</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select a JSON file containing exported templates
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="w-full mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateGallery;