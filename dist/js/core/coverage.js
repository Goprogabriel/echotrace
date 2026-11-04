export const SOURCE_LAYERS = [
    { id: 'church_bell', label: 'Kirker / kirkeklokker', color: '#c4a2ff' },
    { id: 'airport', label: 'Flypladser', color: '#65d9ff' },
    { id: 'wind_turbine', label: 'Vindmøller / parker', color: '#a7e87f' }
];
export function coveragePoints(catalog) {
    const counts = new Map();
    for (const ref of catalog.references)
        if (!ref.synthetic)
            counts.set(ref.sourceId, (counts.get(ref.sourceId) ?? 0) + 1);
    return catalog.sources.map(source => ({ ...source, referenceCount: counts.get(source.id) ?? 0 }));
}
export function filterCoverage(points, filter) {
    const query = filter.query.trim().toLocaleLowerCase('da-DK');
    return points.filter(p => filter.kinds.includes(p.kind) && (!filter.referencesOnly || p.referenceCount > 0) &&
        (!query || `${p.name} ${p.id}`.toLocaleLowerCase('da-DK').includes(query)));
}
/** Screen-space grouping keeps a national catalogue readable, with separate colours
 * per category. This is a display aggregation, never geographic acoustic coverage. */
export function clusterSources(points, xy, width, height, zoom) {
    const cells = new Map(), size = zoom < 11 ? 38 : 18;
    for (const point of points) {
        const [x, y] = xy(point.lat, point.lon);
        if (x < -30 || y < -30 || x > width + 30 || y > height + 30)
            continue;
        const key = `${point.kind}/${Math.floor(x / size)}/${Math.floor(y / size)}`;
        const cluster = cells.get(key);
        if (cluster) {
            const n = cluster.points.length;
            cluster.x = (cluster.x * n + x) / (n + 1);
            cluster.y = (cluster.y * n + y) / (n + 1);
            cluster.points.push(point);
        }
        else
            cells.set(key, { x, y, kind: point.kind, points: [point] });
    }
    return [...cells.values()];
}
