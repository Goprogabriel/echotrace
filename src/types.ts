export interface RidgePoint { t: number; hz: number; snr: number }
export interface Ridge {
  id: string; points: RidgePoint[]; coverage: number; driftHz: number;
  medianSnr: number; start: number; end: number;
  source?: 'auto';
}
export interface SensitivityProfile {
  version: 'sensitivity/1'; value: number; calibrated: false;
  minDurationSeconds: number; minPointContrastDb: number; minTrackCoverage: number;
  maxVariationRatio: number; minDriftHz: number; minRelativeDrift: number; minFitCoverage: number;
  maxRelativeRmse: number; maxTrackRmse: number; minImprovement: number;
  minContrastDb: number; minExcessDb: number; minTemporalExcessDb: number;
  minSupportedFraction: number; minAudioCoverage: number; minSamples: number;
}
export interface SignalOptions { fftSize: number; minHz: number; maxHz: number; sensitivity?: number }
export interface SpectrumView { start: number; end: number; minHz: number; maxHz: number; gain: number }
export interface SignalAnalysis {
  resolutionAttempts?: number[]; sensitivity?: number;
  duration: number; sampleRate: number; fftSize: number; hopSize: number;
  frames: number; bins: number; minHz: number; maxHz: number;
  db: Float32Array; waveform: Float32Array; tracks: Ridge[];
  rms: number; peak: number; clippingRatio: number; warnings: string[];
}
export interface DecodedAudio {
  samples: Float32Array; sampleRate: number; duration: number;
  channels: number; method: string; warnings: string[];
}
export interface FlightPoint { t: number; lat: number; lon: number; altM: number; segment?: number; altitudeReference?: 'msl' | 'pressure' | 'qnh-msl' }
export interface Flight { id: string; callsign: string; type?: string; points: FlightPoint[] }
export interface SearchConfig {
  country?: import('./core/regions.js').CountryCode; lat: number; lon: number; radiusKm: number; startTime: number; global?: boolean;
  clockUncertainty: number; receiverAltitudeM: number; soundSpeed: number; sensitivity?: number;
}
export interface Match {
  trackId: string; flightId: string; callsign: string; sourceHz: number;
  relativeRmse: number; coverage: number; improvement: number; durationSeconds?: number;
  spectralSupport?: {contrastDb: number; coverage: number; samples: number; controlContrastDb?: number; excessDb?: number; reversedContrastDb?: number; temporalExcessDb?: number; supportedFraction?: number; modelCoverage?: number; controls?: number; status?: 'supported' | 'weak' | 'insufficient'};
  predicted: {t: number; hz: number}[];
}
export interface Candidate {
  lat: number; lon: number; offset: number; misfit: number;
  improvement: number; matches: Match[]; matchedFlights: number;
  diagnostics?: {method: 'flight-checks/1'; calibrated: false; independentEvents: number; harmonicGroups: string[][];
    chanceMatch: {trackId: string; controls: number; excessDb: number | null; status: 'supported' | 'weak' | 'insufficient'}[];
    clockOffsets: {trackId: string; offset: number | null; deltaSeconds: number | null}[]; clockConsistent: boolean; distinctRivalMisfit: number | null; ambiguous: boolean};
  gridSpacingM: number; accepted: boolean; curveAccepted?: boolean; audioEvidence?: 'supported' | 'weak' | 'insufficient';
}
export interface GridCell {lat: number; lon: number; misfit: number; spacingM?: number}
export interface AudioValidation {
  method: 'off-curve-contrast/3'; sensitivity: number; minDurationSeconds: number; minTemporalExcessDb: number; minSupportedFraction: number; maxModelSamples: number; minContrastDb: number; minExcessDb: number;
  minSamples: number; minCoverage: number; shiftsBins: readonly number[]; calibrated: false;
}
export interface FitResult {
  audioValidation?: AudioValidation; sensitivityProfile?: Readonly<SensitivityProfile>;
  candidates: Candidate[]; grid: GridCell[]; cellM: number;
  tested: number; elapsedMs: number; warnings: string[];
  search?: {country?: import('./core/regions.js').CountryCode; mode: 'global'; flightsScanned: number; regionsRefined: number; maxDistanceKm: number; exhaustive: false};
}
export interface FlightDataset {
  flights: Flight[]; source: string; license: string; warnings: string[];
  synthetic: boolean; fetchedAt?: string;
  retrieval?: {global: true; complete: boolean; pages: number; from: number; to: number; rawFlights: number; omitted: number; reason?: string};
}
export interface Progress { phase: string; text: string; progress: number }
export type ProgressFn = (progress: Progress) => void;
export interface Coverage {first: string; last: string}

export type SoundKind = 'aircraft' | 'church_bell' | 'wind_turbine';
export interface SoundSignature {
  version: 'acoustic-signature/1'; spectrum: number[]; peaksHz: number[];
  onsetRate: number; modulationHz: number; periodicity: number; tonality: number;
}
export interface SoundDetection {
  kind: SoundKind; status: 'possible' | 'no_evidence'; evidence: string[];
  segments: {start: number; end: number; signature: SoundSignature}[];
}
export interface SoundScan {
  method: 'local-acoustic-screen/1'; calibrated: false;
  detections: SoundDetection[]; warnings: string[];
}
export interface AcousticReference {
  id: string; sourceId: string; kind: Exclude<SoundKind, 'aircraft'>;
  signature: SoundSignature; provenance: string; license: string;
  recordedAt?: string; synthetic: boolean;
}
export interface SoundSource {
  id: string; country: import('./core/regions.js').CountryCode;
  kind: Exclude<SoundKind, 'aircraft'> | 'airport'; provenance?: string; license?: string; name: string; lat: number; lon: number; url: string;
}
export interface SourceCatalog {
  schema: 'echotrace-sources/1'; country: import('./core/regions.js').CountryCode;
  source: string; license: string; fetchedAt: string; coverage: string;
  sources: SoundSource[]; references: AcousticReference[];
}
export interface SourceMatch {
  source: SoundSource; referenceId: string; distance: number; start: number; end: number;
  status: 'reference_similarity'; receiverLocationKnown: false;
}
