import { Upload, Save, ChevronRight, ChevronLeft, ZoomIn, ZoomOut, Undo, Redo, Settings, Download, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface TopToolbarProps {
  currentPage: number;
  totalPages: number;
  zoomLevel: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onUpload: () => void;
  onSave: () => void;
  onSettings: () => void;
  hasDocument: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSaveFields?: () => void;
  onLoadFields?: () => void;
  hasFields?: boolean;
}

export const TopToolbar = ({
  currentPage,
  totalPages,
  zoomLevel,
  onPageChange,
  onZoomChange,
  onUpload,
  onSave,
  onSettings,
  hasDocument,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onSaveFields,
  onLoadFields,
  hasFields = false,
}: TopToolbarProps) => {
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    onZoomChange(Math.min(zoomLevel + 10, 200));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoomLevel - 10, 50));
  };

  return (
    <div className="w-full h-14 bg-toolbar-bg border-b border-border flex items-center px-4 gap-3 shadow-sm" dir="rtl">
      {/* File operations - right side (RTL) */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onUpload} className="gap-2">
          <Upload className="w-4 h-4" />
          העלה PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={!hasDocument}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          שמור PDF
        </Button>
        <Button variant="outline" size="sm" onClick={onSettings} className="gap-2">
          <Settings className="w-4 h-4" />
          הגדרות
        </Button>
      </div>

      {hasDocument && (
        <>
          <Separator orientation="vertical" className="h-8" />

          {/* Field template operations */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSaveFields}
              disabled={!hasFields}
              title="שמור שדות כתבנית"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              שמור שדות
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadFields}
              title="טען שדות מתבנית"
              className="gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              טען שדות
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Undo/Redo */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              title="בטל (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              title="בצע שוב (Ctrl+Shift+Z)"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1" /> {/* Spacer to push remaining items to left */}

          {/* Navigation - center-left */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              title="עמוד הבא"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm min-w-[100px] text-center font-medium">
              עמוד {currentPage} מתוך {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              title="עמוד קודם"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Zoom controls - left side */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              title="הקטן"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm min-w-12 text-center font-medium">{zoomLevel}%</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              title="הגדל"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
