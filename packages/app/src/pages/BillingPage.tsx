/**
 * Billing Page
 * Wraps billing UI with necessary context providers
 */

import { Outlet } from 'react-router-dom';
import { BillingProvider } from '@/contexts/BillingContext';
import { UsageProvider } from '@/contexts/UsageContext';
import { useAuth } from '@clerk/clerk-react';
import { BillingLayout } from '@/components/billing/layout/BillingLayout';

export function BillingPage() {
  const { orgId } = useAuth();

  // Use demo orgId if not authenticated (for testing)
  const effectiveOrgId = orgId || 'org_demo';

  return (
    <BillingProvider orgId={effectiveOrgId} autoLoad={true}>
      <UsageProvider orgId={effectiveOrgId} autoLoad={true} refreshInterval={60000}>
        <BillingLayout>
          <Outlet />
        </BillingLayout>
      </UsageProvider>
    </BillingProvider>
  );
}
