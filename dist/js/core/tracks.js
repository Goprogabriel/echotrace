import { median } from './math.js';
export function samePassage(previous, next) {
    const overlap = Math.max(0, Math.min(previous.end, next.end) - Math.max(previous.start, next.start));
    if (overlap < .6 * (previous.end - previous.start) || !previous.points.length || !next.points.length)
        return false;
    const errors = previous.points.filter((p, i) => i % 8 === 0 && p.t >= next.start && p.t <= next.end).map(p => {
        const nearest = next.points.reduce((a, b) => Math.abs(b.t - p.t) < Math.abs(a.t - p.t) ? b : a);
        return Math.abs(nearest.hz - p.hz) / p.hz;
    });
    return errors.length > 0 && median(errors) < .02;
}
/** Preserve selected events across new FFT resolutions/IDs; do not silently select
 * newly admitted weak hypotheses merely because sensitivity was raised. */
export function selectTracksAfterAnalysis(previous, next) {
    if (previous === null)
        return next.slice(0, 3).map(t => t.id);
    if (!previous.length)
        return [];
    const retained = next.filter(t => previous.some(old => samePassage(old, t))).slice(0, 3).map(t => t.id);
    return retained.length ? retained : next.slice(0, Math.min(3, previous.length)).map(t => t.id);
}
