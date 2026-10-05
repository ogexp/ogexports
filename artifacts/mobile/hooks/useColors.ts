import colors from '@/constants/colors';
import { useOptionalAppPreferences } from '@/context/AppPreferencesContext';

export function useColors() {
  const preferences = useOptionalAppPreferences();
  const appearance = preferences?.resolvedAppearance ?? 'light';
  return { ...colors[appearance], radius: colors.radius };
}
