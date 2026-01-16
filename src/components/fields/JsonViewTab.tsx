import { useState, useMemo } from 'react';
import { Copy, Check, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldDefinition } from '@/types/fields';
import { useTranslation, useDirection } from '@/i18n';

interface JsonViewTabProps {
  fields: FieldDefinition[];
}

/**
 * Sorts fields by physical position (RTL: right to left, top to bottom)
 * Uses dynamic gap detection to handle varying row spacing
 */
function sortFieldsByPosition(fields: FieldDefinition[]): FieldDefinition[] {
  if (fields.length === 0) return [];

  // Group by page first
  const pageGroups = new Map<number, FieldDefinition[]>();
  for (const field of fields) {
    if (!pageGroups.has(field.pageNumber)) {
      pageGroups.set(field.pageNumber, []);
    }
    pageGroups.get(field.pageNumber)!.push(field);
  }

  const result: FieldDefinition[] = [];

  // Process each page
  for (const [, pageFields] of Array.from(pageGroups.entries()).sort((a, b) => a[0] - b[0])) {
    // Sort by Y (descending - top to bottom)
    const sortedByY = [...pageFields].sort((a, b) => b.y - a.y);

    // Calculate gaps between consecutive fields
    const gaps: number[] = [];
    for (let i = 0; i < sortedByY.length - 1; i++) {
      gaps.push(sortedByY[i].y - sortedByY[i + 1].y);
    }

    // Find gap threshold using median + tolerance
    // Gaps significantly larger than median indicate row boundaries
    if (gaps.length === 0) {
      // Only one field
      result.push(...sortedByY);
      continue;
    }

    const sortedGaps = [...gaps].sort((a, b) => a - b);
    const median = sortedGaps[Math.floor(sortedGaps.length / 2)];
    const gapThreshold = Math.max(median * 2, 20); // At least 20px or 2x median

    // Group fields into rows based on gaps
    const rows: FieldDefinition[][] = [];
    let currentRow: FieldDefinition[] = [sortedByY[0]];

    for (let i = 0; i < gaps.length; i++) {
      if (gaps[i] > gapThreshold) {
        // Large gap = new row
        rows.push(currentRow);
        currentRow = [sortedByY[i + 1]];
      } else {
        // Small gap = same row
        currentRow.push(sortedByY[i + 1]);
      }
    }
    rows.push(currentRow); // Add last row

    // Sort fields within each row by X (right to left)
    for (const row of rows) {
      row.sort((a, b) => b.x - a.x);
      result.push(...row);
    }
  }

  return result;
}

export const JsonViewTab = ({ fields }: JsonViewTabProps) => {
  const t = useTranslation();
  const direction = useDirection();
  const [copied, setCopied] = useState(false);
  const [isSorted, setIsSorted] = useState(false);

  // Compute sorted fields when needed
  const displayFields = useMemo(() => {
    return isSorted ? sortFieldsByPosition(fields) : fields;
  }, [fields, isSorted]);

  const jsonString = JSON.stringify(displayFields, null, 2);

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
      {/* Header with sort and copy buttons */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <span className="text-xs text-muted-foreground">{t.jsonReadOnly}</span>
        <div className="flex gap-2">
          {/* Sort by position button */}
          <Button
            variant={isSorted ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsSorted(!isSorted)}
            className="h-7 gap-1.5"
            title={isSorted ? t.showOriginalOrder : t.sortByPosition}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="text-xs">
              {isSorted ? t.sorted : t.sortRTL}
            </span>
          </Button>

          {/* Copy button */}
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
