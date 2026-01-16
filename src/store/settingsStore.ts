import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings, DEFAULT_SETTINGS } from '@/types/settings';
import { FormMetadata } from '@/types/fields';

interface SettingsState {
  settings: AppSettings;
  updateTextFieldSettings: (settings: Partial<AppSettings['textField']>) => void;
  updateCheckboxFieldSettings: (settings: Partial<AppSettings['checkboxField']>) => void;
  updateRadioFieldSettings: (settings: Partial<AppSettings['radioField']>) => void;
  updateDropdownFieldSettings: (settings: Partial<AppSettings['dropdownField']>) => void;
  updateNamingSettings: (settings: Partial<AppSettings['naming']>) => void;
  autoPopulateFromMetadata: (metadata: FormMetadata) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      updateTextFieldSettings: (newSettings) =>
        set((state) => {
          const validated = { ...newSettings };

          // Validate fontSize (8-24)
          if (validated.fontSize !== undefined) {
            validated.fontSize = Math.max(8, Math.min(24, validated.fontSize));
          }

          return {
            settings: {
              ...state.settings,
              textField: {
                ...state.settings.textField,
                ...validated,
              },
            },
          };
        }),

      updateCheckboxFieldSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            checkboxField: {
              ...state.settings.checkboxField,
              ...newSettings,
            },
          },
        })),

      updateRadioFieldSettings: (newSettings) =>
        set((state) => {
          const validated = { ...newSettings };

          // Validate defaultButtonCount (2-10)
          if (validated.defaultButtonCount !== undefined) {
            validated.defaultButtonCount = Math.max(2, Math.min(10, validated.defaultButtonCount));
          }

          // Validate spacing (10-100)
          if (validated.spacing !== undefined) {
            validated.spacing = Math.max(10, Math.min(100, validated.spacing));
          }

          return {
            settings: {
              ...state.settings,
              radioField: {
                ...state.settings.radioField,
                ...validated,
              },
            },
          };
        }),

      updateDropdownFieldSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            dropdownField: {
              ...state.settings.dropdownField,
              ...newSettings,
            },
          },
        })),

      updateNamingSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            naming: {
              ...state.settings.naming,
              ...newSettings,
            },
          },
        })),

      autoPopulateFromMetadata: (metadata) =>
        set((state) => {
          console.log('[Settings] Auto-populating from metadata:', metadata);
          return {
            settings: {
              ...state.settings,
              naming: {
                ...state.settings.naming,
                insuranceCompany: metadata.companyName,
                formName: metadata.formName,
              },
            },
          };
        }),

      resetSettings: () =>
        set({
          settings: DEFAULT_SETTINGS,
        }),
    }),
    {
      name: 'rightflow-settings', // LocalStorage key
    },
  ),
);
