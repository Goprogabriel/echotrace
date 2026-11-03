import type {Coverage, Flight, FlightDataset, FlightPoint, SearchConfig} from '../types.js';
export const API_BASE = 'https://adsb.aero/api/v1';
const MAX_POINTS = 250_000;
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Forventede et JSON-objekt.');
  return v as Record<string, unknown>;
};
const finite = (v: unknown, label: string): number => {
  if (v === '' || v === null || v === undefined || !Number.isFinite(Number(v))) throw new Error(`Ugyldig værdi: ${label}.`);
  return Number(v);
};
export function epochSeconds(value: unknown): number {
  const n = typeof value === 'number' ? value : Date.parse(String(value)) / 1000;
  if (!Number.isFinite(n) || n < 946684800 || n > 4133980800) throw new Error('Tidsstempler skal være ISO 8601 med tidszone eller Unix-sekunder (ikke millisekunder).');
  if (typeof value === 'string' && !/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) throw new Error('ISO-tidspunkter skal indeholde Z eller en tidszone.');
  return n;
}
function point(value: unknown): FlightPoint {
  const p = object(value), lat = finite(p.lat, 'lat'), lon = finite(p.lon, 'lon'), altM = finite(p.altM, 'altM');
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180 || altM < -500 || altM > 22000) throw new Error('En flyposition eller flyhøjde ligger uden for de tilladte grænser.');
  return {t: epochSeconds(p.t), lat, lon, altM};
}
function normalize(points: FlightPoint[]): FlightPoint[] {
  points.sort((a, b) => a.t - b.t);
  return points.filter((p, i) => !i || p.t > points[i - 1].t);
}
export function parseDataset(input: unknown, source = 'Importeret lokalt datasæt'): FlightDataset {
  const root = object(input);
  if (!Array.isArray(root.flights) || !root.flights.length || root.flights.length > 100) throw new Error('Datasættet skal indeholde 1–100 fly i feltet flights.');
  let count = 0;
  const flights = root.flights.map((value: unknown, i: number): Flight => {
    const f = object(value);
    if (!Array.isArray(f.points) || f.points.length < 2) throw new Error(`Fly ${i + 1} mangler mindst to punkter.`);
    count += f.points.length;
    if (count > MAX_POINTS) throw new Error('Højst 250.000 datapunkter pr. import.');
    const points = normalize(f.points.map(point));
    if (points.length < 2) throw new Error('Flybanen har kun ét unikt tidsstempel.');
    return {id: String(f.id || `flight-${i + 1}`).slice(0, 150), callsign: String(f.callsign || f.id || `Fly ${i + 1}`).slice(0, 32),
      type: typeof f.type === 'string' ? f.type.slice(0, 30) : undefined, points};
  });
  if (new Set(flights.map(f => f.id)).size !== flights.length) throw new Error('Fly-id’er skal være unikke.');
  return {flights, source: String(root.source || source).slice(0, 200), license: String(root.license || 'Ikke angivet — kontrollér dine datarettigheder').slice(0, 200),
    synthetic: root.synthetic === true, warnings: ['Importerede data er ikke uafhængigt kontrolleret. Højder forventes i meter over middelvandstand.']};
}
/** Parses documented adsb.aero MultiLineStrings. Sparse speed arrays must NOT be zipped with positions. */
export function parseProvider(input: unknown, from: number, to: number): FlightDataset {
  const root = object(input);
  if (!Array.isArray(root.flights)) throw new Error('Flytjenesten returnerede et ukendt format. Prøv lokal import.');
  const flights: Flight[] = []; let omitted = 0;
  for (const value of root.flights) {
    const f = object(value);
    if (!f.path || !Array.isArray(f.timestamps)) { omitted++; continue; }
    const path = object(f.path);
    if (path.type !== 'MultiLineString' || !Array.isArray(path.coordinates)) { omitted++; continue; }
    const points: FlightPoint[] = [];
    path.coordinates.forEach((segment: unknown, i: number) => {
      const times = (f.timestamps as unknown[])[i];
      if (!Array.isArray(segment) || !Array.isArray(times) || segment.length !== times.length) return;
      segment.forEach((coordinate: unknown, j: number) => {
        if (!Array.isArray(coordinate) || coordinate.length < 3 || coordinate[2] === null) return;
        try {
          const t = epochSeconds(times[j]);
          if (t < from || t > to) return;
          // Published trajectory altitude is PRESSURE altitude in feet, not metres/geometric altitude.
          points.push(point({t, lon: coordinate[0], lat: coordinate[1], altM: finite(coordinate[2], 'pressure_alt_ft') * .3048}));
        } catch { /* Ground/malformed positions are excluded rather than silently coerced. */ }
      });
    });
    const clean = normalize(points);
    if (clean.length >= 3) flights.push({id: String(f.flight_id), callsign: String(f.callsign || f.icao24 || 'Ukendt').trim(), type: String(f.icao_type || ''), points: clean});
    else omitted++;
  }
  const warnings = ['Kildehøjder er trykhøjder omregnet fra fod til meter, ikke præcise geometriske højder. Det kan forskyde løsningen.'];
  if (root.cursor) warnings.push('API-svaret er afkortet. Flere fly kan findes; indsnævr søgeområdet eller importér et komplet udsnit.');
  if (omitted) warnings.push(`${omitted} ruter uden tilstrækkelige punkter i tidsvinduet blev udeladt.`);
  return {flights: flights.slice(0, 100), source: 'adsb.aero / adsb.lol', license: 'ODbL 1.0', synthetic: false,
    warnings, fetchedAt: new Date().toISOString()};
}
async function apiRequest(path: string, options: RequestInit, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, {once: true});
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 45000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {...options, signal: controller.signal, credentials: 'omit'});
    if (!response.ok) throw new Error(response.status === 429 ? 'Flytjenesten har nået sin forespørgselsgrænse. Prøv senere eller importér data.' : `Flytjenesten svarede HTTP ${response.status}. Importér et lokalt datasæt som alternativ.`);
    return await response.json();
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Annulleret', 'AbortError');
    if (error instanceof TypeError) throw new Error('Flytjenesten kunne ikke kontaktes. Netværk, CORS eller driftsstop kan være årsagen. Videoen er ikke sendt. Brug lokal JSON/CSV-import.');
    if (controller.signal.aborted) throw new Error('Flytjenesten svarede ikke inden for 45 sekunder. Prøv lokal import.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export async function fetchCoverage(signal?: AbortSignal): Promise<Coverage> {
  const r = object(await apiRequest('/data-range', {}, signal));
  if (typeof r.first_date !== 'string' || typeof r.last_date !== 'string') throw new Error('Kunne ikke aflæse arkivets datoperiode.');
  return {first: r.first_date, last: r.last_date};
}
export function buildQuery(config: SearchConfig, duration: number): Record<string, unknown> {
  const from = config.startTime - config.clockUncertainty - 360;
  const to = config.startTime + duration + config.clockUncertainty + 30;
  return {match: {trajectory_intersects: {geometry: {type: 'Circle', coordinates: [config.lon, config.lat], radius: config.radiusKm * 1000 + 60000},
    time_from: new Date(from * 1000).toISOString(), time_to: new Date(to * 1000).toISOString()}},
    end_date: new Date((to + 60) * 1000).toISOString(), window_days: 2, limit: 100, include_path: true};
}
export async function fetchFlights(config: SearchConfig, duration: number, signal?: AbortSignal): Promise<FlightDataset> {
  const coverage = await fetchCoverage(signal);
  const day = new Date(config.startTime * 1000).toISOString().slice(0, 10);
  if (day < coverage.first.slice(0, 10) || day > coverage.last.slice(0, 10)) throw new Error(`Datoen ligger uden for tjenestens arkiv (${coverage.first.slice(0, 10)} → ${coverage.last.slice(0, 10)}). Importér historiske data i stedet.`);
  const raw = await apiRequest('/query', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(buildQuery(config, duration))}, signal);
  const result = parseProvider(raw, config.startTime - config.clockUncertainty - 390, config.startTime + duration + config.clockUncertainty + 60);
  if (!result.flights.length) throw new Error('Ingen brugbare flybaner i dette tidsrum og område. Der vises ikke et opdigtet match.');
  return result;
}
export function parseCsv(text: string): FlightDataset {
  const rows: string[][] = []; let row: string[] = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) {row.push(value); value = '';}
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = ''; }
    else value += c;
  }
  if (quoted) throw new Error('CSV indeholder et ikke-afsluttet anførselstegn.');
  row.push(value); if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map(h => h.trim().replace(/^\uFEFF/, '')) || [];
  for (const key of ['flight_id', 'timestamp', 'lat', 'lon', 'alt_m']) if (!headers.includes(key)) throw new Error(`CSV mangler kolonnen ${key}. Se det medfølgende eksempel.`);
  const flights = new Map<string, {id: string; callsign: string; points: unknown[]}>();
  for (const r of rows) {
    const get = (k: string) => r[headers.indexOf(k)]?.trim();
    const id = get('flight_id'); if (!id) throw new Error('CSV-række mangler flight_id.');
    if (!flights.has(id)) flights.set(id, {id, callsign: get('callsign') || id, points: []});
    const time = get('timestamp') || '';
    flights.get(id)!.points.push({t: /^\d+(\.\d+)?$/.test(time) ? Number(time) : time, lat: get('lat'), lon: get('lon'), altM: get('alt_m')});
  }
  return parseDataset({flights: [...flights.values()], source: 'Lokal CSV-import'});
}
export async function importFlights(file: File): Promise<FlightDataset> {
  if (file.size > 25 * 1024 * 1024) throw new Error('Flydata må højst fylde 25 MB. Importér et tids- og områdeudsnit, ikke et globalt dagsarkiv.');
  let text: string;
  if (file.name.endsWith('.gz')) {
    if (!('DecompressionStream' in window)) throw new Error('Udpak gzip-filen før import i denne browser.');
    const reader = file.stream().pipeThrough(new DecompressionStream('gzip')).getReader();
    const parts: Uint8Array[] = []; let size = 0;
    while (true) { const r = await reader.read(); if (r.done) break; size += r.value.length; if (size > 50 * 1024 * 1024) { await reader.cancel(); throw new Error('Udpakket datasæt er for stort (maks. 50 MB).'); } parts.push(r.value); }
    text = new TextDecoder().decode(await new Blob(parts as BlobPart[]).arrayBuffer());
  } else text = await file.text();
  return file.name.replace(/\.gz$/, '').endsWith('.csv') ? parseCsv(text) : parseDataset(JSON.parse(text));
}
