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
 */
export const PlanFeatureList: React.FC<PlanFeatureListProps> = ({ plan, className = '' }) => {
  const features = [
    `${plan.maxForms} ${plan.maxForms === 1 ? 'form' : 'forms'}`,
    `${plan.maxSubmissionsPerMonth.toLocaleString()} submissions/month`,
    `${(plan.maxStorageMB / 1024).toFixed(plan.maxStorageMB >= 1024 ? 0 : 1)} GB storage`,
    `${plan.maxMembers} team ${plan.maxMembers === 1 ? 'member' : 'members'}`,
  ];

  // Add custom features from plan.features object
  Object.entries(plan.features).forEach(([key, value]) => {
    if (value) {
      // Convert camelCase to readable format
      const readableKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
      features.push(readableKey);
    }
  });

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
