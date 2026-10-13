import { useColorScheme } from 'react-native';
import { themePalettes } from '@/constants/colors';
import { useFinance } from '@/contexts/FinanceContext';

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Falls back to the light palette when no dark key is defined in
 * constants/colors.ts (the scaffold ships light-only by default).
 * When a sibling web artifact's dark tokens are synced into a `dark`
 * key, this hook will automatically switch palettes based on the
 * device's appearance setting.
 */
export function useColors() {
  const scheme = useColorScheme();
  const { state } = useFinance();
  const definition = themePalettes[state.themeId] ?? themePalettes.forest;
  const isDark = state.themeId === 'midnight' || scheme === 'dark';
  const palette = isDark ? definition.dark : definition.light;
  return { ...palette, radius: 16 };
}
