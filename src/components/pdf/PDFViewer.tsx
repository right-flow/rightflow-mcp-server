import { PDFCanvas } from './PDFCanvas';

interface PDFViewerProps {
  file: File | null;
  pageNumber: number;
  scale: number;
  userId?: string; // User ID for data source management
  onLoadSuccess: (pdf: any) => void;
  onLoadError: (error: Error) => void;
  onPageRender: (page: any) => void;
}

export const PDFViewer = ({
  file,
  pageNumber,
  scale,
  userId,
  onLoadSuccess,
  onLoadError,
  onPageRender,
}: PDFViewerProps) => {
  return (
    <div className="flex-1 pdf-viewer-container">
      {file ? (
        <PDFCanvas
          file={file}
          pageNumber={pageNumber}
          scale={scale}
          userId={userId}
          onLoadSuccess={onLoadSuccess}
          onLoadError={onLoadError}
          onPageRender={onPageRender}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg mb-2">טען PDF כדי להתחיל</p>
            <p className="text-sm">לחץ על "העלה PDF" בסרגל הכלים</p>
          </div>
        </div>
      )}
    </div>
  );
};
