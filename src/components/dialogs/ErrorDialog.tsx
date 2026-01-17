/**
 * Error Dialog Component
 * Displays validation errors with copy functionality
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  errors: string[];
  description?: string;
}

export function ErrorDialog({
  open,
  onOpenChange,
  title,
  errors,
  description,
}: ErrorDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const errorText = errors.join('\n');
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy errors:', error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] !bg-white dark:!bg-gray-900" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center justify-end gap-2">
            <span>{title}</span>
            <AlertCircle className="h-5 w-5 text-destructive" />
          </DialogTitle>
          {description && (
            <DialogDescription className="text-right">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md"
              dir="rtl"
            >
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-right flex-1">{error}</p>
            </div>
          ))}
        </div>

        <DialogFooter className="flex gap-2 sm:justify-start">
          <Button
            variant="outline"
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-2',
              copied && 'bg-green-50 border-green-500 text-green-700'
            )}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                הועתק!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                העתק שגיאות
              </>
            )}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
