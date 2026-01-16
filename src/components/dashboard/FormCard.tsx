/**
 * Form Card Component (Phase 1)
 * Displays form information in dashboard grid
 */

import { useState } from 'react';
import type { FormRecord } from '../../services/forms/forms.service';

interface FormCardProps {
  form: FormRecord;
  onDelete: () => void;
  onEdit: () => void;
  onViewResponses: () => void;
}

export function FormCard({ form, onDelete, onEdit, onViewResponses }: FormCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const formattedDate = new Date(form.created_at).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const statusBadge = {
    draft: { label: 'טיוטה', color: 'bg-gray-100 text-gray-700' },
    published: { label: 'פורסם', color: 'bg-green-100 text-green-700' },
    archived: { label: 'בארכיון', color: 'bg-yellow-100 text-yellow-700' },
  };

  const badge = statusBadge[form.status] || statusBadge.draft;

  function handleViewPublic() {
    if (form.status === 'published') {
      window.open(`/form/${form.slug}`, '_blank');
    }
  }

  function handleCopyLink() {
    if (form.status === 'published') {
      const url = `${window.location.origin}/form/${form.slug}`;
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
      {/* Card Header */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
            {form.title}
          </h3>
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit();
                  }}
                  className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  ערוך
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onViewResponses();
                  }}
                  className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  צפה בתגובות
                </button>
                {form.status === 'published' && (
                  <>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleViewPublic();
                      }}
                      className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      צפה בטופס
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleCopyLink();
                      }}
                      className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      העתק קישור
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete();
                  }}
                  className="block w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  מחק
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {form.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {form.description}
          </p>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
            {badge.label}
          </span>
          <span className="text-xs text-gray-500">
            {form.fields.length} שדות
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>נוצר: {formattedDate}</span>
          {form.published_at && (
            <span className="text-xs text-green-600">
              פורסם
            </span>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-lg">
        <button
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          ערוך טופס →
        </button>
      </div>
    </div>
  );
}
