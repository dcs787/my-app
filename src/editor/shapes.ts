/**
 * What a template draws, in the template's own coordinates (0,0 = top-left of
 * its natural size). Kept free of Skia so templates are plain, testable data.
 */
export type TextShape = {
  kind: 'text';
  text: string;
  x: number;
  /** baseline */
  y: number;
  size: number;
  /** 'value' = the font's display face (numbers, titles); 'label' = its text face */
  face: 'value' | 'label';
  align?: 'left' | 'center' | 'right';
  opacity?: number;
  /** uppercase + tracking for small labels */
  caps?: boolean;
  /** shrink the size until the text fits this width */
  maxWidth?: number;
};

export type PolylineShape = {
  kind: 'polyline';
  points: { x: number; y: number }[];
  width: number;
  opacity?: number;
  /** dot at the end of the line */
  endDot?: boolean;
};

export type RectShape = {
  kind: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  opacity?: number;
  /** stroke instead of fill */
  stroke?: number;
};

export type Shape = TextShape | PolylineShape | RectShape;
