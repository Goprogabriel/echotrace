import { inRegion, REGIONS } from './regions.js';
import { signatureDistance } from './sound-scan.js';
const fail = () => { throw new Error('Ugyldigt kildekatalog eller referenceformat. Se docs/SOUND-DATA.md.'); };
const text = (v, max = 1000) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const url = (v) => { try {
    return text(v) && new URL(v).protocol === 'https:';
}
catch {
    return false;
} };
export function validSignature(v) {
    return !!v && v.version === 'acoustic-signature/1' && Array.isArray(v.spectrum) && v.spectrum.length === 32 && v.spectrum.every(n => Number.isFinite(n) && n >= 0 && n <= 1) &&
        Math.abs(v.spectrum.reduce((s, n) => s + n * n, 0) - 1) < .01 &&
        Array.isArray(v.peaksHz) && v.peaksHz.length <= 8 && v.peaksHz.every(n => Number.isFinite(n) && n >= 40 && n <= 4000) &&
        [v.onsetRate, v.modulationHz, v.periodicity, v.tonality].every(Number.isFinite) && v.onsetRate >= 0 && v.onsetRate <= 10 &&
        v.modulationHz >= 0 && v.modulationHz <= 2 && v.periodicity >= 0 && v.periodicity <= 1 && v.tonality >= 0 && v.tonality <= 1;
}
export function parseCatalog(value, country = 'DK') {
    if (!value || typeof value !== 'object')
        return fail();
    const c = value;
    if (c.schema !== 'echotrace-sources/1' || c.country !== country || !REGIONS[country].enabled || !text(c.source) || !text(c.license) || !text(c.coverage) || !Number.isFinite(Date.parse(c.fetchedAt)) || !Array.isArray(c.sources) || c.sources.length > 30000 || !Array.isArray(c.references) || c.references.length > 3000)
        return fail();
    const ids = new Set(), refIds = new Set();
    for (const s of c.sources) {
        if (!s || !text(s.id, 160) || ids.has(s.id) || !text(s.name, 300) || s.country !== country || !['church_bell', 'wind_turbine', 'airport'].includes(s.kind) || !inRegion(s, country) || !url(s.url) || (s.provenance !== undefined && !text(s.provenance)) || (s.license !== undefined && !text(s.license)))
            return fail();
        ids.add(s.id);
    }
    for (const r of c.references) {
        const source = c.sources.find(s => s.id === r?.sourceId);
        if (!r || !['church_bell', 'wind_turbine'].includes(r.kind) || !text(r.id, 160) || refIds.has(r.id) || !source || source.kind !== r.kind || !text(r.provenance) || !text(r.license) || typeof r.synthetic !== 'boolean' || !validSignature(r.signature) || (r.recordedAt !== undefined && !Number.isFinite(Date.parse(r.recordedAt))))
            return fail();
        refIds.add(r.id);
    }
    // Copy prevents callers from mutating a previously validated bundle.
    const copy = structuredClone(c);
    copy.sources = copy.sources.map(s => ({ ...s, provenance: s.provenance ?? c.source, license: s.license ?? c.license }));
    return copy;
}
export async function loadCatalog(country, signal) {
    if (!REGIONS[country].enabled)
        throw new Error('Dette land understøttes endnu ikke.');
    const response = await fetch(REGIONS[country].catalog, { signal });
    if (!response.ok)
        throw new Error('Det danske kildekatalog kunne ikke indlæses. Importér et lokalt katalog.');
    return parseCatalog(await response.json(), country);
}
export function matchSources(scan, catalog) {
    const matches = [];
    const sources = new Map(catalog.sources.map(s => [s.id, s]));
    for (const d of scan.detections.filter(d => d.status === 'possible' && d.kind === 'church_bell')) {
        for (const r of catalog.references.filter(r => !r.synthetic && r.kind === d.kind)) {
            const source = sources.get(r.sourceId);
            if (!source)
                continue;
            let best;
            for (const segment of d.segments) {
                const distance = signatureDistance(segment.signature, r.signature);
                if (distance <= .055 && (!best || distance < best.distance))
                    best = { source, referenceId: r.id, distance, start: segment.start, end: segment.end, status: 'reference_similarity', receiverLocationKnown: false };
            }
            if (best)
                matches.push(best);
        }
    }
    // One row per source, retain alternative sources with similar signatures.
    matches.sort((a, b) => a.distance - b.distance);
    return matches.filter((m, i) => matches.findIndex(other => other.source.id === m.source.id) === i).slice(0, 20);
}
export function referenceBundle(source, reference) {
    return parseCatalog({ schema: 'echotrace-sources/1', country: source.country, source: reference.provenance, license: reference.license,
        fetchedAt: new Date().toISOString(), coverage: 'Én brugerleveret reference. Ingen garanti for entydighed.', sources: [source], references: [reference] }, source.country);
}
export function mergeCatalogs(a, b) {
    if (a.country !== b.country)
        return fail();
    const sources = new Map(a.sources.map(s => [s.id, s]));
    for (const s of b.sources) {
        const old = sources.get(s.id);
        if (old && (old.kind !== s.kind || old.lat !== s.lat || old.lon !== s.lon))
            throw new Error('Kilde-id findes allerede med andre koordinater eller en anden lydtype.');
        sources.set(s.id, s);
    }
    const references = new Map(a.references.map(r => [r.id, r]));
    for (const r of b.references)
        references.set(r.id, r);
    return parseCatalog({ ...a, sources: [...sources.values()], references: [...references.values()], coverage: `${a.coverage} Lokale referencer tilføjet.` }, a.country);
}
