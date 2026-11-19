import { sampleActivities } from '@/data/samples';
import { hasLaps, lapsNote, splitsNote } from '@/domain/format';
import type { Activity } from '@/domain/types';

import { addElement, bringToFront, moveElement, defaultComposition, elementAt, removeElement, toggleStat, updateElement, MAX_SCALE } from '../compose';
import type { Shape } from '../shapes';
import { availableStats, presentStats, statValues, templateById, TEMPLATES, unavailableReason } from '../templates';

const now = Date.UTC(2026, 10, 18, 12);
const [run, hills, ride, treadmill] = sampleActivities(now).map(
  (a, i): Activity => ({ ...a, id: `a${i}`, createdAt: now, updatedAt: now }),
);
let n = 0;
const id = () => `e${++n}`;
const style = { colour: '#FFFFFF', font: 'inter' as const };

describe('templates', () => {
  it('render shapes inside their own bounds for every sample activity', () => {
    for (const a of [run, ride, treadmill]) {
      for (const t of TEMPLATES) {
        if (unavailableReason(t, a)) continue;
        const shapes = t.render({ activity: a, units: 'mi' });
        expect(shapes.length).toBeGreaterThan(0);
        for (const s of shapes) {
          const pts = s.kind === 'polyline' ? s.points : [{ x: s.x, y: s.y }];
          for (const p of pts) {
            expect(p.x).toBeGreaterThanOrEqual(-1);
            expect(p.x).toBeLessThanOrEqual(t.size.w + 1);
            expect(p.y).toBeGreaterThanOrEqual(-1);
            expect(p.y).toBeLessThanOrEqual(t.size.h + 1);
          }
        }
      }
    }
  });

  it('never prints empty or "null" text', () => {
    for (const a of [run, ride, treadmill]) {
      for (const t of TEMPLATES) {
        if (unavailableReason(t, a)) continue;
        const texts = t.render({ activity: a, units: 'km' }).filter((s): s is Extract<Shape, { kind: 'text' }> => s.kind === 'text');
        texts.forEach((s) => {
          expect(s.text).not.toMatch(/null|undefined|NaN/);
        });
      }
    }
  });

  it('keeps every stat inside its column so neighbours never overlap', () => {
    for (const id of ['stat-row', 'route-card']) {
      const t = TEMPLATES.find((x) => x.id === id)!;
      const texts = t.render({ activity: run, units: 'mi' }).filter((s): s is Extract<Shape, { kind: 'text' }> => s.kind === 'text');
      const cols = new Set(texts.map((s) => s.x)).size;
      texts.forEach((s) => expect(s.maxWidth).toBeLessThanOrEqual(t.size.w / cols));
    }
  });

  it('draws the free text sticker with its words, or a placeholder', () => {
    const t = TEMPLATES.find((x) => x.id === 'text')!;
    const [shape] = t.render({ activity: run, units: 'mi', text: '  First sub-20 5K  ' });
    expect(shape).toMatchObject({ kind: 'text', text: 'First sub-20 5K', maxWidth: 940 });
    expect(t.render({ activity: run, units: 'mi' })[0]).toMatchObject({ text: 'Your words' });
  });

  it('explains why a template is unavailable', () => {
    const route = TEMPLATES.find((t) => t.id === 'route')!;
    expect(unavailableReason(route, treadmill)).toBe('No route');
    expect(unavailableReason(route, run)).toBeNull();
    expect(unavailableReason(TEMPLATES.find((t) => t.id === 'splits-bars')!, treadmill)).toBe('No splits');
  });

  it('shows speed for rides and pace on foot', () => {
    expect(statValues({ activity: ride, units: 'mi' }).paceUnit).toBe('mph');
    expect(statValues({ activity: run, units: 'km' }).paceUnit).toBe('/km');
  });
});

describe('composition', () => {
  it('lays out a sensible default with or without a route', () => {
    expect(defaultComposition(run, id).elements.map((e) => e.templateId)).toEqual(['title-day', 'route', 'stat-row']);
    expect(defaultComposition(treadmill, id).elements.map((e) => e.templateId)).toEqual(['title-day', 'big-distance', 'stat-row']);
  });

  it('adds, updates, reorders and removes elements', () => {
    let c = defaultComposition(run, id);
    const added = addElement(c, 'stat-grid', id, style, run);
    expect(added.element).not.toBeNull();
    c = added.composition;
    expect(c.elements).toHaveLength(4);
    c = updateElement(c, added.element!.id, { x: 100, scale: 99 });
    expect(c.elements[3]).toMatchObject({ x: 100, scale: MAX_SCALE });
    c = bringToFront(c, c.elements[0].id);
    expect(c.elements[3].templateId).toBe('title-day');
    c = removeElement(c, added.element!.id);
    expect(c.elements).toHaveLength(3);
    // a template the activity can't use is not added
    expect(addElement(c, 'route', id, style, treadmill).element).toBeNull();
  });

  it('places a new sticker in free space when there is room, else the centre', () => {
    const c = defaultComposition(treadmill, id); // title ~330, big distance ~930, stats ~1600
    const small = addElement(c, 'title-day', id, style, treadmill).element!; // 230 tall: fits a gap
    for (const e of c.elements) expect(Math.abs(small.y - e.y)).toBeGreaterThan(150);
    const big = addElement(c, 'stat-grid', id, style, treadmill).element!; // 510 tall: no gap that big
    expect(big.y).toBe(960);
    expect(addElement({ elements: [] }, 'big-distance', id, style, run).element!.y).toBe(960);
  });

  it('moves stickers up and down the stack, stopping at the ends', () => {
    const c = defaultComposition(run, id);
    const ids = c.elements.map((e) => e.id);
    expect(moveElement(c, ids[0], 'up').elements.map((e) => e.id)).toEqual([ids[1], ids[0], ids[2]]);
    expect(moveElement(c, ids[2], 'down').elements.map((e) => e.id)).toEqual([ids[0], ids[2], ids[1]]);
    expect(moveElement(c, ids[2], 'up')).toBe(c);
    expect(moveElement(c, ids[0], 'down')).toBe(c);
    expect(moveElement(c, 'nope', 'up')).toBe(c);
  });

  it('hit-tests rotated and scaled elements, topmost first', () => {
    const base = { templateId: 'route', x: 540, y: 960, scale: 1, rotation: 0, colour: '#fff', font: 'inter' as const };
    const els = [
      { ...base, id: 'below' },
      { ...base, id: 'top', scale: 0.5 },
    ];
    expect(elementAt(els, 540, 960)?.id).toBe('top');
    expect(elementAt(els, 540 + 350, 960)?.id).toBe('below'); // outside the half-size one
    expect(elementAt(els, 10, 10)).toBeNull();
    const rotated = [{ ...base, id: 'r', templateId: 'stat-row', rotation: Math.PI / 2 }]; // 960 x 200, now vertical
    expect(elementAt(rotated, 540, 960 + 400)?.id).toBe('r');
    expect(elementAt(rotated, 540 + 400, 960)).toBeNull();
  });
});

describe('chosen stats', () => {
  const withMax: Activity = { ...run, avgHr: 158, maxHr: 181 };
  const texts = (shapes: Shape[]) =>
    shapes.filter((s): s is Extract<Shape, { kind: 'text' }> => s.kind === 'text').map((s) => s.text);

  it('uses the default order until someone chooses, with max HR opt-in', () => {
    const keys = presentStats({ activity: withMax, units: 'km' }, 6).map((s) => s.key);
    expect(keys).toEqual(['distance', 'pace', 'time', 'climb', 'hr']);
    expect(availableStats({ activity: withMax, units: 'km' }).map((s) => s.key)).toContain('maxHr');
  });

  it('shows the chosen stats in the chosen order, up to the sticker size', () => {
    const input = { activity: withMax, units: 'km' as const, stats: ['maxHr', 'time', 'distance', 'pace'] as const };
    expect(presentStats({ ...input, stats: [...input.stats] }, 3).map((s) => s.label)).toEqual(['Max HR', 'Time', 'Distance']);
    const row = templateById('stat-row')!;
    expect(texts(row.render({ ...input, stats: ['maxHr', 'time'] }))).toEqual(['Max HR', '181 bpm', 'Time', expect.any(String)]);
  });

  it('skips chosen stats the activity lacks, and falls back when none are left', () => {
    const noHr: Activity = { ...run, avgHr: null, maxHr: null };
    expect(presentStats({ activity: noHr, units: 'km', stats: ['maxHr', 'time'] }, 3).map((s) => s.key)).toEqual(['time']);
    expect(presentStats({ activity: noHr, units: 'km', stats: ['maxHr'] }, 3).map((s) => s.key)).toEqual(['distance', 'pace', 'time']);
  });

  it('every stat sticker says how many it fits', () => {
    for (const tid of ['stat-row', 'stat-grid', 'stat-list', 'ticker', 'stacked-numbers', 'route-card', 'route-side']) {
      expect(templateById(tid)?.maxStats).toBeGreaterThan(0);
    }
    expect(templateById('big-distance')?.maxStats).toBeUndefined();
  });

  it('toggles in tap order and refuses when full', () => {
    expect(toggleStat(['distance', 'pace'], 'hr', 3)).toEqual(['distance', 'pace', 'hr']);
    expect(toggleStat(['distance', 'pace', 'hr'], 'pace', 3)).toEqual(['distance', 'hr']);
    expect(toggleStat(['distance', 'pace', 'hr'], 'time', 3)).toBeNull();
  });

  it('keeps the choice on the element through updates', () => {
    const c = defaultComposition(run, id, style);
    const row = c.elements.find((e) => e.templateId === 'stat-row')!;
    const next = updateElement(c, row.id, { stats: ['time', 'distance'] });
    expect(next.elements.find((e) => e.id === row.id)?.stats).toEqual(['time', 'distance']);
    expect(JSON.parse(JSON.stringify(updateElement(next, row.id, { stats: undefined }))).elements.find((e: { id: string }) => e.id === row.id).stats).toBeUndefined();
  });
});

describe('laps', () => {
  const laps = templateById('laps-bars')!;

  it('the Laps sticker needs two or more laps, and draws one bar each', () => {
    expect(unavailableReason(laps, run)).toBe('No laps');
    expect(unavailableReason(laps, { ...run, laps: [{ index: 1, distanceM: 5000, timeS: 1500 }] })).toBe('No laps');
    expect(hills.laps).toHaveLength(6);
    expect(unavailableReason(laps, hills)).toBeNull();
    expect(laps.render({ activity: hills, units: 'mi' }).filter((s) => s.kind === 'rect')).toHaveLength(6);
  });

  it('says where laps and splits came from', () => {
    expect(lapsNote({ source: 'fit' })).toBe('Laps from your watch');
    expect(lapsNote({ source: 'apple_health' })).toBe('Segments you marked on your watch');
    expect(splitsNote({ source: 'strava', detailsAt: 5 })).toBe('Splits from Strava');
    expect(splitsNote({ source: 'gpx', detailsAt: null })).toBe('Worked out from GPS');
    expect(hasLaps(hills)).toBe(true);
  });
});
