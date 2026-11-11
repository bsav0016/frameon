import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { typography, type TextVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  muted?: boolean;
  danger?: boolean;
}

export function Text({ variant = 'body', muted, danger, style, ...rest }: TextProps) {
  const theme = useTheme();
  const color = danger ? theme.danger : muted ? theme.textMuted : theme.text;
  return <RNText {...rest} style={[typography[variant], { color }, style]} />;
}
