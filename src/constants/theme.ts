// FrameOn design tokens: the gold plaque and wood frame from the logo.
export interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  danger: string;
  success: string;
  star: string;
  overlay: string;
}

export const lightPalette: Palette = {
  background: '#FBF7E8',
  surface: '#FFFFFF',
  surfaceMuted: '#F3EDD2',
  border: '#E2DCC4',
  text: '#1A1A1A',
  textMuted: '#6B6659',
  primary: '#8B5A2B',
  onPrimary: '#FFFFFF',
  accent: '#E8D9A0',
  danger: '#B3261E',
  success: '#2E7D32',
  star: '#D99A00',
  overlay: 'rgba(0,0,0,0.4)',
};

export const darkPalette: Palette = {
  background: '#14110C',
  surface: '#1F1A12',
  surfaceMuted: '#2A2318',
  border: '#3A3122',
  text: '#F4EFDD',
  textMuted: '#A89F88',
  primary: '#D4A15F',
  onPrimary: '#1A1206',
  accent: '#E8D9A0',
  danger: '#F2766E',
  success: '#6FCF76',
  star: '#F2BC30',
  overlay: 'rgba(0,0,0,0.6)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heading: { fontSize: 20, fontWeight: '600', lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
} as const;

export type TextVariant = keyof typeof typography;
