export interface RidgePoint { t: number; hz: number; snr: number }
export interface Ridge {
  id: string; points: RidgePoint[]; coverage: number; driftHz: number;
  medianSnr: number; start: number; end: number;
  source?: 'auto' | 'manual';
  anchors?: {t: number; hz: number}[];
}
export interface SignalOptions { fftSize: number; minHz: number; maxHz: number }
export interface SpectrumView { start: number; end: number; minHz: number; maxHz: number; gain: number }
export interface SignalAnalysis {
  resolutionAttempts?: number[];
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
  lat: number; lon: number; radiusKm: number; startTime: number; global?: boolean;
  clockUncertainty: number; receiverAltitudeM: number; soundSpeed: number;
}
export interface Match {
  trackId: string; flightId: string; callsign: string; sourceHz: number;
  relativeRmse: number; coverage: number; improvement: number;
  spectralSupport?: {contrastDb: number; coverage: number; samples: number; controlContrastDb?: number; excessDb?: number; controls?: number; status?: 'supported' | 'weak' | 'insufficient'};
  predicted: {t: number; hz: number}[];
}
export interface Candidate {
  lat: number; lon: number; offset: number; misfit: number;
  improvement: number; matches: Match[]; matchedFlights: number;
  gridSpacingM: number; accepted: boolean; curveAccepted?: boolean; audioEvidence?: 'supported' | 'weak' | 'insufficient';
}
export interface GridCell {lat: number; lon: number; misfit: number; spacingM?: number}
export interface AudioValidation {
  method: 'off-curve-contrast/1'; minContrastDb: number; minExcessDb: number;
  minSamples: number; minCoverage: number; shiftsBins: readonly number[]; calibrated: false;
}
export interface FitResult {
  audioValidation?: AudioValidation;
  candidates: Candidate[]; grid: GridCell[]; cellM: number;
  tested: number; elapsedMs: number; warnings: string[];
  search?: {mode: 'global'; flightsScanned: number; regionsRefined: number; maxDistanceKm: number; exhaustive: false};
}
export interface FlightDataset {
  flights: Flight[]; source: string; license: string; warnings: string[];
  synthetic: boolean; fetchedAt?: string;
  retrieval?: {global: true; complete: boolean; pages: number; from: number; to: number; rawFlights: number; omitted: number; reason?: string};
}
export interface Progress { phase: string; text: string; progress: number }
export type ProgressFn = (progress: Progress) => void;
export interface Coverage {first: string; last: string}
