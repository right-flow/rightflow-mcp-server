// Dashboard Layout
// Created: 2026-02-07
// Updated: 2026-02-08 - Added Automation nav item and language switcher
// Purpose: Shared layout wrapper for role-based dashboards

import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserButton, useOrganization } from '@clerk/clerk-react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useTranslation, useDirection } from '../../../i18n';
import { useRole } from '../../../contexts/RoleContext';
import { useAppStore, type Language } from '../../../store/appStore';

interface DashboardLayoutProps {
  children: ReactNode;
  showSearch?: boolean;
}

interface NavItem {
  id: string;
  icon: string; // Material Symbol name
  label: string;
  path: string;
  roles?: ('admin' | 'manager' | 'worker')[];
}

export function DashboardLayout({
  children,
  showSearch = true,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useTranslation();
  const direction = useDirection();
  const { role } = useRole();
  const { organization } = useOrganization();

  // Language state from store
  const { language, setLanguage } = useAppStore();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setShowLangMenu(false);
  };

  // Navigation items with role-based visibility (using Material Symbol names)
  const navItems: NavItem[] = [
    {
      id: 'overview',
      icon: 'dashboard',
      label: t.overview,
      path: '/dashboard',
    },
    {
      id: 'forms',
      icon: 'description',
      label: t.myForms,
      path: '/editor',
    },
    {
      id: 'responses',
      icon: 'analytics',
      label: t.analytics,
      path: '/responses',
    },
    {
      id: 'automation',
      icon: 'automation',
      label: t.automation,
      path: '/automation',
      roles: ['admin', 'manager'],
    },
    {
      id: 'users',
      icon: 'group',
      label: t.teamManagement,
      path: '/organization/users',
      roles: ['admin'],
    },
    {
      id: 'billing',
      icon: 'credit_card',
      label: t.billing,
      path: '/billing',
      roles: ['admin'],
    },
    {
      id: 'settings',
      icon: 'settings',
      label: t.settingsTitle,
      path: '/organization',
    },
  ];

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) return true; // No role restriction
    return item.roles.includes(role as 'admin' | 'manager' | 'worker');
  });

  // Get role badge color and label
  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: t['dashboard.role.admin'] };
      case 'manager':
        return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: t['dashboard.role.manager'] };
      case 'worker':
        return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: t['dashboard.role.worker'] };
      default:
        return { color: 'bg-gray-100 text-gray-700', label: t['dashboard.role.user'] };
    }
  };

  const roleBadge = getRoleBadge();

  const isRTL = direction === 'rtl';

  return (
    <div
      className="dashboard-grid"
      dir={direction}
      style={{
        display: 'flex',
        flexDirection: isRTL ? 'row-reverse' : 'row',
        minHeight: '100vh',
      }}
    >
      {/* Sidebar - Deep Blue */}
      <aside
        className="sidebar bg-sidebar text-white"
        style={{
          order: isRTL ? 2 : 1,
          width: '280px',
          flexShrink: 0,
          borderLeft: isRTL ? '1px solid rgba(255,255,255,0.1)' : 'none',
          borderRight: isRTL ? 'none' : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Logo */}
        <div className="mb-6 mx-2 overflow-hidden rounded-xl bg-gray-100" style={{ height: '140px' }}>
          <img
            src="/logo.png"
            alt="RightFlow Logo"
            className="w-full h-full object-cover object-center"
            style={{ transform: 'scale(1.3)', transformOrigin: 'center center' }}
          />
        </div>

        {/* Tenant/Organization Logo */}
        {organization?.imageUrl && (
          <div className="mb-6 px-3">
            <div className="w-full h-16 flex items-center justify-center bg-white/10 rounded-lg p-2">
              <img
                src={organization.imageUrl}
                alt={organization.name || 'Organization logo'}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Role Badge */}
        <div className="mb-6 px-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleBadge.color}`}>
            {roleBadge.label}
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <MaterialIcon name={item.icon} size="md" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Usage Indicator */}
        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="bg-white/5 p-4 rounded-xl mb-4">
            <p className="text-xs text-white/60 mb-2">{t['dashboard.sidebar.packageUsage']}</p>
            <div className="w-full bg-white/10 rounded-full h-1.5 mb-2">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: '70%' }} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-white/80">70% {t['dashboard.sidebar.ofQuota']}</span>
              <button
                onClick={() => navigate('/billing')}
                className="text-[10px] text-primary font-bold hover:underline"
              >
                {t['dashboard.sidebar.upgradeNow']}
              </button>
            </div>
          </div>

          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all">
            <MaterialIcon name="help" size="md" />
            {t.helpCenter}
          </button>
          <div className="px-3 py-2 text-xs text-white/40 text-center flex flex-col gap-1">
            <div>{t['dashboard.sidebar.version']} 2.5.0</div>
            <div className="text-[8px] opacity-20 uppercase tracking-widest text-primary">New Dashboard Active</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" style={{ order: isRTL ? 1 : 2, flex: 1 }}>
        {/* Top Header - matching Dashboard1.html */}
        <header className="flex items-center justify-between p-8 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          {/* Left side: Title + Search */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <MaterialIcon name="dashboard" size="lg" className="text-sidebar dark:text-primary" />
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{t.overview}</h2>
            </div>
            {showSearch && (
              <div className="relative w-72">
                <MaterialIcon
                  name="search"
                  size="sm"
                  className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`}
                />
                <input
                  type="text"
                  placeholder={t['dashboard.header.search']}
                  className={`w-full ${direction === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg focus:ring-2 focus:ring-primary/50 text-sm`}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Primary Action Button */}
            <button className="bg-primary hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
              <MaterialIcon name="link" size="sm" />
              {t['dashboard.header.sendFormLink']}
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300 text-sm font-medium"
              >
                <MaterialIcon name="translate" size="sm" />
                <span>{language === 'he' ? t.hebrew : language === 'ar' ? t.arabic : t.english}</span>
                <MaterialIcon name="expand_more" size="sm" />
              </button>
              {showLangMenu && (
                <div className={`absolute top-full ${direction === 'rtl' ? 'right-0' : 'left-0'} mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[120px]`}>
                  <button
                    onClick={() => handleLanguageChange('he')}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg text-gray-700 dark:text-gray-300 ${language === 'he' ? 'bg-gray-100 dark:bg-gray-700 font-medium' : ''}`}
                  >
                    {t.hebrew}
                    {language === 'he' && <MaterialIcon name="check" size="sm" className="ms-auto text-primary" />}
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 ${language === 'en' ? 'bg-gray-100 dark:bg-gray-700 font-medium' : ''}`}
                  >
                    {t.english}
                    {language === 'en' && <MaterialIcon name="check" size="sm" className="ms-auto text-primary" />}
                  </button>
                  <button
                    onClick={() => handleLanguageChange('ar')}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg text-gray-700 dark:text-gray-300 ${language === 'ar' ? 'bg-gray-100 dark:bg-gray-700 font-medium' : ''}`}
                  >
                    {t.arabic}
                    {language === 'ar' && <MaterialIcon name="check" size="sm" className="ms-auto text-primary" />}
                  </button>
                </div>
              )}
            </div>

            {/* Notifications */}
            <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300 relative">
              <MaterialIcon name="notifications" size="md" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
            </button>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

            {/* User Button */}
            <UserButton
              appearance={{
                elements: { userButtonAvatarBox: 'w-10 h-10 rounded-lg' },
              }}
            />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
