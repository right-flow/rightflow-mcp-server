/**
 * Photo Gallery Component
 * Displays a grid of captured photos with zoom and delete functionality
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Trash2, ZoomIn } from 'lucide-react';
import { db } from '@/db/indexedDB';
import type { Asset } from '@/db/schema';

interface PhotoGalleryProps {
  /** Array of photo IDs to display */
  photoIds: string[];
  /** Callback when a photo is deleted */
  onDelete?: (photoId: string) => void;
  /** Maximum number of columns in grid */
  columns?: number;
}

interface PhotoWithURL extends Asset {
  objectURL: string;
}

/**
 * Photo Gallery - Grid display with fullscreen preview
 *
 * @example
 * ```tsx
 * const [photos, setPhotos] = useState(['photo-id-1', 'photo-id-2']);
 *
 * <PhotoGallery
 *   photoIds={photos}
 *   onDelete={(id) => setPhotos(photos.filter(p => p !== id))}
 *   columns={3}
 * />
 * ```
 */
export function PhotoGallery({
  photoIds,
  onDelete,
  columns = 3,
}: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<PhotoWithURL[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithURL | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Ref to track current object URLs for cleanup
  const objectURLsRef = useRef<string[]>([]);

  /**
   * Load photos from IndexedDB and create object URLs
   */
  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      // Revoke old object URLs before creating new ones
      objectURLsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectURLsRef.current = [];

      const loadedPhotos: PhotoWithURL[] = [];

      for (const id of photoIds) {
        const asset = await db.getAsset(id);
        if (asset && asset.type === 'photo') {
          const objectURL = URL.createObjectURL(asset.blob);
          objectURLsRef.current.push(objectURL);
          loadedPhotos.push({ ...asset, objectURL });
        }
      }

      setPhotos(loadedPhotos);
    } catch (err) {
      console.error('[PhotoGallery] Failed to load photos:', err);
    } finally {
      setLoading(false);
    }
  }, [photoIds]);

  // Load photos from IndexedDB
  useEffect(() => {
    loadPhotos();
    return () => {
      // Cleanup object URLs using ref (always has current URLs)
      objectURLsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectURLsRef.current = [];
    };
  }, [loadPhotos]);

  /**
   * Handle photo deletion with confirmation
   */
  const handleDelete = async (photoId: string) => {
    // Show confirmation
    const confirmed = window.confirm('למחוק תמונה זו?');
    if (!confirmed) return;

    setDeletingId(photoId);

    try {
      // Delete from IndexedDB
      await db.deleteAsset(photoId);

      // Revoke object URL and remove from ref
      const photo = photos.find(p => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.objectURL);
        objectURLsRef.current = objectURLsRef.current.filter(url => url !== photo.objectURL);
      }

      // Update local state
      setPhotos(photos.filter(p => p.id !== photoId));

      // Close fullscreen if this photo was selected
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }

      // Notify parent
      onDelete?.(photoId);

      console.log(`[PhotoGallery] Photo deleted: ${photoId}`);
    } catch (err) {
      console.error('[PhotoGallery] Failed to delete photo:', err);
      alert('שגיאה במחיקת התמונה');
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Open fullscreen preview
   */
  const openPreview = (photo: PhotoWithURL) => {
    setSelectedPhoto(photo);
  };

  /**
   * Close fullscreen preview
   */
  const closePreview = () => {
    setSelectedPhoto(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">טוען תמונות...</p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">אין תמונות</p>
          <p className="text-sm">לחץ על כפתור המצלמה כדי לצלם</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Photo Grid */}
      <div
        className="grid gap-2 p-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group"
          >
            {/* Photo Image */}
            <img
              src={photo.objectURL}
              alt="Captured photo"
              className="w-full h-full object-cover"
            />

            {/* Overlay Controls (hover/tap) */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              {/* Zoom Button */}
              <button
                onClick={() => openPreview(photo)}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="הגדל תמונה"
              >
                <ZoomIn className="w-5 h-5 text-gray-800" />
              </button>

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deletingId === photo.id}
                className="w-10 h-10 rounded-full bg-red-500/90 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                aria-label="מחק תמונה"
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Deleting Indicator */}
            {deletingId === photo.id && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fullscreen Preview Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black z-50 flex flex-col"
          onClick={closePreview}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-b from-black/90 to-transparent">
            <div className="flex justify-between items-center">
              <button
                onClick={closePreview}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="סגור"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(selectedPhoto.id);
                }}
                disabled={deletingId === selectedPhoto.id}
                className="w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                aria-label="מחק תמונה"
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Photo */}
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={selectedPhoto.objectURL}
              alt="Fullscreen preview"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Footer - Photo Info */}
          <div className="p-4 bg-gradient-to-t from-black/90 to-transparent">
            <div className="text-center text-white text-sm space-y-1">
              <p>
                {new Date(selectedPhoto.createdAt).toLocaleString('he-IL', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
              <p className="text-white/60">
                {(selectedPhoto.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
