/**
 * PDF Canvas Component
 * Main component for displaying and editing PDF documents with form fields
 */

import { useRef, useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { usePDFCanvasHandlers } from './hooks/usePDFCanvasHandlers';
import { PDFCanvasOverlays } from './PDFCanvasOverlays';
import { PDFCanvasPropertiesPanels } from './PDFCanvasPropertiesPanels';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFCanvasProps {
  file: File | null;
  pageNumber: number;
  scale: number;
  userId?: string; // User ID for data source management
  onLoadSuccess: (pdf: any) => void;
  onLoadError: (error: Error) => void;
  onPageRender: (page: any) => void;
}

export const PDFCanvas = ({
  file,
  pageNumber,
  scale,
  userId,
  onLoadSuccess,
  onLoadError,
  onPageRender,
}: PDFCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const justDraggedRef = useRef(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Zustand stores
  const {
    activeTool,
    fields,
    selectedFieldId,
    selectedFieldIds,
    pageDimensions,
    pdfDocument,
    updateField,
    updateFieldWithUndo,
    deleteFieldWithUndo,
    deleteMultipleFieldsWithUndo,
    updateMultipleFields,
    selectField,
    clearSelection,
    setCanvasWidth: setStoreCanvasWidth,
    getFieldsForPage,
  } = useTemplateEditorStore();

  const currentPageFields = getFieldsForPage(pageNumber);
  const currentPageDimensions = pageDimensions[pageNumber];

  const handlePageLoadSuccess = useCallback(
    (page: any) => {
      // In react-pdf, page object has width/height properties directly
      const width = page.originalWidth || page.width;
      const height = page.originalHeight || page.height;

      const scaledWidth = width * (scale / 100);
      setCanvasWidth(scaledWidth);
      setStoreCanvasWidth(scaledWidth);

      // Store page dimensions for coordinate conversion
      onPageRender({ getSize: () => ({ width, height }) });
    },
    [scale, onPageRender, setStoreCanvasWidth],
  );

  // Event handlers from hook
  const {
    handleCanvasMouseDown,
    handleCanvasClick,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  } = usePDFCanvasHandlers({
    containerRef,
    pageNumber,
    scale,
    canvasWidth,
    currentPageDimensions,
    currentPageFields,
    justDraggedRef,
    setShowDeleteConfirm,
  });

  if (!file) {
    return null;
  }

  return (
    <div className="flex justify-center items-center p-4">
      <div
        ref={containerRef}
        className="relative"
        onMouseDown={handleCanvasMouseDown}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        style={{
          cursor:
            activeTool === 'text-field' || activeTool === 'dropdown-field' || activeTool === 'signature-field' || activeTool === 'static-text-field'
              ? 'crosshair'
              : activeTool === 'checkbox-field' || activeTool === 'radio-field'
                ? 'copy'
                : 'default',
        }}
      >
        <Document
          file={file}
          onLoadSuccess={onLoadSuccess}
          onLoadError={onLoadError}
          loading={<div className="text-muted-foreground">טוען PDF...</div>}
          error={<div className="text-destructive">שגיאה בטעינת PDF</div>}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale / 100}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="pdf-page"
            loading={<div className="text-muted-foreground">טוען עמוד...</div>}
            onLoadSuccess={handlePageLoadSuccess}
          />
        </Document>

        {/* All overlays (guidance texts, fields, drag preview, marquee) */}
        <PDFCanvasOverlays
          pageNumber={pageNumber}
          canvasWidth={canvasWidth}
          currentPageDimensions={currentPageDimensions}
          currentPageFields={currentPageFields}
          scale={scale}
          onFieldUpdate={updateField}
          onFieldDelete={deleteFieldWithUndo}
        />
      </div>

      {/* Properties panels and dialogs */}
      <PDFCanvasPropertiesPanels
        fields={fields}
        selectedFieldId={selectedFieldId}
        selectedFieldIds={selectedFieldIds}
        showDeleteConfirm={showDeleteConfirm}
        pdfDocument={pdfDocument}
        pageNumber={pageNumber}
        userId={userId}
        onFieldUpdate={(id, updates) => updateFieldWithUndo(id, updates)}
        onMultipleFieldsUpdate={updateMultipleFields}
        onMultipleFieldsDelete={deleteMultipleFieldsWithUndo}
        onFieldDeselect={() => selectField(null)}
        onClearSelection={clearSelection}
        onDeleteConfirmClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
