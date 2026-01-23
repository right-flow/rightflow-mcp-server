/**
 * Camera Field Component
 * Allows users to capture multiple photos using device camera
 * Uses fullscreen camera interface and IndexedDB for offline storage
 */

import { useState } from 'react';
import { Camera as CameraIcon } from 'lucide-react';
import type { FieldDefinition } from '@/types/fields';
import { useDirection } from '@/i18n';
import { Camera } from '@/components/Camera';
import { PhotoGallery } from '@/components/PhotoGallery';

interface CameraFieldProps {
  field: FieldDefinition;
  value: string | string[]; // Support both single photo (string) and multiple photos (array)
  onChange: (value: string[]) => void;
}

/**
 * Camera Field - Capture and display photos
 * Supports multiple photos with fullscreen camera and gallery view
 *
 * @example
 * ```tsx
 * <CameraField
 *   field={{ type: 'camera', name: 'photos', label: 'תמונות' }}
 *   value={photoIds}
 *   onChange={setPhotoIds}
 * />
 * ```
 */
export function CameraField({ field, value, onChange }: CameraFieldProps) {
  const direction = useDirection();
  const [showCamera, setShowCamera] = useState(false);

  // Normalize value to array
  const photoIds = Array.isArray(value) ? value : value ? [value] : [];

  const handleCapture = (photoId: string) => {
    // Add new photo to array
    const updatedPhotos = [...photoIds, photoId];
    onChange(updatedPhotos);
    setShowCamera(false);
  };

  const handleDelete = (photoId: string) => {
    // Remove photo from array
    const updatedPhotos = photoIds.filter(id => id !== photoId);
    onChange(updatedPhotos);
  };

  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  return (
    <div dir={direction} className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-foreground">
        {field.label || field.name}
        {field.required && <span className="text-destructive mr-1">*</span>}
      </label>

      {/* Photo Gallery (if photos exist) */}
      {photoIds.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <PhotoGallery
            photoIds={photoIds}
            onDelete={handleDelete}
            columns={3}
          />
        </div>
      )}

      {/* Add Photo Button */}
      <button
        type="button"
        onClick={handleOpenCamera}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <CameraIcon className="w-5 h-5" />
        {photoIds.length > 0
          ? (direction === 'rtl' ? 'הוסף תמונה נוספת' : 'Add Another Photo')
          : (direction === 'rtl' ? 'פתח מצלמה' : 'Open Camera')}
      </button>

      {/* Help text */}
      {photoIds.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {direction === 'rtl'
            ? 'לחץ על הכפתור כדי לצלם תמונות באמצעות המצלמה'
            : 'Click the button to capture photos using your camera'}
        </p>
      )}

      {/* Photo count */}
      {photoIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {direction === 'rtl'
            ? `${photoIds.length} ${photoIds.length === 1 ? 'תמונה' : 'תמונות'} נשמרו`
            : `${photoIds.length} photo${photoIds.length === 1 ? '' : 's'} saved`}
        </p>
      )}

      {/* Fullscreen Camera */}
      {showCamera && (
        <Camera
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
