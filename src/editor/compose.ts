import { CANVAS, DEFAULT_BACKGROUND, type CanvasElement, type Composition, type FontId, type StatKey } from '@/domain/composition';
import type { Activity } from '@/domain/types';

import { templateById, unavailableReason } from './templates';

export type Style = { colour: string; font: FontId };
export const DEFAULT_STYLE: Style = { colour: '#FFFFFF', font: 'inter' };

/** A story holds this many stickers: plenty for a design, and keeps the editor smooth on older iPhones. */
export const MAX_STICKERS = 30;

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 4;

/** A starting layout: title at the top, route (or big distance) in the middle, stats at the bottom. */
export function defaultComposition(
  activity: Activity,
  newId: () => string,
  style: Style = DEFAULT_STYLE,
): Omit<Composition, 'createdAt' | 'updatedAt'> {
  const el = (templateId: string, y: number, scale = 1): CanvasElement => ({
    id: newId(),
    templateId,
    x: CANVAS.w / 2,
    y,
    scale,
    rotation: 0,
    colour: style.colour,
    font: style.font,
  });
  const middle = activity.routePolyline ? el('route', 930, 0.9) : activity.distanceM ? el('big-distance', 930) : null;
  return {
    id: newId(),
    activityId: activity.id,
    background: DEFAULT_BACKGROUND,
    elements: [el('title-day', 330), ...(middle ? [middle] : []), el('stat-row', 1600)],
  };
}

/** Add a template centred on the canvas, scaled down if it is wider than the canvas allows. */
export function addElement<C extends Pick<Composition, 'elements'>>(
  c: C,
  templateId: string,
  newId: () => string,
  style: Style,
  activity: Activity,
): { composition: C; element: CanvasElement | null } {
  const t = templateById(templateId);
  if (!t || unavailableReason(t, activity) || c.elements.length >= MAX_STICKERS) return { composition: c, element: null };
  const scale = Math.min(1, (CANVAS.w * 0.9) / t.size.w);
  const element: CanvasElement = {
    id: newId(),
    templateId,
    x: CANVAS.w / 2,
    y: emptiestY(c.elements, t.size.h * scale),
    scale,
    rotation: 0,
    colour: style.colour,
    font: style.font,
  };
  return { composition: { ...c, elements: [...c.elements, element] }, element };
}

/**
 * Vertical centre (canvas px) for a new element of height `h`: a free spot if
 * one exists (at most 15% overlap), otherwise the middle of the canvas, the
 * familiar place for a new sticker. It arrives selected, ready to drag.
 */
export function emptiestY(elements: CanvasElement[], h: number): number {
  const bands = elements.map((e) => {
    const t = templateById(e.templateId);
    const half = ((t?.size.h ?? 0) * e.scale) / 2;
    return [e.y - half, e.y + half] as const;
  });
  let best = CANVAS.h / 2;
  let bestOverlap = Infinity;
  let bestRaw = Infinity;
  // candidates every 40 px, preferring the middle when tied
  const candidates = [CANVAS.h / 2];
  for (let y = h / 2 + 120; y <= CANVAS.h - h / 2 - 120; y += 40) candidates.push(y);
  for (const y of candidates) {
    const top = y - h / 2;
    const bottom = y + h / 2;
    const overlap = bands.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(b, bottom) - Math.max(a, top)), 0);
    const score = overlap + Math.abs(y - CANVAS.h / 2) * 0.01;
    if (score < bestOverlap) {
      bestOverlap = score;
      bestRaw = overlap;
      best = y;
    }
  }
  return Math.round(bestRaw <= h * 0.15 ? best : CANVAS.h / 2);
}

export function updateElement<C extends Pick<Composition, 'elements'>>(c: C, id: string, patch: Partial<CanvasElement>): C {
  return {
    ...c,
    elements: c.elements.map((e) =>
      e.id === id ? { ...e, ...patch, scale: clamp(patch.scale ?? e.scale, MIN_SCALE, MAX_SCALE) } : e,
    ),
  };
}

export function removeElement<C extends Pick<Composition, 'elements'>>(c: C, id: string): C {
  return { ...c, elements: c.elements.filter((e) => e.id !== id) };
}

/** Move one step towards the front ('up') or the back ('down') of the stack. */
export function moveElement<C extends Pick<Composition, 'elements'>>(c: C, id: string, dir: 'up' | 'down'): C {
  const i = c.elements.findIndex((e) => e.id === id);
  const j = dir === 'up' ? i + 1 : i - 1;
  if (i < 0 || j < 0 || j >= c.elements.length) return c;
  const next = [...c.elements];
  [next[i], next[j]] = [next[j], next[i]];
  return { ...c, elements: next };
}

export function bringToFront<C extends Pick<Composition, 'elements'>>(c: C, id: string): C {
  const e = c.elements.find((x) => x.id === id);
  return e ? { ...c, elements: [...c.elements.filter((x) => x.id !== id), e] } : c;
}

/** What hit testing needs from each element, plain data so it can run on the UI thread. */
export type HitBox = { id: string; x: number; y: number; w: number; h: number; scale: number; rotation: number };

export function hitBoxes(elements: CanvasElement[]): HitBox[] {
  const out: HitBox[] = [];
  for (const e of elements) {
    const t = templateById(e.templateId);
    if (t) out.push({ id: e.id, x: e.x, y: e.y, w: t.size.w, h: t.size.h, scale: e.scale, rotation: e.rotation });
  }
  return out;
}

/** Topmost box under a canvas point, accounting for rotation and scale. Runs on the UI thread too. */
export function boxAt(boxes: HitBox[], x: number, y: number, slop = 24): HitBox | null {
  'worklet';
  for (let i = boxes.length - 1; i >= 0; i--) {
    const e = boxes[i];
    // into the element's local frame
    const dx = x - e.x;
    const dy = y - e.y;
    const cos = Math.cos(-e.rotation);
    const sin = Math.sin(-e.rotation);
    const lx = (dx * cos - dy * sin) / e.scale;
    const ly = (dx * sin + dy * cos) / e.scale;
    const pad = slop / e.scale;
    if (Math.abs(lx) <= e.w / 2 + pad && Math.abs(ly) <= e.h / 2 + pad) return e;
  }
  return null;
}

/** Topmost element under a canvas point. */
export function elementAt(elements: CanvasElement[], x: number, y: number, slop = 24): CanvasElement | null {
  const hit = boxAt(hitBoxes(elements), x, y, slop);
  return hit ? (elements.find((e) => e.id === hit.id) ?? null) : null;
}

/** A gesture's change to one sticker: move, then scale and turn about its centre. */
export type Delta = { tx: number; ty: number; scale: number; rotation: number };
export const NO_DELTA: Delta = { tx: 0, ty: 0, scale: 1, rotation: 0 };

/** The sticker after a gesture, kept on the canvas and within the size limits. */
export function applyDelta(e: Pick<CanvasElement, 'x' | 'y' | 'scale' | 'rotation'>, d: Delta) {
  return {
    x: clamp(e.x + d.tx, 0, CANVAS.w),
    y: clamp(e.y + d.ty, 0, CANVAS.h),
    scale: clamp(e.scale * d.scale, MIN_SCALE, MAX_SCALE),
    rotation: e.rotation + d.rotation,
  };
}

export function clamp(v: number, lo: number, hi: number) {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Tap a stat on or off in a stat sticker's list. A tapped-on stat goes to the
 * end, so the order is the order of taps. Returns null when the sticker is
 * already full, so the screen can say why nothing happened.
 */
export function toggleStat(current: StatKey[], key: StatKey, max: number): StatKey[] | null {
  if (current.includes(key)) return current.filter((k) => k !== key);
  if (current.length >= max) return null;
  return [...current, key];
}
