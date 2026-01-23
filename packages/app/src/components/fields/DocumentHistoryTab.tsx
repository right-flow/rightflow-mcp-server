import { useState, useEffect, useCallback } from 'react';
import { FileText, Trash2, Download, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { documentHistoryService, DocumentHistoryEntry } from '@/services/document-history';
import { FieldDefinition } from '@/types/fields';
import { useTranslation, useDirection } from '@/i18n';
import { cn } from '@/utils/cn';

interface DocumentHistoryTabProps {
  onLoadFields: (fields: FieldDefinition[]) => void;
}

export const DocumentHistoryTab = ({ onLoadFields }: DocumentHistoryTabProps) => {
  const t = useTranslation();
  const direction = useDirection();
  const [documents, setDocuments] = useState<DocumentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await documentHistoryService.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load document history:', err);
      setError('Failed to load document history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await documentHistoryService.deleteDocument(id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(t.clearHistoryConfirm)) return;
    try {
      await documentHistoryService.clearHistory();
      setDocuments([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleLoadFields = (doc: DocumentHistoryEntry) => {
    try {
      const fields = JSON.parse(doc.fieldsJson) as FieldDefinition[];
      onLoadFields(fields);
    } catch (err) {
      console.error('Failed to parse fields JSON:', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} ${t.bytes}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t.kb}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t.mb}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(direction === 'rtl' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-destructive">
        <AlertCircle className="w-6 h-6 mb-2" />
        <p className="text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={loadDocuments} className="mt-2">
          {t.redo}
        </Button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <FileText className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">{t.noDocumentHistory}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" dir={direction}>
      {/* Header with clear button */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {documents.length} {t.documents}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="h-7 text-xs text-destructive hover:text-destructive"
        >
          {t.clearAllHistory}
        </Button>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className={cn(
              'group p-3 rounded-lg border border-border bg-card/50 hover:bg-card',
              'transition-colors cursor-pointer',
            )}
            onClick={() => handleLoadFields(doc)}
          >
            {/* Document name */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 flex-shrink-0 text-primary" />
                <span className="text-sm font-medium truncate">{doc.fileName}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={(e) => handleDelete(doc.id, e)}
                title={t.deleteHistory}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>

            {/* Document info */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div>
                {t.pages}: <span className="font-medium text-foreground">{doc.pageCount}</span>
              </div>
              <div>
                {t.fields}: <span className="font-medium text-foreground">{doc.fieldCount}</span>
              </div>
              <div className="col-span-2">
                {formatFileSize(doc.fileSize)}
              </div>
            </div>

            {/* Last modified */}
            <div className="mt-2 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
              {t.lastModified}: {formatDate(doc.updatedAt)}
            </div>

            {/* Load button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 h-7 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadFields(doc);
              }}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-xs">{t.loadHistoryFields}</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
