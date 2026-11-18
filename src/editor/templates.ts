import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSpeed,
  typeLabel,
  unitLabel,
  usesSpeed,
  weekdayName,
} from '@/domain/format';
import { decodePolyline, projectToBox, trimEnds } from '@/domain/geo';
import type { Activity, Units } from '@/domain/types';

import type { Shape } from './shapes';

export type TemplateInput = { activity: Activity; units: Units };
export type Need = 'route' | 'splits' | 'distance';

export type TemplateDef = {
  id: string;
  name: string;
  category: 'activity' | 'totals' | 'gear';
  needs?: Need[];
  /** natural size in canvas px (canvas is 1080 x 1920) */
  size: { w: number; h: number };
  render(input: TemplateInput): Shape[];
};

/** Stat values for an activity, already formatted, with nulls for anything missing. */
export function statValues({ activity: a, units }: TemplateInput) {
  const speed = usesSpeed(a.type);
  return {
    distance: formatDistance(a.distanceM, units),
    distanceUnit: unitLabel.distance(units),
    time: formatDuration(a.movingTimeS),
    paceLabel: speed ? 'Speed' : 'Pace',
    pace: speed ? formatSpeed(a.distanceM, a.movingTimeS, units) : formatPace(a.distanceM, a.movingTimeS, units),
    paceUnit: speed ? unitLabel.speed(units) : unitLabel.pace(units),
    climb: formatElevation(a.elevationGainM, units),
    climbUnit: unitLabel.elevation(units),
    hr: a.avgHr != null ? String(a.avgHr) : null,
    calories: a.calories != null ? String(a.calories) : null,
  };
}

/** Why a template can't be used with this activity, or null if it can. */
export function unavailableReason(t: TemplateDef, a: Activity): string | null {
  for (const n of t.needs ?? []) {
    if (n === 'route' && !a.routePolyline) return 'No route';
    if (n === 'splits' && a.splits.length < 2) return 'No splits';
    if (n === 'distance' && !a.distanceM) return 'No distance';
  }
  return null;
}

/** Route trimmed at both ends so a story never shows where someone lives. */
export const ROUTE_PRIVACY_TRIM_M = 200;

function routePoints(a: Activity, w: number, h: number, pad: number) {
  if (!a.routePolyline) return [];
  const pts = decodePolyline(a.routePolyline);
  const trimmed = trimEnds(pts, ROUTE_PRIVACY_TRIM_M);
  return projectToBox(trimmed.length >= 2 ? trimmed : pts, w, h, pad);
}

type Stat = { label: string; value: string; unit?: string };

function presentStats(input: TemplateInput, max: number): Stat[] {
  const v = statValues(input);
  const all: (Stat | null)[] = [
    v.distance ? { label: 'Distance', value: v.distance, unit: v.distanceUnit } : null,
    v.pace ? { label: v.paceLabel, value: v.pace, unit: v.paceUnit } : null,
    v.time ? { label: 'Time', value: v.time } : null,
    v.climb ? { label: 'Climb', value: v.climb, unit: v.climbUnit } : null,
    v.hr ? { label: 'Avg HR', value: v.hr, unit: 'bpm' } : null,
    v.calories ? { label: 'Calories', value: v.calories } : null,
  ];
  return all.filter((s): s is Stat => s != null).slice(0, max);
}

/** Label above value. `width` is the cell width: both lines shrink to fit inside it. */
function statCell(s: Stat, x: number, y: number, valueSize: number, width: number, align: 'left' | 'center' = 'left'): Shape[] {
  const maxWidth = width - 24;
  return [
    { kind: 'text', text: s.label, x, y, size: valueSize * 0.3, face: 'label', caps: true, opacity: 0.75, align, maxWidth },
    {
      kind: 'text',
      text: s.unit ? `${s.value} ${s.unit}` : s.value,
      x,
      y: y + valueSize * 1.05,
      size: valueSize,
      face: 'value',
      align,
      maxWidth,
    },
  ];
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'big-distance',
    name: 'Big distance',
    category: 'activity',
    needs: ['distance'],
    size: { w: 900, h: 420 },
    render(input) {
      const v = statValues(input);
      return [
        { kind: 'text', text: v.distance ?? '', x: 450, y: 300, size: 300, face: 'value', align: 'center', maxWidth: 880 },
        { kind: 'text', text: v.distanceUnit === 'mi' ? 'miles' : 'kilometres', x: 450, y: 390, size: 64, face: 'label', align: 'center', caps: true, opacity: 0.85 },
      ];
    },
  },
  {
    id: 'stat-row',
    name: 'Three stats',
    category: 'activity',
    size: { w: 960, h: 200 },
    render(input) {
      const stats = presentStats(input, 3);
      const col = 960 / Math.max(stats.length, 1);
      return stats.flatMap((s, i) => statCell(s, col * i + col / 2, 60, 92, col, 'center'));
    },
  },
  {
    id: 'stat-grid',
    name: 'Stat grid',
    category: 'activity',
    size: { w: 900, h: 510 },
    render(input) {
      const stats = presentStats(input, 6);
      return stats.flatMap((s, i) => statCell(s, (i % 2) * 470 + 10, 60 + Math.floor(i / 2) * 160, 96, 450));
    },
  },
  {
    id: 'route',
    name: 'Route',
    category: 'activity',
    needs: ['route'],
    size: { w: 800, h: 800 },
    render({ activity }) {
      return [{ kind: 'polyline', points: routePoints(activity, 800, 800, 24), width: 14, endDot: true }];
    },
  },
  {
    id: 'route-card',
    name: 'Route and stats',
    category: 'activity',
    needs: ['route'],
    size: { w: 760, h: 900 },
    render(input) {
      const stats = presentStats(input, 3);
      const col = 760 / Math.max(stats.length, 1);
      return [
        { kind: 'polyline', points: routePoints(input.activity, 760, 620, 30), width: 10, endDot: true },
        { kind: 'rect', x: 40, y: 660, w: 680, h: 3, opacity: 0.4 },
        ...stats.flatMap((s, i) => statCell(s, col * i + col / 2, 740, 64, col, 'center')),
      ];
    },
  },
  {
    id: 'title-day',
    name: 'Title and day',
    category: 'activity',
    size: { w: 960, h: 230 },
    render({ activity }) {
      return [
        { kind: 'text', text: activity.title, x: 480, y: 110, size: 96, face: 'value', align: 'center', maxWidth: 940 },
        {
          kind: 'text',
          text: `${weekdayName(activity)} · ${typeLabel(activity.type)}`,
          x: 480,
          y: 190,
          size: 44,
          face: 'label',
          align: 'center',
          caps: true,
          opacity: 0.8,
        },
      ];
    },
  },
  {
    id: 'splits-bars',
    name: 'Splits',
    category: 'activity',
    needs: ['splits'],
    size: { w: 800, h: 640 },
    render({ activity, units }) {
      const splits = activity.splits.filter((s) => s.unit === units).slice(0, 10);
      if (splits.length < 2) return [];
      const speed = usesSpeed(activity.type);
      // seconds per unit, partial last split scaled up
      const perUnit = splits.map((s) => s.timeS / (s.distanceM / (units === 'mi' ? 1609.344 : 1000)));
      const fastest = Math.min(...perUnit);
      const slowest = Math.max(...perUnit);
      const rowH = 600 / splits.length;
      const barH = Math.min(36, rowH * 0.55);
      return splits.flatMap((s, i): Shape[] => {
        const y = 20 + i * rowH;
        // faster = longer bar
        const t = slowest === fastest ? 1 : 1 - (perUnit[i] - fastest) / (slowest - fastest);
        const w = 220 + t * 360;
        const label = speed
          ? formatSpeed(s.distanceM, s.timeS, units)
          : formatPace(s.distanceM, s.timeS, units);
        return [
          { kind: 'text', text: String(s.index), x: 0, y: y + barH * 0.8, size: barH * 0.9, face: 'label', opacity: 0.7 },
          { kind: 'rect', x: 70, y, w, h: barH, r: barH / 2, opacity: 0.9 },
          { kind: 'text', text: label ?? '', x: 70 + w + 20, y: y + barH * 0.8, size: barH * 0.95, face: 'value' },
        ];
      });
    },
  },
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);
