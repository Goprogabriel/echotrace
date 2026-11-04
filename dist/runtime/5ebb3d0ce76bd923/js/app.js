import { sourcesPage } from './pages/sources.js';
import { coveragePoints, filterCoverage, SOURCE_LAYERS } from './core/coverage.js';
import { loadCatalog, parseCatalog, mergeCatalogs, matchSources, referenceBundle } from './core/source-catalog.js';
import { getLanguage, getLocale, languageFromUrl, languageUrl, setLanguage, translateText, translateTree } from './i18n.js';
import { homePage } from './pages/home.js';
import { labPage } from './pages/lab.js';
import { docsPage } from './pages/docs.js';
import { initialState, isBusy } from './state.js';
import { captureMedia, decodeMedia, validateMedia } from './core/audio.js';
import { fetchFlights, importFlightFiles, parseDataset } from './core/data.js';
import { startReveals } from './components/ui.js';
import { drawIllustrationSpectrum, drawSpectrogram, drawWaveform, startHeroCanvas, spectrumBounds } from './components/visuals.js';
import { bindPlayback } from './components/playback.js';
import { mountMap } from './components/map.js';
import { sensitivitySummary, sensitivityPending } from './components/sensitivity.js';
import { selectTracksAfterAnalysis } from './core/tracks.js';
setLanguage(languageFromUrl(location.href));
const root = document.querySelector('#app');
const fileInput = document.querySelector('#media-input');
const catalogInput = document.querySelector('#catalog-input');
const referenceInput = document.querySelector('#reference-input');
const dataInput = document.querySelector('#data-input');
const sourcesView = { filter: { kinds: SOURCE_LAYERS.map(l => l.id), query: '', referencesOnly: false }, selectedId: null, page: 0 };
const sourcesMapView = { lat: 56.1, lon: 11.1, zoom: 6 };
let catalogLoad = null;
let sourcesMapFitted = false;
let state = initialState(), cleanups = [];
let worker = null, controller = new AbortController(), job = 0;
let currentToast = '';
let toastTimer;
let pcm = null;
let playback = { url: '', time: 0, playing: false };
const route = () => location.hash.split('?')[0] || '#/';
function toast(message) {
    currentToast = message;
    const el = document.querySelector('#toast');
    el.textContent = translateText(message);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 5500);
}
function render() {
    const previousMedia = root.querySelector('.video-frame video,.video-frame audio');
    if (previousMedia && previousMedia.readyState >= 1 && previousMedia.getAttribute('src') === state.blobUrl)
        playback = { url: state.blobUrl, time: previousMedia.currentTime || 0, playing: !previousMedia.paused && !previousMedia.ended };
    cleanups.forEach(fn => fn());
    cleanups = [];
    previousMedia?.pause();
    const r = route();
    root.innerHTML = r === '#/sources' ? sourcesPage(state, sourcesView) : r === '#/lab' ? labPage(state) : r === '#/privacy' ? docsPage('privacy') : r === '#/method' ? docsPage('method') : homePage();
    document.title = r === '#/sources' ? 'Datakilder — Echotrace' : r === '#/lab' ? 'Signal-lab — Echotrace' : r === '#/privacy' ? 'Privatliv — Echotrace' : r === '#/method' ? 'Metoden — Echotrace' : 'Echotrace — Find sporet i lyden';
    cleanups.push(startReveals(root));
    const hero = root.querySelector('#hero-canvas');
    if (hero)
        cleanups.push(startHeroCanvas(hero));
    const preview = root.querySelector('#preview-spectrum');
    if (preview) {
        const obs = new ResizeObserver(() => drawIllustrationSpectrum(preview));
        obs.observe(preview);
        cleanups.push(() => obs.disconnect());
        drawIllustrationSpectrum(preview);
    }
    const slider = root.querySelector('#doppler-slider');
    if (slider)
        slider.oninput = () => {
            const x = Number(slider.value) / 100 * 6000, vr = 100 * x / Math.hypot(x, 1800), hz = 130 * 343 / (343 + vr);
            root.querySelector('#doppler-hz').textContent = Math.round(hz).toString();
            root.querySelector('#demo-plane').style.left = `${15 + (Number(slider.value) + 100) / 200 * 70}%`;
        };
    if (r === '#/lab')
        initLab();
    if (r === '#/sources') {
        initSources();
        if (!state.catalog && !catalogLoad && !state.catalogError)
            void ensureCatalog();
    }
    document.documentElement.lang = getLanguage();
    document.title = translateText(document.title);
    const description = document.querySelector('meta[name="description"]');
    if (description) {
        const source = description.dataset.source || description.content;
        description.dataset.source = source;
        description.content = translateText(source);
    }
    document.querySelector('#toast').textContent = currentToast;
    translateTree(document.body);
}
function changeLanguage(language) {
    const fields = Array.from(root.querySelectorAll('input[name],select[name]'), el => ({ name: el.name, value: el.value, checked: el instanceof HTMLInputElement ? el.checked : false }));
    const details = Array.from(root.querySelectorAll('details'), el => el.open);
    setLanguage(language);
    history.replaceState(null, '', languageUrl(location.href, language));
    render();
    for (const field of fields) {
        const el = Array.from(root.querySelectorAll('input[name],select[name]')).find(el => el.name === field.name);
        if (el) {
            el.value = field.value;
            if (el instanceof HTMLInputElement)
                el.checked = field.checked;
        }
    }
    root.querySelectorAll('details').forEach((el, i) => el.open = details[i] || false);
    root.querySelector(`[data-language="${language}"]`)?.focus({ preventScroll: true });
}
function initSources() {
    const points = state.catalog ? filterCoverage(coveragePoints(state.catalog), sourcesView.filter) : [];
    const map = root.querySelector('#coverage-map');
    const select = (id, focus = false) => {
        sourcesView.selectedId = id;
        const source = points.find(p => p.id === id);
        if (focus && source) {
            sourcesMapView.lat = source.lat;
            sourcesMapView.lon = source.lon;
            sourcesMapView.zoom = Math.max(12, sourcesMapView.zoom);
        }
        render();
    };
    if (map)
        cleanups.push(mountMap(map, { config: { lat: 56.1, lon: 11.1, radiusKm: 50, global: true, startTime: 0, clockUncertainty: 0, receiverAltitudeM: 0, soundSpeed: 343 }, flights: [], candidates: [], grid: [], selected: 0, onSelect: () => { }, view: sourcesMapView, fitOnMount: !!state.catalog && !sourcesMapFitted, sourceLayer: { points, selectedId: sourcesView.selectedId, onSelect: id => select(id) } }));
    if (state.catalog)
        sourcesMapFitted = true;
    root.querySelectorAll('[data-source-kind]').forEach(input => input.addEventListener('change', () => {
        sourcesView.filter.kinds = SOURCE_LAYERS.filter(layer => root.querySelector(`[data-source-kind="${layer.id}"]`)?.checked).map(layer => layer.id);
        sourcesView.page = 0;
        render();
    }));
    root.querySelector('[name="coverage-references"]')?.addEventListener('change', e => { sourcesView.filter.referencesOnly = e.target.checked; sourcesView.page = 0; render(); });
    const query = root.querySelector('[name="coverage-query"]');
    let timer;
    query?.addEventListener('input', () => {
        sourcesView.filter.query = query.value;
        sourcesView.page = 0;
        clearTimeout(timer);
        timer = setTimeout(() => { render(); root.querySelector('[name="coverage-query"]')?.focus({ preventScroll: true }); }, 150);
    });
    cleanups.push(() => clearTimeout(timer));
    root.querySelector('[data-coverage-reset]')?.addEventListener('click', () => { sourcesView.filter = { kinds: SOURCE_LAYERS.map(l => l.id), query: '', referencesOnly: false }; sourcesView.selectedId = null; sourcesView.page = 0; render(); });
    root.querySelectorAll('[data-source-id]').forEach(button => button.addEventListener('click', () => select(button.dataset.sourceId, true)));
    root.querySelectorAll('[data-coverage-page]').forEach(button => button.addEventListener('click', () => { sourcesView.page = Number(button.dataset.coveragePage); render(); }));
}
function initLab() {
    const draw = () => {
        const spectrum = root.querySelector('#lab-spectrum');
        if (spectrum && state.analysis)
            drawSpectrogram(spectrum, state.analysis, undefined, state.spectrumView, state.selectedTracks);
        const wave = root.querySelector('#waveform'), values = state.analysis?.waveform || state.waveform;
        if (wave && values)
            drawWaveform(wave, values);
        const result = root.querySelector('#result-spectrum');
        if (result && state.analysis)
            drawSpectrogram(result, state.analysis, state.result?.candidates[state.selected]);
    };
    const observer = new ResizeObserver(draw);
    root.querySelectorAll('canvas').forEach(c => observer.observe(c));
    cleanups.push(() => observer.disconnect());
    draw();
    const media = root.querySelector('.video-frame video,.video-frame audio');
    if (media) {
        const plots = ['lab-spectrum', 'waveform', 'result-spectrum'].flatMap(id => {
            const canvas = root.querySelector(`#${id}`);
            if (!canvas)
                return [];
            return [{ canvas, window: () => id === 'lab-spectrum' ? { start: state.spectrumView.start, end: state.spectrumView.end || state.analysis?.duration || media.duration } : { start: 0, end: state.analysis?.duration || media.duration }, bounds: () => {
                        const r = canvas.getBoundingClientRect();
                        return id === 'waveform' ? { left: 0, top: 0, width: r.width, height: r.height } : spectrumBounds(r.width, r.height);
                    } }];
        });
        cleanups.push(bindPlayback(media, { plots, readouts: root.querySelectorAll('[data-playback-time]'), canSeek: () => !isBusy(state), savedTime: playback.url === state.blobUrl ? playback.time : 0, resume: playback.url === state.blobUrl && playback.playing, onPosition: (time, playing) => { playback = { url: state.blobUrl, time, playing }; } }));
    }
    root.querySelector('[name="view-gain"]')?.addEventListener('input', e => { state.spectrumView.gain = Number(e.target.value); draw(); });
    if (isBusy(state))
        root.querySelectorAll('#signal-controls input,#signal-controls select,#signal-controls button').forEach(el => el.disabled = true);
    if (state.result && state.config && state.dataset) {
        const map = root.querySelector('#result-map');
        const matchedIds = new Set(state.result.candidates.flatMap(c => c.matches.map(m => m.flightId)));
        if (map)
            cleanups.push(mountMap(map, { config: state.config, flights: state.dataset.flights.filter(f => matchedIds.has(f.id)), candidates: state.result.candidates, grid: state.result.grid, selected: state.selected, onSelect: i => { state.selected = i; render(); } }));
    }
    root.querySelector('#search-form')?.addEventListener('submit', e => { e.preventDefault(); void runMatching(); });
    if (isBusy(state))
        root.querySelectorAll('#search-form input,#search-form select,#search-form button').forEach(el => el.disabled = true);
}
function updateProgress(progress) {
    state.progress = progress;
    const text = root.querySelector('#progress-text');
    if (text)
        text.textContent = translateText(progress.text);
    const number = root.querySelector('#progress-percent');
    if (number)
        number.textContent = `${Math.round(progress.progress * 100)}%`;
    const bar = root.querySelector('#progress-bar');
    if (bar)
        bar.style.width = `${progress.progress * 100}%`;
}
function stopJob() { job++; controller.abort(); worker?.terminate(); worker = null; controller = new AbortController(); }
function cancel() {
    stopJob();
    state.stage = state.analysis ? 'ready' : 'idle';
    state.progress = { phase: 'cancelled', text: 'Analysen er annulleret', progress: 0 };
    state.error = '';
    render();
    toast('Beregningen er stoppet. Ingen video blev sendt.');
}
function navigateLab() {
    if (route() !== '#/lab')
        location.hash = '/lab';
    else
        render();
}
function fail(error, currentJob) {
    if (currentJob !== job)
        return;
    if (error instanceof DOMException && error.name === 'AbortError')
        return;
    worker?.terminate();
    worker = null;
    state.error = error instanceof Error ? error.message : 'Der opstod en uventet fejl.';
    state.stage = state.analysis ? 'ready' : 'error';
    state.progress = { phase: 'error', text: 'Beregningen er stoppet', progress: state.progress.progress };
    render();
}
async function analyzeFile(file, demo, capture = false) {
    stopJob();
    const id = job;
    try {
        validateMedia(file);
        if (!capture) {
            pcm = null;
            if (state.blobUrl)
                URL.revokeObjectURL(state.blobUrl);
            const sensitivity = state.sensitivity, catalog = state.catalog;
            state = initialState();
            state.catalog = catalog;
            state.sensitivity = sensitivity;
            state.file = file;
            state.blobUrl = URL.createObjectURL(file);
            if (demo) {
                state.demo = true;
                state.dataset = demo.dataset;
                state.config = { ...demo.config, global: true, country: 'DK' };
                state.consent = true;
                const c = demo.config;
                state.form = { date: new Date(c.startTime * 1000).toISOString().slice(0, 19), clock: String(c.clockUncertainty), altitude: String(c.receiverAltitudeM), sound: String(c.soundSpeed) };
            }
        }
        state.stage = 'decoding';
        state.error = '';
        state.canFallback = false;
        state.progress = { phase: 'decode', text: 'Åbner din optagelse lokalt', progress: .01 };
        navigateLab();
        render();
        const decoded = await (capture ? captureMedia(file, updateProgress, controller.signal) : decodeMedia(file, updateProgress, controller.signal));
        if (id !== job)
            return;
        pcm = decoded.samples.slice();
        state.decoded = { sampleRate: decoded.sampleRate, duration: decoded.duration, channels: decoded.channels, method: decoded.method, warnings: decoded.warnings };
        state.waveform = new Float32Array(700);
        for (let i = 0; i < decoded.samples.length; i++) {
            const k = Math.min(699, Math.floor(i * 700 / decoded.samples.length));
            state.waveform[k] = Math.max(state.waveform[k], Math.abs(decoded.samples[i]));
        }
        state.stage = 'analyzing';
        render();
        runSignalWorker(decoded, id);
    }
    catch (error) {
        if (id === job && error instanceof Error && error.message.includes('direkte'))
            state.canFallback = true;
        fail(error, id);
    }
}
function runSignalWorker(decoded, id, adaptive = true) {
    worker = new Worker(new URL('./workers/analysis.worker.js', import.meta.url), { type: 'module' });
    worker.onerror = () => fail(new Error('Analysearbejderen kunne ikke startes. Åbn appen via localhost eller HTTPS — ikke direkte som en file://-fil.'), id);
    worker.onmessage = (e) => {
        if (id !== job)
            return;
        if (e.data.type === 'progress')
            updateProgress(e.data.data);
        if (e.data.type === 'error')
            fail(new Error(e.data.message), id);
        if (e.data.type === 'analysis') {
            const previous = state.analysis?.tracks.length ? state.analysis.tracks.filter(t => state.selectedTracks.includes(t.id)) : null;
            state.scan = e.data.scan;
            state.sourceMatches = state.catalog ? matchSources(state.scan, state.catalog) : [];
            state.analysis = e.data.data;
            state.signalOptions.fftSize = state.analysis.fftSize;
            state.selectedTracks = selectTracksAfterAnalysis(previous, state.analysis.tracks);
            state.spectrumView = { start: 0, end: state.analysis.duration, minHz: state.analysis.minHz, maxHz: state.analysis.maxHz, gain: 0 };
            state.stage = 'ready';
            worker?.terminate();
            worker = null;
            render();
            if (state.demo && state.dataset?.synthetic && state.analysis.tracks.length)
                void runMatching();
            else {
                void ensureCatalog();
                root.querySelector('#sound-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };
    worker.postMessage({ type: 'analyze', samples: decoded.samples, sampleRate: decoded.sampleRate, options: { ...state.signalOptions, sensitivity: state.sensitivity }, adaptive }, [decoded.samples.buffer]);
}
function getConfig() {
    const f = state.form;
    if (!f.date)
        throw new Error('Angiv optagelsens starttid i UTC.');
    const date = Date.parse(`${f.date}Z`) / 1000;
    if (!Number.isFinite(date) || date < 946684800 || date > 4133980800)
        throw new Error('Angiv en gyldig optagelsestid mellem år 2000 og 2100.');
    const config = { global: true, lat: 56, lon: 10, radiusKm: 50, startTime: date, clockUncertainty: Number(f.clock), receiverAltitudeM: Number(f.altitude), soundSpeed: Number(f.sound), sensitivity: state.sensitivity };
    if (!Object.values(config).every(v => typeof v === 'boolean' || Number.isFinite(v)) || config.clockUncertainty < 0 || config.clockUncertainty > 60 || config.receiverAltitudeM < -400 || config.receiverAltitudeM > 9000 || config.soundSpeed < 300 || config.soundSpeed > 370)
        throw new Error('Kontrollér tidspunkt, urusikkerhed, mikrofonhøjde og lydhastighed.');
    config.country = 'DK';
    return config;
}
async function runMatching() {
    if (isBusy(state) || !state.analysis)
        return;
    stopJob();
    const id = job;
    try {
        if (sensitivityPending(state))
            throw new Error('Anvend den nye følsomhed og analysér lyden igen før søgningen.');
        const tracks = state.analysis.tracks.filter(t => state.selectedTracks.includes(t.id));
        if (!tracks.length || tracks.length > 3)
            throw new Error('Vælg mellem ét og tre tonale spor til søgningen.');
        if (!state.consent)
            throw new Error('Bekræft, at du har ret til at undersøge denne optagelse.');
        const config = getConfig();
        state.config = config;
        state.error = '';
        state.result = null;
        state.selected = 0;
        const previous = state.dataset?.retrieval;
        if (previous && (previous.from !== config.startTime - config.clockUncertainty - 450 || previous.to !== config.startTime + state.analysis.duration + config.clockUncertainty + 60))
            state.dataset = null;
        if (!state.dataset) {
            if (!state.network)
                throw new Error('Tillad forespørgslen til flytjenesten, eller importér lokale flydata. Din video bliver på enheden.');
            state.stage = 'fetching';
            state.progress = { phase: 'fetching', text: 'Henter flybaner verden over ved dit tidspunkt', progress: .02 };
            render();
            const dataset = await fetchFlights(config, state.analysis.duration, controller.signal, (pages, flights) => { if (id === job)
                updateProgress({ phase: 'fetching', text: `Henter globale flydata · ${pages} sider · ${flights.toLocaleString(getLocale())} flybaner`, progress: .02 }); });
            if (id !== job)
                return;
            state.dataset = dataset;
        }
        state.soundTab = 'aircraft';
        state.stage = 'matching';
        state.progress = { phase: 'matching', text: `Sammenligner ${tracks.length} spor med ${state.dataset.flights.length} flybaner`, progress: .02 };
        render();
        root.querySelector('.processing-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        worker = new Worker(new URL('./workers/analysis.worker.js', import.meta.url), { type: 'module' });
        worker.onerror = () => fail(new Error('Modelberegningen kunne ikke gennemføres i denne browser.'), id);
        worker.onmessage = (e) => {
            if (id !== job)
                return;
            if (e.data.type === 'progress')
                updateProgress(e.data.data);
            if (e.data.type === 'error')
                fail(new Error(e.data.message), id);
            if (e.data.type === 'result') {
                state.result = e.data.data;
                state.stage = 'done';
                worker?.terminate();
                worker = null;
                render();
                void ensureCatalog();
                root.querySelector('#results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
        worker.postMessage({ type: 'match', tracks, flights: state.dataset.flights, config, analysis: state.analysis });
    }
    catch (error) {
        fail(error, id);
    }
}
async function loadDemo() {
    if (isBusy(state))
        cancel();
    toast('Åbner den medfølgende testoptagelse. Alle beregninger kører lokalt.');
    try {
        const [media, data, session] = await Promise.all([fetch('./assets/demo.mp4').then(r => { if (!r.ok)
                throw new Error('Testvideoen mangler.'); return r.blob(); }), fetch('./examples/demo-flights.json').then(r => r.json()), fetch('./examples/demo-session.json').then(r => r.json())]);
        await analyzeFile(new File([media], 'echotrace-synthetic-demo.mp4', { type: 'video/mp4' }), { dataset: parseDataset(data), config: session });
    }
    catch (error) {
        toast(error instanceof Error ? error.message : 'Demoen kunne ikke åbnes.');
    }
}
async function loadSoundDemo(kind) {
    try {
        const name = `synthetic-${kind}`, response = await fetch(`./assets/${name}.wav`);
        if (!response.ok)
            throw new Error('Testlyden mangler.');
        await analyzeFile(new File([await response.blob()], `${name}.wav`, { type: 'audio/wav' }));
        state.demo = true;
        render();
    }
    catch (error) {
        toast(error instanceof Error ? error.message : 'Testlyden kunne ikke åbnes.');
    }
}
function exportReport() {
    if (!state.result || !state.config || !state.analysis)
        return;
    const report = { schema: 'echotrace-report/3', language: getLanguage(), engineVersion: '0.2.0', country: 'DK', soundScan: state.scan, sourceMatches: state.sourceMatches, exportedAt: new Date().toISOString(), synthetic: state.demo || state.dataset?.synthetic,
        disclaimer: translateText('Eksperimentelle hypoteser, ikke bekræftede placeringer. Fejlmål er frekvensafvigelser, ikke sandsynligheder. Ingen kalibreret lokationspræcision. Brug ikke rapporten til at identificere en person.'),
        file: { name: state.file?.name, size: state.file?.size, type: state.file?.type }, decoding: state.decoded ? { ...state.decoded, method: translateText(state.decoded.method), warnings: state.decoded.warnings.map(translateText) } : null, search: { mode: 'global', sensitivity: state.config.sensitivity ?? 50, startTime: state.config.startTime, country: 'DK', clockUncertainty: state.config.clockUncertainty, receiverAltitudeM: state.config.receiverAltitudeM, soundSpeed: state.config.soundSpeed },
        signal: { sensitivity: state.analysis.sensitivity ?? 50, duration: state.analysis.duration, sampleRate: state.analysis.sampleRate, fftSize: state.analysis.fftSize, hopSize: state.analysis.hopSize, resolutionAttempts: state.analysis.resolutionAttempts, minHz: state.analysis.minHz, maxHz: state.analysis.maxHz, tracks: state.analysis.tracks, selectedTracks: state.selectedTracks, warnings: state.analysis.warnings.map(translateText) },
        data: { source: state.dataset?.source, license: state.dataset?.license, fetchedAt: state.dataset?.fetchedAt, flightCount: state.dataset?.flights.length, retrieval: state.dataset?.retrieval, warnings: state.dataset?.warnings.map(translateText) }, result: { ...state.result, warnings: state.result.warnings.map(translateText) } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `echotrace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Rapporten indeholder tid og kandidatområder. Del den med omtanke.');
}
function invalidateResult() { state.result = null; state.stage = state.analysis ? 'ready' : state.stage; state.error = ''; }
function signalAction(action) {
    const a = state.analysis;
    if (!a || isBusy(state))
        return;
    const value = (name) => { const el = root.querySelector(`[name="${name}"]`); return el?.value.trim() ? Number(el.value) : NaN; };
    try {
        if (action === 'spectrum-view') {
            const start = value('view-start'), end = value('view-end'), minHz = value('view-min'), maxHz = value('view-max');
            if (![start, end, minHz, maxHz].every(Number.isFinite) || start < 0 || end > a.duration || end - start < 1 || minHz < a.minHz || maxHz > a.maxHz || maxHz - minHz < 5)
                throw new Error('Vælg mindst 1 sekund og 5 Hz inden for den analyserede tid og frekvens.');
            state.spectrumView = { ...state.spectrumView, start, end, minHz, maxHz };
        }
        else if (action === 'spectrum-reset')
            state.spectrumView = { start: 0, end: a.duration, minHz: a.minHz, maxHz: a.maxHz, gain: 0 };
        else if (action === 'reanalyze' || action === 'sensitivity-apply') {
            if (!pcm || !state.decoded)
                throw new Error('Åbn optagelsen igen for at genanalysere.');
            const fftSize = action === 'sensitivity-apply' ? state.signalOptions.fftSize : value('signal-fft'), minHz = action === 'sensitivity-apply' ? state.signalOptions.minHz : value('signal-min'), maxHz = action === 'sensitivity-apply' ? state.signalOptions.maxHz : value('signal-max');
            if (![8192, 16384, 32768].includes(fftSize) || ![minHz, maxHz].every(Number.isFinite) || minHz < 20 || maxHz > 2000 || maxHz - minHz < 20)
                throw new Error('Vælg et analysebånd inden for 20–2000 Hz, mindst 20 Hz bredt.');
            stopJob();
            state.signalOptions = { fftSize, minHz, maxHz };
            invalidateResult();
            state.stage = 'analyzing';
            state.progress = { phase: 'spectrum', text: 'Genanalyserer den lokale lyd', progress: .01 };
            render();
            runSignalWorker({ ...state.decoded, samples: pcm.slice() }, job, action === 'sensitivity-apply');
            return;
        }
        render();
    }
    catch (error) {
        toast(error instanceof Error ? error.message : 'Kontrollér lydindstillingerne.');
    }
}
root.addEventListener('click', e => {
    const target = e.target.closest('[data-action],[data-scroll],[data-candidate],[data-track-zoom],[data-language],[data-bell-seek]');
    if (!target)
        return;
    if (target.hasAttribute('disabled'))
        return;
    if (target.dataset.bellSeek !== undefined) {
        if (isBusy(state))
            return;
        const media = root.querySelector('.video-frame video,.video-frame audio');
        if (media && Number.isFinite(Number(target.dataset.bellSeek))) {
            media.currentTime = Number(target.dataset.bellSeek);
            media.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    if (target.dataset.language === 'da' || target.dataset.language === 'en') {
        changeLanguage(target.dataset.language);
        return;
    }
    if (target.closest('#signal-controls')) {
        if (isBusy(state))
            return;
        if (target.dataset.trackZoom && state.analysis) {
            const t = state.analysis.tracks.find(t => t.id === target.dataset.trackZoom);
            if (!t)
                return;
            const margin = Math.max(10, Math.abs(t.driftHz) * .2), hz = t.points.map(p => p.hz);
            state.spectrumView = { ...state.spectrumView, start: Math.max(0, t.start - 2), end: Math.min(state.analysis.duration, t.end + 2), minHz: Math.max(state.analysis.minHz, Math.min(...hz) - margin), maxHz: Math.min(state.analysis.maxHz, Math.max(...hz) + margin) };
            render();
            return;
        }
        if (target.dataset.action) {
            signalAction(target.dataset.action);
            return;
        }
    }
    if (target.dataset.scroll) {
        const go = () => root.querySelector(`#${target.dataset.scroll}`)?.scrollIntoView({ behavior: 'smooth' });
        if (route() !== '#/') {
            location.hash = '/';
            setTimeout(go, 20);
        }
        else
            go();
        return;
    }
    if (target.dataset.candidate !== undefined) {
        state.selected = Number(target.dataset.candidate);
        render();
        return;
    }
    switch (target.dataset.action) {
        case 'aircraft':
            state.soundTab = 'aircraft';
            render();
            root.querySelector('#search-section')?.scrollIntoView({ behavior: 'smooth' });
            break;
        case 'import-catalog':
            catalogInput.value = '';
            catalogInput.click();
            break;
        case 'retry-catalog':
            void ensureCatalog();
            break;
        case 'filter-sources':
            render();
            root.querySelector('.source-panel details').open = true;
            break;
        case 'reference-audio':
            if (!state.form['reference-source'] || !state.form['reference-provenance']?.trim() || !state.form['reference-license']?.trim() || state.form['reference-consent'] !== 'yes') {
                toast('Vælg en kirke, angiv ophav og licens, og bekræft retten til referencen.');
                break;
            }
            referenceInput.value = '';
            referenceInput.click();
            break;
        case 'scan-report':
            downloadJson({ schema: 'echotrace-sound-report/1', country: 'DK', synthetic: state.demo, exportedAt: new Date().toISOString(), scan: state.scan, matches: state.sourceMatches, catalog: state.catalog ? { source: state.catalog.source, license: state.catalog.license, fetchedAt: state.catalog.fetchedAt, coverage: state.catalog.coverage, references: state.catalog.references } : null }, 'echotrace-lydrapport.json');
            break;
        case 'sensitivity-apply':
            signalAction('sensitivity-apply');
            break;
        case 'upload':
            fileInput.value = '';
            fileInput.click();
            break;
        case 'demo':
            void loadDemo();
            break;
        case 'demo-bells':
            void loadSoundDemo('bells');
            break;
        case 'demo-turbine':
            void loadSoundDemo('turbine');
            break;
        case 'cancel':
            cancel();
            break;
        case 'capture':
            if (state.file)
                void analyzeFile(state.file, undefined, true);
            break;
        case 'import':
            dataInput.value = '';
            dataInput.click();
            break;
        case 'clear-data':
            state.dataset = null;
            state.network = false;
            render();
            break;
        case 'report':
            exportReport();
            break;
        case 'reconfigure':
            state.result = null;
            state.stage = 'ready';
            render();
            root.querySelector('#search-section')?.scrollIntoView({ behavior: 'smooth' });
            break;
    }
});
root.addEventListener('input', e => {
    const el = e.target;
    if (el.closest('#coverage-controls'))
        return;
    if (el.name === 'sensitivity') {
        if (isBusy(state))
            return;
        state.sensitivity = Number(el.value);
        const output = root.querySelector('#sensitivity-value');
        if (output)
            output.textContent = `${state.sensitivity} / 100`;
        const summary = root.querySelector('#sensitivity-summary');
        if (summary)
            summary.textContent = translateText(sensitivitySummary(state.sensitivity));
        return;
    }
    if (el.closest('#signal-controls'))
        return;
    if (!el.name)
        return;
    if (el.name === 'reference-consent' || el.name === 'reference-synthetic')
        state.form[el.name] = el.checked ? 'yes' : 'no';
    else if (el.name === 'consent')
        state.consent = el.checked;
    else if (el.name === 'network')
        state.network = el.checked;
    else
        state.form[el.name] = el.value;
});
root.addEventListener('change', e => {
    const el = e.target;
    if (el.closest('#coverage-controls'))
        return;
    if (el.name === 'sensitivity') {
        if (isBusy(state))
            return;
        state.sensitivity = Number(el.value);
        invalidateResult();
        render();
        root.querySelector('#sensitivity')?.focus({ preventScroll: true });
        return;
    }
    if (!el.dataset.track || isBusy(state))
        return;
    if (el.checked && state.selectedTracks.length >= 3) {
        el.checked = false;
        toast('Vælg højst tre spor ad gangen.');
        return;
    }
    state.selectedTracks = el.checked ? [...state.selectedTracks, el.dataset.track] : state.selectedTracks.filter(id => id !== el.dataset.track);
    invalidateResult();
    render();
});
root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'dropzone') {
    e.preventDefault();
    fileInput.click();
} });
fileInput.onchange = () => { if (fileInput.files?.[0])
    void analyzeFile(fileInput.files[0]); };
dataInput.onchange = async () => {
    const files = Array.from(dataInput.files || []);
    if (!files.length)
        return;
    const importJob = job;
    try {
        const dataset = await importFlightFiles(files);
        if (importJob !== job)
            return;
        state.dataset = dataset;
        invalidateResult();
        render();
        toast(`${state.dataset.flights.length} flybaner indlæst lokalt.`);
    }
    catch (error) {
        if (importJob !== job)
            return;
        state.error = error instanceof Error ? error.message : 'Data kunne ikke indlæses.';
        render();
    }
};
function downloadJson(value, name) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function ensureCatalog() {
    if (state.catalog)
        return Promise.resolve();
    if (catalogLoad)
        return catalogLoad;
    catalogLoad = (async () => {
        try {
            const catalog = await loadCatalog('DK');
            state.catalog = state.catalog ? mergeCatalogs(catalog, state.catalog) : catalog;
            state.catalogError = '';
            state.sourceMatches = state.scan ? matchSources(state.scan, state.catalog) : [];
        }
        catch (error) {
            state.catalogError = error instanceof Error ? error.message : 'Kataloget kunne ikke indlæses.';
        }
        finally {
            catalogLoad = null;
            render();
        }
    })();
    return catalogLoad;
}
catalogInput.onchange = async () => {
    const file = catalogInput.files?.[0], current = job;
    if (!file)
        return;
    try {
        if (file.size > 15_000_000)
            throw new Error('Kataloget må højst fylde 15 MB.');
        const imported = parseCatalog(JSON.parse(await file.text()));
        if (current !== job)
            return;
        state.catalog = state.catalog ? mergeCatalogs(state.catalog, imported) : imported;
        state.catalogError = '';
        state.sourceMatches = state.scan ? matchSources(state.scan, state.catalog) : [];
        render();
    }
    catch (error) {
        if (current === job) {
            state.catalogError = error instanceof Error ? error.message : 'Ugyldigt katalog.';
            render();
        }
    }
};
referenceInput.onchange = async () => {
    const file = referenceInput.files?.[0], source = state.catalog?.sources.find(s => s.id === state.form['reference-source']);
    if (!file || !source || isBusy(state))
        return;
    stopJob();
    const current = job;
    state.stage = 'analyzing';
    state.progress = { phase: 'reference', text: 'Analyserer referenceoptagelsen lokalt', progress: .05 };
    render();
    try {
        const decoded = await decodeMedia(file, updateProgress, controller.signal);
        if (current !== job)
            return;
        worker = new Worker(new URL('./workers/analysis.worker.js', import.meta.url), { type: 'module' });
        worker.onerror = () => fail(new Error('Referenceanalysen kunne ikke startes.'), current);
        worker.onmessage = e => {
            if (current !== job)
                return;
            if (e.data.type === 'error') {
                fail(new Error(e.data.message), current);
                return;
            }
            if (e.data.type !== 'signature')
                return;
            try {
                const reference = { id: `local-${crypto.randomUUID()}`, sourceId: source.id, kind: 'church_bell', signature: e.data.data, provenance: state.form['reference-provenance'], license: state.form['reference-license'], synthetic: state.form['reference-synthetic'] === 'yes' };
                const bundle = referenceBundle(source, reference);
                state.catalog = state.catalog ? mergeCatalogs(state.catalog, bundle) : bundle;
                state.sourceMatches = state.scan ? matchSources(state.scan, state.catalog) : [];
                worker?.terminate();
                worker = null;
                state.stage = state.result ? 'done' : 'ready';
                render();
                downloadJson(bundle, 'echotrace-reference.json');
                toast('Referencen er tilføjet lokalt og eksporteret.');
            }
            catch (error) {
                fail(error, current);
            }
        };
        worker.postMessage({ type: 'signature', samples: decoded.samples, sampleRate: decoded.sampleRate }, [decoded.samples.buffer]);
    }
    catch (error) {
        fail(error, current);
    }
};
window.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes('Files')) {
    e.preventDefault();
    document.body.classList.add('file-drag');
} });
window.addEventListener('dragleave', e => { if (!e.relatedTarget)
    document.body.classList.remove('file-drag'); });
window.addEventListener('drop', e => { e.preventDefault(); document.body.classList.remove('file-drag'); if (e.dataTransfer?.files[0])
    void analyzeFile(e.dataTransfer.files[0]); });
window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0 }); });
window.addEventListener('beforeunload', () => { controller.abort(); worker?.terminate(); if (state.blobUrl)
    URL.revokeObjectURL(state.blobUrl); });
render();
