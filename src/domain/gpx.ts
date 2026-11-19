import { ImportError, type ParsedTrack } from './track';
import type { ActivityType, TrackPoint } from './types';

export type { ParsedTrack };
/** @deprecated use ImportError */
export const GpxError = ImportError;

/**
 * Parse a GPX 1.0/1.1 file. React Native has no DOMParser, and GPX is regular
 * enough that a tolerant scanner is simpler and faster than shipping an XML
 * library. Reads <trkpt> (falls back to <rtept>), <ele>, <time> and heart rate
 * from Garmin/Polar/Coros extensions (any namespace prefix ending in "hr").
 */
export function parseGpx(xml: string): ParsedTrack {
  if (!/<gpx[\s>]/i.test(xml)) throw new ImportError('This file is not a GPX file.');

  const trk = firstBlock(xml, 'trk');
  const name = text(trk ?? xml, 'name');
  const type = mapType(text(trk ?? '', 'type'));

  let points = scanPoints(xml, 'trkpt');
  if (points.length === 0) points = scanPoints(xml, 'rtept');
  if (points.length === 0) throw new ImportError('This GPX file has no track points.');

  // Some exporters write points out of order; time order is what stats need.
  if (points.every((p) => p.time != null)) points.sort((a, b) => a.time! - b.time!);
  return { name: name || undefined, type, points };
}

function scanPoints(xml: string, tag: 'trkpt' | 'rtept'): TrackPoint[] {
  const out: TrackPoint[] = [];
  const re = new RegExp(`<${tag}\\b([^>]*?)(\\/>|>([\\s\\S]*?)<\\/${tag}>)`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const lat = attr(m[1], 'lat');
    const lon = attr(m[1], 'lon');
    if (lat == null || lon == null || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const body = m[3] ?? '';
    const p: TrackPoint = { lat, lon };
    const ele = num(text(body, 'ele'));
    if (ele != null) p.ele = ele;
    const t = text(body, 'time');
    if (t) {
      const ms = Date.parse(t);
      if (!Number.isNaN(ms)) p.time = ms;
    }
    const hr = /<(?:[\w-]+:)?hr>\s*(\d{2,3})\s*</i.exec(body);
    if (hr) p.hr = Number(hr[1]);
    out.push(p);
  }
  return out;
}

function firstBlock(xml: string, tag: string): string | null {
  const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml);
  return m ? m[1] : null;
}

/** Text of the first <tag> that is not inside a nested track segment. */
function text(xml: string, tag: string): string | undefined {
  const head = xml.split(/<trkseg\b/i)[0];
  const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(head);
  if (!m) return undefined;
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(m[1]);
  return (cdata ? cdata[1] : decodeEntities(m[1])).trim(); // CDATA is literal text
}

function attr(attrs: string, name: string): number | null {
  const m = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(attrs);
  return m ? num(m[1]) : null;
}

function num(s: string | undefined | null): number | null {
  if (s == null) return null;
  const n = Number(String(s).trim());
  return Number.isFinite(n) ? n : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

/** Map the free-text <type> exporters write (Strava: "running", Garmin: "trail_running", "9") to ours. */
export function mapType(raw?: string): ActivityType | undefined {
  if (!raw) return undefined;
  const t = raw.toLowerCase();
  if (/trail/.test(t)) return 'trail_run';
  if (/skat/.test(t)) return 'skate';
  if (/ski|snowboard/.test(t)) return 'ski';
  if (/rowing|^row$|kayak|canoe|paddl/.test(t)) return 'row';
  if (/climb/.test(t)) return 'climb';
  if (/run|^9$/.test(t)) return 'run';
  if (/hik/.test(t)) return 'hike';
  if (/walk/.test(t)) return 'walk';
  if (/bik|cycl|ride|^1$/.test(t)) return 'ride';
  if (/swim/.test(t)) return 'swim';
  return 'other';
}
