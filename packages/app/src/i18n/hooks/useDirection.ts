import { useAppStore } from '../../store/appStore';

/**
 * Hook for getting the current text direction based on language
 *
 * @returns 'rtl' for Hebrew and Arabic, 'ltr' for English
 *
 * @example
 * const direction = useDirection();
 * return <div style={{ direction }}>{content}</div>;
 */
export function useDirection(): 'rtl' | 'ltr' {
  const language = useAppStore((state) => state.language);
  return language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
}
