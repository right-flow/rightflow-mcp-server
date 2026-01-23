/**
 * localStorage Migration Utility (Phase 1)
 * Migrates existing forms from localStorage to database on first login
 */

import type { FormField } from '../services/forms/forms.service';

const MIGRATION_KEY = 'rightflow_migration_completed';
const LEGACY_FORMS_KEY = 'rightflow_forms';

interface LegacyForm {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  pdfFile?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Check if migration has already been completed
 */
export function isMigrationCompleted(): boolean {
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark migration as completed
 */
export function markMigrationCompleted(): void {
  try {
    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch (error) {
    console.error('Failed to mark migration completed:', error);
  }
}

/**
 * Get legacy forms from localStorage
 */
export function getLegacyForms(): LegacyForm[] {
  try {
    const data = localStorage.getItem(LEGACY_FORMS_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse legacy forms:', error);
    return [];
  }
}

/**
 * Clear legacy forms from localStorage
 */
export function clearLegacyForms(): void {
  try {
    localStorage.removeItem(LEGACY_FORMS_KEY);
  } catch (error) {
    console.error('Failed to clear legacy forms:', error);
  }
}

/**
 * Migrate forms from localStorage to database
 * Returns the number of forms migrated
 */
export async function migrateLocalStorageForms(
  userId: string,
  authToken: string,
): Promise<{ success: boolean; count: number; errors: string[] }> {
  // Check if already migrated
  if (isMigrationCompleted()) {
    console.log('Migration already completed');
    return { success: true, count: 0, errors: [] };
  }

  // Get legacy forms
  const legacyForms = getLegacyForms();

  if (legacyForms.length === 0) {
    console.log('No legacy forms to migrate');
    markMigrationCompleted();
    return { success: true, count: 0, errors: [] };
  }

  console.log(`Found ${legacyForms.length} legacy forms to migrate`);

  const errors: string[] = [];
  let migratedCount = 0;

  // Migrate each form
  for (const legacyForm of legacyForms) {
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          title: legacyForm.title || 'Untitled Form',
          description: legacyForm.description || '',
          fields: legacyForm.fields || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to migrate form: ${response.statusText}`);
      }

      migratedCount++;
      console.log(`Migrated form: ${legacyForm.title}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to migrate form "${legacyForm.title}":`, errorMsg);
      errors.push(`${legacyForm.title}: ${errorMsg}`);
    }
  }

  // Mark migration as completed (even if some failed)
  markMigrationCompleted();

  // Clear legacy forms if all migrated successfully
  if (errors.length === 0) {
    clearLegacyForms();
    console.log(`Successfully migrated all ${migratedCount} forms`);
  } else {
    console.warn(`Migrated ${migratedCount}/${legacyForms.length} forms with ${errors.length} errors`);
  }

  return {
    success: errors.length === 0,
    count: migratedCount,
    errors,
  };
}

/**
 * Function to trigger migration on dashboard mount
 * Should be called from DashboardPage after user is authenticated
 */
export async function runLocalStorageMigration(
  userId: string | undefined,
  authToken: string | undefined,
): Promise<void> {
  if (!userId || !authToken) {
    return;
  }

  // Run migration in background
  try {
    const result = await migrateLocalStorageForms(userId, authToken);

    if (result.count > 0) {
      console.log(`Migration completed: ${result.count} forms migrated`);

      if (result.errors.length > 0) {
        console.warn('Some forms failed to migrate:', result.errors);
        alert(
          `Migrated ${result.count} forms from localStorage.\n\n` +
          `${result.errors.length} form(s) failed to migrate. Check console for details.`,
        );
      } else {
        alert(`Successfully migrated ${result.count} form(s) from localStorage to your account!`);
      }
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
