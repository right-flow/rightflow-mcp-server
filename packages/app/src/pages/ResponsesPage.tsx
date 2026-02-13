import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser, useAuth, useOrganization } from '@clerk/clerk-react';
import { ResponseExportButton } from '../components/responses/ResponseExportButton';
import { useTranslation, useDirection } from '../i18n';
import { Calendar, MessageSquare, ArrowLeft, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '../components/dashboard/layouts/DashboardLayout';
import { RoleProvider } from '../contexts/RoleContext';

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
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const t = useTranslation();

  // Show loading while organization loads
  if (!orgLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground text-sm">{t['common.loading']}</p>
        </div>
      </div>
    );
  }

  // If no organization, redirect to dashboard to create one
  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{t['dashboard.welcome.description']}</p>
          <a href="/dashboard" className="btn-primary">{t.overview}</a>
        </div>
      </div>
    );
  }

  return (
    <RoleProvider orgId={organization.id}>
      <ResponsesPageContent />
    </RoleProvider>
  );
}

function ResponsesPageContent() {
  const { formId } = useParams<{ formId: string }>();
  const { isSignedIn, isLoaded } = useUser();
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

      const formResponse = await fetch(`/api/v1/forms/${formId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      if (formResponse.ok) {
        const formData = await formResponse.json();
        if (formData.form && formData.form.fields) {
          setFormFields(formData.form.fields);
        }
      }

      const response = await fetch(`/api/v1/submissions?formId=${formId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || (direction === 'rtl' ? 'טעינת התגובות נכשלה' : 'Failed to load responses'));
      }

      const data = await response.json();
      // Handle both old and new API response formats
      setResponses(data.data || data.responses || []);
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
    <DashboardLayout showSearch={false}>
      {/* Page Header with Back Button */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/responses')}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className={`w-5 h-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">
          {direction === 'rtl' ? 'תגובות לטופס' : 'Form Responses'}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">{error}</h2>
          <button
            onClick={() => navigate('/responses')}
            className="bg-primary hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-bold w-full mt-4 transition-colors"
          >
            {direction === 'rtl' ? 'חזרה' : 'Go Back'}
          </button>
        </div>
      ) : responses.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-20 text-center flex flex-col items-center">
          <MessageSquare className="text-zinc-300 w-16 h-16 mb-4" />
          <h2 className="text-xl font-bold mb-2">
            {direction === 'rtl' ? 'אין עדיין תגובות' : 'No responses yet'}
          </h2>
          <button
            onClick={() => navigate('/responses')}
            className="mt-6 px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {direction === 'rtl' ? 'חזרה לרשימת הטפסים' : 'Back to Forms List'}
          </button>
        </div>
      ) : (
        <div className="space-y-6 max-w-5xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">
              {responses.length} {direction === 'rtl' ? 'תגובות נמצאו' : 'responses found'}
            </h2>
            {formId && <ResponseExportButton formId={formId} />}
          </div>

          <div className="grid gap-6">
            {responses.map((response) => (
              <div key={response.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-800/50 flex justify-between items-center">
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {new Date(response.submittedAt).toLocaleString(direction === 'rtl' ? 'he-IL' : 'en-US')}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                    ID: {response.id.slice(0, 8)}
                  </span>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {Object.entries(response.data).map(([fieldId, value]) => {
                    const field = formFields.find(f => f.id === fieldId);
                    const label = field?.label || field?.name || fieldId;

                    if ((field?.type === 'signature' || field?.type === 'camera') && typeof value === 'string' && value.startsWith('data:image')) {
                      return (
                        <div key={fieldId} className="md:col-span-2 space-y-2">
                          <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
                          <div className="border border-border rounded-lg bg-zinc-50 p-2 inline-block">
                            <img src={value} alt={label} className="max-h-48 rounded" />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={fieldId} className="space-y-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
                        <p className="text-foreground font-medium">
                          {value === true ? (direction === 'rtl' ? 'כן' : 'Yes') : value === false ? (direction === 'rtl' ? 'לא' : 'No') : String(value || '-')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
