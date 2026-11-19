/** A saved story design. Elements are positioned in the fixed 1080 x 1920 canvas space. */

export const CANVAS = { w: 1080, h: 1920 } as const;

export type FontId = 'inter' | 'display' | 'serif' | 'mono' | 'condensed';

export const FONT_IDS: FontId[] = ['inter', 'display', 'serif', 'mono', 'condensed'];

/** The stats a stat sticker can show, in the order the person picks. */
export type StatKey = 'distance' | 'pace' | 'time' | 'climb' | 'hr' | 'maxHr' | 'calories';

export const STAT_KEYS: StatKey[] = ['distance', 'pace', 'time', 'climb', 'hr', 'maxHr', 'calories'];

export type Background =
  | { kind: 'photo'; uri: string; width: number; height: number }
  | { kind: 'solid'; colour: string }
  | { kind: 'gradient'; from: string; to: string };

export type CanvasElement = {
  id: string;
  /** a template id from the template registry, e.g. "big-distance", "route" */
  templateId: string;
  /** centre of the element, canvas px */
  x: number;
  y: number;
  scale: number;
  /** radians */
  rotation: number;
  colour: string;
  font: FontId;
  /** free text for the text element */
  text?: string;
  /** stats chosen for a stat sticker, in order; the template's default when absent */
  stats?: StatKey[];
};

export type Composition = {
  id: string;
  activityId: string;
  background: Background;
  elements: CanvasElement[];
  createdAt: number;
  updatedAt: number;
};

export const DEFAULT_BACKGROUND: Background = { kind: 'gradient', from: '#1C1C1F', to: '#0A0A0B' };
