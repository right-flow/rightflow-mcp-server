import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInButton, useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Smartphone,
  CloudOff,
  Zap,
  Shield,
  Users,
  Globe,
  Layout,
  Link as LinkIcon,
  MousePointer2,
  Camera,
  PenTool,
  Cpu,
  ArrowLeft,
} from 'lucide-react';
import { useTranslation, useDirection } from '@/i18n';
import { LanguageSelector } from '@/components/layout/LanguageSelector';

const NICHES = [
  { id: 'medical', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'technical', icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'construction', icon: Layout, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'sales', icon: PenTool, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'security', icon: Users, color: 'text-slate-500', bg: 'bg-slate-50' },
];

const FEATURES = [
  { id: 'pwa', icon: Smartphone },
  { id: 'offlineFirst', icon: CloudOff },
  { id: 'signatureSmoothing', icon: PenTool },
  { id: 'aiDetection', icon: Cpu },
];

export function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();
  const t = useTranslation();
  const direction = useDirection();
  const [activeNiche, setActiveNiche] = useState('medical');

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard');
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF6100]"></div>
      </div>
    );
  }

  const isRtl = direction === 'rtl';

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-sans selection:bg-[#FF6100]/20" dir={direction}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="container mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0A1551] to-[#1E2B7A] rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="text-white w-6 h-6 fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tight text-[#0A1551]">
              Right<span className="text-[#FF6100]">Flow</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-[#0A1551] transition-colors">{isRtl ? 'פיצ׳רים' : 'Features'}</a>
            <a href="#use-cases" className="text-sm font-semibold text-slate-600 hover:text-[#0A1551] transition-colors">{isRtl ? 'מקרי שימוש' : 'Use Cases'}</a>
            <a href="#integrations" className="text-sm font-semibold text-slate-600 hover:text-[#0A1551] transition-colors">{isRtl ? 'אינטגרציות' : 'Integrations'}</a>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSelector />
            <a href="https://app.rightflow.co.il/sign-in" className="hidden sm:block text-sm font-bold text-[#0A1551] hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors">
              {isRtl ? 'התחברות' : 'Login'}
            </a>
            <a href="https://app.rightflow.co.il/sign-up" className="bg-[#FF6100] hover:bg-[#E65700] text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-95 text-sm uppercase tracking-wide">
              {t.getStarted}
            </a>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-40 pb-20 md:pt-52 md:pb-32 bg-slate-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[#0A1551]/[0.02] -skew-x-12 translate-x-1/4 pointer-events-none" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: isRtl ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-[#FF6100] text-xs font-black uppercase tracking-widest border border-orange-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF6100]"></span>
                  </span>
                  RightFlow 2.0 is here
                </div>

                <h1 className="text-5xl md:text-7xl font-black text-[#0A1551] leading-[1.1] tracking-tight">
                  {t.heroTitle}
                </h1>

                <p className="text-xl text-slate-600 leading-relaxed max-w-xl">
                  {t.heroSubtitle}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <a href="https://app.rightflow.co.il/sign-up" className="bg-[#FF6100] hover:bg-[#E65700] text-white text-lg font-bold px-10 py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-500/30 group">
                    {t.getStarted}
                    {isRtl ? <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  </a>
                  <button className="bg-white hover:bg-slate-50 text-[#0A1551] font-bold px-10 py-5 rounded-2xl border border-slate-200 transition-all shadow-sm">
                    {t.viewDemo}
                  </button>
                </div>

                <div className="flex items-center gap-6 pt-8 border-t border-slate-200">
                  <div className="flex -space-x-3 rtl:space-x-reverse">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm font-bold text-slate-500">
                    <span className="text-[#0A1551]">500+</span> {isRtl ? 'צוותי שטח מרוצים בישראל' : 'Satisfied field teams in Israel'}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="absolute -inset-10 bg-[#FF6100]/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="relative bg-white p-4 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(10,21,81,0.15)] border border-slate-100">
                  <div className="rounded-[2rem] overflow-hidden bg-slate-100 aspect-[4/3] relative">
                    <img
                      src="/images/hero-success.png"
                      alt="Mobile App Interface"
                      className="w-full h-full object-cover opacity-95"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1551]/60 to-transparent flex flex-col justify-end p-8 text-white">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold tracking-wide uppercase text-xs">Certified Field-Ready</span>
                      </div>
                      <h3 className="text-2xl font-bold">{isRtl ? 'טפסים חכמים באמת' : 'Truly Intelligent Forms'}</h3>
                    </div>
                  </div>
                </div>

                {/* Floating Micro-UI */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-6 -right-6 md:-right-10 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CloudOff className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Sync Status</div>
                    <div className="text-sm font-bold text-slate-800">{isRtl ? 'אופליין פעיל' : 'Offline Ready'}</div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Matrix Grid */}
        <section id="features" className="py-32 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-[#0A1551] mb-6">
                {isRtl ? 'הכלים הנכונים לעבודה בשטח' : 'The right tools for the field'}
              </h2>
              <p className="text-lg text-slate-600 font-medium">
                RightFlow 2.0 {isRtl ? 'נבנה מאפס כדי לתת מענה לאתגרים של עובדי שטח ישראלים.' : 'was built from the ground up to solve the challenges of Israeli field teams.'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {FEATURES.map((feature) => (
                <motion.div
                  key={feature.id}
                  whileHover={{ y: -5 }}
                  className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200 transition-all group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#FF6100] transition-all">
                    <feature.icon className="w-7 h-7 text-[#0A1551] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0A1551] mb-4">
                    {(t as any)[`${feature.id}Title`]}
                  </h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {(t as any)[`${feature.id}Desc`]}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Tabbed Section */}
        <section id="use-cases" className="py-32 bg-slate-900 overflow-hidden relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#FF6100]/5 blur-[120px] pointer-events-none" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col lg:flex-row gap-20 items-center">
              <div className="lg:w-1/3 space-y-8">
                <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
                  {isRtl ? 'מכל נישה, בכל מקום' : 'Any niche, anywhere'}
                </h2>
                <div className="flex flex-col gap-3">
                  {NICHES.map((niche) => (
                    <button
                      key={niche.id}
                      onClick={() => setActiveNiche(niche.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${activeNiche === niche.id
                        ? 'bg-white shadow-lg scale-105'
                        : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      <div className={`p-2 rounded-lg ${activeNiche === niche.id ? niche.bg : 'bg-slate-800'}`}>
                        <niche.icon className={`w-6 h-6 ${activeNiche === niche.id ? niche.color : 'text-slate-500'}`} />
                      </div>
                      <span className="font-bold">{(t as any)[`${niche.id}Title`]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:w-2/3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeNiche}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="bg-white p-12 md:p-16 rounded-[3rem] shadow-2xl relative"
                  >
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                      <div className="flex-1 space-y-6 text-center md:text-start lg:rtl:text-right">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">
                          {(() => {
                            const NicheIcon = NICHES.find(n => n.id === activeNiche)?.icon || Users;
                            return <NicheIcon className="w-8 h-8 text-[#FF6100]" />;
                          })()}
                        </div>
                        <h3 className="text-3xl font-black text-[#0A1551]">
                          {(t as any)[`${activeNiche}Title`]}
                        </h3>
                        <p className="text-lg text-slate-600 leading-relaxed italic">
                          "{(t as any)[`${activeNiche}Desc`]}"
                        </p>
                        <div className="pt-6">
                          <button className="text-[#FF6100] font-black flex items-center gap-2 hover:gap-3 transition-all">
                            {isRtl ? 'קרא עוד על המקרה' : 'Read use case'}
                            {isRtl ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="w-full md:w-1/2 aspect-square rounded-[2rem] bg-slate-100 overflow-hidden shadow-inner">
                        <img
                          src={activeNiche === 'medical' ? '/images/medical-success.png' : activeNiche === 'technical' ? '/images/technical-success.png' : `https://images.unsplash.com/photo-${activeNiche === 'construction' ? '1504307651254-35680f4f4640' : '1581056771107-24ca5f033842'}?auto=format&fit=crop&q=80&w=400`}
                          alt={activeNiche}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section id="integrations" className="py-32 bg-white">
          <div className="container mx-auto px-6">
            <div className="bg-[#0A1551] rounded-[4rem] p-12 md:p-24 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[#FF6100]/20 to-transparent pointer-events-none" />

              <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
                <div className="space-y-8 text-white">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-orange-300 text-[10px] font-black uppercase tracking-[0.3em]">
                    No-Code Ready
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black">
                    {isRtl ? 'מתחברים לעולם שלכם' : 'Connect to your world'}
                  </h2>
                  <p className="text-slate-300 text-lg leading-relaxed font-medium">
                    {isRtl
                      ? 'הזרם נתונים ישירות ל-CRM, לניהול הפרויקטים או לכל מערכת אוטומציה שאתה כבר עובד איתה.'
                      : 'Stream data directly to your CRM, project management tool, or any automation platform you already use.'}
                  </p>

                  <div className="grid grid-cols-2 gap-6 pt-4">
                    {[
                      { name: 'Priority ERP', detail: (t as any).priorityTitle },
                      { name: 'חשבשבת', detail: (t as any).hashavshevetTitle },
                      { name: 'Monday.com', detail: 'Israeli Favorite' },
                      { name: 'Zoho CRM', detail: 'Advanced Flow' },
                      { name: 'WhatsApp', detail: 'Instant Alerts' },
                      { name: 'Zapier', detail: '3000+ Apps' },
                    ].map(app => (
                      <div key={app.name} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="w-8 h-8 rounded bg-[#FF6100] flex items-center justify-center font-black text-xs">RF</div>
                        <div>
                          <div className="text-sm font-bold">{app.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{app.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div className="aspect-square bg-white rounded-[3rem] p-8 flex items-center justify-center shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-slate-50/50 flex items-center justify-center gap-8 -rotate-12 opacity-10">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <LinkIcon key={i} className="w-20 h-20 text-[#0A1551]" />
                      ))}
                    </div>
                    <div className="relative z-10 text-center space-y-6 p-8">
                      <div className="w-24 h-24 bg-orange-100 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm">
                        <Cpu className="text-[#FF6100] w-12 h-12" />
                      </div>
                      <h4 className="text-2xl font-black text-[#0A1551] uppercase tracking-tighter">Integration Hub</h4>
                      <p className="text-[#0A1551] text-sm font-bold px-4">
                        {(t as any).bidirectionalFlowDesc}
                      </p>
                      <div className="flex justify-center gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-[#FF6100]" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Bar */}
        <section className="py-20 bg-slate-50 border-y border-slate-100">
          <div className="container mx-auto px-6">
            <p className="text-center text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-12">
              {t.socialProofTitle}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale transition-all hover:grayscale-0 hover:opacity-100">
              <div className="text-2xl md:text-3xl font-black italic tracking-tighter text-[#0A1551]">MED-ISRAEL</div>
              <div className="text-2xl md:text-3xl font-black italic tracking-tighter text-[#0A1551]">PHOENIX</div>
              <div className="text-2xl md:text-3xl font-black italic tracking-tighter text-[#0A1551]">ELECTRA</div>
              <div className="text-2xl md:text-3xl font-black italic tracking-tighter text-[#0A1551]">HAGALGAL</div>
              <div className="text-2xl md:text-3xl font-black italic tracking-tighter text-[#0A1551]">SAFETY-PRO</div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 bg-white relative overflow-hidden">
          <div className="container mx-auto px-6 text-center space-y-12 relative z-10">
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-5xl md:text-7xl font-black text-[#0A1551]">
                {isRtl ? 'הנייר נגמר, התזרים מתחיל' : 'Ready to go paperless?'}
              </h2>
              <p className="text-xl text-slate-600 font-medium max-w-xl mx-auto">
                {isRtl ? 'הצטרפו למהפכת ה-Mobile-First של עובדי השטח בישראל.' : 'Join the Mobile-First revolution for field workers in Israel.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <a href="https://app.rightflow.co.il/sign-up" className="bg-[#FF6100] hover:bg-[#E65700] text-white text-xl font-bold px-12 py-6 rounded-2xl shadow-2xl shadow-orange-500/40 transition-all hover:scale-105 active:scale-95 leading-none flex items-center justify-center">
                {t.getStarted}
              </a>
              <button className="bg-[#0A1551] hover:bg-[#1E2B7A] text-white text-xl font-bold px-12 py-6 rounded-2xl shadow-xl transition-all leading-none">
                {isRtl ? 'צור קשר' : 'Contact Us'}
              </button>
            </div>
            <p className="text-slate-400 font-bold text-sm">
              {isRtl ? 'אין צורך בכרטיס אשראי • 14 יום ניסיון כלול' : 'No credit card required • 14-day free trial included'}
            </p>
          </div>

          {/* Background elements */}
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-50 to-transparent -z-10" />
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-orange-100 rounded-full blur-[120px] -translate-x-1/2 -z-10" />
          <div className="absolute top-1/3 right-0 w-96 h-96 bg-blue-100 rounded-full blur-[150px] translate-x-1/3 -z-10" />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white pt-24 pb-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 border-b border-white/10 pb-16">
            <div className="col-span-1 md:col-span-1 space-y-6">
              <div className="flex items-center gap-2">
                <Zap className="text-[#FF6100] w-6 h-6 fill-current" />
                <span className="text-2xl font-black tracking-tight">
                  Right<span className="text-[#FF6100]">Flow</span>
                </span>
              </div>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                The Israeli Gold Standard for field data collection and smart PDF flows. Built with precision for local teams.
              </p>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-[#FF6100]">Product</h4>
              <ul className="space-y-4 text-slate-400 text-sm font-bold">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Enterprise</a></li>
                <li><a href="#" className="hover:text-white transition-colors">PWA Guide</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-[#FF6100]">Support</h4>
              <ul className="space-y-4 text-slate-400 text-sm font-bold">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">RTL Docs</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-[#FF6100]">Legal</h4>
              <ul className="space-y-4 text-slate-400 text-sm font-bold">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GDPR Israeli Addendum</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-8 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <p>© 2026 RightFlow Israel. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              System Operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
