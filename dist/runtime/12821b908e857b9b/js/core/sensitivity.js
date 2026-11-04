const profiles = new Map();
/** One explicit, reproducible tradeoff. Higher values admit weaker/shorter traces.
 * These limits are heuristic operating settings, never confidence percentages. */
export function sensitivityProfile(value = 50) {
    if (!Number.isFinite(value) || value < 0 || value > 100)
        throw new Error('Følsomhed skal være mellem 0 og 100.');
    const level = Math.round(value), cached = profiles.get(level);
    if (cached)
        return cached;
    const blend = (strict, normal, sensitive) => level <= 50 ? strict + (normal - strict) * level / 50 : normal + (sensitive - normal) * (level - 50) / 50;
    const profile = Object.freeze({ version: 'sensitivity/1', value: level,
        minDurationSeconds: blend(14, 8, 6), minPointContrastDb: blend(14, 10, 6),
        minTrackCoverage: blend(.9, .75, .55), maxVariationRatio: blend(1.5, 2, 2.5),
        minDriftHz: blend(5, 3.5, 2.5), minRelativeDrift: blend(.035, .025, .015),
        minFitCoverage: blend(.95, .85, .75), maxRelativeRmse: blend(.01, .02, .035),
        maxTrackRmse: blend(.02, .035, .05), minImprovement: blend(.9, .75, .55),
        minContrastDb: blend(5, 3, 1.5), minExcessDb: blend(5, 3, 1.5),
        minTemporalExcessDb: blend(5, 3, 1.5), minSupportedFraction: blend(.8, .6, .45),
        minAudioCoverage: blend(.85, .7, .6), minSamples: Math.round(blend(20, 12, 10)), calibrated: false });
    profiles.set(level, profile);
    return profile;
}
export function audioValidation(value = 50) {
    const p = sensitivityProfile(value);
    return { method: 'off-curve-contrast/3', sensitivity: p.value, minDurationSeconds: p.minDurationSeconds,
        minTemporalExcessDb: p.minTemporalExcessDb, minSupportedFraction: p.minSupportedFraction,
        maxModelSamples: 512, minContrastDb: p.minContrastDb, minExcessDb: p.minExcessDb,
        minSamples: p.minSamples, minCoverage: p.minAudioCoverage,
        shiftsBins: Object.freeze([-32, -20, -12, 12, 20, 32]), calibrated: false };
}
