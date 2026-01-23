import {
  Upload,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Settings,
  Download,
  Sparkles,
  Globe,
  History,
  Layout,
  Share2,
  ChevronDown,
  Moon,
  Sun,
  Languages,
  Home,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTranslation, useDirection } from '@/i18n';
import { useAppStore } from '@/store/appStore';

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
  onExtractFields?: () => void;
  isExtractingFields?: boolean;
  onPublish?: () => void;
  isPublishing?: boolean;
  formStatus?: 'draft' | 'published' | 'archived';
  onViewHistory?: () => void;
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
  onExtractFields,
  isExtractingFields = false,
  onPublish,
  isPublishing = false,
  formStatus = 'draft',
  onViewHistory,
}: TopToolbarProps) => {
  const t = useTranslation();
  const direction = useDirection();
  const navigate = useNavigate();
  const { theme, toggleTheme, language, setLanguage } = useAppStore();
  const isDark = theme === 'dark';
  const isRTL = direction === 'rtl';

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const handleZoomIn = () => onZoomChange(Math.min(zoomLevel + 10, 200));
  const handleZoomOut = () => onZoomChange(Math.max(zoomLevel - 10, 50));

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <header
      className="w-full h-16 glass backdrop-blur-2xl border-b border-border flex items-center px-6 gap-4 z-50 sticky top-0"
      dir={direction}
    >
      {/* Brand & File Info */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Home button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleGoHome}
          className="h-9 w-9 rounded-xl hover:bg-primary/10"
          title={t.backToDashboard}
        >
          <Home className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2 group cursor-pointer" onClick={handleGoHome}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <Layout className="text-white w-5 h-5" />
          </div>
          <span className="font-bold hidden md:block">Right<span className="text-primary">Flow</span></span>
        </div>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-bold truncate max-w-[150px]">
              {hasDocument ? t.currentDocument : t.untitledForm}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {t[formStatus]}
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-4">
        {/* Navigation & Controls */}
        {hasDocument && (
          <div className="glass bg-muted/30 px-3 py-1.5 rounded-2xl flex items-center gap-4 border border-white/10 shadow-sm">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onUndo} disabled={!canUndo} title={t.undo}>
                <Undo className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onRedo} disabled={!canRedo} title={t.redo}>
                <Redo className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-4" />

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handlePreviousPage} disabled={currentPage === 1} title={t.previousPage}>
                <PrevIcon className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-bold min-w-[60px] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handleNextPage} disabled={currentPage === totalPages} title={t.nextPage}>
                <NextIcon className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-4" />

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handleZoomOut} disabled={zoomLevel <= 50} title={t.zoomOut}>
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-bold min-w-[35px] text-center">{zoomLevel}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handleZoomIn} disabled={zoomLevel >= 200} title={t.zoomIn}>
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden md:flex items-center gap-1 mr-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 rounded-xl" title={isDark ? t.lightMode : t.darkMode}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
            className="h-9 rounded-xl font-bold text-[10px] uppercase"
          >
            <Languages className="w-4 h-4 mr-1.5" />
            {language}
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6 hidden md:block" />

        {!hasDocument ? (
          <Button onClick={onUpload} className="btn-primary py-1.5 px-4 text-sm h-9 flex items-center gap-2 shadow-none ml-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">{t.uploadPdf}</span>
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onExtractFields}
              disabled={isExtractingFields}
              className={`h-9 rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 gap-2 transition-all ${isExtractingFields ? 'animate-pulse' : ''}`}
              title={isExtractingFields ? t.detecting : t.autoDetect}
            >
              <Sparkles className={`w-4 h-4 ${isExtractingFields ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{isExtractingFields ? t.detecting : t.autoDetect}</span>
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onUpload} className="h-9 w-9 rounded-xl" title={t.uploadPdf}>
                <Upload className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onSettings} className="h-9 w-9 rounded-xl" title={t.settings}>
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onViewHistory} className="h-9 w-9 rounded-xl" title={t.viewHistory}>
                <History className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>

            <div className="flex items-center gap-2 ml-2">
              <Button variant="outline" size="sm" onClick={onSave} className="h-9 rounded-xl gap-2 font-bold px-4" title={t.export}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{t.export}</span>
              </Button>
              <Button onClick={onPublish} disabled={isPublishing} className="btn-primary h-9 rounded-xl px-5 flex items-center gap-2 shadow-none" title={isPublishing ? t.publishing : t.publish}>
                {isPublishing ? <Globe className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isPublishing ? t.publishing : t.publish}</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
