export const isBusy = (state) => ['decoding', 'analyzing', 'fetching', 'matching'].includes(state.stage);
export function initialState() {
    return { file: null, blobUrl: '', stage: 'idle', error: '', progress: { phase: 'idle', text: 'Klar til en optagelse', progress: 0 }, analysis: null, dataset: null, result: null, decoded: null, config: null,
        form: { date: '', lat: '', lon: '', radius: '10', clock: '10', altitude: '0', sound: '343' }, consent: false, network: false, waveform: null, demo: false, canFallback: false, selected: 0 };
}
