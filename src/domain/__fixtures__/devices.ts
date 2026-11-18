import { FitBaseType as B, FitEncoder } from 'fit-file-parser';

import type { TrackPoint } from '../types';

/** A TCX file like a Garmin export: one lap with device totals, optional positions. */
export function toTcx(points: TrackPoint[], o: { sport?: string; distanceM: number; timeS: number; calories?: number; positions?: boolean }) {
  const start = new Date(points[0].time!).toISOString();
  const tps = points
    .map(
      (p) =>
        `<Trackpoint><Time>${new Date(p.time!).toISOString()}</Time>` +
        (o.positions === false ? '' : `<Position><LatitudeDegrees>${p.lat}</LatitudeDegrees><LongitudeDegrees>${p.lon}</LongitudeDegrees></Position><AltitudeMeters>${p.ele}</AltitudeMeters>`) +
        `<HeartRateBpm><Value>${p.hr}</Value></HeartRateBpm></Trackpoint>`,
    )
    .join('');
  return `<?xml version="1.0"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
<Activities><Activity Sport="${o.sport ?? 'Running'}"><Id>${start}</Id>
<Lap StartTime="${start}"><TotalTimeSeconds>${o.timeS}</TotalTimeSeconds><DistanceMeters>${o.distanceM}</DistanceMeters><Calories>${o.calories ?? 0}</Calories>
<Track>${tps}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
}

const SEMI = 2 ** 31 / 180;
const fitTime = (ms: number) => FitEncoder.toFitTimestamp(new Date(ms));

/** A FIT activity file as a watch writes it: file_id, records, session, activity. */
export function toFit(
  points: TrackPoint[],
  o: { sport: number; subSport?: number; distanceM: number; timerS: number; elapsedS: number; calories: number; ascentM: number; utcOffsetMin: number; positions?: boolean },
): ArrayBuffer {
  const enc = new FitEncoder();
  const t0 = points[0].time!;
  enc.writeMessage(0, [
    { number: 0, size: 1, baseType: B.Enum, value: 4 },
    { number: 1, size: 2, baseType: B.Uint16, value: 255 },
    { number: 4, size: 4, baseType: B.Uint32, value: fitTime(t0) },
  ]);
  let dist = 0;
  points.forEach((p, i) => {
    if (i) dist += 10;
    const fields = [
      { number: 253, size: 4, baseType: B.Uint32, value: fitTime(p.time!) },
      { number: 3, size: 1, baseType: B.Uint8, value: p.hr ?? 0 },
      { number: 5, size: 4, baseType: B.Uint32, value: Math.round(dist * 100) },
    ];
    if (o.positions !== false) {
      fields.push(
        { number: 0, size: 4, baseType: B.Sint32, value: Math.round(p.lat * SEMI) },
        { number: 1, size: 4, baseType: B.Sint32, value: Math.round(p.lon * SEMI) },
        { number: 2, size: 2, baseType: B.Uint16, value: Math.round(((p.ele ?? 0) + 500) * 5) },
      );
    }
    enc.writeMessage(20, fields, 1);
  });
  const tEnd = points[points.length - 1].time!;
  enc.writeMessage(18, [
    { number: 253, size: 4, baseType: B.Uint32, value: fitTime(tEnd) },
    { number: 2, size: 4, baseType: B.Uint32, value: fitTime(t0) },
    { number: 5, size: 1, baseType: B.Enum, value: o.sport },
    { number: 6, size: 1, baseType: B.Enum, value: o.subSport ?? 0 },
    { number: 7, size: 4, baseType: B.Uint32, value: o.elapsedS * 1000 },
    { number: 8, size: 4, baseType: B.Uint32, value: o.timerS * 1000 },
    { number: 9, size: 4, baseType: B.Uint32, value: o.distanceM * 100 },
    { number: 11, size: 2, baseType: B.Uint16, value: o.calories },
    { number: 16, size: 1, baseType: B.Uint8, value: 150 },
    { number: 22, size: 2, baseType: B.Uint16, value: o.ascentM },
  ], 2);
  enc.writeMessage(34, [
    { number: 253, size: 4, baseType: B.Uint32, value: fitTime(tEnd) },
    { number: 5, size: 4, baseType: B.Uint32, value: fitTime(tEnd + o.utcOffsetMin * 60000) },
  ], 3);
  const bytes = enc.close();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
