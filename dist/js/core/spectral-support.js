import { median } from './math.js';
export const AUDIO_VALIDATION = Object.freeze({ method: 'off-curve-contrast/1',
    minContrastDb: 3, minExcessDb: 3, minSamples: 12, minCoverage: .7,
    shiftsBins: Object.freeze([-32, -20, -12, 12, 20, 32]), calibrated: false });
/** Independent display diagnostic: model brightness against nearby off-curve bins.
 * Does not rerank candidates or turn frequency error into a probability. */
export function measureSpectralSupport(analysis, predicted) {
    const contrasts = [];
    const binHz = analysis.sampleRate / analysis.fftSize;
    for (const p of predicted) {
        const frame = Math.round((p.t * analysis.sampleRate - analysis.fftSize / 2) / analysis.hopSize);
        const bin = Math.round((p.hz - analysis.minHz) / binHz);
        if (frame < 0 || frame >= analysis.frames || bin < 8 || bin >= analysis.bins - 8)
            continue;
        const at = (b) => analysis.db[frame * analysis.bins + b];
        // ±1 bin tolerates quantization; the sidebands exclude the Hann main lobe.
        const on = Math.max(at(bin - 1), at(bin), at(bin + 1));
        const off = median([-8, -7, -6, -5, 5, 6, 7, 8].map(d => at(bin + d)));
        if (Number.isFinite(on) && Number.isFinite(off))
            contrasts.push(on - off);
    }
    if (!contrasts.length)
        return undefined;
    return { contrastDb: median(contrasts), coverage: contrasts.length / Math.max(1, predicted.length), samples: contrasts.length };
}
export function attachSpectralSupport(result, analysis) {
    for (const candidate of result.candidates)
        for (const match of candidate.matches)
            match.spectralSupport = measureSpectralSupport(analysis, match.predicted);
}
/** Fixed off-curve controls, evaluated at identical times and with equal coverage.
 * This is an uncalibrated rejection heuristic, not an independent validation set. */
export function compareSpectralControls(analysis, predicted) {
    const binHz = analysis.sampleRate / analysis.fftSize;
    const shifts = AUDIO_VALIDATION.shiftsBins;
    const shared = predicted.filter(p => {
        const frame = Math.round((p.t * analysis.sampleRate - analysis.fftSize / 2) / analysis.hopSize);
        const bin = Math.round((p.hz - analysis.minHz) / binHz);
        return frame >= 0 && frame < analysis.frames && bin >= 40 && bin < analysis.bins - 40;
    });
    const support = measureSpectralSupport(analysis, shared);
    if (!support)
        return undefined;
    support.coverage = shared.length / Math.max(1, predicted.length);
    const controls = shifts.map(shift => measureSpectralSupport(analysis, shared.map(p => ({ t: p.t, hz: p.hz + shift * binHz }))));
    if (controls.some(c => !c || c.samples !== support.samples))
        return { ...support, status: 'insufficient' };
    const controlContrastDb = Math.max(...controls.map(c => c.contrastDb));
    const excessDb = support.contrastDb - controlContrastDb;
    return { ...support, controlContrastDb, excessDb, controls: controls.length,
        status: support.samples < AUDIO_VALIDATION.minSamples || support.coverage < AUDIO_VALIDATION.minCoverage ? 'insufficient' : support.contrastDb >= AUDIO_VALIDATION.minContrastDb && excessDb >= AUDIO_VALIDATION.minExcessDb ? 'supported' : 'weak' };
}
/** A curve-only hypothesis must also survive audio checks before final acceptance. */
export function validateSpectralSupport(result, analysis) {
    result.audioValidation = { ...AUDIO_VALIDATION };
    let rejected = false;
    for (const candidate of result.candidates) {
        candidate.curveAccepted ??= candidate.accepted;
        for (const match of candidate.matches)
            match.spectralSupport = compareSpectralControls(analysis, match.predicted);
        const supports = candidate.matches.map(m => m.spectralSupport?.status);
        candidate.audioEvidence = !supports.length || supports.some(s => !s || s === 'insufficient') ? 'insufficient' : supports.every(s => s === 'supported') ? 'supported' : 'weak';
        candidate.accepted = candidate.curveAccepted && candidate.audioEvidence === 'supported';
        rejected ||= candidate.curveAccepted && !candidate.accepted;
    }
    // Show accepted audio-supported candidates first, then retain model-error ordering.
    result.candidates.sort((a, b) => Number(b.accepted) - Number(a.accepted) || a.misfit - b.misfit);
    if (rejected)
        result.warnings.push('Et eller flere kurvematches blev afvist af lydkontrollen: modellen skal have mindst 3 dB kontrast og 3 dB mere end alle seks forskudte kontrolkurver, mindst 12 målinger og 70% dækning. Grænserne er ikke statistisk kalibreret.');
    if (!result.candidates.some(c => c.accepted) && result.candidates.some(c => c.curveAccepted))
        result.warnings.unshift('Ingen kurvekandidater bestod den ekstra lydkontrol. Der gives ingen konklusion om placeringen.');
}
