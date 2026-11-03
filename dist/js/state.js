export const isBusy = (state) => ['decoding', 'analyzing', 'fetching', 'matching'].includes(state.stage);
export function initialState() {
    return { file: null, blobUrl: '', stage: 'idle', error: '', progress: { phase: 'idle', text: 'Klar til en optagelse', progress: 0 }, analysis: null, dataset: null, result: null, decoded: null, config: null,
        form: { date: '', clock: '0', altitude: '0', sound: '343' }, consent: false, network: false, waveform: null, demo: false, canFallback: false, selected: 0,
        signalOptions: { fftSize: 8192, minHz: 30, maxHz: 1000 }, spectrumView: { start: 0, end: 0, minHz: 30, maxHz: 1000, gain: 0 }, selectedTracks: [] };
}
