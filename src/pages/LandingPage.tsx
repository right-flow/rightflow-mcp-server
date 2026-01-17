import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInButton, useUser } from '@clerk/clerk-react';
import { motion, Variants } from 'framer-motion';
import { ArrowLeft, ArrowRight, FileText, Zap, Shield, Sparkles, Smartphone, CloudOff, CheckCircle2, Globe } from 'lucide-react';
import { useTranslation, useDirection } from '@/i18n';
import { LanguageSelector } from '@/components/layout/LanguageSelector';

export function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();
  const t = useTranslation();
  const direction = useDirection();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard');
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400 font-medium">Loading RightFlow...</p>
        </div>
      </div>
    );
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const niches = [
    {
      id: 'medical',
      title: direction === 'rtl' ? 'ציוד רפואי' : 'Medical Equipment',
      desc: direction === 'rtl' ? 'חוזים מורכבים בבתי חולים, גם במרתפים ללא קליטה.' : 'Complex contracts in hospitals, even in basements without signal.',
      icon: Shield
    },
    {
      id: 'technical',
      title: direction === 'rtl' ? 'שירות טכני' : 'Technical Services',
      desc: direction === 'rtl' ? 'דו"חות שירות, צילום תקלות וחתימת לקוח בשיוך מיידי.' : 'Service reports, photo capture, and instant client sign-off.',
      icon: Zap
    },
    {
      id: 'construction',
      title: direction === 'rtl' ? 'נדל"ן ותשתיות' : 'Construction & RE',
      desc: direction === 'rtl' ? 'טפסי פיקוח ובטיחות באתר לבנייה עם תמיכה מלאה ברגולציה.' : 'Site inspection and safety forms with full regulatory support.',
      icon: FileText
    }
  ];

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 overflow-x-hidden selection:bg-blue-500/30 font-sans" dir={direction}>
      {/* Premium Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="container mx-auto px-6 py-8 flex justify-between items-center relative z-50">
        <motion.div
          initial={{ opacity: 0, x: direction === 'rtl' ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 ring-1 ring-white/10">
            <FileText className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            Right<span className="text-blue-400">Flow</span> 2.0
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: direction === 'rtl' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
          <LanguageSelector />
          <SignInButton mode="modal">
            <button className="hidden sm:block text-sm font-bold text-slate-400 hover:text-white transition-colors">
              {direction === 'rtl' ? 'התחברות' : 'Sign In'}
            </button>
          </SignInButton>
          <SignInButton mode="modal">
            <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-sm ring-1 ring-white/10 uppercase tracking-wider">
              {t.getStarted}
            </button>
          </SignInButton>
        </motion.div>
      </nav>

      <main className="container mx-auto px-6 pt-16 pb-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Hero Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-[0.2em]">
              <Sparkles className="w-4 h-4" />
              {direction === 'rtl' ? 'הראשונים בישראל – HEBREW FIRST' : 'THE ISRAELI GOLD STANDARD'}
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight">
              {t.heroTitle}
            </motion.h1>

            <motion.p variants={itemVariants} className="text-xl text-slate-400 leading-relaxed max-w-xl">
              {t.heroSubtitle}
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-5 pt-4">
              <SignInButton mode="modal">
                <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold px-10 py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-2xl shadow-blue-500/30 group">
                  {t.getStarted}
                  {direction === 'rtl' ? <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
              </SignInButton>
              <button className="bg-white/5 hover:bg-white/10 text-white font-bold px-10 py-5 rounded-2xl border border-white/10 transition-all backdrop-blur-sm">
                {t.viewDemo}
              </button>
            </motion.div>

            {/* Micro-Features */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-8 pt-8">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-wider">
                <CloudOff className="w-4 h-4 text-blue-400" />
                {direction === 'rtl' ? 'אופליין מלא' : 'True Offline'}
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                {direction === 'rtl' ? 'תאימות רגולטורית' : 'Regulatory Ready'}
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-wider">
                <Smartphone className="w-4 h-4 text-blue-400" />
                {direction === 'rtl' ? 'מותאם שטח' : 'Field Optimized'}
              </div>
            </motion.div>
          </motion.div>

          {/* Visual Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: direction === 'rtl' ? 5 : -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-blue-500/20 rounded-[3rem] blur-3xl -z-10 animate-pulse" />
            <div className="bg-slate-800/50 border border-white/10 rounded-[2.5rem] p-4 shadow-2xl backdrop-blur-xl group overflow-hidden">
              {/* Mockup Frame */}
              <div className="relative rounded-[2rem] overflow-hidden aspect-[9/16] bg-[#1a1f2e]">
                {/* Mockup UI Content */}
                <div className="absolute inset-0 p-8 space-y-6">
                  <div className="flex justify-between items-center mb-8">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="bg-blue-600/20 text-blue-400 text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 border border-blue-400/30">
                      <CloudOff className="w-2 h-2" />
                      {direction === 'rtl' ? 'מצב לא מקוון' : 'OFFLINE MODE'}
                    </div>
                  </div>
                  {/* Placeholder Form Fields */}
                  <div className="h-4 w-1/3 bg-slate-700/50 rounded-full" />
                  <div className="h-12 w-full bg-slate-800 border border-white/5 rounded-xl" />
                  <div className="h-4 w-1/4 bg-slate-700/50 rounded-full" />
                  <div className="h-12 w-full bg-slate-800 border border-white/5 rounded-xl" />

                  {/* Signature Box */}
                  <div className="h-32 w-full bg-slate-800/80 border border-blue-500/30 rounded-2xl relative flex flex-col items-center justify-center gap-2">
                    <div className="text-blue-400/40 font-mono text-xs italic">
                      {direction === 'rtl' ? 'חתום כאן' : 'Sign Here'}
                    </div>
                    <div className="absolute bottom-4 right-4 text-[10px] text-slate-500 font-bold">
                      ID: DF-V2-9012
                    </div>
                    {/* SVG Signature Animation Placeholder */}
                    <motion.div
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <svg width="150" height="60" viewBox="0 0 150 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-blue-400 opacity-60">
                        <path d="M10,45 C20,40 30,50 40,35 C50,20 60,10 70,30 C80,50 90,55 110,40 C130,25 140,45 130,50 C120,55 80,45 60,40" />
                      </svg>
                    </motion.div>
                  </div>

                  <div className="h-14 w-full bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white pt-1 shadow-lg shadow-blue-600/20 ring-1 ring-white/10 uppercase tracking-widest text-sm">
                    {direction === 'rtl' ? 'שלח טופס' : 'Submit Form'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Niche Selection Grid */}
        <section className="mt-32 space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white">
              {direction === 'rtl' ? 'מותאם אישית לנישה שלך' : 'Tailored for Your Niche'}
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              {direction === 'rtl' ? 'אנחנו פותרים את הבעיות המנדטוריות בשטח, לא רק בונים טפסים.' : 'We solve mission-critical field problems, we don’t just build forms.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {niches.map((niche) => (
              <motion.div
                key={niche.id}
                whileHover={{ y: -10 }}
                className="bg-slate-800/30 border border-white/5 rounded-3xl p-8 hover:bg-slate-800/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl -z-10 group-hover:bg-blue-600/10 transition-all" />
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <niche.icon className="text-blue-400 w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-white mb-4">{niche.title}</h3>
                <p className="text-slate-400 leading-relaxed font-medium">
                  {niche.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features List */}
        <section className="mt-32 py-20 border-t border-white/5 grid md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <h4 className="text-xl font-black text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              {t.featureHebrewTitle}
            </h4>
            <p className="text-slate-400 font-medium">
              {t.featureHebrewDesc}
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-xl font-black text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" />
              {t.featureAiTitle}
            </h4>
            <p className="text-slate-400 font-medium">
              {t.featureAiDesc}
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-xl font-black text-white flex items-center gap-2">
              <CloudOff className="w-5 h-5 text-blue-400" />
              {t.featureOfflineTitle}
            </h4>
            <p className="text-slate-400 font-medium">
              {t.featureOfflineDesc}
            </p>
          </div>
        </section>

        {/* Social Proof */}
        <section className="mt-32 pt-20 border-t border-white/10 text-center">
          <p className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-12">
            {t.socialProofTitle}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-16 opacity-30 grayscale invert brightness-0">
            {/* Industry Logos Representation */}
            <div className="text-3xl font-black italic tracking-tighter">MED-ISRAEL</div>
            <div className="text-3xl font-black italic tracking-tighter">PHOENIX</div>
            <div className="text-3xl font-black italic tracking-tighter">ELECTRA</div>
            <div className="text-3xl font-black italic tracking-tighter">HAGALGAL</div>
            <div className="text-3xl font-black italic tracking-tighter">SAFETY-PRO</div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-white/5 mt-20">
        <div className="container mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm font-bold uppercase tracking-widest">
          <p>© 2026 RightFlow. Built with precision in Israel.</p>
          <div className="flex gap-10 mt-6 md:mt-0">
            <a href="#" className="hover:text-blue-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

