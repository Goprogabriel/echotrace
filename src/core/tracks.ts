import type {Ridge} from '../types.js';
import {median} from './math.js';

export function samePassage(previous: Ridge, next: Ridge): boolean {
  const overlap = Math.max(0, Math.min(previous.end, next.end) - Math.max(previous.start, next.start));
  if (overlap < .6 * (previous.end - previous.start) || !previous.points.length || !next.points.length) return false;
  const errors = previous.points.filter((p, i) => i % 8 === 0 && p.t >= next.start && p.t <= next.end).map(p => {
    const nearest = next.points.reduce((a, b) => Math.abs(b.t - p.t) < Math.abs(a.t - p.t) ? b : a);
    return Math.abs(nearest.hz - p.hz) / p.hz;
  });
  return errors.length > 0 && median(errors) < .02;
}
/** Preserve selected events across new FFT resolutions/IDs; do not silently select
 * newly admitted weak hypotheses merely because sensitivity was raised. */
export function selectTracksAfterAnalysis(previous: Ridge[] | null, next: Ridge[]): string[] {
  if (previous === null) {const representatives=new Set(harmonicGroups(next).map(g=>[...g].sort((a,b)=>b.medianSnr-a.medianSnr)[0].id));return next.filter(t=>representatives.has(t.id)).slice(0,3).map(t=>t.id);}
  if (!previous.length) return [];
  const retained = next.filter(t => previous.some(old => samePassage(old, t))).slice(0, 3).map(t => t.id);
  return retained.length ? retained : next.slice(0, Math.min(3, previous.length)).map(t => t.id);
}

/** Anchor-based grouping, inspired by AeroDoppler. No transitive unions: a weak
 * bridge must not merge two unrelated flybys into one event. */
export function harmonicGroups(tracks: Ridge[]): Ridge[][] {
  const groups: Ridge[][] = [];
  for (const track of [...tracks].sort((a, b) => median(a.points.map(p => p.hz)) - median(b.points.map(p => p.hz)) || a.start - b.start)) {
    const group = groups.find(g => isHarmonic(g[0], track));
    if (group) group.push(track); else groups.push([track]);
  }
  return groups;
}
export function isHarmonic(base: Ridge, other: Ridge): boolean {
  if(!base.points.length||!other.points.length)return false;
  const overlap = Math.min(base.end, other.end) - Math.max(base.start, other.start);
  if (overlap <= 0 || overlap < .75 * Math.max(base.end - base.start, other.end - other.start)) return false;
  const ratios = base.points.filter((p, i) => i % 4 === 0 && p.t >= other.start && p.t <= other.end).map(p => {
    const nearest = other.points.reduce((a, b) => Math.abs(b.t - p.t) < Math.abs(a.t - p.t) ? b : a);
    return nearest.hz / p.hz;
  });
  if (ratios.length < 4) return false;
  const ratio = median(ratios), harmonic = Math.round(ratio);
  return harmonic >= 2 && harmonic <= 4 && Math.abs(ratio / harmonic - 1) < .015 && ratios.every(r => Math.abs(r / harmonic - 1) < .025);
}
