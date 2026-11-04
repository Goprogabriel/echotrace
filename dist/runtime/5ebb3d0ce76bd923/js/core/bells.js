import { fft, median } from './math.js';
const SR = 8000, N = 2048, HOP = 400;
/** Inspect each short spectrum before averaging: swinging, overlapping bells smear
 * long-window peaks and do not necessarily double the total RMS at every strike.
 * Outputs are acoustic proposals, not identified physical bells or probabilities. */
export function analyzeBells(samples, sampleRate, onProgress = () => { }) {
    const duration = samples.length / sampleRate;
    if (!Number.isFinite(sampleRate) || sampleRate < 2000 || sampleRate > 192000 || duration < 1 || duration > 1800.1)
        throw new Error('Ugyldig lyd til klokkeanalyse.');
    const mono = new Float32Array(Math.floor(duration * SR));
    for (let i = 0; i < mono.length; i++) {
        const lo = Math.floor(i * sampleRate / SR), hi = Math.min(samples.length, Math.max(lo + 1, Math.floor((i + 1) * sampleRate / SR)));
        let sum = 0;
        for (let j = lo; j < hi; j++)
            sum += Number.isFinite(samples[j]) ? samples[j] : 0;
        mono[i] = sum / Math.max(1, hi - lo);
    }
    const re = new Float64Array(N), im = new Float64Array(N), power = new Float64Array(N / 2), db = new Float64Array(N / 2), background = new Float64Array(N / 2);
    const window = Float64Array.from({ length: N }, (_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / (N - 1)));
    const frames = [];
    const lo = Math.ceil(120 * N / SR), hi = Math.floor(Math.min(3000, sampleRate * .45) * N / SR);
    for (let at = 0; at + N <= mono.length; at += HOP) {
        if (at % (HOP * 100) === 0)
            onProgress(at / mono.length);
        for (let j = 0; j < N; j++)
            re[j] = mono[at + j] * window[j];
        im.fill(0);
        fft(re, im);
        let total = 0, max = 0;
        for (let b = lo - 12; b <= Math.min(N / 2 - 1, hi + 12); b++) {
            power[b] = re[b] ** 2 + im[b] ** 2;
            db[b] = 10 * Math.log10(Math.max(1e-24, power[b]));
            if (b >= lo && b <= hi) {
                total += power[b];
                max = Math.max(max, power[b]);
            }
        }
        const peaks = [];
        for (let b = lo; b <= hi; b++) {
            if (power[b] < max * .004 || db[b] <= db[b - 1] || db[b] < db[b + 1])
                continue;
            const side = [];
            for (let k = 4; k <= 12; k++) {
                side.push(db[b - k], db[b + k]);
            }
            if (db[b] - median(side) < 10)
                continue;
            const shift = .5 * (db[b - 1] - db[b + 1]) / (db[b - 1] - 2 * db[b] + db[b + 1] || 1);
            peaks.push({ hz: (b + Math.max(-.5, Math.min(.5, shift))) * SR / N, energy: power[b], bin: b });
        }
        peaks.sort((a, b) => b.energy - a.energy);
        const strongest = peaks.slice(0, 12).sort((a, b) => a.hz - b.hz);
        const tonalEnergy = strongest.reduce((sum, p) => sum + p.energy, 0);
        const tonal = strongest.length >= 3 && total > 1e-14 && tonalEnergy / total >= .06;
        // A stationary harmonic machine/organ comb must not qualify merely by having
        // many peaks. Permit missing fundamentals but demand non-harmonic resonances.
        let harmonicFit = 0;
        if (strongest.length)
            for (const divisor of [1, 2]) {
                const base = strongest[0].hz / divisor;
                const explained = strongest.filter(p => Math.abs(p.hz / base - Math.round(p.hz / base)) * base / p.hz < .02).length / strongest.length;
                harmonicFit = Math.max(harmonicFit, explained);
            }
        let rise = 0;
        for (const p of strongest)
            rise += Math.max(0, p.energy - background[p.bin]);
        const novelty = tonalEnergy > 1e-14 ? rise / tonalEnergy : 0;
        for (let b = lo; b <= hi; b++)
            background[b] = background[b] * .8 + power[b] * .2;
        frames.push({ t: (at + N / 2) / SR, tonal, inharmonic: tonal && harmonicFit <= .8, novelty, peaks: strongest.map(p => p.hz) });
    }
    const events = [];
    for (let i = 2; i < frames.length - 2; i++) {
        const f = frames[i], smooth = (frames[i - 1].novelty + 2 * f.novelty + frames[i + 1].novelty) / 4;
        const before = (frames[i - 2].novelty + 2 * frames[i - 1].novelty + f.novelty) / 4;
        const after = (f.novelty + 2 * frames[i + 1].novelty + frames[i + 2].novelty) / 4;
        if (!f.tonal || smooth < .18 || smooth < before || smooth <= after || f.t - (events.at(-1)?.t ?? -10) < .35)
            continue;
        events.push({ t: f.t, novelty: smooth, resonancesHz: f.peaks.slice(0, 8) });
    }
    const windows = [];
    for (let start = 0; start < duration - 1; start += 10) {
        const end = Math.min(start + 20, duration);
        if (end - start < 5)
            continue;
        const slice = frames.filter(f => f.t >= start && f.t < end), attacks = events.filter(e => e.t >= start && e.t < end);
        const tonalFraction = slice.filter(f => f.tonal).length / Math.max(1, slice.length);
        const inharmonicFraction = slice.filter(f => f.inharmonic).length / Math.max(1, slice.length);
        windows.push({ start, end, tonalFraction, inharmonicFraction, attackCount: attacks.length,
            accepted: tonalFraction >= .3 && inharmonicFraction >= .15 && attacks.length >= 2 });
    }
    // Proposed attacks only in positively screened windows; no duplicate events
    // from overlapping windows. This does not resolve simultaneously struck bells.
    const supported = events.filter(e => windows.some(w => w.accepted && e.t >= w.start && e.t < w.end));
    const intervals = [];
    for (let second = 0; second < duration; second++) {
        const block = frames.filter(f => f.t >= second && f.t < second + 1);
        if (block.filter(f => f.tonal).length / Math.max(1, block.length) < .25 || !supported.some(e => Math.abs(e.t - (second + .5)) <= 1.5))
            continue;
        const previous = intervals.at(-1);
        if (previous && second - previous.end <= 1)
            previous.end = Math.min(second + 1, duration);
        else
            intervals.push({ start: second, end: Math.min(second + 1, duration) });
    }
    onProgress(1);
    return { method: 'resonance-flux/1', sampleRate: SR, fftSize: N, hopSize: HOP, windows, events: supported, intervals,
        warnings: ['Anslagsforslag kan også skyldes udsving i klangen, ekko og overlappende klokker. Antallet er ikke et antal fysiske klokker eller verificerede slag.', 'Tidsintervaller er akustiske forslag med cirka ét sekunds opløsning; musik og andre klokker kan ligne kirkeklokker.'] };
}
