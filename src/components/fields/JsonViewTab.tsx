import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldDefinition } from '@/types/fields';
import { useTranslation, useDirection } from '@/i18n';

interface JsonViewTabProps {
  fields: FieldDefinition[];
}

export const JsonViewTab = ({ fields }: JsonViewTabProps) => {
  const t = useTranslation();
  const direction = useDirection();
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(fields, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <p className="text-sm">{t.noFieldsForJson}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" dir={direction}>
      {/* Header with copy button */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <span className="text-xs text-muted-foreground">{t.jsonReadOnly}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1.5"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs">{t.jsonCopied}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-xs">{t.copyJson}</span>
            </>
          )}
        </Button>
      </div>

      {/* JSON content */}
      <div className="flex-1 overflow-auto p-2">
        <pre
          className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words"
          dir="ltr"
        >
          {jsonString}
        </pre>
      </div>
    </div>
  );
};
