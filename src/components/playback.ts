import {clamp} from '../core/math.js';

interface TimelinePlot {
  canvas: HTMLCanvasElement;
  window: () => {start: number; end: number};
  bounds: () => {left: number; top: number; width: number; height: number};
}
interface PlaybackOptions {
  plots: TimelinePlot[];
  readouts: NodeListOf<HTMLElement>;
  canSeek: () => boolean;
  savedTime: number;
  resume: boolean;
  onPosition: (time: number, playing: boolean) => void;
}
export function formatPlaybackTime(time: number): string {
  const tenths = Math.max(0, Math.floor(time * 10 + .00001));
  return `${Math.floor(tenths / 600).toString().padStart(2, '0')}:${(Math.floor(tenths / 10) % 60).toString().padStart(2, '0')}.${tenths % 10}`;
}
/** Lightweight DOM cursors: playback never reruns FFT or repaints the spectrogram. */
export function bindPlayback(media: HTMLMediaElement, options: PlaybackOptions): () => void {
  let raf = 0, disposed = false, restored = false;
  const removers: (() => void)[] = [];
  const listen = (target: EventTarget, type: string, listener: EventListener, eventOptions?: AddEventListenerOptions): void => {
    target.addEventListener(type, listener, eventOptions); removers.push(() => target.removeEventListener(type, listener, eventOptions));
  };
  const markers = options.plots.map(plot => {
    const cursor = document.createElement('span'); cursor.className = 'playback-cursor'; cursor.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'); label.className = 'playback-cursor-label'; cursor.append(label);
    plot.canvas.parentElement!.append(cursor);
    const canvas = plot.canvas, oldRole = canvas.getAttribute('role'), oldTab = canvas.getAttribute('tabindex');
    canvas.setAttribute('role', 'slider'); canvas.tabIndex = 0;
    canvas.setAttribute('aria-valuemin', '0');
    canvas.title = 'Klik eller træk for at spole. Piletaster: 1 sekund. Shift + piletast: 10 sekunder. Rul vandret eller Shift + rul for at spole.';
    let pointer: number | null = null;
    const seek = (time: number): void => {
      if (!options.canSeek() || media.readyState < 1 || !Number.isFinite(media.duration)) return;
      media.currentTime = clamp(time, 0, media.duration); sync();
    };
    const seekPointer = (e: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect(), b = plot.bounds(), range = plot.window();
      if (b.width <= 0 || range.end <= range.start) return;
      seek(range.start + clamp((e.clientX - rect.left - b.left) / b.width, 0, 1) * (range.end - range.start));
    };
    listen(canvas, 'pointerdown', ((e: PointerEvent) => {
      if (!options.canSeek() || e.button !== 0 || media.readyState < 1) return;
      const rect = canvas.getBoundingClientRect(), b = plot.bounds();
      if (e.clientX < rect.left + b.left || e.clientX > rect.left + b.left + b.width || e.clientY < rect.top + b.top || e.clientY > rect.top + b.top + b.height) return;
      e.preventDefault(); canvas.focus({preventScroll: true}); pointer = e.pointerId; canvas.setPointerCapture(pointer); seekPointer(e);
    }) as EventListener);
    listen(canvas, 'pointermove', ((e: PointerEvent) => {if (pointer === e.pointerId) seekPointer(e);}) as EventListener);
    listen(canvas, 'pointerup', ((e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      seekPointer(e); if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer); pointer = null;
    }) as EventListener);
    listen(canvas, 'pointercancel', (() => {pointer = null;}) as EventListener);
    listen(canvas, 'wheel', ((e: WheelEvent) => {
      if (!options.canSeek() || e.ctrlKey || e.metaKey || (!e.deltaX && !e.shiftKey)) return;
      const b = plot.bounds(), range = plot.window();
      if (b.width <= 0) return;
      e.preventDefault(); seek(media.currentTime + (e.deltaX || e.deltaY) * (range.end - range.start) / b.width);
    }) as EventListener, {passive: false});
    listen(canvas, 'keydown', ((e: KeyboardEvent) => {
      if (!options.canSeek()) return;
      const moves: Record<string, number> = {ArrowLeft: -1, ArrowRight: 1, PageDown: -10, PageUp: 10};
      if (e.key in moves) {e.preventDefault(); seek(media.currentTime + moves[e.key] * (e.shiftKey ? 10 : 1));}
      else if (e.key === 'Home' || e.key === 'End') {e.preventDefault(); seek(e.key === 'Home' ? 0 : media.duration);}
    }) as EventListener);
    removers.push(() => {
      cursor.remove();
      if (oldRole === null) canvas.removeAttribute('role'); else canvas.setAttribute('role', oldRole);
      if (oldTab === null) canvas.removeAttribute('tabindex'); else canvas.setAttribute('tabindex', oldTab);
      for (const name of ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'aria-disabled', 'title']) canvas.removeAttribute(name);
    });
    return {plot, cursor, label};
  });
  function sync(): void {
    if (disposed) return;
    const time = media.readyState < 1 ? options.savedTime : media.currentTime || 0, duration = Number.isFinite(media.duration) ? media.duration : 0;
    const stamp = formatPlaybackTime(time);
    for (const readout of options.readouts) readout.textContent = `${stamp} / ${formatPlaybackTime(duration)}`;
    for (const {plot, cursor, label} of markers) {
      const range = plot.window(), b = plot.bounds(), canvas = plot.canvas;
      cursor.hidden = !duration || range.end <= range.start;
      const ratio = clamp((time - range.start) / Math.max(.001, range.end - range.start), 0, 1);
      cursor.style.left = `${canvas.offsetLeft + b.left + ratio * b.width}px`;
      cursor.style.top = `${canvas.offsetTop + b.top}px`; cursor.style.height = `${b.height}px`;
      cursor.dataset.time = String(time);
      const outside = time < range.start || time > range.end;
      cursor.classList.toggle('outside-window', outside); cursor.classList.toggle('label-left', ratio > .7);
      label.textContent = `${stamp}${outside ? ' · uden for udsnit' : ''}`;
      canvas.setAttribute('aria-valuemax', String(duration)); canvas.setAttribute('aria-valuenow', String(time));
      canvas.setAttribute('aria-valuetext', `${stamp} af ${formatPlaybackTime(duration)}`);
      canvas.setAttribute('aria-disabled', String(!options.canSeek()));
    }
    if (media.readyState >= 1) options.onPosition(time, !media.paused && !media.ended);
  }
  const tick = (): void => {sync(); if (!disposed && !media.paused && !media.ended) raf = requestAnimationFrame(tick);};
  const update = (): void => {cancelAnimationFrame(raf); tick();};
  const restore = (): void => {
    if (restored || media.readyState < 1 || !Number.isFinite(media.duration)) return;
    restored = true; media.currentTime = clamp(options.savedTime, 0, media.duration);
    if (options.resume) void media.play().catch(() => {sync();});
    sync();
  };
  for (const event of ['timeupdate', 'seeking', 'seeked', 'play', 'pause', 'ended']) listen(media, event, update);
  listen(media, 'loadedmetadata', restore);
  const resize = new ResizeObserver(sync); options.plots.forEach(p => resize.observe(p.canvas));
  restore(); sync();
  return () => {if (disposed) return; disposed = true; cancelAnimationFrame(raf); resize.disconnect(); removers.forEach(fn => fn());};
}
