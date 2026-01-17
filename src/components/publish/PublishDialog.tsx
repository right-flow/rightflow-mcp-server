/**
 * Publish Dialog Component
 * Allows users to publish forms with version notes and displays URLs
 * Premium users get a shortened URL
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Check, Copy, ExternalLink, Sparkles } from 'lucide-react';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  formTitle: string;
  onPublish: (notes?: string) => Promise<void>;
  isPublishing: boolean;
  publishedUrl?: string | null;
  shortUrl?: string | null;
  isPremiumUser?: boolean;
}

export function PublishDialog({
  open,
  onOpenChange,
  formId: _formId,
  formTitle,
  onPublish,
  isPublishing,
  publishedUrl,
  shortUrl,
  isPremiumUser = false,
}: PublishDialogProps) {
  const [notes, setNotes] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Reset notes when dialog closes
  useEffect(() => {
    if (!open) {
      setNotes('');
    }
  }, [open]);

  async function handlePublish() {
    await onPublish(notes);
  }

  async function copyToClipboard(url: string, type: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(type);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  const isPublished = !!publishedUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] !bg-white dark:!bg-gray-900" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">
            {isPublished ? 'הטופס פורסם בהצלחה! 🎉' : 'פרסם טופס'}
          </DialogTitle>
          <DialogDescription className="text-right">
            {isPublished
              ? 'הטופס זמין כעת בקישור הציבורי. שתף את הקישור עם משיבים.'
              : `פרסם את הטופס "${formTitle}" ויצור קישור ציבורי.`}
          </DialogDescription>
        </DialogHeader>

        {!isPublished && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-right block">
                הערות גרסה (אופציונלי)
              </Label>
              <Input
                id="notes"
                placeholder="לדוגמה: הוספת שדה טלפון, תיקון שגיאות..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-right"
                dir="rtl"
              />
              <p className="text-sm text-gray-500 text-right">
                הערות אלו יופיעו בהיסטוריית הגרסאות
              </p>
            </div>
          </div>
        )}

        {isPublished && (
          <div className="space-y-4 py-4">
            {/* Regular URL */}
            <div className="space-y-2">
              <Label className="text-right block font-medium">
                קישור ציבורי
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={publishedUrl || ''}
                  readOnly
                  className="text-left flex-1 font-mono text-sm"
                  dir="ltr"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(publishedUrl || '', 'regular')}
                  title="העתק קישור"
                  disabled={!publishedUrl}
                >
                  {copiedUrl === 'regular' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(publishedUrl || '', '_blank')}
                  title="פתח בחלון חדש"
                  disabled={!publishedUrl}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Short URL - Premium Feature */}
            {isPremiumUser && shortUrl && (
              <div className="space-y-2">
                <Label className="text-right block font-medium flex items-center justify-end gap-2">
                  <span className="text-xs bg-gradient-to-r from-purple-600 to-blue-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Premium
                  </span>
                  קישור מקוצר
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={shortUrl}
                    readOnly
                    className="text-left flex-1 font-mono text-sm bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
                    dir="ltr"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(shortUrl, 'short')}
                    title="העתק קישור מקוצר"
                    className="border-purple-200 hover:bg-purple-50"
                    disabled={!shortUrl}
                  >
                    {copiedUrl === 'short' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-purple-600" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(shortUrl, '_blank')}
                    title="פתח בחלון חדש"
                    className="border-purple-200 hover:bg-purple-50"
                    disabled={!shortUrl}
                  >
                    <ExternalLink className="h-4 w-4 text-purple-600" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 text-right">
                  קישור קצר ונוח לשיתוף ב-SMS, WhatsApp ורשתות חברתיות
                </p>
              </div>
            )}

            {/* Premium Upsell */}
            {!isPremiumUser && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-right">
                    <h4 className="font-medium text-gray-900 mb-1">
                      רוצה קישור מקוצר?
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      שדרג ל-Premium וקבל קישורים מקוצרים לכל הטפסים שלך
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-purple-600 text-purple-600 hover:bg-purple-50"
                      onClick={() => {
                        // TODO: Navigate to pricing page
                        console.log('Navigate to pricing');
                      }}
                    >
                      שדרג עכשיו
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:justify-start">
          {!isPublished ? (
            <>
              <Button
                onClick={handlePublish}
                disabled={isPublishing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPublishing ? 'מפרסם...' : 'פרסם טופס'}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPublishing}
              >
                ביטול
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              סגור
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
