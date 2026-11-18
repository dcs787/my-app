import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSpeed,
  formatLongDate,
  typeLabel,
  unitLabel,
  usesSpeed,
  weekdayName,
} from '@/domain/format';
import { decodePolyline, projectToBox, trimEnds } from '@/domain/geo';
import type { Activity, Units } from '@/domain/types';

import type { Shape } from './shapes';

export type TemplateInput = { activity: Activity; units: Units };
export type Need = 'route' | 'splits' | 'distance' | 'time' | 'hr' | 'climb' | 'calories';

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
    if (n === 'time' && !a.movingTimeS) return 'No time';
    if (n === 'hr' && a.avgHr == null) return 'No heart rate';
    if (n === 'climb' && !a.elevationGainM) return 'No climb';
    if (n === 'calories' && a.calories == null) return 'No calories';
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
  // ---- single big numbers
  {
    id: 'big-pace',
    name: 'Big pace',
    category: 'activity',
    needs: ['distance', 'time'],
    size: { w: 900, h: 400 },
    render(input) {
      const v = statValues(input);
      return [
        { kind: 'text', text: v.pace ?? '', x: 450, y: 280, size: 280, face: 'value', align: 'center', maxWidth: 880 },
        { kind: 'text', text: `${v.paceUnit} · average ${v.paceLabel.toLowerCase()}`, x: 450, y: 370, size: 56, face: 'label', align: 'center', caps: true, opacity: 0.85, maxWidth: 880 },
      ];
    },
  },
  {
    id: 'big-time',
    name: 'Big time',
    category: 'activity',
    needs: ['time'],
    size: { w: 900, h: 400 },
    render(input) {
      const v = statValues(input);
      return [
        { kind: 'text', text: v.time ?? '', x: 450, y: 280, size: 260, face: 'value', align: 'center', maxWidth: 880 },
        { kind: 'text', text: 'moving time', x: 450, y: 370, size: 56, face: 'label', align: 'center', caps: true, opacity: 0.85 },
      ];
    },
  },
  {
    id: 'big-climb',
    name: 'Big climb',
    category: 'activity',
    needs: ['climb'],
    size: { w: 900, h: 470 },
    render(input) {
      const v = statValues(input);
      // a simple ridge line above the number
      const ridge = [0, 0.55, 0.35, 0.9, 0.6, 1, 0.45, 0.7, 0.2].map((h, i) => ({ x: 150 + i * 75, y: 150 - h * 120 }));
      return [
        { kind: 'polyline', points: ridge, width: 10 },
        { kind: 'text', text: `${v.climb ?? ''} ${v.climbUnit}`, x: 450, y: 360, size: 180, face: 'value', align: 'center', maxWidth: 880 },
        { kind: 'text', text: 'elevation gain', x: 450, y: 440, size: 52, face: 'label', align: 'center', caps: true, opacity: 0.85 },
      ];
    },
  },
  {
    id: 'big-heart',
    name: 'Heart rate',
    category: 'activity',
    needs: ['hr'],
    size: { w: 800, h: 400 },
    render(input) {
      const v = statValues(input);
      const beat = [0, 0, 0.1, -0.5, 1, -0.3, 0.05, 0, 0].map((h, i) => ({ x: 100 + i * 75, y: 90 - h * 70 }));
      return [
        { kind: 'polyline', points: beat, width: 9 },
        { kind: 'text', text: v.hr ?? '', x: 400, y: 320, size: 190, face: 'value', align: 'center' },
        { kind: 'text', text: 'avg bpm', x: 400, y: 385, size: 48, face: 'label', align: 'center', caps: true, opacity: 0.85 },
      ];
    },
  },
  {
    id: 'big-calories',
    name: 'Calories',
    category: 'activity',
    needs: ['calories'],
    size: { w: 800, h: 360 },
    render(input) {
      const v = statValues(input);
      return [
        { kind: 'text', text: v.calories ?? '', x: 400, y: 240, size: 220, face: 'value', align: 'center', maxWidth: 780 },
        { kind: 'text', text: 'calories burned', x: 400, y: 330, size: 52, face: 'label', align: 'center', caps: true, opacity: 0.85 },
      ];
    },
  },

  // ---- layouts
  {
    id: 'stat-list',
    name: 'Stat list',
    category: 'activity',
    size: { w: 760, h: 520 },
    render(input) {
      const stats = presentStats(input, 5);
      const rowH = 100;
      return stats.flatMap((s, i): Shape[] => {
        const y = 20 + i * rowH;
        return [
          ...(i ? [{ kind: 'rect', x: 0, y, w: 760, h: 2, opacity: 0.35 } as Shape] : []),
          { kind: 'text', text: s.label, x: 0, y: y + 66, size: 40, face: 'label', caps: true, opacity: 0.8 },
          { kind: 'text', text: s.unit ? `${s.value} ${s.unit}` : s.value, x: 760, y: y + 70, size: 60, face: 'value', align: 'right', maxWidth: 440 },
        ];
      });
    },
  },
  {
    id: 'stacked-numbers',
    name: 'Stacked',
    category: 'activity',
    size: { w: 760, h: 640 },
    render(input) {
      const stats = presentStats(input, 3);
      return stats.flatMap((s, i): Shape[] => {
        const y = 170 + i * 200;
        return [
          { kind: 'text', text: s.value, x: 0, y, size: 170, face: 'value', maxWidth: 520 },
          { kind: 'text', text: (s.unit ?? s.label).toUpperCase(), x: 760, y: y - 10, size: 40, face: 'label', align: 'right', opacity: 0.8, maxWidth: 220 },
        ];
      });
    },
  },
  {
    id: 'ticker',
    name: 'One line',
    category: 'activity',
    size: { w: 980, h: 150 },
    render(input) {
      const line = presentStats(input, 3)
        .map((s) => (s.unit ? `${s.value} ${s.unit}` : s.value))
        .join('  ·  ');
      return [
        { kind: 'rect', x: 0, y: 10, w: 980, h: 3, opacity: 0.6 },
        { kind: 'text', text: line, x: 490, y: 100, size: 64, face: 'value', align: 'center', maxWidth: 960 },
        { kind: 'rect', x: 0, y: 137, w: 980, h: 3, opacity: 0.6 },
      ];
    },
  },
  {
    id: 'distance-pill',
    name: 'Distance pill',
    category: 'activity',
    needs: ['distance'],
    size: { w: 620, h: 190 },
    render(input) {
      const v = statValues(input);
      return [
        { kind: 'rect', x: 6, y: 6, w: 608, h: 178, r: 89, stroke: 8 },
        { kind: 'text', text: `${v.distance ?? ''} ${v.distanceUnit}`, x: 310, y: 125, size: 96, face: 'value', align: 'center', maxWidth: 520 },
      ];
    },
  },
  {
    id: 'route-side',
    name: 'Route beside stats',
    category: 'activity',
    needs: ['route'],
    size: { w: 960, h: 420 },
    render(input) {
      const stats = presentStats(input, 3);
      return [
        { kind: 'polyline', points: routePoints(input.activity, 420, 420, 24), width: 9, endDot: true },
        ...stats.flatMap((s, i) => statCell(s, 480, 60 + i * 125, 72, 480)),
      ];
    },
  },
  {
    id: 'route-framed',
    name: 'Framed route',
    category: 'activity',
    needs: ['route'],
    size: { w: 760, h: 900 },
    render(input) {
      const v = statValues(input);
      return [
        { kind: 'rect', x: 6, y: 6, w: 748, h: 888, r: 48, stroke: 6, opacity: 0.9 },
        { kind: 'polyline', points: routePoints(input.activity, 760, 700, 90).map((p) => ({ x: p.x, y: p.y + 10 })), width: 10, endDot: true },
        { kind: 'text', text: [v.distance && `${v.distance} ${v.distanceUnit}`, v.time].filter(Boolean).join('  ·  '), x: 380, y: 820, size: 64, face: 'value', align: 'center', maxWidth: 660 },
      ];
    },
  },

  // ---- words
  {
    id: 'date-stamp',
    name: 'Date',
    category: 'activity',
    size: { w: 900, h: 260 },
    render({ activity }) {
      return [
        { kind: 'text', text: weekdayName(activity), x: 450, y: 150, size: 150, face: 'value', align: 'center', maxWidth: 880 },
        { kind: 'text', text: formatLongDate(activity), x: 450, y: 235, size: 56, face: 'label', align: 'center', caps: true, opacity: 0.85 },
      ];
    },
  },
  {
    id: 'fastest-split',
    name: 'Fastest split',
    category: 'activity',
    needs: ['splits'],
    size: { w: 800, h: 380 },
    render({ activity, units }) {
      const per = units === 'mi' ? 1609.344 : 1000;
      // full splits only: a short last split can look fast without being so
      const full = activity.splits.filter((s) => s.unit === units && s.distanceM >= per * 0.95);
      if (!full.length) return [];
      const best = full.reduce((a, b) => (b.timeS < a.timeS ? b : a));
      const speed = usesSpeed(activity.type);
      const value = speed ? formatSpeed(best.distanceM, best.timeS, units) : formatPace(best.distanceM, best.timeS, units);
      const unit = speed ? unitLabel.speed(units) : unitLabel.pace(units);
      return [
        { kind: 'text', text: `fastest ${units === 'mi' ? 'mile' : 'km'} · #${best.index}`, x: 400, y: 70, size: 52, face: 'label', align: 'center', caps: true, opacity: 0.85 },
        { kind: 'text', text: `${value ?? ''}`, x: 400, y: 290, size: 220, face: 'value', align: 'center', maxWidth: 640 },
        { kind: 'text', text: unit, x: 400, y: 360, size: 48, face: 'label', align: 'center', opacity: 0.85 },
      ];
    },
  },
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);
