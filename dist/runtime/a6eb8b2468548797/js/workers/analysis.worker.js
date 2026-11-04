import { diagnoseFlights } from '../core/flight-diagnostics.js';
import { screenSounds, signature } from '../core/sound-scan.js';
import { analyzeSignal, analyzeSignalAdaptive } from '../core/signal.js';
import { validateSpectralSupport } from '../core/spectral-support.js';
import { matchFlights } from '../core/matcher.js';
import { matchGlobalFlights } from '../core/global-search.js';
const scope = self;
scope.onmessage = (event) => {
    try {
        const progress = (data) => scope.postMessage({ type: 'progress', data });
        if (event.data.type === 'signature') {
            const samples = event.data.samples, sr = event.data.sampleRate;
            const result = signature(samples, sr, 0, Math.min(20, samples.length / sr));
            if (result.peaksHz.length < 3 || result.onsetRate < .09 || result.tonality < .45)
                throw new Error('Referencens første 20 sekunder skal indeholde flere tydelige klokkeslag.');
            scope.postMessage({ type: 'signature', data: result });
        }
        else if (event.data.type === 'analyze') {
            const analyze = event.data.adaptive ? analyzeSignalAdaptive : analyzeSignal;
            const result = analyze(event.data.samples, event.data.sampleRate, progress, event.data.options);
            const scan = screenSounds(event.data.samples, event.data.sampleRate, result);
            scope.postMessage({ type: 'analysis', data: result, scan }, [result.db.buffer, result.waveform.buffer]);
        }
        else if (event.data.type === 'match') {
            const started = performance.now();
            const result = (event.data.config.global ? matchGlobalFlights : matchFlights)(event.data.tracks, event.data.flights, event.data.config, progress);
            if (event.data.analysis)
                validateSpectralSupport(result, event.data.analysis, { flights: event.data.flights, tracks: event.data.tracks, config: event.data.config });
            if (event.data.analysis)
                diagnoseFlights(result, event.data.analysis, { flights: event.data.flights, tracks: event.data.tracks, config: event.data.config });
            result.elapsedMs = performance.now() - started;
            scope.postMessage({ type: 'result', data: result });
        }
    }
    catch (error) {
        scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Analysen mislykkedes.' });
    }
};
