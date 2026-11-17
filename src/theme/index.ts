import { tokens } from './tokens';

export { tokens };
export type { ColorRole, TypeRole } from './tokens';

export const colors = tokens.colors;
export const space = tokens.space;
export const radius = tokens.radius;
export const layout = tokens.layout;
export const motion = tokens.motion;

/** Inter is loaded per weight, so a weight maps to a font family name. */
const interByWeight: Record<string, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
};

export function fontFamily(weight: string | number = '400'): string {
  return interByWeight[String(weight)] ?? interByWeight['400'];
}

/** Text style for a type role, with the right Inter family for its weight. */
export function typeStyle(role: keyof typeof tokens.type, weight?: string | number) {
  const t = tokens.type[role];
  return {
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
    fontFamily: fontFamily(weight ?? t.fontWeight),
  };
}

/** Focus ring: 2px focus colour outside a 2px bg gap. */
export const focusRing = {
  outlineColor: tokens.colors.focus,
  outlineWidth: 2,
  outlineOffset: 2,
  outlineStyle: 'solid' as const,
};
