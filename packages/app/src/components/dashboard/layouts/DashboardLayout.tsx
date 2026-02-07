// Dashboard Layout
// Created: 2026-02-07
// Purpose: Shared layout wrapper for role-based dashboards

import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserButton, useOrganization } from '@clerk/clerk-react';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  Bell,
  Search,
  HelpCircle,
  Layout,
  Users,
  CreditCard,
} from 'lucide-react';
import { useTranslation, useDirection } from '../../../i18n';
import { useRole } from '../../../contexts/RoleContext';

interface DashboardLayoutProps {
  children: ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showSearch?: boolean;
}

interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  roles?: ('admin' | 'manager' | 'worker')[];
}

export function DashboardLayout({
  children,
  searchQuery = '',
  onSearchChange,
  showSearch = true,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useTranslation();
  const direction = useDirection();
  const { role } = useRole();
  const { organization } = useOrganization();

  // Navigation items with role-based visibility
  const navItems: NavItem[] = [
    {
      id: 'overview',
      icon: LayoutDashboard,
      label: t.overview,
      path: '/dashboard',
    },
    {
      id: 'forms',
      icon: FileText,
      label: t.myForms,
      path: '/dashboard',
    },
    {
      id: 'responses',
      icon: BarChart3,
      label: t.responses,
      path: '/responses',
    },
    {
      id: 'users',
      icon: Users,
      label: t.teamManagement || 'ניהול צוות',
      path: '/organization/users',
      roles: ['admin'],
    },
    {
      id: 'billing',
      icon: CreditCard,
      label: t.billing || 'חיוב',
      path: '/billing',
      roles: ['admin'],
    },
    {
      id: 'settings',
      icon: Settings,
      label: t.settings,
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
        return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'מנהל' };
      case 'manager':
        return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'מנהל צוות' };
      case 'worker':
        return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'עובד' };
      default:
        return { color: 'bg-gray-100 text-gray-700', label: 'משתמש' };
    }
  };

  const roleBadge = getRoleBadge();

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

        {/* Tenant/Organization Logo */}
        {organization?.imageUrl && (
          <div className="mb-6 px-3">
            <div className="w-full h-20 flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-border p-2">
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-secondary text-primary'
                    : 'text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1 pt-6 border-t border-border">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
            <HelpCircle className="w-4 h-4" />
            {t.helpCenter}
          </button>
          <div className="px-3 py-2 text-xs text-muted-foreground text-center">
            גרסה 2.5.0
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="flex items-center justify-between mb-8">
          {showSearch && onSearchChange ? (
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="relative w-full">
                <Search
                  className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
                />
                <input
                  type="text"
                  placeholder={t.searchFormsPlaceholder}
                  className={`input-standard w-full ${direction === 'rtl' ? 'pr-10' : 'pl-10'} h-10`}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-muted-foreground">
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-border" />
            <UserButton
              appearance={{
                elements: { userButtonAvatarBox: 'w-10 h-10 rounded-lg' },
              }}
            />
          </div>
        </header>

        {/* Page Content */}
        {children}
      </main>
    </div>
  );
}
