import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typeStyle, type ColorRole, type TypeRole } from '@/theme';

export type TextProps = RNTextProps & {
  variant?: TypeRole;
  color?: ColorRole;
  weight?: '400' | '500' | '600' | '700' | '800';
  align?: 'left' | 'center' | 'right';
  uppercase?: boolean;
};

export function Text({
  variant = 'base',
  color = 'text',
  weight,
  align,
  uppercase,
  style,
  maxFontSizeMultiplier = 1.4,
  ...rest
}: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        typeStyle(variant, weight),
        { color: colors[color], textAlign: align },
        uppercase && { textTransform: 'uppercase', letterSpacing: 0.5 },
        style,
      ]}
      {...rest}
    />
  );
}
