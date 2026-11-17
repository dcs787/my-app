import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Platform, type GestureResponderEvent } from 'react-native';

import { focusRing } from '@/theme';

/** Shared press behaviour: focus ring state, pressed opacity and an optional light haptic. */
export function usePressable(onPress?: (e: GestureResponderEvent) => void, haptic = false) {
  const [focused, setFocused] = useState(false);

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (haptic && Platform.OS === 'ios') {
        Haptics.selectionAsync().catch(() => {});
      }
      onPress?.(e);
    },
    [onPress, haptic],
  );

  return {
    focused,
    pressableProps: {
      onPress: handlePress,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
    stateStyle: (pressed: boolean, disabled?: boolean | null) => [
      pressed && !disabled && { opacity: 0.7 },
      disabled && { opacity: 0.4 },
      focused && focusRing,
    ],
  };
}
