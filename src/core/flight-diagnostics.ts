/** Independent browser implementation inspired by AeroDoppler's chance-match and
 * clock-lock gates. Deliberately reports uncalibrated diagnostics, never grades. */
import type {FitResult, SignalAnalysis} from '../types.js';
import type {AudioContext} from './spectral-support.js';
import {measureSpectralSupport} from './spectral-support.js';
import {fitTrack} from './matcher.js';
import {ecef, prepareFlight} from './physics.js';
import {harmonicGroups} from './tracks.js';
import {haversine} from './math.js';
export function diagnoseFlights(result: FitResult, analysis: SignalAnalysis, context: AudioContext): void {
  const groups = harmonicGroups(context.tracks);
  const groupIndex = new Map(groups.flatMap((g, i) => g.map(track => [track.id, i] as const)));
  for (const c of result.candidates) {
    const events = new Set(c.matches.map(m => groupIndex.get(m.trackId)));
    const nullChecks: {trackId: string; controls: number; excessDb: number | null; status: 'supported' | 'weak' | 'insufficient'}[] = [];
    const clockOffsets: {trackId: string; offset: number | null; deltaSeconds: number | null}[] = [];
    for (const m of c.matches) {
      const track = context.tracks.find(t => t.id === m.trackId), flight = context.flights.find(f => f.id === m.flightId);
      const on = m.spectralSupport;
      const controls: number[] = [], controlStarts: number[] = [];
      if (track && on && m.predicted.length) {
        const span = track.end - track.start, first = analysis.fftSize / 2 / analysis.sampleRate;
        const last = ((analysis.frames - 1) * analysis.hopSize + analysis.fftSize / 2) / analysis.sampleRate;
        // Deterministic, disjoint comparison windows from the same recording.
        // No wraparound: preserving time order avoids control discontinuities.
        for (let i = 0; i < 16; i++) {
          const start = first + (last - first - span) * i / 15;
          if (start < first || start + span > last || Math.abs(start - track.start) < span + 2 || controlStarts.some(other=>Math.abs(other-start)<span+2)) continue;
          const shifted = m.predicted.map(p => ({t: p.t + start - track.start, hz: p.hz}));
          const support = measureSpectralSupport(analysis, shifted);
          if (support && support.samples >= 12 && support.samples >= on.samples * .8) {controls.push(support.contrastDb);controlStarts.push(start);}
        }
      }
      const excess = controls.length >= 4 && on ? on.contrastDb - Math.max(...controls) : null;
      nullChecks.push({trackId: m.trackId, controls: controls.length, excessDb: excess,
        status: excess === null ? 'insufficient' : excess >= 3 ? 'supported' : 'weak'});
      let own: {offset: number; rmse: number} | null = null;
      if (track && flight) {
        const prepared = prepareFlight(flight), receiver = ecef(c.lat, c.lon, context.config.receiverAltitudeM);
        // Always include the actual shared optimum; never let diagnostics alter it.
        const bound = context.config.clockUncertainty;
        const offsets = [...new Set([c.offset, ...Array.from({length: 25}, (_, i) => -bound + 2 * bound * i / 24)])];
        for (const offset of offsets) {
          const fit = fitTrack(track, prepared, receiver, context.config, offset);
          if (fit && (!own || fit.relativeRmse < own.rmse)) own = {offset, rmse: fit.relativeRmse};
        }
      }
      clockOffsets.push({trackId: m.trackId, offset: own?.offset ?? null, deltaSeconds: own ? own.offset - c.offset : null});
    }
    const rival = result.candidates.filter(other => other !== c && other.curveAccepted && haversine(c, other) > 2000).sort((a,b)=>a.misfit-b.misfit)[0];
    c.diagnostics = {method: 'flight-checks/1', calibrated: false, independentEvents: events.size,
      harmonicGroups: groups.map(g => g.map(t => t.id)), chanceMatch: nullChecks, clockOffsets,
      clockConsistent: clockOffsets.every(o => o.deltaSeconds !== null && Math.abs(o.deltaSeconds) <= 4),
      distinctRivalMisfit: rival?.misfit ?? null, ambiguous: !!rival && Math.abs(rival.misfit - c.misfit) < .002};
    // A clearly stronger off-event control is a rejection, not a confidence boost.
    if (nullChecks.some(check => check.status === 'weak')) {c.accepted = false; c.audioEvidence = 'weak';}
  }
  result.candidates.sort((a,b)=>Number(b.accepted)-Number(a.accepted)||a.misfit-b.misfit);
  if (groups.some(g => g.length > 1)) result.warnings.push('Harmoniske toner fra samme passage tælles som én uafhængig lydhændelse.');
  if (result.candidates.some(c => c.diagnostics?.chanceMatch.some(check => check.status === 'weak'))) result.warnings.push('Et match blev afvist, fordi forskudte kontrolvinduer i samme optagelse havde lignende lydstøtte.');
  if (result.candidates.some(c => c.diagnostics?.chanceMatch.some(check => check.status === 'insufficient'))) result.warnings.push('Optagelsen har ikke nok adskilte kontrolvinduer til en meningsfuld kontrol af tilfældige match. Denne kontrol er ikke bestået.');
}
