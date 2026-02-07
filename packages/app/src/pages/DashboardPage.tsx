import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  Bell,
  Search,
  HelpCircle,
  Layout,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { FormCard } from '../components/dashboard/FormCard';
import { SendFormLinkDialog } from '../components/whatsapp/SendFormLinkDialog';
import type { FormRecord } from '../services/forms/forms.service';
import { useMigrationOnMount } from '../utils/localStorageMigration';
import { useTranslation, useDirection } from '../i18n';
import { HelpWidget } from '../components/onboarding/HelpWidget';
import { ProgressChecklist } from '../components/onboarding/ProgressChecklist';
import { SmartUpgradeManager } from '../components/onboarding/SmartUpgradeManager';

export function DashboardPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const t = useTranslation();
  const direction = useDirection();
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [whatsAppForm, setWhatsAppForm] = useState<FormRecord | null>(null);
  const [responsesCount, setResponsesCount] = useState(0);
  const [hasCustomized, setHasCustomized] = useState(
    localStorage.getItem('onboarding_has_customized') === 'true'
  );
  const [hasShared, setHasShared] = useState(
    localStorage.getItem('onboarding_has_shared') === 'true'
  );

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/');
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    if (isSignedIn && user) {
      loadForms();
      loadUsageData();
      useMigrationOnMount(user.id, user.primaryEmailAddress?.id);
    }
  }, [isSignedIn, user]);

  async function loadForms() {
    try {
      setIsLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/forms', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // Don't show error for 404 (new user with no forms) - just show empty state
      if (response.status === 404) {
        setForms([]);
        return;
      }

      if (!response.ok) throw new Error(t.failedToLoadForms);
      const data = await response.json();
      setForms(data.forms || []);
    } catch (err) {
      // Only show error if it's not a "no forms" situation
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadUsageData() {
    try {
      const orgId = user?.organizationMemberships?.[0]?.organization?.id;
      if (!orgId) return;

      const usageResponse = await fetch(`/api/v1/billing/usage/${orgId}`);
      if (!usageResponse.ok) return; // Fail silently

      const usageData = await usageResponse.json();
      setResponsesCount(usageData.responsesUsed || 0);
    } catch (error) {
      // Fail silently - onboarding still works with 0 responses
      console.warn('Failed to load usage data:', error);
    }
  }

  async function handleCreateForm() {
    try {
      const token = await getToken();
      console.log('🔐 Token received:', token ? 'Yes (length: ' + token.length + ')' : 'No');

      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: t.untitledForm,
          description: '',
          fields: [
            {
              id: 'field_1',
              type: 'text',
              label: t.textField,
              required: false,
            }
          ],
        }),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Full Error response:', JSON.stringify(errorData, null, 2));
        console.error('❌ Error message:', errorData?.error?.message || errorData?.message || 'Unknown error');
        throw new Error(errorData?.error?.message || errorData?.message || 'Failed to create form');
      }

      const data = await response.json();
      navigate(`/editor/${data.form.id}`);
    } catch (err) {
      console.error('💥 Create form error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create form');
    }
  }

  const filteredForms = forms.filter(f =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle WhatsApp share - track for onboarding
  function handleSendWhatsApp(form: FormRecord) {
    setWhatsAppForm(form);
    if (!hasShared) {
      setHasShared(true);
      localStorage.setItem('onboarding_has_shared', 'true');
    }
  }

  // Restart tutorial handler
  function handleRestartTutorial() {
    // Reset onboarding progress
    localStorage.removeItem('onboarding_has_customized');
    localStorage.removeItem('onboarding_has_shared');
    setHasCustomized(false);
    setHasShared(false);
    // Could also navigate to a tutorial page or show a guided tour
    console.log('Tutorial restarted');
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-grid" dir={direction}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 bg-black dark:bg-white rounded-lg flex items-center justify-center">
            <Layout className="text-white dark:text-black w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">RightFlow</span>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { id: 'overview', icon: LayoutDashboard, label: t.overview, path: '/dashboard', active: true },
            { id: 'forms', icon: FileText, label: t.myForms, path: '/dashboard' },
            { id: 'responses', icon: BarChart3, label: t.responses, path: '/responses' },
            { id: 'settings', icon: Settings, label: t.settings, path: '/organization' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${item.active
                ? 'bg-secondary text-primary'
                : 'text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-foreground'
                }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-1 pt-6 border-t border-border">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
            <HelpCircle className="w-4 h-4" />
            {t.helpCenter}
          </button>
          <div className="px-3 py-2 text-xs text-muted-foreground text-center">
            גרסה 2.4.2
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <input
                type="text"
                placeholder={t.searchFormsPlaceholder}
                className={`input-standard w-full ${direction === 'rtl' ? 'pr-10' : 'pl-10'} h-10`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-muted-foreground">
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-border" />
            <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-10 h-10 rounded-lg' } }} />
          </div>
        </header>

        {/* Welcome Section */}
        <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.dashboard}</h1>
            <p className="text-muted-foreground mt-1">{t.manageFormsDescription}</p>
          </div>
          <button onClick={handleCreateForm} className="btn-primary">
            <Plus className="w-4 h-4" />
            {t.createNewForm}
          </button>
        </div>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg mb-8 flex items-center gap-3 text-sm font-medium"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forms Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 rounded-xl animate-pulse bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-border rounded-xl p-20 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
              <FileText className="text-muted-foreground w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t.noFormsFound}</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              {searchQuery ? t.noResultsFor.replace('{query}', searchQuery) : t.noFormsYetDescription}
            </p>
            {!searchQuery && (
              <button onClick={handleCreateForm} className="btn-primary mt-8">
                {t.createFirstForm}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredForms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onDelete={loadForms}
                onEdit={() => navigate(`/editor/${form.id}`)}
                onViewResponses={() => navigate(`/responses/${form.id}`)}
                onSendWhatsApp={() => handleSendWhatsApp(form)}
              />
            ))}
          </div>
        )}
      </main>

      {whatsAppForm && (
        <SendFormLinkDialog
          open={!!whatsAppForm}
          onOpenChange={(open) => { if (!open) setWhatsAppForm(null); }}
          formId={whatsAppForm.id}
          formUrl={`${window.location.origin}/f/${whatsAppForm.slug}`}
        />
      )}

      {/* Onboarding Components */}
      <SmartUpgradeManager />
      <ProgressChecklist
        formsCount={forms.length}
        isPublished={forms.some(f => f.status === 'published')}
        responsesCount={responsesCount}
        hasCustomized={hasCustomized}
        hasShared={hasShared}
      />
      <HelpWidget onRestartTutorial={handleRestartTutorial} />
    </div>
  );
}
