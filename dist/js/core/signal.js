import { clamp, fft, median } from './math.js';
export const DEFAULT_SIGNAL_OPTIONS = { fftSize: 8192, minHz: 30, maxHz: 1000 };
/** Search finer resolutions for missing passages even after finding one strong tone.
 * Keep the original result unless a finer pass adds tracks without losing old ones.
 * User-triggered reanalysis still honours the selected resolution exactly. */
export function analyzeSignalAdaptive(samples, sampleRate, progress = () => { }, options = DEFAULT_SIGNAL_OPTIONS) {
    let best = analyzeSignal(samples, sampleRate, progress, options);
    const attempts = [options.fftSize];
    best.resolutionAttempts = [...attempts];
    if (best.tracks.length >= 2)
        return best;
    const initialCount = best.tracks.length;
    for (const fftSize of [16384, 32768].filter(size => size > options.fftSize)) {
        if (samples.length < fftSize * 4)
            continue;
        attempts.push(fftSize);
        const result = analyzeSignal(samples, sampleRate, p => progress({ ...p, text: `Ny søgning med FFT ${fftSize.toLocaleString('da-DK')} · ${p.text}` }), { ...options, fftSize });
        // Retain a detected passage: a new resolution must explain the same time/frequency trace.
        const retains = best.tracks.every(old => result.tracks.some(track => {
            const overlap = Math.max(0, Math.min(old.end, track.end) - Math.max(old.start, track.start));
            if (overlap < .6 * (old.end - old.start))
                return false;
            const errors = old.points.filter((p, i) => i % 8 === 0 && p.t >= track.start && p.t <= track.end).map(p => {
                const q = track.points.reduce((a, b) => Math.abs(b.t - p.t) < Math.abs(a.t - p.t) ? b : a);
                return Math.abs(q.hz - p.hz) / p.hz;
            });
            return errors.length > 0 && median(errors) < .02;
        }));
        if (!best.tracks.length || (result.tracks.length > best.tracks.length && retains))
            best = result;
        if (best.tracks.length >= 2)
            break;
    }
    best.resolutionAttempts = [...attempts];
    if (!best.tracks.length)
        best.warnings.unshift(`Ingen automatiske spor ved FFT ${attempts.map(size => size.toLocaleString('da-DK')).join(', ')}. Zoom ind og undersøg lyden; en optagelse indeholder ikke nødvendigvis en målbar flykurve.`);
    else if (best.tracks.length > initialCount)
        best.warnings.unshift(`Finere frekvensanalyse fandt ${best.tracks.length - initialCount} ekstra spor. FFT ${best.fftSize.toLocaleString('da-DK')} bruges til den samlede analyse.`);
    return best;
}
/** Deterministic STFT + continuity-constrained tonal-ridge extraction. NOT an aircraft classifier. */
export function analyzeSignal(samples, sampleRate, progress = () => { }, options = DEFAULT_SIGNAL_OPTIONS) {
    if (!Number.isFinite(sampleRate) || sampleRate < 2000 || sampleRate > 192000)
        throw new Error('Ugyldig samplerate.');
    if (samples.length / sampleRate < 5)
        throw new Error('Vælg mindst 5 sekunders lyd. 30–90 sekunder er bedre.');
    if (samples.length / sampleRate > 1800.1)
        throw new Error('Klip optagelsen ned til højst 30 minutter.');
    if (![8192, 16384, 32768].includes(options.fftSize) || !Number.isFinite(options.minHz) || !Number.isFinite(options.maxHz) || options.minHz < 20 || options.maxHz > Math.min(2000, sampleRate / 2) || options.maxHz - options.minHz < 20)
        throw new Error('Vælg 20–2000 Hz, mindst 20 Hz båndbredde og en gyldig FFT-størrelse.');
    const n = options.fftSize, lo = Math.ceil(options.minHz * n / sampleRate), hi = Math.floor(options.maxHz * n / sampleRate);
    let hop = n / 8;
    // Bound spectrum/DP memory on long recordings and narrow high-resolution views.
    while (Math.max(0, Math.floor((samples.length - n) / hop) + 1) * (hi - lo + 1) > 4_000_000)
        hop *= 2;
    const frames = Math.floor((samples.length - n) / hop) + 1, bins = hi - lo + 1;
    if (frames < 2 || bins < 8)
        throw new Error('For lidt lyd til frekvensanalyse.');
    const db = new Float32Array(frames * bins), waveform = new Float32Array(700);
    const window = Float64Array.from({ length: n }, (_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / (n - 1)));
    const re = new Float64Array(n), im = new Float64Array(n);
    let energy = 0, peak = 0, clipped = 0;
    for (let i = 0; i < samples.length; i++) {
        const s = Number.isFinite(samples[i]) ? samples[i] : 0;
        energy += s * s;
        peak = Math.max(peak, Math.abs(s));
        if (Math.abs(s) >= .995)
            clipped++;
        const k = Math.min(699, Math.floor(i * 700 / samples.length));
        waveform[k] = Math.max(waveform[k], Math.abs(s));
    }
    for (let f = 0; f < frames; f++) {
        for (let i = 0; i < n; i++) {
            const s = samples[f * hop + i];
            re[i] = (Number.isFinite(s) ? s : 0) * window[i];
        }
        im.fill(0);
        fft(re, im);
        for (let k = lo; k <= hi; k++)
            db[f * bins + k - lo] = 20 * Math.log10(Math.max(1e-15, 4 * Math.hypot(re[k], im[k]) / n));
        if (f % 30 === 0)
            progress({ phase: 'spectrum', text: `Frekvensvindue ${f + 1} af ${frames}`, progress: .08 + .64 * f / frames });
    }
    progress({ phase: 'ridges', text: 'Følger sammenhængende tonale spor', progress: .74 });
    const tracks = extractRidges(db, frames, bins, lo, sampleRate, n, hop);
    const warnings = [];
    const rms = Math.sqrt(energy / samples.length);
    if (rms < .00005)
        warnings.push('Meget lavt lydniveau eller intet lydspor.');
    if (clipped / samples.length > .01)
        warnings.push('Lydsporet klipper. Det kan forvrænge frekvenssporene.');
    if (!tracks.length)
        warnings.push('Ingen tilstrækkeligt lange, faldende tonale spor. Det udelukker ikke flystøj.');
    if (samples.length / sampleRate < 20)
        warnings.push('Et kort klip giver få observationer og større tvetydighed.');
    warnings.push('Tonale spor kan også komme fra musik, biler eller maskiner. De er ikke i sig selv bevis for et fly.');
    progress({ phase: 'ready', text: 'Den lokale lydanalyse er klar', progress: 1 });
    return { duration: samples.length / sampleRate, sampleRate, fftSize: n, hopSize: hop, frames, bins,
        minHz: lo * sampleRate / n, maxHz: hi * sampleRate / n, db, waveform, tracks, rms, peak,
        clippingRatio: clipped / samples.length, warnings };
}
function extractRidges(db, frames, bins, lo, sr, n, hop) {
    const prominence = new Float32Array(db.length), masked = new Uint8Array(db.length);
    // Local frequency-background contrast in dB; excludes ±3 bins around a peak.
    for (let f = 0; f < frames; f++) {
        for (let b = 0; b < bins; b++) {
            let sum = 0, count = 0;
            for (let k = Math.max(0, b - 15); k <= Math.min(bins - 1, b + 15); k++) {
                if (Math.abs(k - b) <= 3)
                    continue;
                sum += db[f * bins + k];
                count++;
            }
            prominence[f * bins + b] = Math.max(0, db[f * bins + b] - sum / Math.max(1, count));
        }
    }
    const tracks = [];
    for (let attempt = 0; attempt < 10 && tracks.length < 8; attempt++) {
        let prev = new Float64Array(bins), next = new Float64Array(bins);
        const parents = new Int16Array(frames * bins);
        for (let f = 0; f < frames; f++) {
            // Linear-time L1 distance transform: permits fast curves at higher FFT resolution
            // without an expensive all-pairs search or a fixed five-bin speed limit.
            const penalty = .85 * sr / n;
            for (let b = 0; b < bins; b++) {
                const p = f * bins + b;
                next[b] = prev[b];
                parents[p] = b;
                if (b > 0 && next[b - 1] - penalty > next[b]) {
                    next[b] = next[b - 1] - penalty;
                    parents[p] = parents[p - 1];
                }
            }
            for (let b = bins - 2; b >= 0; b--) {
                if (next[b + 1] - penalty > next[b]) {
                    next[b] = next[b + 1] - penalty;
                    parents[f * bins + b] = parents[f * bins + b + 1];
                }
            }
            for (let b = 0; b < bins; b++) {
                const p = f * bins + b;
                const peak = b > 0 && b < bins - 1 && db[p] >= db[p - 1] && db[p] >= db[p + 1];
                next[b] += masked[p] ? -14 : peak ? clamp(prominence[p] - 6, -6, 50) : -6;
            }
            [prev, next] = [next, prev];
        }
        let b = 0;
        for (let k = 1; k < bins; k++)
            if (prev[k] > prev[b])
                b = k;
        const path = new Int16Array(frames);
        for (let f = frames - 1; f >= 0; f--) {
            path[f] = b;
            b = parents[f * bins + b];
        }
        const points = [];
        for (let f = 0; f < frames; f++) {
            const bin = path[f], p = f * bins + bin;
            for (let k = Math.max(0, bin - 5); k <= Math.min(bins - 1, bin + 5); k++)
                masked[f * bins + k] = 1;
            // Relative contrast, not an absolute level: weak recordings must remain analyzable.
            if (prominence[p] < 10 || bin < 2 || bin > bins - 3)
                continue;
            // A path beside a broad peak is not another independent tonal measurement.
            if (db[p] < db[p - 1] || db[p] < db[p + 1])
                continue;
            const ym = db[p - 1], y0 = db[p], yp = db[p + 1];
            const denom = ym - 2 * y0 + yp;
            const correction = Math.abs(denom) > 1e-6 ? clamp(.5 * (ym - yp) / denom, -.5, .5) : 0;
            points.push({ t: (f * hop + n / 2) / sr, hz: (lo + bin + correction) * sr / n, snr: prominence[p] });
        }
        // Separate passages in a long recording. Do not bridge silence or unrelated tones.
        const segments = [];
        for (const p of points) {
            const segment = segments.at(-1), last = segment?.at(-1);
            if (!last || p.t - last.t > Math.max(1.5, 3 * hop / sr) || Math.abs(p.hz - last.hz) / (p.t - last.t) > 35)
                segments.push([p]);
            else
                segment.push(p);
        }
        for (const points of segments) {
            if (points.length < 25)
                continue;
            const fifth = Math.max(4, Math.floor(points.length / 5));
            const first = median(points.slice(0, fifth).map(p => p.hz)), last = median(points.slice(-fifth).map(p => p.hz));
            const drift = first - last, span = points.at(-1).t - points[0].t;
            if (span < 8 || points.length / (span * sr / hop + 1) < .75 || drift < Math.max(3.5, first * .025))
                continue;
            // Reject wandering paths assembled from random peaks at finer FFT resolutions.
            // Curves with substantial reversals are not handled by this automatic tracker.
            const totalVariation = points.slice(1).reduce((sum, p, i) => sum + Math.abs(p.hz - points[i].hz), 0);
            const netFall = points[0].hz - points.at(-1).hz;
            if (netFall <= 0 || totalVariation > 2 * netFall)
                continue;
            // Reject very jumpy tracks and near-identical harmonic copies. This is a heuristic, not ground truth.
            const jumps = points.slice(1).filter((p, i) => Math.abs(p.hz - points[i].hz) / Math.max(.1, p.t - points[i].t) > 35).length;
            if (jumps / points.length > .08)
                continue;
            const duplicate = tracks.some(track => {
                const overlap = Math.max(0, Math.min(track.end, points.at(-1).t) - Math.max(track.start, points[0].t));
                if (overlap < .6 * Math.min(track.end - track.start, span))
                    return false;
                const ratios = points.filter((p, i) => i % 8 === 0 && p.t >= track.start && p.t <= track.end).map(p => {
                    const q = track.points.reduce((a, c) => Math.abs(c.t - p.t) < Math.abs(a.t - p.t) ? c : a);
                    return p.hz / q.hz;
                });
                const ratio = median(ratios), deviation = median(ratios.map(x => Math.abs(x - ratio))) / ratio;
                return deviation < .008 && [1, 2, 3, .5, 1 / 3].some(k => Math.abs(ratio - k) < .035 * k);
            });
            if (duplicate)
                continue;
            tracks.push({ id: `S${tracks.length + 1}`, source: 'auto', points, coverage: points.length / frames, driftHz: drift,
                medianSnr: median(points.map(p => p.snr)), start: points[0].t, end: points.at(-1).t });
            if (tracks.length === 8)
                break;
        }
    }
    return tracks;
}
