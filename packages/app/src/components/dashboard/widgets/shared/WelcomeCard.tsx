// Welcome Card Widget
// Created: 2026-02-07
// Updated: 2026-02-08 - Added i18n support
// Purpose: Welcome message with user name and role

import { useUser } from '@clerk/clerk-react';
import { useRole } from '../../../../contexts/RoleContext';
import { useTranslation } from '../../../../i18n';

interface WelcomeCardProps {
  actionButton?: React.ReactNode;
}

export function WelcomeCard({ actionButton }: WelcomeCardProps) {
  const { user } = useUser();
  const { role } = useRole();
  const t = useTranslation();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t['dashboard.greeting.morning'];
    if (hour < 17) return t['dashboard.greeting.afternoon'];
    return t['dashboard.greeting.evening'];
  };

  const getRoleMessage = () => {
    switch (role) {
      case 'admin':
        return t['dashboard.greeting.adminMessage'];
      case 'manager':
        return t['dashboard.greeting.managerMessage'];
      case 'worker':
        return t['dashboard.greeting.workerMessage'];
      default:
        return t.manageFormsDescription;
    }
  };

  return (
    <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {getGreeting()}, {user?.firstName || t['dashboard.greeting.defaultUser']}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{getRoleMessage()}</p>
      </div>
      {actionButton}
    </div>
  );
}
