/** Country packs keep geography, datasets and future availability in one place. */
export const REGIONS = {
    DK: { name: 'Danmark', enabled: true, bounds: { south: 54.45, north: 57.9, west: 7.5, east: 15.3 }, catalog: './data/dk-sources.json' },
    GB: { name: 'Storbritannien · senere', enabled: false, bounds: { south: 49.8, north: 60.9, west: -8.7, east: 2 }, catalog: '' },
    DE: { name: 'Tyskland · senere', enabled: false, bounds: { south: 47.2, north: 55.1, west: 5.8, east: 15.1 }, catalog: '' }
};
export function inRegion(point, country) {
    const b = REGIONS[country].bounds;
    return Number.isFinite(point.lat) && Number.isFinite(point.lon) && point.lat >= b.south && point.lat <= b.north && point.lon >= b.west && point.lon <= b.east;
}
