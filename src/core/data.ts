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
  const result: FlightPoint = {t: epochSeconds(p.t), lat, lon, altM};
  if (p.segment !== undefined) {
    if (!Number.isSafeInteger(p.segment) || Number(p.segment) < 0) throw new Error('Ugyldigt flybanesegment.');
    result.segment = Number(p.segment);
  }
  if (p.altitudeReference !== undefined) {
    if (!['msl', 'pressure', 'qnh-msl'].includes(String(p.altitudeReference))) throw new Error('Ukendt højdereference.');
    result.altitudeReference = p.altitudeReference as FlightPoint['altitudeReference'];
  }
  return result;
}
function normalize(points: FlightPoint[]): FlightPoint[] {
  points.sort((a, b) => a.t - b.t);
  return points.filter((p, i) => !i || p.t > points[i - 1].t);
}
export function parseDataset(input: unknown, source = 'Importeret lokalt datasæt'): FlightDataset {
  const root = object(input);
  if (!Array.isArray(root.flights) || !root.flights.length || root.flights.length > 20_000) throw new Error('Datasættet skal indeholde 1–20.000 fly i feltet flights.');
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
export function parseProvider(input: unknown, from: number, to: number, paged = false): FlightDataset {
  const root = object(input);
  if (!Array.isArray(root.flights)) throw new Error('Flytjenesten returnerede et ukendt format. Prøv lokal import.');
  const flights: Flight[] = []; let omitted = 0, corrected = 0, pressure = 0;
  for (const value of root.flights) {
    const f = object(value);
    if (typeof f.flight_id !== 'string' || !f.flight_id.trim()) {omitted++; continue;}
    if (!f.path || !Array.isArray(f.timestamps)) { omitted++; continue; }
    const path = object(f.path);
    if (path.type !== 'MultiLineString' || !Array.isArray(path.coordinates)) { omitted++; continue; }
    const points: FlightPoint[] = [];
    path.coordinates.forEach((segment: unknown, i: number) => {
      const times = (f.timestamps as unknown[])[i];
      if (!Array.isArray(segment) || !Array.isArray(times) || segment.length !== times.length) return;
      const rawCorrections = Array.isArray(f.alt_correction_ft) ? f.alt_correction_ft[i] : null;
      const corrections = Array.isArray(rawCorrections) ? rawCorrections.filter((v: unknown): v is number[] => Array.isArray(v) && v.length >= 2 && typeof v[0] === 'number' && Number.isFinite(v[0]) && typeof v[1] === 'number' && Number.isFinite(v[1])).sort((a, b) => a[0] - b[0]) : [];
      let correctionIndex = -1;
      segment.forEach((coordinate: unknown, j: number) => {
        if (!Array.isArray(coordinate) || coordinate.length < 3 || coordinate[2] === null) return;
        try {
          const t = epochSeconds(times[j]);
          if (t < from || t > to) return;
          // Sparse QNH corrections have their own timestamps, never zip with positions.
          while (correctionIndex + 1 < corrections.length && corrections[correctionIndex + 1][0] <= t) correctionIndex++;
          while (correctionIndex >= 0 && corrections[correctionIndex][0] > t) correctionIndex--;
          const correction = correctionIndex >= 0 ? corrections[correctionIndex][1] : null;
          points.push(point({t, lon: coordinate[0], lat: coordinate[1], segment: i,
            altM: (finite(coordinate[2], 'pressure_alt_ft') + (correction ?? 0)) * .3048,
            altitudeReference: correction === null ? 'pressure' : 'qnh-msl'}));
          if (correction === null) pressure++; else corrected++;
        } catch { /* Ground/malformed positions are excluded rather than silently coerced. */ }
      });
    });
    const clean = normalize(points);
    if (clean.length >= 3) flights.push({id: String(f.flight_id), callsign: String(f.callsign || f.icao24 || 'Ukendt').trim(), type: String(f.icao_type || ''), points: clean});
    else omitted++;
  }
  const warnings = ['Kildehøjder er trykhøjder omregnet fra fod til meter, ikke præcise geometriske højder. Det kan forskyde løsningen.'];
  if (corrected) warnings.push('Tilgængelige QNH-rettelser er anvendt ved deres egne tidspunkter. Rettet MSL-højde er stadig ikke en præcis geometrisk højde.');
  if (pressure && corrected) warnings.push('Nogle positioner mangler QNH-rettelse. Der interpoleres ikke mellem forskellige højdereferencer.');
  if (root.cursor && !paged) warnings.push('API-svaret er afkortet. Flere fly kan findes; indsnævr søgeområdet eller importér et komplet udsnit.');
  if (omitted) warnings.push(`${omitted} ruter uden tilstrækkelige punkter i tidsvinduet blev udeladt.`);
  return {flights: paged ? flights : flights.slice(0, 100), source: 'adsb.aero / adsb.lol', license: 'ODbL 1.0', synthetic: false,
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
  const from = config.startTime - config.clockUncertainty - (config.global ? 420 : 360);
  const to = config.startTime + duration + config.clockUncertainty + 30;
  const predicate: Record<string, unknown> = {time_from: new Date(from * 1000).toISOString(), time_to: new Date(to * 1000).toISOString()};
  if (!config.global) predicate.geometry = {type: 'Circle', coordinates: [config.lon, config.lat], radius: config.radiusKm * 1000 + 60000};
  // end_date bounds departure, not position time. Include up to two-day-old departures.
  return {match: {trajectory_intersects: predicate},
    end_date: new Date((to + 60) * 1000).toISOString(),
    start_from: new Date((from - 2 * 86400) * 1000).toISOString(),
    window_days: config.global ? 3 : 2, limit: 100, include_path: true};
}
export async function fetchFlights(config: SearchConfig, duration: number, signal?: AbortSignal, progress?: (pages: number, flights: number) => void): Promise<FlightDataset> {
  const coverage = await fetchCoverage(signal);
  const day = new Date(config.startTime * 1000).toISOString().slice(0, 10);
  if (day < coverage.first.slice(0, 10) || day > coverage.last.slice(0, 10)) throw new Error(`Datoen ligger uden for tjenestens arkiv (${coverage.first.slice(0, 10)} → ${coverage.last.slice(0, 10)}). Importér historiske data i stedet.`);
  const query = buildQuery(config, duration);
  const from = config.startTime - config.clockUncertainty - (config.global ? 450 : 390), to = config.startTime + duration + config.clockUncertainty + 60;
  if (!config.global) {
    const raw = await apiRequest('/query', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(query)}, signal);
    const result = parseProvider(raw, from, to);
    if (!result.flights.length) throw new Error('Ingen brugbare flybaner i dette tidsrum. Prøv lokal import.');
    return result;
  }
  const flights = new Map<string, Flight>();
  let cursor: unknown = null, pages = 0, points = 0, rawFlights = 0, omitted = 0, reason: string | undefined;
  const seenCursors = new Set<string>();
  const warnings = new Set<string>();
  do {
    if (signal?.aborted) throw new DOMException('Annulleret', 'AbortError');
    const raw = object(await apiRequest('/query', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...query, ...(cursor ? {cursor} : {})})}, signal));
    pages++;
    const parsed = parseProvider(raw, from, to, true);
    const count = Array.isArray(raw.flights) ? raw.flights.length : 0;
    rawFlights += count; omitted += Math.max(0, count - parsed.flights.length);
    parsed.warnings.forEach(w => {if (!w.includes('ruter uden')) warnings.add(w);});
    for (const flight of parsed.flights) {
      if (flights.has(flight.id)) continue;
      if (points + flight.points.length > 1_000_000 || flights.size >= 20_000) {reason = 'Browserens datagrænse blev nået (20.000 flybaner / 1.000.000 punkter).'; break;}
      points += flight.points.length; flights.set(flight.id, flight);
    }
    cursor = raw.cursor || null;
    if (reason) break;
    if (cursor) {
      const key = JSON.stringify(cursor);
      if (seenCursors.has(key)) throw new Error('Flytjenesten gentog sin næste side. Søgningen blev stoppet for at undgå en uendelig hentning.');
      seenCursors.add(key);
    }
    progress?.(pages, flights.size);
    if (cursor && pages >= 200) {reason = 'Hentningen blev begrænset til 200 sider for at skåne den gratis flytjeneste.'; break;}
  } while (cursor);
  if (!flights.size) throw new Error('Ingen brugbare flybaner ved tidspunktet i arkivet. Dækning kan mangle; prøv lokal import.');
  if (omitted) warnings.add(`${omitted} ruter manglede tilstrækkelige positioner i tidsvinduet.`);
  if (reason) warnings.add(reason);
  warnings.add('Tidsudsnittet medtager afgange op til to døgn før optagelsen. Ældre afgange og fly uden arkivdata kan mangle.');
  warnings.add('Global hentning betyder arkivets tilgængelige flybaner, ikke alle faktiske fly. Dækningen er ujævn.');
  return {flights: [...flights.values()], source: 'adsb.aero / adsb.lol · globalt tidsudsnit', license: 'ODbL 1.0', synthetic: false, fetchedAt: new Date().toISOString(), warnings: [...warnings],
    retrieval: {global: true, complete: !cursor && !reason, pages, from, to, rawFlights, omitted, reason}};
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
  return file.name.replace(/\.gz$/, '').endsWith('.csv') ? parseCsv(text) : parseFlightInput(JSON.parse(text));
}

/** Original readsb per-aircraft trace, as published in the adsb.lol archives. */
export function parseReadsbTrace(input: unknown): FlightDataset {
  const root = object(input), base = epochSeconds(root.timestamp);
  if (typeof root.icao !== 'string' || !/^~?[0-9a-f]{6}$/i.test(root.icao) || !Array.isArray(root.trace) || !root.trace.length || root.trace.length > MAX_POINTS) throw new Error('Ugyldigt readsb-spor eller for mange datapunkter.');
  const flights: Flight[] = []; let points: FlightPoint[] = [], segment = 0, omitted = 0, lastTime = -Infinity;
  let callsign = root.icao;
  const flush = (): void => {
    if (points.length >= 2) flights.push({id: `${root.icao}:${points[0].t}`, callsign, type: typeof root.t === 'string' ? root.t.slice(0, 30) : undefined, points});
    points = []; callsign = root.icao as string;
  };
  for (const entry of root.trace) {
    if (!Array.isArray(entry) || entry.length < 7 || typeof entry[0] !== 'number' || !Number.isFinite(entry[0]) || entry[0] < 0) {omitted++; segment++; continue;}
    const t = base + entry[0], flags = entry[6];
    if (!Number.isSafeInteger(flags) || flags < 0 || t <= lastTime) throw new Error('readsb-punkter skal have gyldige flag og stigende tid.');
    lastTime = t;
    if (flags & 2) {flush(); segment++;}
    // Stale positions and ground rows cannot define a physical flight segment.
    // Flag 8 denotes ellipsoid altitude: do not silently mix it with barometric MSL.
    if (flags & 1 || flags & 8 || typeof entry[3] !== 'number') {omitted++; segment++; continue;}
    try {
      points.push(point({t, lat: entry[1], lon: entry[2], altM: entry[3] * .3048, segment, altitudeReference: 'pressure'}));
      if (entry[8] && typeof entry[8] === 'object' && typeof entry[8].flight === 'string' && entry[8].flight.trim()) callsign = entry[8].flight.trim().slice(0, 32);
    } catch {omitted++; segment++;}
  }
  flush();
  if (flights.length > 20_000) throw new Error('Højst 20.000 flybaner pr. import.');
  if (!flights.length) throw new Error('readsb-sporet indeholder ingen brugbar flybane.');
  return {flights, source: 'Lokal readsb-trace · kilde og licens skal kontrolleres', license: 'Ikke angivet — kontrollér dine datarettigheder', synthetic: root.synthetic === true,
    warnings: ['readsb-højder er trykhøjder i fod omregnet til meter. Geometriske højder erstatter ikke automatisk MSL-højder.',
      'readsb-positioner kan stamme fra ADS-B, MLAT eller TIS-B. Modtagerkvalitet er ikke uafhængigt valideret.',
      ...(omitted ? [`${omitted} readsb-punkter blev udeladt; spor forbindes ikke hen over dem.`] : [])]};
}

export function parseFlightInput(input: unknown): FlightDataset {
  const root = object(input);
  if (Array.isArray(root.trace)) return parseReadsbTrace(root);
  const rawFlights = Array.isArray(root.flights) ? root.flights : typeof root.flight_id === 'string' ? [root] : null;
  if (rawFlights?.length && rawFlights.every(f => f && typeof f === 'object' && 'flight_id' in f)) {
    if (rawFlights.length > 20_000) throw new Error('Højst 20.000 flybaner pr. import.');
    const result = parseProvider({flights: rawFlights, cursor: root.cursor}, 946684800, 4133980800, true);
    if (!result.flights.length) throw new Error('Ingen brugbare positioner i det importerede API-svar.');
    const validated = parseDataset({...result, synthetic: root.synthetic === true});
    return {...validated, warnings: [...result.warnings, ...(root.cursor ? ['Det importerede API-svar har flere sider. Importen er ikke komplet.'] : [])]};
  }
  return parseDataset(root);
}

export async function importFlightFiles(files: File[]): Promise<FlightDataset> {
  if (!files.length || files.length > 100 || files.reduce((sum, f) => sum + f.size, 0) > 25 * 1024 * 1024) throw new Error('Vælg højst 100 flydatafiler og samlet højst 25 MB.');
  const datasets: FlightDataset[] = []; let total = 0;
  for (const file of files) {
    const dataset = await importFlights(file);
    total += dataset.flights.reduce((sum, f) => sum + f.points.length, 0);
    if (total > MAX_POINTS) throw new Error('Højst 250.000 datapunkter pr. import.');
    datasets.push(dataset);
  }
  if (datasets.length === 1) return datasets[0];
  const merged = parseDataset({flights: datasets.flatMap(d => d.flights), synthetic: datasets.some(d => d.synthetic), source: 'Flere lokale flydatafiler', license: [...new Set(datasets.map(d => d.license))].join('; ')});
  return {...merged, warnings: [...new Set(datasets.flatMap(d => d.warnings))]};
}
