import { analyzeSignal, analyzeSignalAdaptive } from '../core/signal.js';
import { matchFlights } from '../core/matcher.js';
import { matchGlobalFlights } from '../core/global-search.js';
const scope = self;
scope.onmessage = (event) => {
    try {
        const progress = (data) => scope.postMessage({ type: 'progress', data });
        if (event.data.type === 'analyze') {
            const analyze = event.data.adaptive ? analyzeSignalAdaptive : analyzeSignal;
            const result = analyze(event.data.samples, event.data.sampleRate, progress, event.data.options);
            scope.postMessage({ type: 'analysis', data: result }, [result.db.buffer, result.waveform.buffer]);
        }
        else if (event.data.type === 'match') {
            const result = (event.data.config.global ? matchGlobalFlights : matchFlights)(event.data.tracks, event.data.flights, event.data.config, progress);
            scope.postMessage({ type: 'result', data: result });
        }
    }
    catch (error) {
        scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Analysen mislykkedes.' });
    }
};
