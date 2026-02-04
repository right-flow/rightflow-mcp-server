import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { apiClient } from '@/api/client';
import { whatsappService } from
  '@/services/whatsapp/whatsappService';
import type { WhatsAppChannel } from
  '@/services/whatsapp/types';

interface SendFormLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  formUrl: string;
}

export function SendFormLinkDialog({
  open,
  onOpenChange,
  formId,
  formUrl,
}: SendFormLinkDialogProps) {
  const t = useTranslation();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<WhatsAppChannel[]>([]);
  const [channelId, setChannelId] = useState('');
  const [phone, setPhone] = useState('');
  const [caption, setCaption] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<'success' | 'error' | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    (async () => {
      const token = await getToken();
      apiClient.setAuthToken(token);

      whatsappService.listChannels()
        .then((list) => {
          const working = list.filter((c) => c.status === 'WORKING');
          setChannels(working);
          if (working.length === 1) {
            setChannelId(working[0].id);
          }
        })
        .catch(() => setChannels([]))
        .finally(() => setIsLoading(false));
    })();
  }, [open, getToken]);

  const handleSend = async () => {
    if (!channelId || !phone.trim()) return;

    setIsSending(true);
    setResult(null);
    setError(null);

    try {
      const token = await getToken();
      apiClient.setAuthToken(token);

      await whatsappService.sendFormLink({
        channelId,
        formId,
        recipientPhone: phone.trim(),
        formUrl,
        caption: caption.trim() || undefined,
      });
      setResult('success');
      setTimeout(() => {
        onOpenChange(false);
        setPhone('');
        setCaption('');
        setResult(null);
      }, 2000);
    } catch (err: any) {
      setResult('error');
      setError(err.message || t.messageFailed);
    } finally {
      setIsSending(false);
    }
  };

  const handleGoToSettings = () => {
    onOpenChange(false);
    navigate('/organization/whatsapp');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.sendFormLink}</DialogTitle>
        </DialogHeader>

        {result === 'success' ? (
          <div className="flex flex-col items-center gap-2 py-8
            text-green-600">
            <CheckCircle2 className="w-12 h-12" />
            <p className="font-semibold">{t.messageSent}</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin
                    text-gray-400" />
                </div>
              ) : channels.length === 0 ? (
                <div className="text-sm text-amber-600 bg-amber-50
                  rounded p-3">
                  <p className="inline">
                    {t.noWorkingChannels}{' '}
                    <button
                      onClick={handleGoToSettings}
                      className="text-amber-700 underline hover:text-amber-800 font-semibold"
                    >
                      {t.noWorkingChannelsLinkText}
                    </button>
                  </p>
                </div>
              ) : (
                <>
                  {/* Channel selector */}
                  <div className="space-y-2">
                    <Label>{t.selectChannel}</Label>
                    <Select
                      value={channelId}
                      onChange={(e) => setChannelId(e.target.value)}
                    >
                      <option value="" disabled>
                        {t.selectChannel}
                      </option>
                      {channels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.displayName}
                          {ch.phoneNumber
                            ? ` (${ch.phoneNumber})`
                            : ''}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="recipientPhone">
                      {t.recipientPhone}
                    </Label>
                    <Input
                      id="recipientPhone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t.recipientPhonePlaceholder}
                      dir="ltr"
                      type="tel"
                    />
                  </div>

                  {/* Caption */}
                  <div className="space-y-2">
                    <Label htmlFor="caption">
                      {t.messageCaption}
                    </Label>
                    <Input
                      id="caption"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder=""
                    />
                  </div>

                  {/* Form URL (read-only) */}
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={formUrl}
                      readOnly
                      dir="ltr"
                      className="bg-gray-50 text-gray-500"
                    />
                  </div>
                </>
              )}

              {result === 'error' && error && (
                <div className="flex items-center gap-2 text-sm
                  text-red-600 bg-red-50 rounded p-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSending}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleSend}
                disabled={
                  !channelId ||
                  !phone.trim() ||
                  isSending ||
                  channels.length === 0
                }
              >
                {isSending && (
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                )}
                {t.sendMessage}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
