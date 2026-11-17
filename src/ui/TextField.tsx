import { useId, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, typeStyle } from '@/theme';

import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  helper?: string;
  error?: string;
  disabled?: boolean;
};

export function TextField({ label, helper, error, disabled, onFocus, onBlur, ...input }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const borderColor = error ? colors.danger : focused ? colors.focus : colors.borderInput;
  return (
    <View style={{ gap: 6, opacity: disabled ? 0.4 : 1 }}>
      <Text variant="footnote" weight="500" nativeID={`${id}-label`}>
        {label}
      </Text>
      <TextInput
        {...input}
        editable={!disabled && input.editable !== false}
        accessibilityLabel={label}
        accessibilityLabelledBy={`${id}-label`}
        accessibilityHint={error ?? helper}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          typeStyle('base'),
          { borderColor, borderWidth: focused || error ? 2 : 1, color: colors.text },
        ]}
      />
      {error ? (
        <Text variant="footnote" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="footnote" color="textMuted">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
});
