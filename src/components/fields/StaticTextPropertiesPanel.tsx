import { useState } from 'react';
import { FieldDefinition } from '@/types/fields';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Copy, Loader2 } from 'lucide-react';
import { useTranslation, useDirection } from '@/i18n';
import { sanitizeUserInput } from '@/utils/inputSanitization';
import { cn } from '@/utils/cn';
import { extractTextFromPDFArea, isRTLText } from '@/utils/pdfTextExtraction';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface StaticTextPropertiesPanelProps {
  field: FieldDefinition;
  pdfDocument: PDFDocumentProxy | null;
  pageNumber: number;
  onUpdate: (updates: Partial<FieldDefinition>) => void;
  onClose: () => void;
}

export const StaticTextPropertiesPanel = ({
  field,
  pdfDocument,
  pageNumber,
  onUpdate,
  onClose,
}: StaticTextPropertiesPanelProps) => {
  const t = useTranslation();
  const direction = useDirection();
  const [isExtracting, setIsExtracting] = useState(false);

  // Security: Sanitize content input to prevent XSS attacks
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const sanitized = sanitizeUserInput(e.target.value);
    onUpdate({ content: sanitized });
  };

  // Security: Validate background color against whitelist of allowed values
  // Background color is selected from dropdown with only predefined options
  const handleBackgroundColorChange = (value: string) => {
    // Whitelist of allowed background colors (dropdown only, no user input)
    const allowedColors = ['transparent', '#ffffff', 'rgb(196, 198, 207)'];

    if (allowedColors.includes(value)) {
      onUpdate({ backgroundColor: value });
    } else {
      // Fallback to transparent if invalid value somehow passed
      console.warn(`Invalid background color: ${value}. Using fallback: transparent`);
      onUpdate({ backgroundColor: 'transparent' });
    }
  };

  // Security: Sanitize section name to prevent XSS attacks
  const handleSectionNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeUserInput(e.target.value);
    onUpdate({ sectionName: sanitized });
  };

  // Extract text from PDF at field's coordinates
  const handleCopyFromPDF = async () => {
    if (!pdfDocument) {
      alert('PDF document not loaded. Please wait for PDF to load.');
      return;
    }

    setIsExtracting(true);

    try {
      const extractedText = await extractTextFromPDFArea(pdfDocument, {
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        pageNumber,
      });

      if (extractedText) {
        // Sanitize the extracted text
        const sanitized = sanitizeUserInput(extractedText);

        // Detect if text is RTL (Hebrew/Arabic) and update direction accordingly
        const isRTL = isRTLText(sanitized);
        const updates: Partial<FieldDefinition> = {
          content: sanitized,
        };

        // Auto-update text direction if detected
        if (isRTL && field.direction !== 'rtl') {
          updates.direction = 'rtl';
        } else if (!isRTL && field.direction !== 'ltr') {
          updates.direction = 'ltr';
        }

        onUpdate(updates);
        console.log(`Extracted text from PDF: "${sanitized}" (${isRTL ? 'RTL' : 'LTR'})`);
      } else {
        alert('No text found at this location in the PDF.');
      }
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      alert(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div
      className={cn(
        'fixed right-4 top-20 w-80 bg-background border border-border rounded-lg shadow-lg p-4 z-[2000]',
        'animate-in slide-in-from-right duration-200',
        'max-h-[80vh] overflow-y-auto',
      )}
      dir={direction}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t.staticTextProperties || 'Static Text Properties'}</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Field Properties */}
      <div className="space-y-4">

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="static-content">{t.content || 'Content'}</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyFromPDF}
            disabled={isExtracting || !pdfDocument}
            className="h-7 px-2 text-xs"
            title="Copy text from PDF at this location"
          >
            {isExtracting ? (
              <Loader2 className="w-3 h-3 ml-1 animate-spin" />
            ) : (
              <Copy className="w-3 h-3 ml-1" />
            )}
            {isExtracting ? 'Extracting...' : 'Copy from PDF'}
          </Button>
        </div>
        <textarea
          id="static-content"
          className="w-full min-h-[80px] px-3 py-2 text-sm border border-input rounded-md bg-background"
          value={field.content || ''}
          onChange={handleContentChange}
          placeholder={t.enterStaticText || 'Enter static text...'}
          dir={field.direction}
        />
        <p className="text-xs text-muted-foreground">
          Click "Copy from PDF" to extract text from the original PDF at this field's location
        </p>
      </div>

      {/* Text Alignment */}
      <div className="space-y-2">
        <Label htmlFor="text-align">{t.textAlignment || 'Text Alignment'}</Label>
        <Select
          id="text-align"
          value={field.textAlign || 'left'}
          onChange={(e) => onUpdate({ textAlign: e.target.value as 'left' | 'center' | 'right' })}
        >
          <option value="left">{t.alignLeft || 'Left'}</option>
          <option value="center">{t.alignCenter || 'Center'}</option>
          <option value="right">{t.alignRight || 'Right'}</option>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <Label htmlFor="font-size">{t.fontSize}</Label>
        <Input
          id="font-size"
          type="number"
          min="8"
          max="72"
          value={field.fontSize || 12}
          onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 12 })}
          dir="ltr"
          className="text-left"
        />
      </div>

      {/* Font Weight */}
      <div className="space-y-2">
        <Label htmlFor="font-weight">{t.fontWeight || 'Font Weight'}</Label>
        <Select
          id="font-weight"
          value={field.fontWeight || 'normal'}
          onChange={(e) => onUpdate({ fontWeight: e.target.value as 'normal' | 'bold' })}
        >
          <option value="normal">{t.normal || 'Normal'}</option>
          <option value="bold">{t.bold || 'Bold'}</option>
        </Select>
      </div>

      {/* Font Style */}
      <div className="space-y-2">
        <Label htmlFor="font-style">{t.fontStyle || 'Font Style'}</Label>
        <Select
          id="font-style"
          value={field.fontStyle || 'normal'}
          onChange={(e) => onUpdate({ fontStyle: e.target.value as 'normal' | 'italic' })}
        >
          <option value="normal">{t.normal || 'Normal'}</option>
          <option value="italic">{t.italic || 'Italic'}</option>
        </Select>
      </div>

      {/* Text Color - Always Black */}
      <div className="space-y-2">
        <Label htmlFor="text-color">{t.textColor || 'Text Color'}</Label>
        <div className="flex gap-2">
          <div className="w-20 h-10 rounded border border-input bg-black"></div>
          <Input
            type="text"
            value="#000000"
            readOnly
            disabled
            placeholder="#000000"
            className="flex-1 bg-muted"
            dir="ltr"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Text color is always black for static text
        </p>
      </div>

      {/* Background Color - Transparent, White, or Gray */}
      <div className="space-y-2">
        <Label htmlFor="bg-color">{t.backgroundColor || 'Background Color'}</Label>
        <Select
          id="bg-color"
          value={field.backgroundColor || 'transparent'}
          onChange={(e) => handleBackgroundColorChange(e.target.value)}
        >
          <option value="transparent">Transparent</option>
          <option value="#ffffff">White</option>
          <option value="rgb(196, 198, 207)">Light Gray</option>
        </Select>
        <div className="flex gap-2 items-center">
          <div
            className="w-full h-8 rounded border border-input"
            style={{
              backgroundColor: field.backgroundColor || 'transparent',
              backgroundImage: field.backgroundColor === 'transparent' || !field.backgroundColor
                ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                : 'none',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}
          ></div>
        </div>
      </div>

      {/* Border */}
      <div className="space-y-2">
        <Label>{t.border || 'Border'}</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="border-width" className="text-xs">{t.width || 'Width'}</Label>
            <Input
              id="border-width"
              type="number"
              min="0"
              max="10"
              value={field.borderWidth || 0}
              onChange={(e) => onUpdate({ borderWidth: parseInt(e.target.value) || 0 })}
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="border-color" className="text-xs">{t.color || 'Color'}</Label>
            <Input
              id="border-color"
              type="color"
              value={field.borderColor || '#000000'}
              onChange={(e) => onUpdate({ borderColor: e.target.value })}
              className="h-10"
            />
          </div>
        </div>
      </div>

      {/* Section Name */}
      <div className="space-y-2">
        <Label htmlFor="section-name">{t.sectionName}</Label>
        <Input
          id="section-name"
          type="text"
          value={field.sectionName || ''}
          onChange={handleSectionNameChange}
          placeholder={t.sectionNamePlaceholder || 'e.g., Instructions'}
          dir={field.direction}
        />
      </div>
      </div>
    </div>
  );
};
