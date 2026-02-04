import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Visual progress indicator for AI field extraction
 * Displays on PDF canvas with animated spinner and Hebrew RTL text
 */
export const ExtractionProgressOverlay = () => {
  const { isExtractingFields, extractionProgress } = useTemplateEditorStore();

  // Don't render if not extracting or no progress data
  if (!isExtractingFields || !extractionProgress) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 min-w-[320px] text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Spinner */}
          <div className="flex justify-center mb-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </div>

          {/* Primary message (RTL Hebrew) */}
          <p
            className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 text-right"
            dir="rtl"
          >
            {extractionProgress.message}
          </p>

          {/* Optional: Page progress */}
          {extractionProgress.currentPage && extractionProgress.totalPages && (
            <p
              className="text-sm text-gray-600 dark:text-gray-400 text-right"
              dir="rtl"
            >
              עמוד {extractionProgress.currentPage} מתוך {extractionProgress.totalPages}
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
