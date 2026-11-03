import { dopplerFactor, ecef, prepareFlight } from './physics.js';
import { haversine, offsetPosition } from './math.js';
export function fitTrack(track, flight, receiver, config, offset, keepCurve = false, samples = 56) {
    const stride = Math.max(1, Math.floor(track.points.length / samples));
    let xy = 0, xx = 0, sumw = 0, sumy = 0;
    const values = [];
    let attempted = 0;
    for (let i = 0; i < track.points.length; i += stride) {
        const p = track.points[i];
        attempted++;
        const factor = dopplerFactor(flight, receiver, config.startTime + p.t + offset, config.soundSpeed, config.global ? 120_000 : Infinity);
        if (factor === null)
            continue;
        const w = Math.min(3, Math.max(.5, p.snr / 15));
        xy += w * factor * p.hz;
        xx += w * factor * factor;
        sumw += w;
        sumy += w * p.hz;
        values.push({ t: p.t, hz: p.hz, factor, w });
    }
    if (values.length < Math.min(25, Math.ceil(samples * .7)) || values.length / attempted < .85 || !xx)
        return null;
    const sourceHz = xy / xx, mean = sumy / sumw;
    let residual = 0, baseline = 0;
    for (const p of values) {
        residual += p.w * (p.hz - sourceHz * p.factor) ** 2;
        baseline += p.w * (p.hz - mean) ** 2;
    }
    const relativeRmse = Math.sqrt(residual / sumw) / mean;
    return { trackId: track.id, flightId: flight.flight.id, callsign: flight.flight.callsign,
        sourceHz, relativeRmse, coverage: values.length / attempted,
        improvement: baseline > 0 ? 1 - residual / baseline : 0,
        predicted: keepCurve ? values.map(p => ({ t: p.t, hz: sourceHz * p.factor })) : [] };
}
/** Bounded, coarse-to-fine grid search. Scores are model errors, NOT probabilities. */
export function matchFlights(tracks, flights, config, progress = () => { }) {
    const start = performance.now();
    if (!tracks.length)
        throw new Error('Der er ingen tonale spor at matche.');
    if (tracks.length > 3)
        throw new Error('Vælg højst tre spor til én søgning.');
    if (!flights.length)
        throw new Error('Datasættet indeholder ingen anvendelige flybaner.');
    if (flights.length > 100)
        throw new Error('Brug højst 100 flybaner ad gangen.');
    if (![config.lat, config.lon, config.radiusKm, config.startTime, config.clockUncertainty, config.receiverAltitudeM, config.soundSpeed].every(Number.isFinite))
        throw new Error('Ugyldige søgeparametre.');
    if (Math.abs(config.lat) > 90 || Math.abs(config.lon) > 180 || config.radiusKm < 1 || config.radiusKm > 50 || config.clockUncertainty < 0 || config.clockUncertainty > 60 || config.soundSpeed < 300 || config.soundSpeed > 370 || Math.abs(config.receiverAltitudeM) > 9000)
        throw new Error('Søgeparametrene ligger uden for modellens grænser.');
    const prepared = flights.map(prepareFlight), selected = tracks;
    const offsets = config.clockUncertainty ? [-1, -.5, 0, .5, 1].map(v => v * config.clockUncertainty) : [0];
    const step = config.radiusKm * 1000 / 8, grid = [];
    const coarse = [];
    let tested = 0;
    const evaluate = (lat, lon, timeOffsets, spacing, curves = false) => {
        const receiver = ecef(lat, lon, config.receiverAltitudeM);
        let best = null;
        for (const offset of timeOffsets) {
            const matches = [];
            for (const track of selected) {
                let match = null;
                for (const f of prepared) {
                    const m = fitTrack(track, f, receiver, config, offset, curves);
                    if (m && (!match || m.relativeRmse < match.relativeRmse))
                        match = m;
                }
                if (match)
                    matches.push(match);
            }
            tested++;
            // A hypothesis must explain every selected independent tonal ridge. No cherry-picking.
            if (matches.length !== selected.length)
                continue;
            const misfit = Math.sqrt(matches.reduce((s, m) => s + m.relativeRmse ** 2, 0) / matches.length);
            const improvement = Math.min(...matches.map(m => m.improvement));
            const candidate = { lat, lon, offset, misfit, improvement, matches,
                matchedFlights: new Set(matches.map(m => m.flightId)).size, gridSpacingM: spacing,
                accepted: misfit < .02 && improvement > .75 && matches.every(m => m.relativeRmse < .035) };
            if (!best || misfit < best.misfit)
                best = candidate;
        }
        return best;
    };
    for (let y = -8; y <= 8; y++) {
        for (let x = -8; x <= 8; x++) {
            if (x * x + y * y > 64)
                continue;
            const p = offsetPosition(config.lat, config.lon, x * step, y * step);
            const candidate = evaluate(p.lat, p.lon, offsets, step);
            if (candidate) {
                coarse.push(candidate);
                grid.push({ lat: p.lat, lon: p.lon, misfit: candidate.misfit, spacingM: step });
            }
        }
        progress({ phase: 'matching', text: `Sammenligner lyd med ${flights.length} flybaner · ${tested.toLocaleString('da-DK')} hypoteser`, progress: .04 + .59 * (y + 8) / 16 });
    }
    coarse.sort((a, b) => a.misfit - b.misfit);
    const seeds = [];
    for (const c of coarse) {
        if (seeds.every(s => haversine(s, c) > step * 2.6))
            seeds.push(c);
        if (seeds.length === 4)
            break;
    }
    const refined = [];
    for (let i = 0; i < seeds.length; i++) {
        let center = seeds[i];
        for (let level = 1; level <= 2; level++) {
            const spacing = step / 4 ** level;
            const timeStep = config.clockUncertainty / (2 * 4 ** level);
            const times = timeStep ? [-2, -1, 0, 1, 2].map(v => center.offset + v * timeStep).filter(t => Math.abs(t) <= config.clockUncertainty) : [0];
            let best = center;
            for (let y = -4; y <= 4; y++)
                for (let x = -4; x <= 4; x++) {
                    const p = offsetPosition(center.lat, center.lon, x * spacing, y * spacing);
                    if (haversine(config, p) > config.radiusKm * 1000)
                        continue;
                    const c = evaluate(p.lat, p.lon, times, spacing);
                    if (c && c.misfit < best.misfit)
                        best = c;
                }
            center = best;
            progress({ phase: 'refining', text: `Undersøger kandidatområde ${i + 1} af ${seeds.length} · trin ${level}/2`, progress: .65 + .32 * (i + level / 2) / Math.max(1, seeds.length) });
        }
        const complete = evaluate(center.lat, center.lon, [center.offset], center.gridSpacingM, true);
        if (complete)
            refined.push(complete);
    }
    refined.sort((a, b) => a.misfit - b.misfit);
    const candidates = [];
    for (const c of refined)
        if (candidates.every(s => haversine(s, c) > Math.max(step / 2, 300)))
            candidates.push(c);
    const warnings = ['Eksperimentel model. Et godt kurvematch er ikke bevis for optagelsens placering.',
        'Der søges kun i det valgte område og tidsinterval. Et bedre match kan eksistere udenfor.',
        'Modellen antager en stationær mikrofon, en konstant motortone og ensartet, vindstille luft.',
        'ADS-B-højder, lydens hastighed og ukendt kameratid kan give systematiske fejl. Gridafstand er ikke en sikkerhedsradius.'];
    if (selected.some(t => t.source === 'manual'))
        warnings.push('Manuelle spor bygger på brugerens optegnede punkter med lineær interpolation. Et match bekræfter ikke, at kurven findes i lyden.');
    if (candidates[0]?.matchedFlights === 1)
        warnings.push('Kun én uafhængig flybane matcher. Spejlede og aflange løsningsområder kan ikke udelukkes.');
    if (candidates.filter(c => c.accepted).length > 1)
        warnings.push('Flere adskilte områder passer til modellen. Resultatet er tvetydigt.');
    if (!candidates.some(c => c.accepted))
        warnings.unshift('Ingen kandidater bestod den eksperimentelle kvalitetsgrænse.');
    if (config.clockUncertainty > 0)
        warnings.push('Urkorrektionen er kun afsøgt på et diskret grid; den er ikke et uafhængigt fund af optagelsestiden.');
    progress({ phase: 'complete', text: 'Hypoteser og modelkurver er klar', progress: 1 });
    return { candidates, grid, cellM: step, tested, elapsedMs: performance.now() - start, warnings };
}
