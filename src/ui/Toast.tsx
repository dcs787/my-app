import type { LucideIcon } from '@/ui/icons';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, motion, radius } from '@/theme';

import { Text } from './Text';

type ToastMsg = { id: number; text: string; icon?: LucideIcon };
type ShowToast = (text: string, icon?: LucideIcon) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

/** One toast at a time; newest replaces. Shown 1.6 s, announced to screen readers. */
export function ToastProvider({ children, bottomOffset = 72 }: { children: ReactNode; bottomOffset?: number }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback<ShowToast>(
    (text, icon) => {
      if (timer.current) clearTimeout(timer.current);
      setMsg({ id: Date.now(), text, icon });
      AccessibilityInfo.announceForAccessibility(text);
      Animated.timing(opacity, { toValue: 1, duration: motion.fast, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: motion.base, useNativeDriver: true }).start(() =>
          setMsg(null),
        );
      }, 1600);
    },
    [opacity],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const Icon = msg?.icon;
  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg && (
        <View pointerEvents="none" style={[styles.layer, { bottom: insets.bottom + bottomOffset }]}>
          <Animated.View style={[styles.toast, { opacity }]} accessibilityLiveRegion="polite">
            {Icon && <Icon size={16} color={colors.text} strokeWidth={2.5} />}
            <Text variant="sm" weight="600">
              {msg.text}
            </Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 360,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    boxShadow: '0 12px 32px rgba(0,0,0,.45)',
  },
});
