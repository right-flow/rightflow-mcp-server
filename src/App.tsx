import { useRef, useState, useEffect, useMemo } from 'react';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { ToolsBar } from '@/components/layout/ToolsBar';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageThumbnailSidebar } from '@/components/layout/PageThumbnailSidebar';
import { PDFViewer } from '@/components/pdf/PDFViewer';
import { FieldListSidebar } from '@/components/fields/FieldListSidebar';
import { RecoveryDialog } from '@/components/dialogs/RecoveryDialog';
import { UploadWarningDialog } from '@/components/dialogs/UploadWarningDialog';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { VersionDisplay } from '@/components/ui/VersionDisplay';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { useSettingsStore } from '@/store/settingsStore';
import { generateThumbnails } from '@/utils/pdfThumbnails';
import { getFieldsWithErrors } from '@/utils/inputSanitization';
import {
  loadRecoveryData,
  clearRecoveryData,
  setupAutoSave,
  RecoveryData,
} from '@/utils/crashRecovery';

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldTemplateInputRef = useRef<HTMLInputElement>(null);
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showUploadWarning, setShowUploadWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isExtractingFields, setIsExtractingFields] = useState(false);

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
    setPdfFile,
    setCurrentPage,
    setTotalPages,
    setThumbnails,
    setZoomLevel,
    setActiveTool,
    setPageDimensions,
    selectField,
    deleteField,
    restoreFromRecovery,
    undo,
    redo,
    canUndo,
    canRedo,
    loadFields,
    updateFieldWithUndo,
  } = useTemplateEditorStore();

  const { settings } = useSettingsStore();

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

      // Auto-generate missing field names
      const fieldsWithNames = ensureFieldNames(fields);

      // Update fields in store if any names were auto-generated
      const hasChanges = fieldsWithNames.some((f, i) => f.name !== fields[i].name);
      if (hasChanges) {
        console.log('Auto-generated missing field names');
        // Update each field that changed
        fieldsWithNames.forEach((field, index) => {
          if (field.name !== fields[index].name) {
            updateFieldWithUndo(field.id, { name: field.name });
          }
        });
      }

      // Validate fields before generation
      const errors = validateFieldsForPDF(fieldsWithNames);
      if (errors.length > 0) {
        alert(`שגיאות בשדות:\n\n${errors.join('\n')}`);
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

  const handleSaveFields = async () => {
    if (fields.length === 0) {
      alert('אין שדות לשמירה. אנא הוסף לפחות שדה אחד.');
      return;
    }

    try {
      // Import field template utilities
      const { saveFieldsToFile } = await import('@/utils/fieldTemplates');

      // Prompt for template name
      const templateName = prompt('הכנס שם לתבנית:', `template_${Date.now()}`);
      if (!templateName) return; // User cancelled

      // Save fields to JSON file
      saveFieldsToFile(fields, templateName);

      alert(`✅ תבנית השדות נשמרה בהצלחה!\nקובץ: ${templateName}.json\nשדות: ${fields.length}`);
    } catch (error) {
      console.error('Error saving fields:', error);
      alert(`שגיאה בשמירת שדות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    }
  };

  const handleLoadFields = () => {
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
      alert(`שגיאה בטעינת שדות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
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

      // Extract fields using Gemini AI
      const extractedFields = await extractFieldsWithAI(pdfFile, (status) => {
        console.log(`AI Extraction: ${status}`);
      });

      if (extractedFields.length === 0) {
        alert('לא נמצאו שדות ב-PDF.\n\nיתכן שה-PDF אינו מכיל טפסים או שה-AI לא הצליח לזהות שדות.');
        return;
      }

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
        alert(
          `✅ ${extractedFields.length} שדות זוהו בהצלחה באמצעות AI!\n\n` +
            `ניתן לערוך אותם או להוסיף שדות נוספים.`,
        );
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

  return (
    <div className="w-screen h-screen flex flex-col" dir="rtl">
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
        onSaveFields={handleSaveFields}
        onLoadFields={handleLoadFields}
        onExtractFields={handleExtractFields}
        isExtractingFields={isExtractingFields}
        hasFields={fields.length > 0}
      />

      {/* Tools Bar - Field Creation Tools */}
      {pdfFile && <ToolsBar activeTool={activeTool} onToolChange={setActiveTool} />}

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <MainLayout>
        {pdfFile && totalPages > 0 && (
          <PageThumbnailSidebar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageSelect={setCurrentPage}
            thumbnails={thumbnails}
          />
        )}
        <PDFViewer
          file={pdfFile}
          pageNumber={currentPage}
          scale={zoomLevel}
          onLoadSuccess={handlePDFLoadSuccess}
          onLoadError={handlePDFLoadError}
          onPageRender={handlePageRender}
        />
        {pdfFile && fields.length > 0 && (
          <FieldListSidebar
            fields={fields}
            selectedFieldId={selectedFieldId}
            currentPage={currentPage}
            errorFieldIds={errorFieldIds}
            onFieldSelect={selectField}
            onFieldDelete={deleteField}
            onPageNavigate={setCurrentPage}
          />
        )}
      </MainLayout>

      <VersionDisplay />
    </div>
  );
}

export default App;
