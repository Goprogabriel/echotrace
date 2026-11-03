import { clamp, fft, median } from './math.js';
/** Deterministic STFT + continuity-constrained tonal-ridge extraction. NOT an aircraft classifier. */
export function analyzeSignal(samples, sampleRate, progress = () => { }) {
    if (!Number.isFinite(sampleRate) || sampleRate < 2000 || sampleRate > 192000)
        throw new Error('Ugyldig samplerate.');
    if (samples.length / sampleRate < 5)
        throw new Error('Vælg mindst 5 sekunders lyd. 30–90 sekunder er bedre.');
    if (samples.length / sampleRate > 181)
        throw new Error('Klip optagelsen ned til højst 3 minutter.');
    const n = 8192, hop = 1024, lo = Math.ceil(30 * n / sampleRate), hi = Math.floor(650 * n / sampleRate);
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
        for (let i = 0; i < n; i++)
            re[i] = (samples[f * hop + i] || 0) * window[i];
        im.fill(0);
        fft(re, im);
        for (let k = lo; k <= hi; k++)
            db[f * bins + k - lo] = 20 * Math.log10(Math.max(1e-9, 4 * Math.hypot(re[k], im[k]) / n));
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
    for (let attempt = 0; attempt < 7 && tracks.length < 3; attempt++) {
        let prev = new Float64Array(bins), next = new Float64Array(bins);
        const parents = new Int16Array(frames * bins);
        for (let f = 0; f < frames; f++) {
            for (let b = 0; b < bins; b++) {
                let best = -Infinity, bestB = b;
                for (let k = Math.max(0, b - 5); k <= Math.min(bins - 1, b + 5); k++) {
                    const score = prev[k] - .85 * Math.abs(k - b);
                    if (score > best) {
                        best = score;
                        bestB = k;
                    }
                }
                const p = f * bins + b;
                const emission = masked[p] ? -14 : clamp(prominence[p] - 6, -6, 50);
                next[b] = best + emission;
                parents[p] = bestB;
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
            if (prominence[p] < 10 || db[p] < -88 || bin < 2 || bin > bins - 3)
                continue;
            const ym = db[p - 1], y0 = db[p], yp = db[p + 1];
            const denom = ym - 2 * y0 + yp;
            const correction = Math.abs(denom) > 1e-6 ? clamp(.5 * (ym - yp) / denom, -.5, .5) : 0;
            points.push({ t: (f * hop + n / 2) / sr, hz: (lo + bin + correction) * sr / n, snr: prominence[p] });
        }
        if (points.length < 45 || points.length / frames < .55)
            continue;
        const fifth = Math.max(4, Math.floor(points.length / 5));
        const first = median(points.slice(0, fifth).map(p => p.hz)), last = median(points.slice(-fifth).map(p => p.hz));
        const drift = first - last, span = points.at(-1).t - points[0].t;
        if (span < 8 || drift < Math.max(3.5, first * .025))
            continue;
        // Reject very jumpy tracks and near-identical harmonic copies. This is a heuristic, not ground truth.
        const jumps = points.slice(1).filter((p, i) => Math.abs(p.hz - points[i].hz) / Math.max(.1, p.t - points[i].t) > 35).length;
        if (jumps / points.length > .08)
            continue;
        const duplicate = tracks.some(track => {
            const ratios = points.filter((_, i) => i % 8 === 0).map(p => {
                const q = track.points.reduce((a, c) => Math.abs(c.t - p.t) < Math.abs(a.t - p.t) ? c : a);
                return p.hz / q.hz;
            });
            const ratio = median(ratios), deviation = median(ratios.map(x => Math.abs(x - ratio))) / ratio;
            return deviation < .008 && [1, 2, 3, .5, 1 / 3].some(k => Math.abs(ratio - k) < .035 * k);
        });
        if (duplicate)
            continue;
        tracks.push({ id: `S${tracks.length + 1}`, points, coverage: points.length / frames, driftHz: drift,
            medianSnr: median(points.map(p => p.snr)), start: points[0].t, end: points.at(-1).t });
    }
    return tracks;
}
