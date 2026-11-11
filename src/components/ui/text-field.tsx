import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Text } from './text';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="label" muted>
          {label}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={label ?? rest.placeholder}
        placeholderTextColor={theme.textMuted}
        {...rest}
        style={[
          styles.input,
          { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border, color: theme.text },
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" danger accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
});
