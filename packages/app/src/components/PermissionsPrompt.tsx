/**
 * Permissions Prompt Component
 * User-friendly prompt for requesting permissions (location, camera, etc.)
 */

import { useState } from 'react';
import { MapPin, Camera, X, Shield, CheckCircle2 } from 'lucide-react';
import { locationService } from '@/services/locationService';

export type PermissionType = 'location' | 'camera';

interface PermissionsPromptProps {
  /** Type of permission to request */
  type: PermissionType;
  /** Whether the prompt is open */
  isOpen: boolean;
  /** Callback when user grants permission */
  onGrant: () => void;
  /** Callback when user denies permission */
  onDeny: () => void;
  /** Callback to close the prompt */
  onClose: () => void;
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
}

const PERMISSION_CONFIG: Record<
  PermissionType,
  {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    reason: string;
    privacy: string;
  }
> = {
  location: {
    icon: MapPin,
    title: 'אישור גישה למיקום',
    description: 'על מנת להוסיף את מיקומך לטופס, נדרשת גישה למיקום המכשיר',
    reason: 'המיקום שלך עוזר לנו לוודא שהטופס מולא במקום הנכון ולשפר את השירות שלנו.',
    privacy: 'המיקום שלך נשמר באופן מאובטח ולא ישותף עם צדדים שלישיים ללא הסכמתך.',
  },
  camera: {
    icon: Camera,
    title: 'אישור גישה למצלמה',
    description: 'על מנת לצלם תמונות לטופס, נדרשת גישה למצלמה',
    reason: 'המצלמה מאפשרת לך לצלם ולהעלות תמונות ישירות לטופס בצורה נוחה ומהירה.',
    privacy: 'התמונות נשמרות במכשיר שלך ומועלות לשרת רק כאשר אתה שולח את הטופס.',
  },
};

/**
 * Permissions Prompt - Request permissions with clear explanation
 *
 * @example
 * ```tsx
 * const [showPrompt, setShowPrompt] = useState(false);
 *
 * <PermissionsPrompt
 *   type="location"
 *   isOpen={showPrompt}
 *   onGrant={() => {
 *     // Permission granted
 *     setShowPrompt(false);
 *   }}
 *   onDeny={() => {
 *     // Permission denied
 *     setShowPrompt(false);
 *   }}
 *   onClose={() => setShowPrompt(false)}
 * />
 * ```
 */
export function PermissionsPrompt({
  type,
  isOpen,
  onGrant,
  onDeny,
  onClose,
  title,
  description,
}: PermissionsPromptProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = PERMISSION_CONFIG[type];
  const Icon = config.icon;

  if (!isOpen) return null;

  const handleGrant = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      if (type === 'location') {
        // Check permission status first
        const status = await locationService.checkPermissionStatus();

        if (status === 'denied') {
          setError('הרשאת מיקום נדחתה. אנא אפשר מיקום בהגדרות הדפדפן.');
          setIsRequesting(false);
          return;
        }

        if (status === 'unsupported') {
          setError('המכשיר שלך לא תומך במיקום גיאוגרפי.');
          setIsRequesting(false);
          return;
        }

        // Try to get location (will trigger browser prompt if status is 'prompt')
        try {
          await locationService.getCurrentLocation({ timeout: 5000 });
          onGrant();
        } catch (err: any) {
          if (err.code === 1) {
            // User denied permission
            onDeny();
          } else {
            setError(err.message || 'לא ניתן לקבל מיקום. נסה שוב.');
          }
        }
      } else if (type === 'camera') {
        // Camera permission is requested when opening camera
        // This prompt is just informational
        onGrant();
      }
    } catch (err) {
      console.error('[PermissionsPrompt] Error:', err);
      setError('שגיאה בבקשת הרשאה. נסה שוב.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDeny = () => {
    onDeny();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="סגור"
        >
          <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {title || config.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {description || config.description}
          </p>
        </div>

        {/* Reason */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              {config.reason}
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {config.privacy}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-300 text-center">
              {error}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDeny}
            disabled={isRequesting}
            className="flex-1 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            לא כרגע
          </button>
          <button
            onClick={handleGrant}
            disabled={isRequesting}
            className="flex-1 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            {isRequesting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>בודק...</span>
              </>
            ) : (
              'אשר גישה'
            )}
          </button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
          תוכל לשנות את ההרשאות בכל עת בהגדרות הדפדפן
        </p>
      </div>
    </div>
  );
}
