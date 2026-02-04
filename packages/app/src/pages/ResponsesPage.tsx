import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { ResponseExportButton } from '../components/responses/ResponseExportButton';
import { useTranslation, useDirection } from '../i18n';
import { motion } from 'framer-motion';
import { Calendar, MessageSquare, ArrowLeft, Layout, Search, Bell, HelpCircle, FileText, BarChart3, Settings } from 'lucide-react';

interface Response {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedAt: Date;
  submitterIp?: string | null;
  submitterUserAgent?: string | null;
}

interface FormField {
  id: string;
  label?: string;
  name?: string;
  type: string;
}

export function ResponsesPage() {
  const { formId } = useParams<{ formId: string }>();
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const t = useTranslation();
  const direction = useDirection();
  const [responses, setResponses] = useState<Response[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/');
    }
  }, [isLoaded, isSignedIn, navigate]);

  const loadResponses = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const token = await getToken();

      const formResponse = await fetch(`/api/forms?id=${formId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      if (formResponse.ok) {
        const formData = await formResponse.json();
        if (formData.form && formData.form.fields) {
          setFormFields(formData.form.fields);
        }
      }

      const response = await fetch(`/api/responses?formId=${formId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || (direction === 'rtl' ? 'טעינת התגובות נכשלה' : 'Failed to load responses'));
      }

      const data = await response.json();
      setResponses(data.responses || []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load responses');
    } finally {
      setIsLoading(false);
    }
  }, [formId, getToken, direction]);

  useEffect(() => {
    if (!isSignedIn || !formId) return;
    const controller = new AbortController();
    loadResponses(controller.signal);
    return () => controller.abort();
  }, [isSignedIn, formId, loadResponses]);

  if (!isLoaded) return null;

  return (
    <div className="dashboard-grid" dir={direction}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-9 h-9 bg-black dark:bg-white rounded-lg flex items-center justify-center">
            <Layout className="text-white dark:text-black w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">RightFlow</span>
        </div>

        <nav className="flex-1 space-y-1">
          <button onClick={() => navigate('/dashboard')} className="sidebar-link"><Layout className="w-4 h-4" />{t.overview}</button>
          <button onClick={() => navigate('/dashboard')} className="sidebar-link"><FileText className="w-4 h-4" />{t.myForms}</button>
          <button onClick={() => navigate('/responses')} className="sidebar-link sidebar-link-active"><BarChart3 className="w-4 h-4" />{t.responses}</button>
          <button onClick={() => navigate('/organization')} className="sidebar-link"><Settings className="w-4 h-4" />{t.settings}</button>
        </nav>

        <div className="mt-auto space-y-1 pt-6 border-t border-border">
          <button className="sidebar-link"><HelpCircle className="w-4 h-4" />{t.helpCenter}</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <ArrowLeft className={`w-5 h-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">{direction === 'rtl' ? 'תגובות לטופס' : 'Form Responses'}</h1>
          </div>
          <div className="flex items-center gap-4">
            <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-10 h-10 rounded-lg' } }} />
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : error ? (
          <div className="premium-card p-10 text-center max-w-md mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">{error}</h2>
            <button onClick={() => navigate('/dashboard')} className="btn-primary w-full mt-4">חזרה</button>
          </div>
        ) : responses.length === 0 ? (
          <div className="premium-card p-20 text-center flex flex-col items-center border-dashed">
            <MessageSquare className="text-zinc-300 w-16 h-16 mb-4" />
            <h2 className="text-xl font-bold mb-2">{direction === 'rtl' ? 'אין עדיין תגובות' : 'No responses yet'}</h2>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary mt-6">חזרה ללוח הבקרה</button>
          </div>
        ) : (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">{responses.length} תגובות נמצאו</h2>
              {formId && <ResponseExportButton formId={formId} />}
            </div>

            <div className="grid gap-6">
              {responses.map((response) => (
                <div key={response.id} className="premium-card group overflow-hidden">
                  <div className="p-6 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {new Date(response.submittedAt).toLocaleString(direction === 'rtl' ? 'he-IL' : 'en-US')}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">ID: {response.id.slice(0, 8)}</span>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {Object.entries(response.data).map(([fieldId, value]) => {
                      const field = formFields.find(f => f.id === fieldId);
                      const label = field?.label || field?.name || fieldId;

                      if ((field?.type === 'signature' || field?.type === 'camera') && typeof value === 'string' && value.startsWith('data:image')) {
                        return (
                          <div key={fieldId} className="md:col-span-2 space-y-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
                            <div className="border border-border rounded-lg bg-zinc-50 p-2 inline-block"><img src={value} alt={label} className="max-h-48 rounded" /></div>
                          </div>
                        );
                      }

                      return (
                        <div key={fieldId} className="space-y-1">
                          <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
                          <p className="text-foreground font-medium">{value === true ? 'כן' : value === false ? 'לא' : String(value || '-')}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
