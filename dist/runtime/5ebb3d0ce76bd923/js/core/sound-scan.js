import { analyzeBells } from './bells.js';
import { fft, median, clamp } from './math.js';
export const SOUND_TYPES = [
    { id: 'aircraft', label: 'Fly', experimental: true },
    { id: 'church_bell', label: 'Kirkeklokker', experimental: true },
    { id: 'wind_turbine', label: 'Vindmøller', experimental: true }
];
const SR = 8000, N = 1024;
/** Fixed-rate, gain-normalised descriptors, independent of the Doppler view settings.
 * Box averaging before decimation limits aliasing; descriptors are not audio fingerprints
 * suitable for proof of identity. Never interpret a similarity as a probability. */
export function signature(samples, sampleRate, start = 0, end = samples.length / sampleRate) {
    const spectrum = new Array(32).fill(0), average = new Float64Array(N / 2);
    const envelope = [], re = new Float64Array(N), im = new Float64Array(N);
    const frames = Math.floor((end - start - N / SR) * 10) + 1;
    if (!Number.isFinite(sampleRate) || sampleRate < SR / 4 || frames < 8)
        throw new Error('For lidt lyd til lydscreening.');
    for (let f = 0; f < frames; f++) {
        let energy = 0;
        for (let j = 0; j < N; j++) {
            const at = (start + f / 10 + j / SR) * sampleRate;
            let value = 0, count = 0;
            for (let k = Math.floor(at); k < Math.max(Math.floor(at) + 1, Math.floor(at + sampleRate / SR)); k++) {
                value += Number.isFinite(samples[k]) ? samples[k] : 0;
                count++;
            }
            value /= count;
            energy += value * value;
            re[j] = value * (.5 - .5 * Math.cos(2 * Math.PI * j / (N - 1)));
        }
        envelope.push(Math.sqrt(energy / N));
        im.fill(0);
        fft(re, im);
        for (let b = 6; b < N / 2 - 1; b++) {
            const power = re[b] ** 2 + im[b] ** 2;
            average[b] += power;
            const hz = b * SR / N;
            const band = Math.floor(Math.log(hz / 40) / Math.log(4000 / 40) * 32);
            if (band >= 0 && band < 32)
                spectrum[band] += power;
        }
    }
    const total = spectrum.reduce((s, v) => s + v, 0);
    const norm = Math.sqrt(spectrum.reduce((s, v) => s + v * v, 0));
    for (let i = 0; i < spectrum.length; i++)
        spectrum[i] = norm > 1e-20 ? spectrum[i] / norm : 0;
    const ranked = [];
    let tonalPower = 0;
    for (let b = 8; b < N / 2 - 5; b++) {
        const bg = (average[b - 5] + average[b - 4] + average[b + 4] + average[b + 5]) / 4;
        if (average[b] > bg * 12 && average[b] >= average[b - 1] && average[b] >= average[b + 1]) {
            ranked.push({ hz: b * SR / N, power: average[b] });
            tonalPower += average[b - 1] + average[b] + average[b + 1];
        }
    }
    ranked.sort((a, b) => b.power - a.power);
    const peaks = ranked.filter(p => p.power > (ranked[0]?.power ?? 0) * .025).slice(0, 8);
    const mean = envelope.reduce((s, v) => s + v, 0) / envelope.length;
    const variance = envelope.reduce((s, v) => s + (v - mean) ** 2, 0);
    let periodicity = 0, modulationHz = 0;
    // 0.35–2 Hz blade-pass-like modulation, at least four cycles in the window.
    for (let lag = 5; lag <= Math.min(28, Math.floor(envelope.length / 4)); lag++) {
        let cross = 0, aa = 0, bb = 0;
        for (let i = lag; i < envelope.length; i++) {
            const a = envelope[i] - mean, b = envelope[i - lag] - mean;
            cross += a * b;
            aa += a * a;
            bb += b * b;
        }
        const corr = cross / Math.max(1e-30, Math.sqrt(aa * bb));
        if (corr > periodicity) {
            periodicity = corr;
            modulationHz = 10 / lag;
        }
    }
    let strikes = 0, previous = -20;
    for (let i = 3; i < envelope.length - 5; i++) {
        const before = median(envelope.slice(i - 3, i));
        const after = median(envelope.slice(i + 3, i + 6));
        if (i - previous >= 7 && envelope[i] > Math.max(mean * .5, before * 1.8) && after < envelope[i] * .85) {
            strikes++;
            previous = i;
        }
    }
    const cv = Math.sqrt(variance / envelope.length) / Math.max(mean, 1e-15);
    return { version: 'acoustic-signature/1', spectrum, peaksHz: peaks.map(p => p.hz).sort((a, b) => a - b), onsetRate: strikes / (end - start),
        modulationHz, periodicity: cv >= .08 && total > 1e-18 ? clamp(periodicity, 0, 1) : 0,
        tonality: total > 1e-18 ? clamp(tonalPower / total, 0, 1) : 0 };
}
export function screenSounds(samples, sampleRate, analysis, progress = () => { }) {
    const detections = SOUND_TYPES.map(t => ({ kind: t.id, status: 'no_evidence', evidence: [], segments: [] }));
    const by = (kind) => detections.find(d => d.kind === kind);
    if (analysis.tracks.length)
        by('aircraft').status = 'possible';
    by('aircraft').evidence.push('Faldende tonale spor undersøges med flybaner og lydkontrol. Manglende spor udelukker ikke flystøj.');
    const duration = samples.length / sampleRate, bells = analyzeBells(samples, sampleRate, fraction => progress({ phase: 'bells', text: 'Undersøger klokker gennem hele optagelsen', progress: fraction }));
    // Overlap avoids splitting strikes and short mixed-source passages at a boundary.
    for (let start = 0; start < duration - 1; start += 10) {
        const end = Math.min(start + 20, duration);
        if (end - start < 5)
            continue;
        const s = signature(samples, sampleRate, start, end);
        if (bells.windows.some(w => w.start === start && w.accepted))
            by('church_bell').segments.push({ start, end, signature: s });
        if (end - start >= 12 && s.periodicity > .65 && s.tonality < .3 && s.modulationHz >= .35)
            by('wind_turbine').segments.push({ start, end, signature: s });
    }
    for (const d of detections)
        if (d.segments.length)
            d.status = 'possible';
    by('church_bell').evidence.push('Gentagne anslag og flere smalle resonanser. Musik og andre klokker kan ligne kirkeklokker.');
    by('wind_turbine').evidence.push('Periodisk moduleret bredbåndsstøj. Vind, trafik og maskiner kan give samme mønster.');
    return { method: 'local-acoustic-screen/2', calibrated: false, detections, bells,
        warnings: ['Lydscreeningen er regelbaseret og eksperimentel. Indikationer er ikke sikker genkendelse; manglende indikation udelukker ikke lyden.', 'En kildes koordinater er ikke mikrofonens placering. Klokker og vindmøller kræver stedbundne referenceoptagelser.'] };
}
/** Lower is more similar. Frequency agreement is deliberately strict for bells. */
export function signatureDistance(a, b) {
    const spectral = 1 - a.spectrum.reduce((s, v, i) => s + v * b.spectrum[i], 0);
    if (a.peaksHz.length < 3 || b.peaksHz.length < 3)
        return Infinity;
    const distance = (from, to) => from.reduce((s, hz) => s + Math.min(...to.map(other => Math.abs(hz - other) / Math.max(hz, other))), 0) / from.length;
    return Math.max(0, spectral) * .4 + (distance(a.peaksHz, b.peaksHz) + distance(b.peaksHz, a.peaksHz)) * .3;
}
