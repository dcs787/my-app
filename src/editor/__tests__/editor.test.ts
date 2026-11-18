import { sampleActivities } from '@/data/samples';
import type { Activity } from '@/domain/types';

import { addElement, bringToFront, defaultComposition, elementAt, removeElement, updateElement, MAX_SCALE } from '../compose';
import type { Shape } from '../shapes';
import { statValues, TEMPLATES, unavailableReason } from '../templates';

const now = Date.UTC(2026, 10, 18, 12);
const [run, , ride, treadmill] = sampleActivities(now).map(
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
