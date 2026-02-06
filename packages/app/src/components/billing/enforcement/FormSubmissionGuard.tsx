// FormSubmissionGuard Component
// Created: 2026-02-05
// Purpose: HOC for form submission with quota enforcement

import React, { useState, useCallback } from 'react';
import { useQuotaCheck } from '../../../hooks/useQuotaCheck';
import { QuotaWarningModal } from './QuotaWarningModal';

interface FormSubmissionGuardProps {
  formId: string;
  onSubmit: () => void | Promise<void>;
  onUpgrade: () => void;
  children: (props: { handleSubmit: () => Promise<void>; isChecking: boolean }) => React.ReactNode;
  bypassQuotaCheck?: boolean;
}

/**
 * Form submission guard component
 * Wraps form submission with quota checking and warning modal
 * Prevents submission if quota exceeded (unless user proceeds)
 */
export const FormSubmissionGuard: React.FC<FormSubmissionGuardProps> = ({
  formId,
  onSubmit,
  onUpgrade,
  children,
  bypassQuotaCheck = false,
}) => {
  const { checkBeforeSubmit, quotaResult, showWarning, setShowWarning, checking: isChecking } = useQuotaCheck(formId);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle submission with quota check
  const handleSubmit = useCallback(async () => {
    if (bypassQuotaCheck) {
      // Bypass quota check - just submit
      setIsSubmitting(true);
      try {
        await onSubmit();
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Check quota before submission
    const allowed = await checkBeforeSubmit();

    if (allowed) {
      // Quota check passed - proceed with submission
      setIsSubmitting(true);
      try {
        await onSubmit();
      } finally {
        setIsSubmitting(false);
      }
    }
    // If not allowed, modal will be shown by useQuotaCheck hook
  }, [bypassQuotaCheck, checkBeforeSubmit, onSubmit]);

  // Handle proceed from modal (user wants to submit despite warning)
  const handleProceedFromModal = useCallback(async () => {
    setShowWarning(false);
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, setShowWarning]);

  // Handle don't show again
  const handleDontShowAgainChange = useCallback((checked: boolean) => {
    if (checked) {
      localStorage.setItem('quotaWarning_dontShowAgain', 'true');
    } else {
      localStorage.removeItem('quotaWarning_dontShowAgain');
    }
  }, []);

  return (
    <>
      {/* Render children with handleSubmit function */}
      {children({ handleSubmit, isChecking: isChecking || isSubmitting })}

      {/* Quota warning modal */}
      <QuotaWarningModal
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        onProceed={handleProceedFromModal}
        onUpgrade={onUpgrade}
        quotaResult={quotaResult}
        showDontShowAgain={true}
        onDontShowAgainChange={handleDontShowAgainChange}
      />
    </>
  );
};

export default FormSubmissionGuard;
