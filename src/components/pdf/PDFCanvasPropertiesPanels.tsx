/**
 * PDF Canvas Properties Panels Component
 * Renders field properties panels and confirmation dialogs
 */

import { FieldPropertiesPanel } from '@/components/fields/FieldPropertiesPanel';
import { MultiSelectPropertiesPanel } from '@/components/fields/MultiSelectPropertiesPanel';
import { StaticTextPropertiesPanel } from '@/components/fields/StaticTextPropertiesPanel';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FieldDefinition } from '@/types/fields';
import { useTranslation, useDirection } from '@/i18n';

interface PDFCanvasPropertiesPanelsProps {
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  selectedFieldIds: string[];
  showDeleteConfirm: boolean;
  pdfDocument: any;
  pageNumber: number;
  userId?: string; // User ID for data source management
  onFieldUpdate: (id: string, updates: Partial<FieldDefinition>) => void;
  onMultipleFieldsUpdate: (ids: string[], updates: Partial<FieldDefinition>) => void;
  onMultipleFieldsDelete: (ids: string[]) => void;
  onFieldDeselect: () => void;
  onClearSelection: () => void;
  onDeleteConfirmClose: () => void;
}

export const PDFCanvasPropertiesPanels = ({
  fields,
  selectedFieldId,
  selectedFieldIds,
  showDeleteConfirm,
  pdfDocument,
  pageNumber,
  userId,
  onFieldUpdate,
  onMultipleFieldsUpdate,
  onMultipleFieldsDelete,
  onFieldDeselect,
  onClearSelection,
  onDeleteConfirmClose,
}: PDFCanvasPropertiesPanelsProps) => {
  const t = useTranslation();
  const direction = useDirection();

  return (
    <>
      {/* Multi-Select Properties Panel */}
      {selectedFieldIds.length > 1 && (() => {
        const selectedFields = fields.filter(f => selectedFieldIds.includes(f.id));
        if (selectedFields.length === 0) return null;

        return (
          <MultiSelectPropertiesPanel
            selectedFields={selectedFields}
            onUpdateAll={(updates) => onMultipleFieldsUpdate(selectedFieldIds, updates)}
            onClose={onClearSelection}
          />
        );
      })()}

      {/* Single Field Properties Panel */}
      {selectedFieldIds.length <= 1 && selectedFieldId && (() => {
        const selectedField = fields.find(f => f.id === selectedFieldId);
        if (!selectedField) return null;

        // Static text fields use a different properties panel
        if (selectedField.type === 'static-text') {
          return (
            <StaticTextPropertiesPanel
              field={selectedField}
              pdfDocument={pdfDocument}
              pageNumber={pageNumber}
              onUpdate={(updates) => onFieldUpdate(selectedFieldId, updates)}
              onClose={onFieldDeselect}
            />
          );
        }

        return (
          <FieldPropertiesPanel
            field={selectedField}
            allFields={fields}
            userId={userId}
            onUpdate={(updates) => onFieldUpdate(selectedFieldId, updates)}
            onClose={onFieldDeselect}
          />
        );
      })()}

      {/* Multi-Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t.delete}
        message={t.deleteConfirmMessage.replace('{count}', String(selectedFieldIds.length))}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        variant="danger"
        direction={direction}
        onConfirm={() => {
          onMultipleFieldsDelete(selectedFieldIds);
          onDeleteConfirmClose();
        }}
        onCancel={onDeleteConfirmClose}
      />
    </>
  );
};
