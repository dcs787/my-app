import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, motion, radius } from '@/theme';

import { Text } from './Text';

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'half' | 'full';
  children: ReactNode;
};

/** Bottom sheet: slides up (fades with Reduce Motion), backdrop tap / back / Escape closes. */
export function Sheet({ open, onClose, title, size = 'half', children }: SheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(open);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));

  // Mount as soon as it opens; unmount after the close animation finishes.
  if (open && !visible) setVisible(true);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: motion.sheet,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
  }, [open, progress]);

  const sheetHeight = Math.round(height * (size === 'full' ? 0.92 : 0.6));
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          { height: sheetHeight, paddingBottom: insets.bottom },
          reduceMotion ? { opacity: progress } : { transform: [{ translateY }] },
        ]}>
        <View style={styles.grabber} />
        {title ? (
          <Text variant="title" weight="600" accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
        ) : null}
        <View style={{ flex: 1 }}>{children}</View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    boxShadow: '0 -8px 32px rgba(0,0,0,.5)',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: 8,
    marginBottom: 8,
  },
  title: { paddingHorizontal: 16, paddingBottom: 8 },
});
