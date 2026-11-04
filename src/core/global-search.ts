import {inRegion, REGIONS} from './regions.js';
import type {Candidate, FitResult, Flight, GridCell, ProgressFn, Ridge, SearchConfig} from '../types.js';
import {haversine, offsetPosition} from './math.js';
import {ecef, prepareFlight} from './physics.js';
import {fitTrack, matchFlights} from './matcher.js';
import {sensitivityProfile} from './sensitivity.js';

const MAX_REGIONS = 64;
const MAX_FLIGHTS = 20_000;
/** Flight-led worldwide candidate search. No user location or assumed home city. */
export function matchGlobalFlights(tracks: Ridge[], flights: Flight[], config: SearchConfig, progress: ProgressFn = () => {}): FitResult {
  if(config.country && !REGIONS[config.country]?.enabled)throw new Error('Dette land understøttes endnu ikke.');
  const started = performance.now(), profile = sensitivityProfile(config.sensitivity);
  if (!tracks.length || tracks.length > 3) throw new Error('Vælg mellem ét og tre frekvensspor.');
  if (!flights.length || flights.length > MAX_FLIGHTS) throw new Error('Global søgning kræver 1–20.000 flybaner.');
  if (![config.startTime, config.clockUncertainty, config.receiverAltitudeM, config.soundSpeed].every(Number.isFinite) || config.clockUncertainty < 0 || config.clockUncertainty > 60 || config.soundSpeed < 300 || config.soundSpeed > 370 || Math.abs(config.receiverAltitudeM) > 9000) throw new Error('Kontrollér tidspunkt og avancerede parametre.');
  if (tracks.some(t => t.points.length < 8 || t.points.some(p => !Number.isFinite(p.t) || !Number.isFinite(p.hz) || !Number.isFinite(p.snr)))) throw new Error('Frekvenssporet mangler brugbare punkter.');
  const globalConfig = {...config, global: true};
  const anchor = [...tracks].sort((a, b) => b.driftHz - a.driftHz)[0];
  // The steepest sustained frequency drop estimates delayed closest approach.
  // This is only a seed; final fitting still solves retarded-time geometry.
  const span = Math.max(1, Math.floor(anchor.points.length / 10));
  let steepest = Infinity, passageTime = (anchor.start + anchor.end) / 2;
  for (let k = span; k < anchor.points.length - span; k++) {
    const a = anchor.points[k - span], b = anchor.points[k + span];
    if (b.t <= a.t) continue;
    const slope = (b.hz - a.hz) / (b.t - a.t);
    if (slope < steepest) {steepest = slope; passageTime = anchor.points[k].t;}
  }
  const referenceTime = config.startTime + passageTime;
  const from = config.startTime + Math.min(...tracks.map(t => t.start)) - config.clockUncertainty - 450;
  const to = config.startTime + Math.max(...tracks.map(t => t.end)) + config.clockUncertainty + 30;
  const eligible = flights.filter(f => f.points.length >= 3 && f.points[0].t <= to && f.points[f.points.length - 1].t >= from);
  const seeds: {lat: number; lon: number; score: number}[] = [];
  const offsets = config.clockUncertainty ? [-config.clockUncertainty, 0, config.clockUncertainty] : [0];
  let tested = 0;
  // Screen multiple distances around the inferred passage, including close
  // flyovers which a uniform 50 km grid can miss entirely.
  const screeningOffsets: [number, number][] = [[0, 0]];
  for (const radius of [2500, 5000, 10_000, 20_000, 40_000, 80_000, 120_000, 200_000, 250_000]) {
    for (let angle = 0; angle < 8; angle++) screeningOffsets.push([radius * Math.sin(angle * Math.PI / 4), radius * Math.cos(angle * Math.PI / 4)]);
  }
  for (let i = 0; i < eligible.length; i++) {
    const f = eligible[i], prepared = prepareFlight(f);
    const delta = (p: Flight['points'][number]): number => Math.abs(p.t + Math.max(0, p.altM - config.receiverAltitudeM) / config.soundSpeed - referenceTime);
    const center = f.points.reduce((a, b) => delta(b) < delta(a) ? b : a);
    const ranked: {lat: number; lon: number; score: number}[] = [];
    for (const [east, north] of screeningOffsets) {
      const p = offsetPosition(center.lat, center.lon, east, north);
      if(config.country && !inRegion(p,config.country))continue;
      let score = Infinity;
      for (const offset of offsets) {
        tested++;
        const m = fitTrack(anchor, prepared, ecef(p.lat, p.lon, config.receiverAltitudeM), globalConfig, offset, false, 10);
        if (m && m.improvement > .2) score = Math.min(score, m.relativeRmse);
      }
      if (Number.isFinite(score)) ranked.push({...p, score});
    }
    ranked.sort((a, b) => a.score - b.score);
    const separate: typeof ranked = [];
    for (const p of ranked) {
      if (separate.every(s => haversine(s, p) > 60_000)) separate.push(p);
      if (separate.length === 4) break;
    }
    seeds.push(...separate);
    if (i % 10 === 0 || i === eligible.length - 1) progress({phase: 'global-screening', text: `Søger globalt · ${i + 1} af ${eligible.length} flybaner`, progress: .03 + .4 * (i + 1) / Math.max(1, eligible.length)});
  }
  seeds.sort((a, b) => a.score - b.score);
  const regions: typeof seeds = [];
  for (const s of seeds) {
    if (regions.every(r => haversine(r, s) > 50_000)) regions.push(s);
    if (regions.length === MAX_REGIONS) break;
  }
  const candidates: Candidate[] = [], grid: GridCell[] = [];
  let crowded = false, refinedRegions = 0;
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const nearby = eligible.map(f => ({f, distance: f.points.reduce((distance, p) => p.t >= from && p.t <= to ? Math.min(distance, haversine(region, p)) : distance, Infinity)})).filter(f => f.distance < 180_000).sort((a, b) => a.distance - b.distance);
    if (!nearby.length) continue;
    if (nearby.length > 100) crowded = true;
    const local = matchFlights(tracks, nearby.slice(0, 100).map(f => f.f), {...globalConfig, lat: region.lat, lon: region.lon, radiusKm: 50});
    refinedRegions++;
    candidates.push(...local.candidates); grid.push(...local.grid); tested += local.tested;
    progress({phase: 'global-refining', text: `Undersøger muligt område ${i + 1} af ${regions.length}`, progress: .45 + .53 * (i + 1) / Math.max(1, regions.length)});
  }
  candidates.sort((a, b) => a.misfit - b.misfit);
  const unique: Candidate[] = [];
  for (const c of candidates) {
    if (unique.every(u => haversine(u, c) > 2000)) unique.push(c);
    if (unique.length === 12) break;
  }
  const warnings = [
    'Eksperimentel global kandidatsøgning, ikke en bekræftet lokation. Et godt kurvematch er ikke bevis.',
    `Alle ${eligible.length} tidsrelevante, indlæste flybaner blev groft afsøgt. De ${refinedRegions} bedst rangerede områder blev undersøgt nærmere. Ikke hvert punkt på jorden er testet.`,
    'Søgningen bruger højst 120 km lydafstand og grov geografisk/tidsmæssig afsøgning. Fly uden data eller kandidater uden for disse modelgrænser kan blive overset.',
    'Modellen antager stationær mikrofon, konstant kildetone og ensartet vindstille luft. Gridafstand er ikke lokationspræcision.'
  ];
  if(config.country)warnings.push('Landefilteret er en geografisk afgrænsningsboks. Kyst, grænseområder og hav er ikke afgrænset med landegrænsepolygoner.');
  if (crowded) warnings.push('I tætte områder blev højst de 100 nærmeste flybaner sammenlignet i den detaljerede søgning.');
  if (unique[0]?.matchedFlights === 1) warnings.push('Kun én flybane matcher. Spejlede og aflange løsningsområder kan ikke udelukkes.');
  if (unique.filter(c => c.accepted).length > 1) warnings.push('Flere adskilte områder passer til modellen. Resultatet er tvetydigt.');
  if (!unique.some(c => c.accepted)) warnings.unshift('Ingen kandidater bestod den eksperimentelle kvalitetsgrænse.');
  progress({phase: 'complete', text: 'Den globale kandidatsøgning er færdig', progress: 1});
  return {sensitivityProfile: profile, candidates: unique, grid, cellM: 50_000, tested, elapsedMs: performance.now() - started, warnings,
    search: {country:config.country, mode: 'global', flightsScanned: eligible.length, regionsRefined: refinedRegions, maxDistanceKm: 120, exhaustive: false}};
}
