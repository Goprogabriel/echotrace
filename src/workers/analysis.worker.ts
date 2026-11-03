import {analyzeSignal} from '../core/signal.js';
import {matchFlights} from '../core/matcher.js';
import type {Flight, Ridge, SearchConfig, SignalOptions} from '../types.js';
const scope = self as unknown as {onmessage: ((event: MessageEvent) => void) | null; postMessage: (data: unknown, transfer?: Transferable[]) => void};
scope.onmessage = (event: MessageEvent) => {
  try {
    const progress = (data: unknown) => scope.postMessage({type: 'progress', data});
    if (event.data.type === 'analyze') {
      const result = analyzeSignal(event.data.samples as Float32Array, event.data.sampleRate as number, progress, event.data.options as SignalOptions | undefined);
      scope.postMessage({type: 'analysis', data: result}, [result.db.buffer, result.waveform.buffer]);
    } else if (event.data.type === 'match') {
      const result = matchFlights(event.data.tracks as Ridge[], event.data.flights as Flight[], event.data.config as SearchConfig, progress);
      scope.postMessage({type: 'result', data: result});
    }
  } catch (error) { scope.postMessage({type: 'error', message: error instanceof Error ? error.message : 'Analysen mislykkedes.'}); }
};
