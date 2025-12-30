import { RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PageThumbnailSidebarProps {
  currentPage: number;
  totalPages: number;
  onPageSelect: (page: number) => void;
  thumbnails: string[]; // Array of data URLs or blob URLs for thumbnails
  onReprocessPage?: (page: number) => void;
  isReprocessing?: boolean;
  reprocessingPage?: number | null;
}

export const PageThumbnailSidebar = ({
  currentPage,
  totalPages,
  onPageSelect,
  thumbnails,
  onReprocessPage,
  isReprocessing = false,
  reprocessingPage = null,
}: PageThumbnailSidebarProps) => {
  return (
    <div className="w-32 h-full bg-sidebar-bg border-l border-border overflow-y-auto p-2">
      {Array.from({ length: totalPages }, (_, index) => {
        const pageNumber = index + 1;
        const isCurrentPage = pageNumber === currentPage;
        const thumbnailUrl = thumbnails[index];
        const isThisPageReprocessing = isReprocessing && reprocessingPage === pageNumber;

        return (
          <div
            key={pageNumber}
            className={cn(
              'group relative mb-2 cursor-pointer border-2 rounded transition-all hover:shadow-md',
              isCurrentPage
                ? 'border-primary shadow-md'
                : 'border-transparent hover:border-gray-300',
            )}
            onClick={() => onPageSelect(pageNumber)}
            title={`עמוד ${pageNumber}`}
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={`עמוד ${pageNumber}`}
                className="w-full"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-[1/1.414] bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-xs">
                  {pageNumber}
                </span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs text-center py-1">
              {pageNumber}
            </div>
            {/* Reprocess button - appears on hover */}
            {onReprocessPage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReprocessPage(pageNumber);
                }}
                disabled={isReprocessing}
                className={cn(
                  'absolute top-1 right-1 p-1 rounded bg-blue-600 text-white',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
                  isThisPageReprocessing && 'opacity-100'
                )}
                title={`עבד מחדש עמוד ${pageNumber}`}
              >
                <RefreshCw
                  className={cn('w-3 h-3', isThisPageReprocessing && 'animate-spin')}
                />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
