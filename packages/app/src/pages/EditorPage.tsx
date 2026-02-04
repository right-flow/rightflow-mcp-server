import { useRef, useState, useEffect, useMemo } from 'react';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { ToolsBar } from '@/components/layout/ToolsBar';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageThumbnailSidebar } from '@/components/layout/PageThumbnailSidebar';
import { PDFViewer } from '@/components/pdf/PDFViewer';
import { FieldListSidebar } from '@/components/fields/FieldListSidebar';
import { RecoveryDialog } from '@/components/dialogs/RecoveryDialog';
import { UploadWarningDialog } from '@/components/dialogs/UploadWarningDialog';
import { HtmlPreviewDialog } from '@/components/dialogs/HtmlPreviewDialog';
import { ErrorDialog } from '@/components/dialogs/ErrorDialog';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { PublishDialog } from '@/components/publish/PublishDialog';
import { VersionHistory } from '@/components/publish/VersionHistory';
import { EditorMobileToolbar, EditorMobileToolbarSpacer } from '@/components/mobile/EditorMobileToolbar';
import { useUser, useAuth } from '@clerk/clerk-react';
import type { GeneratedHtmlResult } from '@/services/html-generation';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDirection } from '@/i18n';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { generateThumbnails } from '@/utils/pdfThumbnails';
import { getFieldsWithErrors } from '@/utils/inputSanitization';
import {
  loadRecoveryData,
  clearRecoveryData,
  setupAutoSave,
  RecoveryData,
} from '@/utils/crashRecovery';
import { documentHistoryService } from '@/services/document-history';

export function EditorPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldTemplateInputRef = useRef<HTMLInputElement>(null);
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showUploadWarning, setShowUploadWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isExtractingFields, setIsExtractingFields] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessingPage, setReprocessingPage] = useState<number | null>(null);
  const [isHtmlDialogOpen, setIsHtmlDialogOpen] = useState(false);
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<GeneratedHtmlResult | null>(null);
  const [htmlLoadingStatus, setHtmlLoadingStatus] = useState('');
  const [extractedFormMetadata, setExtractedFormMetadata] = useState<import('@/types/fields').FormMetadata | undefined>();
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogTitle, setErrorDialogTitle] = useState('');
  const [errorDialogErrors, setErrorDialogErrors] = useState<string[]>([]);

  // Zustand stores
  const {
    pdfFile,
    currentPage,
    totalPages,
    thumbnails,
    zoomLevel,
    activeTool,
    fields,
    selectedFieldId,
    selectedFieldIds,
    setPdfFile,
    setPdfDocument,
    setCurrentPage,
    setTotalPages,
    setThumbnails,
    setZoomLevel,
    setActiveTool,
    setPageDimensions,
    selectField,
    toggleFieldSelection,
    deleteField,
    restoreFromRecovery,
    undo,
    redo,
    canUndo,
    canRedo,
    loadFields,
    updateFieldWithUndo,
    setPageMetadata,
    hoveredFieldId,
    setHoveredField,
  } = useTemplateEditorStore();

  const { settings } = useSettingsStore();
  const direction = useDirection();
  const { user } = useUser();
  const { getToken, orgId, orgRole } = useAuth();
  const isMobile = useIsMobile();

  // Simplified role-based access (Clerk free tier)
  // Create/update forms: Personal accounts OR organization members (admin/member)
  const canCreateForm = !orgId || (
    orgRole === 'org:admin' ||
    orgRole === 'org:member' ||
    orgRole === 'org:basic_member'
  );
  const canUpdateForm = !orgId || (
    orgRole === 'org:admin' ||
    orgRole === 'org:member' ||
    orgRole === 'org:basic_member'
  );

  // Calculate field validation errors
  const errorFieldIds = useMemo(() => {
    return getFieldsWithErrors(fields);
  }, [fields]);

  // Check for crash recovery data on mount
  useEffect(() => {
    const data = loadRecoveryData();
    if (data) {
      setRecoveryData(data);
    }
  }, []);

  // Setup auto-save for crash recovery
  useEffect(() => {
    const cleanup = setupAutoSave(() => ({
      pdfFile,
      currentPage,
      zoomLevel,
      fields,
      totalPages,
    }));

    // Cleanup on unmount
    return cleanup;
  }, [pdfFile, currentPage, zoomLevel, fields, totalPages]);

  const handleRestore = () => {
    if (recoveryData) {
      restoreFromRecovery(recoveryData);
      setRecoveryData(null);
      clearRecoveryData();
      console.log('[App] Recovery data restored successfully');
    }
  };

  const handleDiscardRecovery = () => {
    clearRecoveryData();
    setRecoveryData(null);
    console.log('[App] Recovery data discarded');
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Import validation utilities
    const { validatePDFFile } = await import('@/utils/inputSanitization');

    // Validate PDF file (checks MIME type, size, and magic bytes)
    const validation = await validatePDFFile(file);

    if (!validation.isValid) {
      alert(validation.error || 'קובץ PDF לא תקין');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Check if there are existing fields
    if (fields.length > 0) {
      // Show warning dialog
      setPendingFile(file);
      setShowUploadWarning(true);
      return;
    }

    // No existing fields - proceed with upload
    await processFileUpload(file, false);
  };

  const processFileUpload = async (file: File, keepFields: boolean) => {
    if (!keepFields) {
      // Clear existing fields for new document
      loadFields([]); // Actually clear the fields
      setPdfFile(file);
      setCurrentPage(1);
      setThumbnails([]);

      // Check if PDF has AcroForm fields and extract them
      try {
        const { hasAcroFormFields, extractFieldsFromPDF } = await import(
          '@/utils/pdfFieldExtractor'
        );

        const hasFields = await hasAcroFormFields(file);

        if (hasFields) {
          const shouldExtract = confirm(
            'נמצאו שדות קיימים ב-PDF.\n\n' +
            'האם לייבא את השדות הקיימים לעורך?\n\n' +
            'לחץ "אישור" לייבוא אוטומטי או "ביטול" להתחיל ריק',
          );

          if (shouldExtract) {
            const extractedFields = await extractFieldsFromPDF(file);

            if (extractedFields.length > 0) {
              loadFields(extractedFields);
              alert(
                `✅ ${extractedFields.length} שדות יובאו בהצלחה מה-PDF!\n\n` +
                `ניתן לערוך אותם או להוסיף שדות נוספים.`,
              );
              console.log(`✓ Imported ${extractedFields.length} fields from PDF`);
            }
          } else {
            console.log('User chose not to import existing fields');
          }
        }
      } catch (error) {
        console.error('Error extracting fields from PDF:', error);
        // Don't block PDF upload if field extraction fails
        alert(
          'לא ניתן לייבא שדות מה-PDF.\n' +
          'ניתן להמשיך ולהוסיף שדות ידנית.\n\n' +
          `שגיאה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`,
        );
      }
    } else {
      // keepFields = true - just update the PDF file
      setPdfFile(file);
      setCurrentPage(1);
      setThumbnails([]);
      console.log('PDF updated, keeping existing fields');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePDFLoadSuccess = async (pdf: any) => {
    setTotalPages(pdf.numPages);
    setPdfDocument(pdf); // Store PDF document for text extraction
    console.log(`PDF loaded successfully with ${pdf.numPages} pages`);

    // Generate thumbnails asynchronously
    if (pdfFile) {
      try {
        const thumbnailUrls = await generateThumbnails(pdfFile);
        setThumbnails(thumbnailUrls);
        console.log('Thumbnails generated successfully');
      } catch (error) {
        console.error('Failed to generate thumbnails:', error);
      }
    }
  };

  const handlePDFLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    alert('שגיאה בטעינת קובץ PDF');
    setPdfFile(null);
    setTotalPages(0);
  };

  const handlePageRender = (page: any) => {
    const { width, height } = page.getSize();
    setPageDimensions(currentPage, { width, height });
  };

  const handleUploadWarningNewDocument = async () => {
    setShowUploadWarning(false);
    if (pendingFile) {
      await processFileUpload(pendingFile, false);
      setPendingFile(null);
    }
  };

  const handleUploadWarningNewVersion = async () => {
    setShowUploadWarning(false);
    if (pendingFile) {
      await processFileUpload(pendingFile, true);
      setPendingFile(null);
    }
  };

  const handleUploadWarningCancel = () => {
    setShowUploadWarning(false);
    setPendingFile(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!pdfFile) {
      alert('אין PDF להורדה. אנא טען קובץ PDF תחילה.');
      return;
    }

    if (fields.length === 0) {
      alert('אין שדות להוספה. אנא הוסף לפחות שדה אחד.');
      return;
    }

    try {
      // Import PDF generation utilities
      const { generateFillablePDF, downloadPDF, validateFieldsForPDF, ensureFieldNames } = await import(
        '@/utils/pdfGeneration'
      );
      const { generateFilename } = await import('@/utils/filenameGenerator');
      const { reindexFields } = await import('@/utils/fieldSorting');

      // Sort fields by position based on language direction
      const sortedFields = reindexFields(fields, direction);
      console.log(`📐 Fields sorted by position (${direction}) before PDF generation`);

      // Auto-generate missing field names
      const fieldsWithNames = ensureFieldNames(sortedFields);

      // Update fields in store if any names were auto-generated
      // IMPORTANT: Compare by field ID, not array index, since fieldsWithNames is sorted
      const hasChanges = fieldsWithNames.some(f => {
        const originalField = fields.find(orig => orig.id === f.id);
        return originalField && f.name !== originalField.name;
      });

      if (hasChanges) {
        console.log('Auto-generated missing field names');
        // Update each field that changed - compare by ID
        fieldsWithNames.forEach((field) => {
          const originalField = fields.find(orig => orig.id === field.id);
          if (originalField && field.name !== originalField.name) {
            updateFieldWithUndo(field.id, { name: field.name });
          }
        });
      }

      // Validate fields before generation
      const errors = validateFieldsForPDF(fieldsWithNames);
      if (errors.length > 0) {
        setErrorDialogTitle('שגיאות בשדות');
        setErrorDialogErrors(errors);
        setErrorDialogOpen(true);
        return;
      }

      console.log('🚀 Generating fillable PDF...');

      // Generate PDF with all fields and settings
      const pdfBytes = await generateFillablePDF(pdfFile, fieldsWithNames, {
        checkboxStyle: settings.checkboxField.style,
      });

      // Generate filename from naming settings template
      const fallbackName = pdfFile.name.replace('.pdf', '_fillable');
      const filename = generateFilename(settings.naming, fallbackName);

      // Download PDF and JSON metadata as zip file
      await downloadPDF(pdfBytes, filename, fieldsWithNames);

      alert('✅ קובץ ZIP (PDF + JSON) הורד בהצלחה! בדוק את תיקיית ההורדות.');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`שגיאה ביצירת PDF: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    }
  };

  const _handleSaveFields = async () => {
    if (fields.length === 0) {
      alert('אין שדות לשמירה. אנא הוסף לפחות שדה אחד.');
      return;
    }

    try {
      // Import field template utilities
      const { saveFieldsToFile } = await import('@/utils/fieldTemplates');
      const { reindexFields } = await import('@/utils/fieldSorting');
      const { generateFilename } = await import('@/utils/filenameGenerator');

      // Sort fields by position based on language direction
      const sortedFields = reindexFields(fields, direction);
      console.log(`📐 Fields sorted by position (${direction}) before template save`);

      // Generate default filename from naming settings (similar to handleSave)
      const fallbackName = pdfFile?.name.replace('.pdf', '_template') || 'template';
      const defaultName = generateFilename(settings.naming, fallbackName);

      // Prompt for template name
      const templateName = prompt('הכנס שם לתבנית:', defaultName);
      if (!templateName) return; // User cancelled

      // Save sorted fields to JSON file
      saveFieldsToFile(sortedFields, templateName);

      // Also save to document history
      try {
        await documentHistoryService.addDocument({
          fileName: pdfFile?.name || templateName,
          fileSize: pdfFile?.size || 0,
          pageCount: totalPages,
          fieldCount: sortedFields.length,
          fields: sortedFields,
        });
        console.log('✓ Document saved to history');
      } catch (historyError) {
        console.error('Failed to save to document history:', historyError);
        // Don't block the save operation if history save fails
      }

      alert(`✅ תבנית השדות נשמרה בהצלחה!\nקובץ: ${templateName}.json\nשדות: ${sortedFields.length}`);
    } catch (error) {
      console.error('Error saving fields:', error);
      alert(`שגיאה בשמירת שדות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    }
  };

  // Handle loading fields from document history
  const handleLoadFieldsFromHistory = (historyFields: typeof fields) => {
    if (fields.length > 0) {
      const confirmed = confirm(
        'קיימים שדות במסמך הנוכחי.\n\n' +
        'האם להחליף אותם בשדות מההיסטוריה?',
      );
      if (!confirmed) return;
    }
    loadFields(historyFields);
    alert(`✅ ${historyFields.length} שדות נטענו מההיסטוריה!`);
  };

  // Reprocess a single page with AI
  const handleReprocessPage = async (pageNumber: number) => {
    if (!pdfFile) {
      alert('אין PDF לעיבוד. אנא טען קובץ PDF תחילה.');
      return;
    }

    const existingFieldsCount = fields.filter(f => f.pageNumber === pageNumber).length;
    const confirmed = confirm(
      `עיבוד מחדש של עמוד ${pageNumber}\n\n` +
      `פעולה זו תמחק ${existingFieldsCount} שדות קיימים בעמוד זה ותחליף אותם בשדות חדשים.\n\n` +
      `להמשיך?`,
    );

    if (!confirmed) return;

    setIsReprocessing(true);
    setReprocessingPage(pageNumber);

    try {
      const { reprocessSinglePage } = await import('@/utils/aiFieldExtraction');
      const { reindexFields } = await import('@/utils/fieldSorting');

      const { fields: newFields, metadata } = await reprocessSinglePage(
        pdfFile,
        pageNumber,
        (status) => console.log(`[Reprocess] ${status}`),
      );

      // Update metadata if available
      if (metadata) {
        setPageMetadata(pageNumber, metadata);
      }

      // Replace and re-sort all fields in a single store update
      const allFields = [
        ...fields.filter(f => f.pageNumber !== pageNumber),
        ...newFields,
      ];
      const sortedFields = reindexFields(allFields, direction);
      loadFields(sortedFields);

      alert(
        `✅ עמוד ${pageNumber} עובד מחדש בהצלחה!\n` +
        `שדות קודמים: ${existingFieldsCount}\n` +
        `שדות חדשים: ${newFields.length}`,
      );
    } catch (error) {
      console.error('Error reprocessing page:', error);
      alert(`שגיאה בעיבוד מחדש: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setIsReprocessing(false);
      setReprocessingPage(null);
    }
  };

  const _handleLoadFields = () => {
    fieldTemplateInputRef.current?.click();
  };

  const handleFieldTemplateChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Import field template utilities
      const { loadFieldsFromFile } = await import('@/utils/fieldTemplates');

      // Load fields from JSON file
      const loadedFields = await loadFieldsFromFile(file);

      // Ask user if they want to replace or merge
      const replace = confirm(
        `נמצאו ${loadedFields.length} שדות בתבנית.\n\n` +
        `האם להחליף את השדות הקיימים (${fields.length})?\n\n` +
        `לחץ "אישור" להחלפה או "ביטול" למיזוג`,
      );

      if (replace) {
        // Replace all fields
        loadFields(loadedFields);
        alert(`✅ ${loadedFields.length} שדות נטענו בהצלחה והחליפו את השדות הקיימים!`);
      } else {
        // Merge fields (add to existing)
        loadFields([...fields, ...loadedFields]);
        alert(
          `✅ ${loadedFields.length} שדות נטענו ונוספו!\nסה"כ שדות כעת: ${fields.length + loadedFields.length}`,
        );
      }

      console.log(`✓ Loaded ${loadedFields.length} fields from template`);
    } catch (error) {
      console.error('Error loading fields:', error);

      // Use ErrorDialog for better error display with copy functionality
      const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      setErrorDialogTitle('שגיאה בכפרוס הטופס');
      setErrorDialogErrors([
        errorMessage,
        '',
        'פרטים טכניים:',
        `קובץ: ${file.name}`,
        `סוג שגיאה: ${error instanceof Error ? error.name : 'Unknown'}`,
        '',
        'אנא בדוק שהקובץ כולל:',
        '• מערך fields תקין',
        '• כל שדה כולל: id, type, name, x, y, width, height, pageNumber',
        '• סוגי שדות נתמכים: text, checkbox, radio, dropdown, signature',
      ]);
      setErrorDialogOpen(true);
    }

    // Reset input so same file can be loaded again
    event.target.value = '';
  };

  const handleExtractFields = async () => {
    if (!pdfFile) {
      alert('אין PDF לניתוח. אנא טען קובץ PDF תחילה.');
      return;
    }

    if (isExtractingFields) {
      return; // Prevent multiple simultaneous extractions
    }

    setIsExtractingFields(true);

    try {
      // Import AI field extraction utility
      const { extractFieldsWithAI } = await import('@/utils/aiFieldExtraction');

      const { fields: extractedFields, metadata, formMetadata } = await extractFieldsWithAI(pdfFile, (status) => {
        console.log(`AI Extraction: ${status}`);
      });

      if (extractedFields.length === 0) {
        alert('לא נמצאו שדות ב-PDF.\n\nיתכן שה-PDF אינו מכיל טפסים או שה-AI לא הצליח לזהות שדות.');
        return;
      }

      // Auto-populate settings from form metadata if available and confident
      if (formMetadata && formMetadata.confidence !== 'low') {
        const { autoPopulateFromMetadata } = useSettingsStore.getState();
        autoPopulateFromMetadata(formMetadata);
        setExtractedFormMetadata(formMetadata);
        console.log(`✓ Auto-populated settings: ${formMetadata.companyName} - ${formMetadata.formName}`);
      }

      // Store metadata for each page
      metadata.forEach(m => setPageMetadata(m.pageNumber, m));

      // Ask user if they want to replace or merge fields (if existing fields present)
      if (fields.length > 0) {
        const replace = confirm(
          `AI זיהה ${extractedFields.length} שדות.\n\n` +
          `האם להחליף את השדות הקיימים (${fields.length})?\n\n` +
          `לחץ "אישור" להחלפה או "ביטול" למיזוג`,
        );

        if (replace) {
          // Replace all fields
          loadFields(extractedFields);
          alert(`✅ ${extractedFields.length} שדות זוהו והחליפו את השדות הקיימים!`);
        } else {
          // Merge fields (add to existing)
          loadFields([...fields, ...extractedFields]);
          alert(
            `✅ ${extractedFields.length} שדות זוהו ונוספו!\n` +
            `סה"כ שדות כעת: ${fields.length + extractedFields.length}`,
          );
        }
      } else {
        // No existing fields - just populate
        loadFields(extractedFields);

        // Build success message
        let successMessage = `✅ ${extractedFields.length} שדות זוהו בהצלחה באמצעות AI!\n\n`;
        if (formMetadata && formMetadata.confidence !== 'low') {
          successMessage += `📋 זוהה טופס: ${formMetadata.formName}\n`;
          successMessage += `🏢 חברה: ${formMetadata.companyName}\n\n`;
          successMessage += `ההגדרות עודכנו אוטומטית.\n\n`;
        }
        successMessage += `ניתן לערוך אותם או להוסיף שדות נוספים.`;

        alert(successMessage);
      }

      console.log(`✓ AI extracted ${extractedFields.length} fields from PDF`);
    } catch (error) {
      console.error('Error extracting fields with AI:', error);
      alert(
        'שגיאה בזיהוי שדות באמצעות AI.\n\n' +
        `שגיאה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}\n\n` +
        'ודא שהגדרת את GEMINI_API_KEY ב-Vercel.',
      );
    } finally {
      setIsExtractingFields(false);
    }
  };

  const handleExportHtml = async () => {
    if (fields.length === 0) {
      alert('אין שדות לייצוא. אנא הוסף לפחות שדה אחד.');
      return;
    }

    // Open dialog and start generation
    setIsHtmlDialogOpen(true);
    setIsGeneratingHtml(true);
    setGeneratedHtml(null);
    setHtmlLoadingStatus('מתחיל יצירת HTML...');

    try {
      // Import HTML generation utilities
      const { generateHtmlForm } = await import('@/services/html-generation');

      // Get PDF filename for title
      const formTitle = pdfFile?.name?.replace(/\.pdf$/i, '') || 'טופס';

      const result = await generateHtmlForm(
        fields,
        {
          formTitle,
          generationMethod: 'auto', // Try AI first, fallback to template
        },
        (status) => setHtmlLoadingStatus(status),
      );

      setGeneratedHtml(result);
      console.log(`✓ HTML form generated: ${result.formId} (method: ${result.metadata.method})`);
    } catch (error) {
      console.error('Error generating HTML:', error);
      alert(
        'שגיאה ביצירת HTML.\n\n' +
        `שגיאה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`,
      );
      setIsHtmlDialogOpen(false);
    } finally {
      setIsGeneratingHtml(false);
    }
  };

  const handleCloseHtmlDialog = () => {
    setIsHtmlDialogOpen(false);
    setGeneratedHtml(null);
    setHtmlLoadingStatus('');
  };

  const handlePublish = () => {
    if (!user) {
      alert('יש להתחבר כדי לפרסם טפסים.');
      return;
    }

    // Check permissions in organization context
    if (orgId && !currentFormId && !canCreateForm) {
      alert('אין לך הרשאה ליצור טפסים בארגון זה.');
      return;
    }

    if (orgId && currentFormId && !canUpdateForm) {
      alert('אין לך הרשאה לעדכן טפסים בארגון זה.');
      return;
    }

    if (fields.length === 0) {
      alert('אין שדות לפרסום. אנא הוסף לפחות שדה אחד.');
      return;
    }

    // Open publish dialog
    setIsPublishDialogOpen(true);
  };

  const handlePublishConfirm = async (notes?: string) => {
    if (!user || !pdfFile) return;

    setIsPublishing(true);

    try {
      const token = await getToken();

      // Step 1: Create form in database (if not already created)
      let formId = currentFormId;

      if (!formId) {
        const createResponse = await fetch('/api/v1/forms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: pdfFile.name.replace(/\.pdf$/i, '') || 'טופס',
            description: extractedFormMetadata?.formName,
            fields: fields,
            settings: settings,
          }),
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.message || 'Failed to create form');
        }

        const createResult = await createResponse.json();
        formId = createResult.form?.id;

        if (!formId) {
          throw new Error('Form created but no ID returned');
        }

        setCurrentFormId(formId);
        console.log('✓ Form created with ID:', formId);
      }

      // Step 2: Publish the form (update status to published)
      const publishResponse = await fetch(`/api/v1/forms/${formId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'published',
          settings: notes ? { ...settings, publishNotes: notes } : settings
        }),
      });

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        throw new Error(error.message || 'Failed to publish form');
      }

      const form = await publishResponse.json();

      // Step 3: Update state with URLs
      // Construct public URL from form slug
      const baseUrl = window.location.origin;
      const publicUrl = `${baseUrl}/f/${form.slug}`;

      setPublishedUrl(publicUrl);
      setShortUrl(form.short_url || null);
      setFormStatus('published');

      console.log('✓ Form published successfully');
    } catch (error) {
      console.error('Error publishing form:', error);
      alert(
        'שגיאה בפרסום הטופס.\n\n' +
        `שגיאה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`,
      );
      setIsPublishDialogOpen(false);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleViewHistory = () => {
    if (!currentFormId) {
      alert('אין טופס פעיל לצפייה בהיסטוריה.');
      return;
    }

    setIsHistoryDialogOpen(true);
  };

  const handleRestoreVersion = async (versionNumber: number, notes?: string) => {
    if (!user || !currentFormId) return;

    try {
      const token = await getToken();
      const response = await fetch(
        `/api/form-versions?formId=${currentFormId}&action=restore&version=${versionNumber}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ notes }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to restore version');
      }

      const result = await response.json();

      // Update form fields to show restored version
      if (result.form && result.form.fields) {
        loadFields(result.form.fields);
      }

      // Update form status
      setFormStatus('published');
      console.log(`✓ Version ${versionNumber} restored successfully`);

      // Show success message to user
      alert(`✅ גרסה ${versionNumber} שוחזרה בהצלחה!\n\nהטופס עודכן עם השדות מהגרסה המשוחזרת.`);
    } catch (error) {
      console.error('Error restoring version:', error);
      alert(
        'שגיאה בשחזור גרסה.\n\n' +
        `שגיאה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`,
      );
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-background" dir={direction}>
      {/* Recovery Dialog */}
      {recoveryData && (
        <RecoveryDialog
          recoveryData={recoveryData}
          onRestore={handleRestore}
          onDiscard={handleDiscardRecovery}
        />
      )}

      {/* Upload Warning Dialog */}
      {showUploadWarning && (
        <UploadWarningDialog
          fieldCount={fields.length}
          onNewDocument={handleUploadWarningNewDocument}
          onNewVersion={handleUploadWarningNewVersion}
          onCancel={handleUploadWarningCancel}
        />
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={fieldTemplateInputRef}
        type="file"
        accept="application/json"
        onChange={handleFieldTemplateChange}
        style={{ display: 'none' }}
      />

      <TopToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        zoomLevel={zoomLevel}
        onPageChange={setCurrentPage}
        onZoomChange={setZoomLevel}
        onUpload={handleUpload}
        onSave={handleSave}
        onSettings={() => setIsSettingsOpen(true)}
        hasDocument={!!pdfFile}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onExtractFields={handleExtractFields}
        isExtractingFields={isExtractingFields}
        onExportHtml={handleExportHtml}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        formStatus={formStatus}
        onViewHistory={handleViewHistory}
      />

      {/* Tools Bar - Field Creation Tools */}
      {pdfFile && !isMobile && <ToolsBar activeTool={activeTool} onToolChange={setActiveTool} />}

      {/* Mobile Toolbar - Bottom Navigation (Mobile Only) */}
      {pdfFile && isMobile && (
        <EditorMobileToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          showLabels={true}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* HTML Preview Dialog */}
      <HtmlPreviewDialog
        isOpen={isHtmlDialogOpen}
        onClose={handleCloseHtmlDialog}
        result={generatedHtml}
        isLoading={isGeneratingHtml}
        loadingStatus={htmlLoadingStatus}
        pdfFileName={pdfFile?.name}
        pdfFile={pdfFile}
        fields={fields}
        formMetadata={extractedFormMetadata}
      />

      {/* Publish Dialog */}
      <PublishDialog
        open={isPublishDialogOpen}
        onOpenChange={setIsPublishDialogOpen}
        formId="temp-form-id"
        formTitle={pdfFile?.name?.replace(/\.pdf$/i, '') || 'טופס'}
        onPublish={handlePublishConfirm}
        isPublishing={isPublishing}
        publishedUrl={publishedUrl}
        shortUrl={shortUrl}
        isPremiumUser={false}
      />

      {/* Version History Dialog */}
      <VersionHistory
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        formId={currentFormId || ''}
        onRestore={handleRestoreVersion}
      />

      {/* Error Dialog */}
      <ErrorDialog
        open={errorDialogOpen}
        onOpenChange={setErrorDialogOpen}
        title={errorDialogTitle}
        errors={errorDialogErrors}
        description="ניתן להעתיק את השגיאות ולתקן את השדות"
      />

      <MainLayout>
        {/* Page Thumbnail Sidebar - Desktop Only */}
        {pdfFile && totalPages > 0 && !isMobile && (
          <PageThumbnailSidebar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageSelect={setCurrentPage}
            thumbnails={thumbnails}
            onReprocessPage={handleReprocessPage}
            isReprocessing={isReprocessing}
            reprocessingPage={reprocessingPage}
          />
        )}

        {/* PDF Viewer - Main Canvas */}
        <PDFViewer
          file={pdfFile}
          pageNumber={currentPage}
          scale={zoomLevel}
          userId={user?.id}
          onLoadSuccess={handlePDFLoadSuccess}
          onLoadError={handlePDFLoadError}
          onPageRender={handlePageRender}
          onZoomChange={setZoomLevel}
        />

        {/* Field List Sidebar - Desktop Only */}
        {pdfFile && !isMobile && (
          <FieldListSidebar
            fields={fields}
            selectedFieldId={selectedFieldId}
            selectedFieldIds={selectedFieldIds}
            currentPage={currentPage}
            errorFieldIds={errorFieldIds}
            onFieldSelect={selectField}
            onToggleFieldSelection={toggleFieldSelection}
            onFieldDelete={deleteField}
            onPageNavigate={setCurrentPage}
            hoveredFieldId={hoveredFieldId}
            onFieldHover={setHoveredField}
            onLoadFieldsFromHistory={handleLoadFieldsFromHistory}
          />
        )}

        {/* Mobile Toolbar Spacer - Prevents content from being hidden behind toolbar */}
        {pdfFile && isMobile && <EditorMobileToolbarSpacer />}
      </MainLayout>
    </div>
  );
}

// Named export above
