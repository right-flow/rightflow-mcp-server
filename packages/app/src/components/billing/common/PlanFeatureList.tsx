// PlanFeatureList Component
// Created: 2026-02-05
// Purpose: Display list of plan features with checkmarks

import React from 'react';
import { Plan } from '../../../api/types';

interface PlanFeatureListProps {
  plan: Plan;
  className?: string;
}

/**
 * Plan feature list component
 * Displays plan limits and features as a checklist
 * Based on: Features/-Planning-/11-Self-Service-Subscriptions/Pricing plan.md
 */
export const PlanFeatureList: React.FC<PlanFeatureListProps> = ({ plan, className = '' }) => {
  // Get feature descriptions based on pricing plan document
  const getFeatureList = (plan: Plan): string[] => {
    const features: string[] = [];
    const planFeatures = plan.features as any;

    // 1. מספר טפסים (Number of forms)
    if (plan.maxForms === -1) {
      features.push('מספר טפסים: ללא הגבלה');
    } else {
      features.push(`מספר טפסים: ${plan.maxForms}`);
    }

    // 2. פעימות (חודשי) (Monthly submissions)
    if (plan.maxSubmissionsPerMonth >= 5000) {
      features.push('פעימות (חודשי): 5,000+');
    } else {
      features.push(`פעימות (חודשי): ${plan.maxSubmissionsPerMonth.toLocaleString()}`);
    }

    // 3. מיתוג (Branding)
    let branding = 'חובה (לוגו המערכת)'; // Default
    if (plan.name === 'FREE' || plan.name === 'BASIC') {
      branding = 'חובה (לוגו המערכת)';
    } else if (plan.name === 'EXPANDED') {
      branding = 'ללא מיתוג (White Label)';
    } else if (plan.name === 'ENTERPRISE') {
      branding = 'דומיין מותאם אישית';
    }
    features.push(`מיתוג: ${branding}`);

    // 4. מעקב נטישה (Abandonment tracking)
    let abandonment = 'ללא';
    if (planFeatures.abandonmentTracking === false || !planFeatures.abandonmentTracking) {
      abandonment = 'ללא';
    } else if (planFeatures.abandonmentTracking === 'view') {
      abandonment = 'צפייה בלבד (ללא תזכורות)';
    } else if (planFeatures.abandonmentTracking === 'auto') {
      abandonment = 'תזכורות אוטו\' (SMS/Mail)';
    } else if (planFeatures.abandonmentTracking === 'full') {
      abandonment = 'ניתוח משפך המרה מלא';
    }
    features.push(`מעקב נטישה: ${abandonment}`);

    // 5. אינטגרציות (Integrations)
    let integrations = 'ללא';
    if (plan.name === 'FREE') {
      integrations = 'ללא';
    } else if (plan.name === 'BASIC') {
      integrations = 'בסיסיות (WhatsApp)';
    } else if (plan.name === 'EXPANDED') {
      integrations = 'פרימיום (WhatsApp, SMS, Mail)';
    } else if (plan.name === 'ENTERPRISE') {
      integrations = 'API ו-Webhooks מלאים';
    }
    features.push(`אינטגרציות: ${integrations}`);

    // 6. ניתוח נתונים (AI) (AI data analysis)
    let analytics = 'בסיסי (גרפים)';
    if (plan.name === 'FREE' || plan.name === 'BASIC') {
      analytics = 'בסיסי (גרפים)';
    } else if (plan.name === 'EXPANDED') {
      analytics = 'השוואת נתונים היסטוריים';
    } else if (plan.name === 'ENTERPRISE') {
      analytics = 'מודל מסקנות והמלצות AI';
    }
    features.push(`ניתוח נתונים (AI): ${analytics}`);

    return features;
  };

  const features = getFeatureList(plan);

  return (
    <ul className={`space-y-2 ${className}`} role="list">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm text-gray-700">{feature}</span>
        </li>
      ))}
    </ul>
  );
};

export default PlanFeatureList;
