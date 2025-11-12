import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Upload, Pen, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureImage: string, timestamp: string) => void;
  currentSignature?: string;
}

/**
 * Validate that a data URL is a safe image format and not malicious content
 * Prevents XSS attacks via data URLs
 */
function isValidImageDataURL(dataUrl: string): boolean {
  // Must start with valid image mime type
  const validPrefixes = [
    'data:image/png;base64,',
    'data:image/jpeg;base64,',
    'data:image/jpg;base64,',
  ];

  if (!validPrefixes.some(prefix => dataUrl.startsWith(prefix))) {
    return false;
  }

  // Verify base64 format (only valid base64 characters)
  const base64Part = dataUrl.split(',')[1];
  if (!base64Part || !/^[A-Za-z0-9+/=]+$/.test(base64Part)) {
    return false;
  }

  return true;
}

export const SignatureModal = ({
  isOpen,
  onClose,
  onSave,
  currentSignature,
}: SignatureModalProps) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(currentSignature || null);
  const signatureRef = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('נא להעלות קובץ תמונה בלבד (PNG, JPG)');
      return;
    }

    // Validate file size (max 2MB to prevent memory issues)
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_FILE_SIZE) {
      alert('גודל הקובץ חורג מ-2MB. נא לכווץ את התמונה או לבחור קובץ קטן יותר.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    let signatureData: string | null = null;

    if (activeTab === 'draw') {
      if (signatureRef.current && !signatureRef.current.isEmpty()) {
        signatureData = signatureRef.current.toDataURL('image/png');
      } else {
        alert('נא לצייר חתימה לפני השמירה');
        return;
      }
    } else if (activeTab === 'upload') {
      if (uploadedImage) {
        signatureData = uploadedImage;
      } else {
        alert('נא להעלות תמונת חתימה לפני השמירה');
        return;
      }
    }

    if (signatureData) {
      // Validate signature data to prevent XSS attacks
      if (!isValidImageDataURL(signatureData)) {
        alert('פורמט תמונה לא תקין או מסוכן. נא להשתמש רק ב-PNG או JPG');
        return;
      }

      const timestamp = new Date().toISOString();
      onSave(signatureData, timestamp);
      onClose();
    }
  };

  const handleClose = () => {
    // Clear canvas explicitly
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      signatureRef.current.clear();
    }
    // Reset uploaded image
    setUploadedImage(currentSignature || null);
    // Reset to draw tab
    setActiveTab('draw');
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  // Reset state when modal opens to prevent race conditions
  useEffect(() => {
    if (isOpen) {
      // Clear canvas when opening
      if (signatureRef.current) {
        signatureRef.current.clear();
      }
      setUploadedImage(currentSignature || null);
      setActiveTab('draw');
    }
  }, [isOpen, currentSignature]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>הוסף חתימה</DialogTitle>
          <DialogDescription>
            צייר חתימה או העלה תמונה קיימת
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'draw' | 'upload')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw">
              <Pen className="w-4 h-4 ml-2" />
              ציור
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 ml-2" />
              העלאה
            </TabsTrigger>
          </TabsList>

          {/* Draw Tab */}
          <TabsContent value="draw" className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-2 bg-white">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  width: 550,
                  height: 200,
                  className: 'signature-canvas',
                }}
                backgroundColor="white"
                penColor="black"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                className="flex-1"
              >
                <Eraser className="w-4 h-4 ml-2" />
                נקה
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              השתמש בעכבר או במסך המגע כדי לצייר את החתימה שלך
            </p>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 bg-muted/50 flex flex-col items-center justify-center min-h-[200px] cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadedImage ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={uploadedImage}
                    alt="Uploaded signature"
                    className="max-w-full max-h-[180px] object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-0 left-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedImage(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium mb-1">לחץ להעלאת תמונה</p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG עד 2MB
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileUpload}
              className="hidden"
            />

            <p className="text-sm text-muted-foreground">
              העלה תמונה קיימת של החתימה שלך (רקע שקוף מומלץ)
            </p>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            ביטול
          </Button>
          <Button type="button" onClick={handleSave}>
            שמור חתימה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
