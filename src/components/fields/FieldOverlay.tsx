import { TextField } from './TextField';
import { CheckboxField } from './CheckboxField';
import { RadioField } from './RadioField';
import { DropdownField } from './DropdownField';
import { SignatureField } from './SignatureField';
import { FieldDefinition } from '@/types/fields';

interface PageDimensions {
  width: number;
  height: number;
}

interface FieldOverlayProps {
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  selectedFieldIds: string[]; // Multi-select support
  scale: number;
  pageDimensions: PageDimensions;
  canvasWidth: number;
  onFieldSelect: (id: string) => void;
  onToggleFieldSelection: (id: string) => void; // Multi-select support
  onFieldUpdate: (id: string, updates: Partial<FieldDefinition>) => void;
  onFieldDelete: (id: string) => void;
  onFieldDuplicate: (id: string) => void;
  hoveredFieldId: string | null;
  onFieldHover: (id: string | null) => void;
}

export const FieldOverlay = ({
  fields,
  selectedFieldId,
  selectedFieldIds,
  scale,
  pageDimensions,
  canvasWidth,
  onFieldSelect,
  onToggleFieldSelection,
  onFieldUpdate,
  onFieldDelete,
  onFieldDuplicate,
  hoveredFieldId,
  onFieldHover,
}: FieldOverlayProps) => {
  // Scale factor for converting between PDF points and pixels
  const scaleFactor = scale / 100;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="relative w-full h-full pointer-events-auto">
        {fields.map((field) => {
          const isSelected = field.id === selectedFieldId || selectedFieldIds.includes(field.id);
          const isHovered = field.id === hoveredFieldId;

          const commonProps = {
            field,
            isSelected,
            isHovered,
            scale: scaleFactor,
            pageDimensions,
            canvasWidth,
            onSelect: onFieldSelect,
            onToggleSelection: onToggleFieldSelection,
            onUpdate: onFieldUpdate,
            onDelete: onFieldDelete,
            onDuplicate: onFieldDuplicate,
            onHover: onFieldHover,
          };

          if (field.type === 'text') {
            return <TextField key={field.id} {...commonProps} />;
          } else if (field.type === 'checkbox') {
            return <CheckboxField key={field.id} {...commonProps} />;
          } else if (field.type === 'radio') {
            return <RadioField key={field.id} {...commonProps} />;
          } else if (field.type === 'dropdown') {
            return <DropdownField key={field.id} {...commonProps} />;
          } else if (field.type === 'signature') {
            return <SignatureField key={field.id} {...commonProps} />;
          }

          return null;
        })}
      </div>
    </div>
  );
};
