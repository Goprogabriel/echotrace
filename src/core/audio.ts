import type {DecodedAudio, ProgressFn} from '../types.js';
export const MAX_MEDIA_BYTES = 150 * 1024 * 1024;
export const MAX_DURATION = 180;
export function validateMedia(file: File): void {
  if (!file.size) throw new Error('Filen er tom.');
  if (file.size > MAX_MEDIA_BYTES) throw new Error('Filen er for stor. Brug et klip på højst 150 MB og 3 minutter.');
  if (!/\.(mp4|mov|m4v|webm|wav|mp3|m4a|ogg|flac|aac)$/i.test(file.name) && !/^(video|audio)\//.test(file.type)) throw new Error('Vælg en video- eller lydfil, fx MP4, MOV, WebM eller WAV.');
}
export async function decodeMedia(file: File, progress: ProgressFn, signal: AbortSignal): Promise<DecodedAudio> {
  validateMedia(file);
  progress({phase: 'decode', text: 'Åbner lydsporet på din enhed', progress: .02});
  if (!('OfflineAudioContext' in window)) throw new Error('Browseren understøtter ikke lokal lydafkodning. Prøv en nyere Chrome, Edge eller Safari.');
  const context = new OfflineAudioContext(1, 1, 8000);
  const bytes = await file.arrayBuffer();
  if (signal.aborted) throw new DOMException('Annulleret', 'AbortError');
  let decoded: AudioBuffer;
  try { decoded = await context.decodeAudioData(bytes); }
  catch { throw new Error('Browseren kan ikke åbne dette lydformat direkte. Prøv “Udtræk under afspilning”, eller vælg en WAV/MP4 med understøttet lyd.'); }
  if (signal.aborted) throw new DOMException('Annulleret', 'AbortError');
  if (decoded.duration > MAX_DURATION + .1) throw new Error('Optagelsen er længere end 3 minutter. Klip den ned først, så analysen ikke overbelaster din browser.');
  if (decoded.duration < 5) throw new Error('Vælg en optagelse med mindst 5 sekunders lyd.');
  // Use the strongest channel: averaging opposite-polarity stereo can cancel a useful low tone.
  let best = 0, energy = -1;
  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const values = decoded.getChannelData(ch); let e = 0;
    for (let i = 0; i < values.length; i += 8) e += values[i] * values[i];
    if (e > energy) {energy = e; best = ch;}
  }
  return {samples: decoded.getChannelData(best).slice(), sampleRate: decoded.sampleRate, duration: decoded.duration,
    channels: decoded.numberOfChannels, method: 'Web Audio · lokal afkodning', warnings: decoded.numberOfChannels > 1 ? [`Kanal ${best + 1} med højest energi blev analyseret; stereo er ikke blandet sammen.`] : []};
}
/** Explicit user-triggered, silent local playback fallback; does not access a microphone. */
export async function captureMedia(file: File, progress: ProgressFn, signal: AbortSignal): Promise<DecodedAudio> {
  validateMedia(file);
  const audio = new AudioContext();
  await audio.resume(); // Called directly from a user click, before any asynchronous decoding.
  if (!audio.audioWorklet) { await audio.close(); throw new Error('Afspilningsudtræk kræver HTTPS eller localhost og AudioWorklet.'); }
  const media = document.createElement('video');
  media.playsInline = true; media.preload = 'auto'; media.src = URL.createObjectURL(file);
  const chunks: Float32Array[] = [];
  let node: AudioWorkletNode | undefined, count = 0;
  try {
    await audio.audioWorklet.addModule(new URL('../workers/capture-worklet.js', import.meta.url));
    if (media.readyState < 1) await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Videoformatet kunne ikke åbnes.')), 10000);
      media.onloadedmetadata = () => { clearTimeout(timer); resolve(); };
      media.onerror = () => { clearTimeout(timer); reject(new Error('Browseren kan ikke afspille dette videoformat.')); };
    });
    if (!Number.isFinite(media.duration) || media.duration > MAX_DURATION || media.duration < 5) throw new Error('Afspilningsudtræk kræver et klip på 5–180 sekunder.');
    node = new AudioWorkletNode(audio, 'local-pcm-capture');
    const source = audio.createMediaElementSource(media); source.connect(node); node.connect(audio.destination);
    node.port.onmessage = e => {
      if (e.data instanceof Float32Array) { count += e.data.length; if (count <= audio.sampleRate * 183) chunks.push(e.data); }
    };
    await new Promise<void>((resolve, reject) => {
      const abort = () => { cleanup(); reject(new DOMException('Annulleret', 'AbortError')); };
      const timeout = setTimeout(() => { cleanup(); reject(new Error('Afspilning gik i stå. Hold fanen åben, eller brug WAV.')); }, (media.duration + 30) * 1000);
      const cleanup = () => { clearTimeout(timeout); signal.removeEventListener('abort', abort); };
      signal.addEventListener('abort', abort, {once: true});
      if (signal.aborted) {abort(); return;}
      media.ontimeupdate = () => progress({phase: 'capture', text: `Udtrækker lyd under lydløs afspilning · ${Math.floor(media.currentTime)} / ${Math.ceil(media.duration)} s`, progress: .02 + .08 * media.currentTime / media.duration});
      media.onended = () => {cleanup(); node?.port.postMessage('flush'); setTimeout(resolve, 80);};
      node?.port.postMessage('start');
      media.play().catch(e => {cleanup(); reject(e);});
    });
    if (!chunks.length) throw new Error('Intet lydspor kunne udtrækkes.');
    const pcm = new Float32Array(chunks.reduce((s, c) => s + c.length, 0));
    let index = 0; for (const chunk of chunks) {pcm.set(chunk, index); index += chunk.length;}
    const off = new OfflineAudioContext(1, Math.ceil(pcm.length / audio.sampleRate * 8000), 8000);
    const buffer = off.createBuffer(1, pcm.length, audio.sampleRate); buffer.copyToChannel(pcm, 0);
    const offlineSource = off.createBufferSource(); offlineSource.buffer = buffer; offlineSource.connect(off.destination); offlineSource.start();
    const rendered = await off.startRendering();
    return {samples: rendered.getChannelData(0).slice(), sampleRate: 8000, duration: rendered.duration, channels: 1,
      method: 'AudioWorklet · lydløst afspilningsudtræk', warnings: ['Lyd udtrukket under realtidsafspilning. Startforsinkelse og browser-timing kan forskyde lydens tidsakse; tillad urusikkerhed. Hold fanen i forgrunden.']};
  } finally {media.pause(); URL.revokeObjectURL(media.src); media.removeAttribute('src'); media.load(); node?.disconnect(); await audio.close();}
}
