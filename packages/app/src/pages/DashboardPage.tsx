import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import {
  Plus,
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  Search,
  Bell,
  Layout,
} from 'lucide-react';
import { FormCard } from '../components/dashboard/FormCard';
import type { FormRecord } from '../services/forms/forms.service';
import { useMigrationOnMount } from '../utils/localStorageMigration';
import { useTranslation, useDirection } from '../i18n';

export function DashboardPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken, orgId, orgRole } = useAuth();
  const navigate = useNavigate();
  const t = useTranslation();
  const direction = useDirection();
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Simplified role-based access (Clerk free tier)
  // Create forms: Personal accounts OR organization members (admin/member)
  // Delete forms: Personal accounts OR organization admins only
  const canCreateForm = !orgId || (
    orgRole === 'org:admin' ||
    orgRole === 'org:member' ||
    orgRole === 'org:basic_member'
  );
  const canDeleteForm = !orgId || orgRole === 'org:admin';

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/');
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    if (isSignedIn && user) {
      loadForms();
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

      if (!response.ok) throw new Error('Failed to load forms');
      const data = await response.json();
      setForms(data.forms || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateForm() {
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: direction === 'rtl' ? 'טופס ללא כותרת' : 'Untitled Form',
          description: '',
          fields: [],
        }),
      });

      if (!response.ok) throw new Error('Failed to create form');
      const data = await response.json();
      navigate(`/editor/${data.form.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create form');
    }
  }

  async function handleDeleteForm(formId: string) {
    if (!confirm(direction === 'rtl' ? 'האם אתה בטוח שברצונך למחוק טופס זה?' : 'Are you sure you want to delete this form?')) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/forms?id=${formId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete form');
      await loadForms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete form');
    }
  }

  const filteredForms = forms.filter(f =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground" dir={direction}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground font-medium">{t.loadingDashboard}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-grid bg-background text-foreground" dir={direction}>
      {/* Sidebar */}
      <aside className={`border-${direction === 'rtl' ? 'l' : 'r'} border-border bg-sidebar-bg/50 backdrop-blur-xl hidden lg:flex flex-col p-6 sticky top-0 h-screen`}>
        <div className="flex items-center gap-3 px-2 mb-10 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <Layout className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Right<span className="text-primary">Flow</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { icon: LayoutDashboard, label: t.overview, active: true, path: '/dashboard' },
            { icon: FileText, label: t.myForms, active: false, path: '/dashboard' },
            { icon: BarChart3, label: t.responses, active: false, path: '/responses' },
            { icon: Settings, label: t.settings, active: false, path: '/dashboard' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${item.active
                ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-border mt-auto">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
            <HelpCircle className="w-5 h-5" />
            {t.helpCenter}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full group">
              <Search className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors`} />
              <input
                type="text"
                placeholder={t.searchFormsPlaceholder}
                className={`input-premium w-full ${direction === 'rtl' ? 'pr-10' : 'pl-10'} bg-muted/50 focus:bg-background h-10 text-sm`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-5 h-5" />
              <span className={`absolute -top-1 ${direction === 'rtl' ? '-left-1' : '-right-1'} w-2 h-2 bg-primary rounded-full border-2 border-background`} />
            </button>
            <div className="h-8 w-[1px] bg-border mx-2" />
            <div className="flex items-center gap-3">
              <div className={`text-${direction === 'rtl' ? 'left' : 'right'} hidden sm:block`}>
                <p className="text-sm font-bold truncate max-w-[120px]">{user?.fullName || (direction === 'rtl' ? 'משתמש' : 'User')}</p>
                <p className="text-xs text-muted-foreground">{t.freePlan}</p>
              </div>
              <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: 'w-10 h-10 rounded-xl' } }} />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 max-w-[1400px] mx-auto w-full">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-2xl mb-8 flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{t.dashboard}</h1>
              <p className="text-muted-foreground font-medium mt-1">{t.manageFormsDescription}</p>
            </div>
            {canCreateForm && (
              <button
                onClick={handleCreateForm}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {t.createNewForm}
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="forms-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass-card h-48 animate-pulse bg-muted/20" />
              ))}
            </div>
          ) : filteredForms.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-20 text-center flex flex-col items-center border-dashed"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
                <FileText className="text-primary w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t.noFormsFound}</h2>
              <p className="text-muted-foreground mb-8 max-w-sm">
                {searchQuery ? t.noResultsFor.replace('{query}', searchQuery) : 'עדיין לא יצרת טפסים. התחל את המסע שלך על ידי יצירת ה-flow הראשון שלך בעברית.'}
              </p>
              {!searchQuery && canCreateForm && (
                <button
                  onClick={handleCreateForm}
                  className="btn-primary px-8"
                >
                  {t.createFirstForm}
                </button>
              )}
            </motion.div>
          ) : (
            <div className="forms-grid">
              {filteredForms.map((form) => (
                <FormCard
                  key={form.id}
                  form={form}
                  onDelete={() => handleDeleteForm(form.id)}
                  onEdit={() => navigate(`/editor/${form.id}`)}
                  onViewResponses={() => navigate(`/responses/${form.id}`)}
                  canDelete={canDeleteForm}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
