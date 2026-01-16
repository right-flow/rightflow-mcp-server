/**
 * Version History Component
 * Displays version history for published forms with restore functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Calendar, User, FileText, RotateCcw, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface FormVersion {
  id: string;
  form_id: string;
  version_number: number;
  title: string;
  description: string | null;
  fields: any[];
  stations: string[];
  settings: Record<string, any>;
  published_by: string;
  published_at: Date;
  is_current: boolean;
  notes: string | null;
  created_at: Date;
}

interface VersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  onRestore?: (versionNumber: number, notes?: string) => Promise<void>;
}

export function VersionHistory({
  open,
  onOpenChange,
  formId,
  onRestore,
}: VersionHistoryProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  // Memoized fetch function with proper dependencies
  const fetchVersionHistory = useCallback(async () => {
    if (!user) {
      console.error('User not authenticated');
      alert('יש להתחבר כדי לצפות בהיסטוריית גרסאות');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/form-versions?formId=${formId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch version history');
      }

      const data = await response.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error('Error fetching version history:', error);
      alert('שגיאה בטעינת היסטוריית גרסאות');
    } finally {
      setIsLoading(false);
    }
  }, [formId, user, getToken]);

  // Fetch version history when dialog opens
  useEffect(() => {
    if (open && formId) {
      fetchVersionHistory();
    }
  }, [open, formId, fetchVersionHistory]);

  async function handleRestore(version: FormVersion) {
    const confirmed = confirm(
      `האם לשחזר גרסה ${version.version_number}?\n\n` +
        `פעולה זו תיצור גרסה חדשה עם התוכן של גרסה ${version.version_number}.\n\n` +
        `הגרסה הנוכחית תישמר בהיסטוריה.`,
    );

    if (!confirmed) return;

    const notes = prompt('הוסף הערות לגרסה המשוחזרת (אופציונלי):');
    if (notes === null) return; // User cancelled

    setIsRestoring(true);
    setRestoringVersion(version.version_number);

    try {
      if (onRestore) {
        await onRestore(version.version_number, notes || undefined);
        await fetchVersionHistory(); // Refresh list
        alert(`✅ גרסה ${version.version_number} שוחזרה בהצלחה!`);
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      alert(`שגיאה בשחזור גרסה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setIsRestoring(false);
      setRestoringVersion(null);
    }
  }

  function formatDate(date: Date | string) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: he });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">היסטוריית גרסאות</DialogTitle>
          <DialogDescription className="text-right">
            צפה בגרסאות קודמות של הטופס ושחזר גרסה קודמת במידת הצורך
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">טוען גרסאות...</p>
            </div>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">אין גרסאות קודמות</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-4">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`border rounded-lg p-4 ${
                    version.is_current
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } transition-colors`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Version header */}
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          גרסה {version.version_number}
                        </h3>
                        {version.is_current && (
                          <Badge variant="default" className="bg-green-600">
                            <Check className="h-3 w-3 ml-1" />
                            גרסה נוכחית
                          </Badge>
                        )}
                      </div>

                      {/* Version metadata */}
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(version.published_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>פורסם על ידי: {version.published_by}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{version.fields.length} שדות</span>
                        </div>
                      </div>

                      {/* Version notes */}
                      {version.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm border-r-2 border-blue-500">
                          <p className="text-gray-700">{version.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {!version.is_current && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(version)}
                          disabled={isRestoring}
                          className="gap-2"
                        >
                          {isRestoring && restoringVersion === version.version_number ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                              משחזר...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4" />
                              שחזר
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
