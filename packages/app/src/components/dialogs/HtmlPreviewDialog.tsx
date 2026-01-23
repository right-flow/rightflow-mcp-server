/**
 * HTML Preview Dialog Component
 *
 * Displays generated HTML form with preview and ZIP download options
 * Downloads a package containing PDF with AcroForm fields, JSON, and HTML
 */

import * as React from 'react';
import { X, ExternalLink, Loader2, FileCode, Archive } from 'lucide-react';
import type { FieldDefinition, FormMetadata } from '@/types/fields';
import {
  downloadFormPackageZip,
  previewHtmlInNewTab,
  type GeneratedHtmlResult,
} from '@/services/html-generation';

interface HtmlPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: GeneratedHtmlResult | null;
  isLoading?: boolean;
  loadingStatus?: string;
  pdfFileName?: string;
  pdfFile?: File | null;
  fields?: FieldDefinition[];
  formMetadata?: FormMetadata;
}

export const HtmlPreviewDialog: React.FC<HtmlPreviewDialogProps> = ({
  isOpen,
  onClose,
  result,
  isLoading = false,
  loadingStatus = 'מייצר HTML...',
  pdfFileName,
  pdfFile,
  fields,
  formMetadata,
}) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Generate base filename from PDF name
  const getBaseFilename = () => {
    if (pdfFileName) {
      return pdfFileName.replace(/\.pdf$/i, '');
    }
    return result?.formId || 'form-package';
  };

  // Handle ZIP download
  const handleDownloadZip = async () => {
    if (!result || !pdfFile || !fields || fields.length === 0) {
      console.error('Missing required data for ZIP download');
      return;
    }

    setIsDownloading(true);
    try {
      await downloadFormPackageZip(pdfFile, fields, result, getBaseFilename(), formMetadata);
    } catch (error) {
      console.error('Error downloading ZIP:', error);
      alert('שגיאה בהורדת הקובץ. אנא נסה שוב.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle open in new tab
  const handleOpenInNewTab = () => {
    if (result) {
      previewHtmlInNewTab(result);
    }
  };

  // Reset iframe loaded state when result changes
  React.useEffect(() => {
    setIframeLoaded(false);
  }, [result]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]"
      dir="rtl"
    >
      <div className="bg-background border border-border rounded-lg shadow-xl w-[90vw] max-w-5xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <FileCode className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">ייצוא HTML</h2>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? loadingStatus
                  : result
                    ? `${result.metadata.fieldCount} שדות | ${result.metadata.sectionCount} סקשנים`
                    : 'תצוגה מקדימה של הטופס'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            title="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-lg font-medium">{loadingStatus}</p>
              <p className="text-sm text-muted-foreground">
                יצירת טופס HTML מהשדות שהוגדרו...
              </p>
            </div>
          ) : result ? (
            <div className="h-full flex flex-col">
              {/* Preview iframe */}
              <div className="flex-1 border border-border rounded-lg overflow-hidden bg-white relative">
                {!iframeLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}
                <iframe
                  ref={iframeRef}
                  srcDoc={result.htmlContent}
                  className="w-full h-full"
                  title="HTML Preview"
                  sandbox="allow-scripts"
                  onLoad={() => setIframeLoaded(true)}
                />
              </div>

              {/* Info bar */}
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>שיטה: {result.metadata.method === 'gemini' ? 'AI (Gemini)' : 'תבנית'}</span>
                  <span>•</span>
                  <span>כיוון: {result.metadata.rtl ? 'RTL' : 'LTR'}</span>
                  <span>•</span>
                  <span>
                    נוצר:{' '}
                    {new Date(result.metadata.generatedAt).toLocaleTimeString('he-IL')}
                  </span>
                </div>
                <span className="font-mono text-xs">{result.formId}</span>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <FileCode className="w-16 h-16 opacity-30" />
              <p>אין תוכן להצגה</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {result && (
              <span>
                חבילה:{' '}
                <span className="font-medium text-foreground">
                  {getBaseFilename()}.zip
                </span>
                <span className="mx-2 text-muted-foreground/60">•</span>
                <span className="text-xs">PDF + JSON + HTML</span>
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-muted text-foreground font-medium rounded-md hover:bg-muted/80 transition-colors"
            >
              סגור
            </button>
            <button
              onClick={handleOpenInNewTab}
              disabled={!result || isLoading}
              className="px-4 py-2 bg-muted text-foreground font-medium rounded-md hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              תצוגה מקדימה
            </button>
            <button
              onClick={handleDownloadZip}
              disabled={!result || isLoading || isDownloading || !pdfFile || !fields}
              className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מכין חבילה...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  הורד ZIP
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
