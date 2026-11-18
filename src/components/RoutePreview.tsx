import { useMemo } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { decodePolyline, projectToBox } from '@/domain/geo';
import { colors } from '@/theme';

/** Static route line for lists and details. The editor draws routes with Skia instead. */
export function RoutePreview({
  polyline,
  width,
  height,
  stroke = colors.text,
  strokeWidth = 3,
}: {
  polyline: string;
  width: number;
  height: number;
  stroke?: string;
  strokeWidth?: number;
}) {
  const pts = useMemo(
    () => projectToBox(decodePolyline(polyline), width, height, strokeWidth * 2),
    [polyline, width, height, strokeWidth],
  );
  if (pts.length < 2) return null;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const end = pts[pts.length - 1];
  return (
    <Svg width={width} height={height} accessibilityLabel="Route map" accessible>
      <Path d={d} stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={end.x} cy={end.y} r={strokeWidth * 1.4} fill={stroke} />
    </Svg>
  );
}
