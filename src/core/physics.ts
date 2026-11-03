import type {Flight, FlightPoint} from '../types.js';
export type Vec3 = [number, number, number];
export interface PreparedFlight {flight: Flight; times: Float64Array; xyz: Float64Array}
const R = 6371000, RAD = Math.PI / 180;
/** Spherical Earth coordinates; altitude is metres MSL. No atmospheric or ellipsoid correction. */
export function ecef(lat: number, lon: number, altM = 0): Vec3 {
  const r = R + altM, cl = Math.cos(lat * RAD);
  return [r * cl * Math.cos(lon * RAD), r * cl * Math.sin(lon * RAD), r * Math.sin(lat * RAD)];
}
export function prepareFlight(flight: Flight): PreparedFlight {
  const times = Float64Array.from(flight.points.map(p => p.t));
  const xyz = new Float64Array(times.length * 3);
  flight.points.forEach((p: FlightPoint, i: number) => xyz.set(ecef(p.lat, p.lon, p.altM), i * 3));
  return {flight, times, xyz};
}
export function interpolate(f: PreparedFlight, t: number): {position: Vec3; velocity: Vec3} | null {
  const ts = f.times, n = ts.length;
  if (n < 2 || t < ts[0] || t > ts[n - 1]) return null;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (hi + lo) >> 1; if (ts[mid] <= t) lo = mid; else hi = mid; }
  const dt = ts[hi] - ts[lo];
  // Never interpolate through a long coverage gap, duplicate timestamp, or across two flight legs.
  if (dt <= 0 || dt > 30) return null;
  const a = (t - ts[lo]) / dt, position: Vec3 = [0, 0, 0], velocity: Vec3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const d = f.xyz[hi * 3 + k] - f.xyz[lo * 3 + k];
    position[k] = f.xyz[lo * 3 + k] + a * d; velocity[k] = d / dt;
  }
  if (Math.hypot(...velocity) > 335) return null; // This subsonic model does not handle sonic booms.
  return {position, velocity};
}
/**
 * Solve t_receive = t_emit + |source(t_emit)-receiver| / c.
 * Positive radial velocity is receding: f_observed/f_source = c/(c+v_radial).
 */
export function dopplerFactor(f: PreparedFlight, receiver: Vec3, receivedAt: number, c: number): number | null {
  if (!(c >= 300 && c <= 370)) return null;
  let te = Math.min(f.times[f.times.length - 1], Math.max(f.times[0], receivedAt - 20));
  let factor = 1;
  for (let k = 0; k < 8; k++) {
    const state = interpolate(f, te); if (!state) return null;
    const d = state.position.map((v, i) => v - receiver[i]);
    const range = Math.hypot(...d); if (range < 10) return null;
    const radial = (d[0] * state.velocity[0] + d[1] * state.velocity[1] + d[2] * state.velocity[2]) / range;
    if (Math.abs(radial) > c * .98) return null;
    factor = c / (c + radial);
    const residual = te + range / c - receivedAt;
    if (Math.abs(residual) < .002) return factor;
    te -= residual * factor;
    if (te < f.times[0] || te > f.times[f.times.length - 1]) return null;
  }
  return null;
}
