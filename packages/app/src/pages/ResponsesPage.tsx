import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { ResponseExportButton } from '../components/responses/ResponseExportButton';
import { useTranslation, useDirection } from '../i18n';
import { motion } from 'framer-motion';
import { Calendar, MessageSquare, ArrowLeft } from 'lucide-react';

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

      // Load form to get field labels
      const formResponse = await fetch(`/api/forms?id=${formId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal,
      });

      if (formResponse.ok) {
        const formData = await formResponse.json();
        if (formData.form && formData.form.fields) {
          setFormFields(formData.form.fields);
        }
      }

      // Load responses
      const response = await fetch(`/api/responses?formId=${formId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal,
      });

      if (!response.ok) {
        // Try to get error message from server response
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message ||
          (response.status === 403
            ? (direction === 'rtl'
              ? 'אין לך הרשאה לצפות בתגובות של טופס זה'
              : 'You do not have permission to view responses for this form')
            : (direction === 'rtl' ? 'טעינת התגובות נכשלה' : 'Failed to load responses'));
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setResponses(data.responses || []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load responses');
    } finally {
      setIsLoading(false);
    }
  }, [formId, getToken, direction]);

  useEffect(() => {
    if (!isSignedIn || !formId) {
      return;
    }

    const controller = new AbortController();
    loadResponses(controller.signal);

    return () => {
      controller.abort();
    };
  }, [isSignedIn, formId, loadResponses]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={direction}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground font-medium">{direction === 'rtl' ? 'טוען תגובות...' : 'Loading responses...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={direction}>
        <div className="glass-card p-8 text-center max-w-md border-destructive/20">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-destructive mb-2">{error}</h1>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary mt-4">
            {direction === 'rtl' ? 'חזור ללוח הבקרה' : 'Back to Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30" dir={direction}>
      <header className="h-20 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className={`w-5 h-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">
            {direction === 'rtl' ? 'תגובות לטופס' : 'Form Responses'}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className={`text-${direction === 'rtl' ? 'left' : 'right'} hidden sm:block`}>
            <p className="text-sm font-bold truncate max-w-[120px]">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">{t.freePlan}</p>
          </div>
          <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: 'w-10 h-10 rounded-xl' } }} />
        </div>
      </header>

      <main className="p-8 max-w-[1000px] mx-auto w-full">
        {responses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-20 text-center flex flex-col items-center border-dashed"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
              <MessageSquare className="text-primary w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {direction === 'rtl' ? 'אין עדיין תגובות' : 'No responses yet'}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-sm">
              {direction === 'rtl'
                ? 'תגובות יופיעו כאן ברגע שמשתמשים ימלאו וישלחו את הטופס שלך.'
                : 'Responses will appear here once users submit your form.'}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary px-8"
            >
              {direction === 'rtl' ? 'חזור ללוח הבקרה' : 'Back to Dashboard'}
            </button>
          </motion.div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {responses.length} {direction === 'rtl' ? 'תגובות נמצאו' : (responses.length === 1 ? 'response found' : 'responses found')}
                </h2>
              </div>
              {formId && <ResponseExportButton formId={formId} />}
            </div>

            <div className="space-y-4">
              {responses.map((response, idx) => (
                <motion.div
                  key={response.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-card overflow-hidden group hover:border-primary/30 transition-all"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
                      <div className="flex items-center gap-2 text-primary font-bold">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          {new Date(response.submittedAt).toLocaleString(direction === 'rtl' ? 'he-IL' : 'en-US')}
                        </span>
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-bold">
                        ID: {response.id.slice(0, 8)}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                      {Object.entries(response.data).map(([fieldId, value]) => {
                        const field = formFields.find(f => f.id === fieldId);
                        const label = field?.label || field?.name || fieldId;

                        // Handle signature fields (base64 images)
                        if (field?.type === 'signature' && typeof value === 'string' && value.startsWith('data:image')) {
                          return (
                            <div key={fieldId} className="flex flex-col gap-1 md:col-span-2">
                              <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
                              <div className="bg-muted/30 p-2 rounded-lg border border-border/20">
                                <img src={value} alt={label} className="max-h-32 border border-border rounded" />
                              </div>
                            </div>
                          );
                        }

                        // Handle camera fields (base64 images)
                        if (field?.type === 'camera' && typeof value === 'string' && value.startsWith('data:image')) {
                          return (
                            <div key={fieldId} className="flex flex-col gap-1 md:col-span-2">
                              <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
                              <div className="bg-muted/30 p-2 rounded-lg border border-border/20">
                                <img src={value} alt={label} className="max-h-64 border border-border rounded" />
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={fieldId} className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
                            <span className="text-foreground font-medium bg-muted/30 p-2 rounded-lg border border-border/20">
                              {value === true ? (direction === 'rtl' ? 'כן' : 'Yes') : (value === false ? (direction === 'rtl' ? 'לא' : 'No') : String(value || '-'))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
