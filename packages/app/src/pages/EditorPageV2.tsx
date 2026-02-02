/**
 * EditorPageV2 - Modern Editor with FloatingNavbar
 * Advanced form workflow editor with comprehensive feature set
 *
 * INTEGRATED FEATURES:
 * ✅ AI Field Extraction - Automatic field detection using Gemini AI (handleAIExtract)
 * ✅ Drag-and-Drop - Field manipulation via FieldOverlay in PDFViewer
 * ✅ Multi-Selection - Keyboard shortcuts (Shift/Ctrl+Click) via useTemplateEditorStore
 * ✅ RTL Support - Full Hebrew/Arabic text direction handling
 * ✅ Undo/Redo - History management via Zustand store
 * ✅ Tools Bar - Field creation tools (text, checkbox, radio, signature, etc.)
 * ✅ Floating Navbar - Draggable navigation with keyboard shortcuts
 * ✅ Field List Sidebar - Visual field management with thumbnails
 * ✅ Page Thumbnails - Multi-page PDF navigation
 * ✅ Settings Management - Form configuration and preferences
 *
 * KEYBOARD SHORTCUTS:
 * - Ctrl+O: Upload PDF
 * - Ctrl+I: AI Field Extraction
 * - Ctrl+Z: Undo
 * - Ctrl+Y: Redo
 * - Ctrl+S: Save
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { FloatingNavbar } from '@/components/editor/FloatingNavbar';
import { ToolsBar } from '@/components/layout/ToolsBar';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageThumbnailSidebar } from '@/components/layout/PageThumbnailSidebar';
import { PDFViewer } from '@/components/pdf/PDFViewer';
import { FieldListSidebar } from '@/components/fields/FieldListSidebar';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { useUser } from '@clerk/clerk-react';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDirection } from '@/i18n';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { generateThumbnails } from '@/utils/pdfThumbnails';

export function EditorPageV2() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
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
    undo,
    redo,
    canUndo,
    canRedo,
    hoveredFieldId,
    setHoveredField,
  } = useTemplateEditorStore();

  const { settings } = useSettingsStore();
  const direction = useDirection();
  const { user } = useUser();
  const isMobile = useIsMobile();

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.includes('pdf')) {
      alert('אנא בחר קובץ PDF');
      return;
    }

    setPdfFile(file);
    setCurrentPage(1);
    setThumbnails([]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePDFLoadSuccess = async (pdf: any) => {
    setTotalPages(pdf.numPages);
    setPdfDocument(pdf);
    console.log(`PDF loaded successfully with ${pdf.numPages} pages`);

    // Generate thumbnails
    if (pdfFile) {
      try {
        const thumbnailUrls = await generateThumbnails(pdfFile);
        setThumbnails(thumbnailUrls);
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

  const handleSave = () => {
    if (!pdfFile) {
      alert('אין PDF להורדה');
      return;
    }
    if (fields.length === 0) {
      alert('אין שדות להוספה');
      return;
    }
    // TODO: Implement save logic
    console.log('Save clicked');
  };

  const handleAIExtract = async () => {
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

      const { fields: extractedFields, metadata } = await extractFieldsWithAI(pdfFile, (status) => {
        console.log(`AI Extraction: ${status}`);
      });

      if (extractedFields.length === 0) {
        alert('לא נמצאו שדות ב-PDF.\n\nיתכן שה-PDF אינו מכיל טפסים או שה-AI לא הצליח לזהות שדות.');
        return;
      }

      // Store metadata for each page
      const { setPageMetadata, loadFields } = useTemplateEditorStore.getState();
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
        alert(
          `✅ ${extractedFields.length} שדות זוהו בהצלחה באמצעות AI!\n\n` +
          `ניתן לערוך אותם או להוסיף שדות נוספים.`
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

  // FloatingNavbar configuration
  const navbarTabs = [
    { id: 'edit', label: 'עריכה', icon: 'edit' },
    { id: 'preview', label: 'תצוגה מקדימה', icon: 'eye' },
    { id: 'settings', label: 'הגדרות', icon: 'settings' },
  ];

  const navbarActions = [
    {
      id: 'upload',
      label: 'העלאת PDF',
      icon: 'upload',
      onClick: handleUpload,
      group: 'file',
      shortcut: 'Ctrl+O',
    },
    {
      id: 'ai-extract',
      label: 'זיהוי שדות באמצעות AI',
      icon: 'sparkles',
      onClick: handleAIExtract,
      disabled: !pdfFile || isExtractingFields,
      group: 'file',
      shortcut: 'Ctrl+I',
    },
    {
      id: 'undo',
      label: 'ביטול',
      icon: 'undo',
      onClick: undo,
      disabled: !canUndo(),
      group: 'edit',
      shortcut: 'Ctrl+Z',
    },
    {
      id: 'redo',
      label: 'חזרה',
      icon: 'redo',
      onClick: redo,
      disabled: !canRedo(),
      group: 'edit',
      shortcut: 'Ctrl+Y',
    },
    {
      id: 'save',
      label: 'שמירה',
      icon: 'save',
      onClick: handleSave,
      disabled: !pdfFile || fields.length === 0,
      group: 'file',
      shortcut: 'Ctrl+S',
    },
    {
      id: 'publish',
      label: 'פרסום',
      icon: 'publish',
      onClick: () => alert('פרסום יתווסף בהמשך'),
      disabled: !pdfFile || fields.length === 0,
      group: 'file',
    },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);

    // Handle tab-specific actions
    if (tabId === 'settings') {
      setIsSettingsOpen(true);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-background" dir={direction}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* FloatingNavbar - The star of the show! */}
      <FloatingNavbar
        tabs={navbarTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        actions={navbarActions}
        direction={direction}
        draggable={true}
        position={{ top: 16, [direction === 'rtl' ? 'right' : 'left']: 16 }}
      />

      {/* Tools Bar - Field Creation Tools */}
      {pdfFile && !isMobile && <ToolsBar activeTool={activeTool} onToolChange={setActiveTool} />}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setActiveTab('edit');
        }}
      />

      <MainLayout>
        {/* Page Thumbnail Sidebar - Desktop Only */}
        {pdfFile && totalPages > 0 && !isMobile && (
          <PageThumbnailSidebar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageSelect={setCurrentPage}
            thumbnails={thumbnails}
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
            errorFieldIds={[]}
            onFieldSelect={selectField}
            onToggleFieldSelection={toggleFieldSelection}
            onFieldDelete={deleteField}
            onPageNavigate={setCurrentPage}
            hoveredFieldId={hoveredFieldId}
            onFieldHover={setHoveredField}
          />
        )}
      </MainLayout>

      {/* Version Badge */}
      <div
        className="fixed bottom-4 left-4 bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-medium"
        style={{ zIndex: 9999 }}
      >
        EditorV2 (Beta)
      </div>
    </div>
  );
}
