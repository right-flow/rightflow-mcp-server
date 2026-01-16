/**
 * Form Viewer Page (Phase 1)
 * Public page for viewing and submitting published forms
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { FormRecord } from '../services/forms/forms.service';

export function FormViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<FormRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (slug) {
      loadForm();
    }
  }, [slug]);

  async function loadForm() {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Load basic form info
      const response = await fetch(`/api/forms?slug=${slug}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Form not found');
        } else {
          setError('Failed to load form');
        }
        return;
      }

      const data = await response.json();
      const loadedForm = data.form;

      if (loadedForm.status !== 'published') {
        setError('This form is not published');
        return;
      }

      // Step 2: Load current published version
      try {
        const versionResponse = await fetch(`/api/form-versions?formId=${loadedForm.id}`);

        if (versionResponse.ok) {
          const versionData = await versionResponse.json();
          const versions = versionData.versions || [];

          // Find the current version
          const currentVersion = versions.find((v: any) => v.is_current);

          if (currentVersion) {
            // Use fields from the current version
            loadedForm.fields = currentVersion.fields;
            console.log('✓ Loaded current version:', currentVersion.version_number);
          } else {
            console.warn('No current version found, using form fields');
          }
        } else {
          // If version API fails, fall back to form fields
          console.warn('Failed to load versions, using form fields');
        }
      } catch (versionError) {
        // If version loading fails, continue with form fields
        console.warn('Error loading version:', versionError);
      }

      setForm(loadedForm);

      // Initialize form data with default values
      const initialData: Record<string, any> = {};
      loadedForm.fields.forEach((field: any) => {
        if (field.type === 'checkbox') {
          initialData[field.id] = false;
        } else {
          initialData[field.id] = '';
        }
      });
      setFormData(initialData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load form');
    } finally {
      setIsLoading(false);
    }
  }

  function handleFieldChange(fieldId: string, value: any) {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form) return;

    // Validate required fields
    const missingFields = form.fields
      .filter((field: any) => field.required && !formData[field.id])
      .map((field: any) => field.label || field.name);

    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: form.id,
          data: formData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      setSubmitSuccess(true);
      setFormData({});
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{error}</h1>
          <a href="/" className="text-blue-600 hover:underline">
            Go back home
          </a>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Thank you!
          </h2>
          <p className="text-gray-600 mb-6">
            Your response has been submitted successfully.
          </p>
          <button
            onClick={() => {
              setSubmitSuccess(false);
              setFormData({});
            }}
            className="text-blue-600 hover:underline"
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Form Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-600">
              {form.description}
            </p>
          )}
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
          <div className="space-y-6">
            {form.fields.map((field: any) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label || field.name}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {/* Text Input */}
                {field.type === 'text' && (
                  <input
                    type="text"
                    value={formData[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={field.required}
                    dir={field.direction || 'ltr'}
                  />
                )}

                {/* Checkbox */}
                {field.type === 'checkbox' && (
                  <input
                    type="checkbox"
                    checked={formData[field.id] || false}
                    onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                )}

                {/* Other field types can be added here */}
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          Powered by <a href="/" className="text-blue-600 hover:underline">RightFlow</a>
        </div>
      </div>
    </div>
  );
}
