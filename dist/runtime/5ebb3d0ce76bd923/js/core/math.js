export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export function median(values) {
    if (!values.length)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const m = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}
/** In-place radix-2 FFT. The caller supplies a fresh, real-valued window. */
export function fft(re, im) {
    const n = re.length;
    if (n !== im.length || n < 2 || (n & (n - 1)))
        throw new Error('FFT size must be a power of two.');
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1)
            j ^= bit;
        j ^= bit;
        if (i < j) {
            [re[i], re[j]] = [re[j], re[i]];
            [im[i], im[j]] = [im[j], im[i]];
        }
    }
    for (let len = 2; len <= n; len <<= 1) {
        const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
        for (let i = 0; i < n; i += len) {
            let ur = 1, ui = 0;
            for (let j = 0; j < len / 2; j++) {
                const p = i + j, q = p + len / 2;
                const vr = re[q] * ur - im[q] * ui, vi = re[q] * ui + im[q] * ur;
                re[q] = re[p] - vr;
                im[q] = im[p] - vi;
                re[p] += vr;
                im[p] += vi;
                const next = ur * wr - ui * wi;
                ui = ur * wi + ui * wr;
                ur = next;
            }
        }
    }
}
export function haversine(a, b) {
    const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r;
    const s = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(Math.max(0, 1 - s)));
}
export function offsetPosition(lat, lon, eastM, northM) {
    const distance = Math.hypot(eastM, northM) / 6371000, bearing = Math.atan2(eastM, northM), rad = Math.PI / 180;
    const phi = lat * rad, lambda = lon * rad;
    const nextLat = Math.asin(Math.max(-1, Math.min(1, Math.sin(phi) * Math.cos(distance) + Math.cos(phi) * Math.sin(distance) * Math.cos(bearing))));
    const nextLon = lambda + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(phi), Math.cos(distance) - Math.sin(phi) * Math.sin(nextLat));
    return { lat: nextLat / rad, lon: ((nextLon / rad + 180) % 360 + 360) % 360 - 180 };
}
