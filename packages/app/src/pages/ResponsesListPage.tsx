import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowRight, Layout, Search, BarChart3, Settings as SettingsIcon, FileText, LayoutDashboard } from 'lucide-react';
import { useTranslation, useDirection } from '../i18n';
import type { FormRecord } from '../services/forms/forms.service';

export function ResponsesListPage() {
    const { isSignedIn, isLoaded, user } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const t = useTranslation();
    const direction = useDirection();
    const [forms, setForms] = useState<FormRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredForms = forms.filter(form =>
        form.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center" dir={direction}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">{t.loadingDashboard}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-grid bg-background text-foreground" dir={direction}>
            {/* Sidebar - Same as Dashboard */}
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
                        { icon: LayoutDashboard, label: t.overview, active: false, path: '/dashboard' },
                        { icon: FileText, label: t.myForms, active: false, path: '/dashboard' },
                        { icon: BarChart3, label: t.responses, active: true, path: '/responses' },
                        { icon: SettingsIcon, label: t.settings, active: false, path: '/dashboard' },
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
                        <MessageSquare className="w-5 h-5" />
                        {t.helpCenter}
                    </button>
                    <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                        גרסה 2.4.2
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-20 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-8">
                    <div className="flex-1 max-w-xl relative">
                        <Search className={`absolute ${direction === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                        <input
                            type="text"
                            placeholder={t.searchFormsPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full bg-muted/50 border-none rounded-2xl h-11 ${direction === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:ring-2 focus:ring-primary/20 transition-all font-medium`}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`text-${direction === 'rtl' ? 'left' : 'right'} hidden sm:block`}>
                            <p className="text-sm font-bold truncate max-w-[120px]">{user?.fullName}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.freePlan}</p>
                        </div>
                        <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: 'w-10 h-10 rounded-xl' } }} />
                    </div>
                </header>

                <div className="p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black tracking-tight mb-2">{t.responses}</h1>
                        <p className="text-muted-foreground font-medium">{direction === 'rtl' ? 'בחר טופס כדי לצפות בתגובות שלו' : 'Select a form to view its responses'}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredForms.map((form) => (
                            <motion.div
                                key={form.id}
                                whileHover={{ y: -5 }}
                                className="glass-card p-6 cursor-pointer group hover:border-primary/30"
                                onClick={() => navigate(`/responses/${form.id}`)}
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <BarChart3 className="w-6 h-6" />
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

                        {filteredForms.length === 0 && (
                            <div className="col-span-full py-20 text-center glass-card border-dashed">
                                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-muted-foreground">{t.noFormsFound}</h2>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
