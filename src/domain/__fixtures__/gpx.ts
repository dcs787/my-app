import type { TrackPoint } from '../types';

/** Degrees of latitude per metre on the mean-radius sphere used by haversine. */
export const DEG_PER_M = 180 / (Math.PI * 6371008.8);

/** A straight run north: `n` points, `stepM` metres and `stepS` seconds apart. */
export function northTrack(n: number, stepM: number, stepS: number, start = Date.UTC(2026, 10, 17, 13, 5)): TrackPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    lat: 40 + i * stepM * DEG_PER_M,
    lon: -105,
    ele: 1600 + (i % 20 < 10 ? i % 20 : 20 - (i % 20)), // 10 m rolling hills
    time: start + i * stepS * 1000,
    hr: 150 + (i % 3),
  }));
}

export function toGpx(points: TrackPoint[], name = '<![CDATA[Lunch loop & hills]]>', type = 'running'): string {
  const pts = points
    .map(
      (p) =>
        `<trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.ele}</ele><time>${new Date(p.time!).toISOString()}</time>` +
        `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${p.hr}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><time>2026-11-17T13:05:00Z</time></metadata>
  <trk><name>${name}</name><type>${type}</type><trkseg>
${pts}
  </trkseg></trk>
</gpx>`;
}
