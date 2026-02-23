import { OrganizationProfile } from '@clerk/clerk-react';
import { useDirection, useTranslation } from '@/i18n';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { McpInstallerDownload } from '@/components/organization/McpInstallerDownload';

export function OrganizationSettingsPage() {
  const direction = useDirection();
  const navigate = useNavigate();
  const t = useTranslation();

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      {/* Header */}
      <header className="h-20 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center px-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className={`w-5 h-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className={`text-2xl font-bold tracking-tight ${direction === 'rtl' ? 'mr-4' : 'ml-4'}`}>
          {direction === 'rtl' ? 'הגדרות ארגון' : 'Organization Settings'}
        </h1>
      </header>

      <div className="container mx-auto p-6 max-w-[1200px] space-y-6">
        {/* WhatsApp Channels Link */}
        <button
          onClick={() => navigate('/organization/whatsapp')}
          className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-start"
        >
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              {t.whatsappChannels}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t.whatsappManageChannelsDesc}
            </p>
          </div>
          <ArrowLeft className={`w-5 h-5 text-muted-foreground ${direction === 'rtl' ? '' : 'rotate-180'}`} />
        </button>

        {/* MCP Installer Download */}
        <div className="rounded-xl border border-border bg-card p-6">
          <McpInstallerDownload />
        </div>

        {/* Organization Profile */}
        <OrganizationProfile
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-none',
            },
          }}
        />
      </div>
    </div>
  );
}
