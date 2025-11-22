import { useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type ThemePreference = 'light' | 'dark' | 'system';

type ResolvedTheme = 'light' | 'dark';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

export function useTheme() {
  const [preference, setPreference] = useLocalStorage<ThemePreference>('homebase-theme', 'system');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(MEDIA_QUERY);

    const resolveTheme = (): ResolvedTheme => (media.matches ? 'dark' : 'light');

    const applyTheme = (nextPreference: ThemePreference) => {
      const nextResolved = nextPreference === 'system' ? resolveTheme() : nextPreference;
      setResolved(nextResolved);
      document.documentElement.classList.toggle('dark', nextResolved === 'dark');
    };

    applyTheme(preference);

    const handleChange = () => {
      if (preference === 'system') {
        applyTheme('system');
      }
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [preference]);

  return {
    preference,
    setPreference,
    resolvedTheme: resolved
  };
}
