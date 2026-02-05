import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { apiClient } from '@/api/client';
import { whatsappService } from
  '@/services/whatsapp/whatsappService';

interface QrCodeDialogProps {
  channelId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

export function QrCodeDialog({
  channelId,
  open,
  onOpenChange,
  onConnected,
}: QrCodeDialogProps) {
  const t = useTranslation();
  const { getToken } = useAuth();
  const [qrData, setQrData] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('loading');
  const [error, setError] = useState<string | null>(null);

  const fetchQr = useCallback(async () => {
    if (!channelId) return;

    try {
      const token = await getToken();
      apiClient.setAuthToken(token);

      const qr = await whatsappService.getQrCode(channelId);

      if (!qr.data) {
        throw new Error('QR code data is empty');
      }

      setQrData(qr.data);
      setStatus('scan');
      setError(null);
    } catch (err: any) {
      setError(err.message || t.qrExpired);
      setStatus('error');
    }
  }, [channelId, getToken, t.qrExpired]);

  const checkStatus = useCallback(async () => {
    if (!channelId) return;

    try {
      const token = await getToken();
      apiClient.setAuthToken(token);

      const channel = await whatsappService.refreshStatus(channelId);

      if (channel.status === 'WORKING') {
        setStatus('connected');
        onConnected?.();
        setTimeout(() => onOpenChange(false), 2000);
        return;
      }

      if (channel.status === 'FAILED') {
        setStatus('failed');
        setError(channel.lastError || t.statusFailed);
        return;
      }

      // Still waiting - refresh QR
      if (channel.status === 'SCAN_QR_CODE') {
        await fetchQr();
      }
    } catch {
      // Ignore polling errors
    }
  }, [channelId, getToken, fetchQr, onConnected, onOpenChange, t.statusFailed]);

  useEffect(() => {
    if (!open || !channelId) return;

    setStatus('loading');
    setQrData(null);
    setError(null);

    // Initial QR fetch
    fetchQr();

    // Poll every 3 seconds
    const interval = setInterval(checkStatus, 3000);

    return () => clearInterval(interval);
  }, [open, channelId, fetchQr, checkStatus]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{t.scanQrCode}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin
                text-gray-400" />
            </div>
          )}

          {status === 'scan' && qrData && (
            <>
              <img
                src={`data:image/png;base64,${qrData}`}
                alt="WhatsApp QR Code"
                className="w-64 h-64 border rounded"
              />
              <p className="text-sm text-gray-600 text-center
                max-w-xs">
                {t.scanQrInstructions}
              </p>
            </>
          )}

          {status === 'connected' && (
            <div className="flex flex-col items-center gap-2
              text-green-600">
              <CheckCircle2 className="w-16 h-16" />
              <p className="font-semibold">{t.connectionSuccess}</p>
            </div>
          )}

          {(status === 'error' || status === 'failed') && (
            <div className="flex flex-col items-center gap-3">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="outline" onClick={fetchQr}>
                {t.refreshStatus}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
