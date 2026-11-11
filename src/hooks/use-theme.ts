import { useColorScheme } from 'react-native';

import { darkPalette, lightPalette, type Palette } from '@/constants/theme';

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? darkPalette : lightPalette;
}
