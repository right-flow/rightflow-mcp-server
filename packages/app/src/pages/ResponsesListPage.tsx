import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, useOrganization } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useTranslation, useDirection } from '../i18n';
import { DashboardLayout } from '../components/dashboard/layouts/DashboardLayout';
import { RoleProvider } from '../contexts/RoleContext';
import type { FormRecord } from '../services/forms/forms.service';

export function ResponsesListPage() {
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
            <ResponsesListContent />
        </RoleProvider>
    );
}

function ResponsesListContent() {
    const { isSignedIn, isLoaded } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const t = useTranslation();
    const direction = useDirection();
    const [forms, setForms] = useState<FormRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            navigate('/');
        }
    }, [isLoaded, isSignedIn, navigate]);

    useEffect(() => {
        if (isSignedIn) {
            loadForms();
        }
    }, [isSignedIn]);

    async function loadForms() {
        try {
            setIsLoading(true);
            const token = await getToken();
            const response = await fetch('/api/v1/forms', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Handle both old and new API response formats
                setForms(data.data || data.forms || []);
            }
        } catch (error) {
            console.error('Failed to load forms:', error);
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <DashboardLayout showSearch={false}>
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">{t.loadingDashboard}</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout showSearch={false}>
            <div className="mb-8">
                <h1 className="text-3xl font-black tracking-tight mb-2">{t.responses}</h1>
                <p className="text-muted-foreground font-medium">
                    {direction === 'rtl' ? 'בחר טופס כדי לצפות בתגובות שלו' : 'Select a form to view its responses'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {forms.map((form) => (
                    <motion.div
                        key={form.id}
                        whileHover={{ y: -5 }}
                        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 cursor-pointer group hover:border-primary/30 hover:shadow-lg transition-all"
                        onClick={() => navigate(`/responses/${form.id}`)}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                <MaterialIcon name="analytics" size="lg" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-foreground truncate">{form.title}</h3>
                                <p className="text-xs text-muted-foreground truncate">{form.slug}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border">
                            <span className="text-xs font-bold text-muted-foreground">
                                {form.fields.length} {t.fields}
                            </span>
                            <div className="flex items-center gap-1 text-primary font-bold text-sm">
                                {direction === 'rtl' ? 'צפה בתגובות' : 'View Responses'}
                                <ArrowRight className={`w-4 h-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
                            </div>
                        </div>
                    </motion.div>
                ))}

                {forms.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-zinc-900 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                        <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-muted-foreground">{t.noFormsFound}</h2>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
