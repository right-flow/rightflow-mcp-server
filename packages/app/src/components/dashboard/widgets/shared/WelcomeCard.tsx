// Welcome Card Widget
// Created: 2026-02-07
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
    if (hour < 12) return 'בוקר טוב';
    if (hour < 17) return 'צהריים טובים';
    return 'ערב טוב';
  };

  const getRoleMessage = () => {
    switch (role) {
      case 'admin':
        return 'הנה סקירה של הארגון שלך';
      case 'manager':
        return 'הנה סקירה של הצוות שלך';
      case 'worker':
        return 'הנה הטפסים שמוקצים לך';
      default:
        return t.manageFormsDescription;
    }
  };

  return (
    <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {getGreeting()}, {user?.firstName || 'משתמש'}
        </h1>
        <p className="text-muted-foreground mt-1">{getRoleMessage()}</p>
      </div>
      {actionButton}
    </div>
  );
}
