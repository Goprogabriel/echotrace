import { translateText } from '../i18n.js';
import { clamp } from '../core/math.js';
export function formatPlaybackTime(time) {
    const tenths = Math.max(0, Math.floor(time * 10 + .00001));
    return `${Math.floor(tenths / 600).toString().padStart(2, '0')}:${(Math.floor(tenths / 10) % 60).toString().padStart(2, '0')}.${tenths % 10}`;
}
/** Lightweight DOM cursors: playback never reruns FFT or repaints the spectrogram. */
export function bindPlayback(media, options) {
    let raf = 0, disposed = false, restored = false;
    const removers = [];
    const listen = (target, type, listener, eventOptions) => {
        target.addEventListener(type, listener, eventOptions);
        removers.push(() => target.removeEventListener(type, listener, eventOptions));
    };
    const markers = options.plots.map(plot => {
        const cursor = document.createElement('span');
        cursor.className = 'playback-cursor';
        cursor.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.className = 'playback-cursor-label';
        cursor.append(label);
        plot.canvas.parentElement.append(cursor);
        const canvas = plot.canvas, oldRole = canvas.getAttribute('role'), oldTab = canvas.getAttribute('tabindex');
        canvas.setAttribute('role', 'slider');
        canvas.tabIndex = 0;
        canvas.setAttribute('aria-valuemin', '0');
        canvas.title = translateText('Klik eller træk for at spole. Piletaster: 1 sekund. Shift + piletast: 10 sekunder. Rul vandret eller Shift + rul for at spole.');
        let pointer = null;
        const seek = (time) => {
            if (!options.canSeek() || media.readyState < 1 || !Number.isFinite(media.duration))
                return;
            media.currentTime = clamp(time, 0, media.duration);
            sync();
        };
        const seekPointer = (e) => {
            const rect = canvas.getBoundingClientRect(), b = plot.bounds(), range = plot.window();
            if (b.width <= 0 || range.end <= range.start)
                return;
            seek(range.start + clamp((e.clientX - rect.left - b.left) / b.width, 0, 1) * (range.end - range.start));
        };
        listen(canvas, 'pointerdown', ((e) => {
            if (!options.canSeek() || e.button !== 0 || media.readyState < 1)
                return;
            const rect = canvas.getBoundingClientRect(), b = plot.bounds();
            if (e.clientX < rect.left + b.left || e.clientX > rect.left + b.left + b.width || e.clientY < rect.top + b.top || e.clientY > rect.top + b.top + b.height)
                return;
            e.preventDefault();
            canvas.focus({ preventScroll: true });
            pointer = e.pointerId;
            canvas.setPointerCapture(pointer);
            seekPointer(e);
        }));
        listen(canvas, 'pointermove', ((e) => { if (pointer === e.pointerId)
            seekPointer(e); }));
        listen(canvas, 'pointerup', ((e) => {
            if (pointer !== e.pointerId)
                return;
            seekPointer(e);
            if (canvas.hasPointerCapture(pointer))
                canvas.releasePointerCapture(pointer);
            pointer = null;
        }));
        listen(canvas, 'pointercancel', (() => { pointer = null; }));
        listen(canvas, 'wheel', ((e) => {
            if (!options.canSeek() || e.ctrlKey || e.metaKey || (!e.deltaX && !e.shiftKey))
                return;
            const b = plot.bounds(), range = plot.window();
            if (b.width <= 0)
                return;
            e.preventDefault();
            seek(media.currentTime + (e.deltaX || e.deltaY) * (range.end - range.start) / b.width);
        }), { passive: false });
        listen(canvas, 'keydown', ((e) => {
            if (!options.canSeek())
                return;
            const moves = { ArrowLeft: -1, ArrowRight: 1, PageDown: -10, PageUp: 10 };
            if (e.key in moves) {
                e.preventDefault();
                seek(media.currentTime + moves[e.key] * (e.shiftKey ? 10 : 1));
            }
            else if (e.key === 'Home' || e.key === 'End') {
                e.preventDefault();
                seek(e.key === 'Home' ? 0 : media.duration);
            }
        }));
        removers.push(() => {
            cursor.remove();
            if (oldRole === null)
                canvas.removeAttribute('role');
            else
                canvas.setAttribute('role', oldRole);
            if (oldTab === null)
                canvas.removeAttribute('tabindex');
            else
                canvas.setAttribute('tabindex', oldTab);
            for (const name of ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'aria-disabled', 'title'])
                canvas.removeAttribute(name);
        });
        return { plot, cursor, label };
    });
    function sync() {
        if (disposed)
            return;
        const time = media.readyState < 1 ? options.savedTime : media.currentTime || 0, duration = Number.isFinite(media.duration) ? media.duration : 0;
        const stamp = formatPlaybackTime(time);
        for (const readout of options.readouts)
            readout.textContent = `${stamp} / ${formatPlaybackTime(duration)}`;
        for (const { plot, cursor, label } of markers) {
            const range = plot.window(), b = plot.bounds(), canvas = plot.canvas;
            cursor.hidden = !duration || range.end <= range.start;
            const ratio = clamp((time - range.start) / Math.max(.001, range.end - range.start), 0, 1);
            cursor.style.left = `${canvas.offsetLeft + b.left + ratio * b.width}px`;
            cursor.style.top = `${canvas.offsetTop + b.top}px`;
            cursor.style.height = `${b.height}px`;
            cursor.dataset.time = String(time);
            const outside = time < range.start || time > range.end;
            cursor.classList.toggle('outside-window', outside);
            cursor.classList.toggle('label-left', ratio > .7);
            label.textContent = `${stamp}${outside ? translateText(' · uden for udsnit') : ''}`;
            canvas.setAttribute('aria-valuemax', String(duration));
            canvas.setAttribute('aria-valuenow', String(time));
            canvas.setAttribute('aria-valuetext', `${stamp} ${translateText('af')} ${formatPlaybackTime(duration)}`);
            canvas.setAttribute('aria-disabled', String(!options.canSeek()));
        }
        if (media.readyState >= 1)
            options.onPosition(time, !media.paused && !media.ended);
    }
    const tick = () => { sync(); if (!disposed && !media.paused && !media.ended)
        raf = requestAnimationFrame(tick); };
    const update = () => { cancelAnimationFrame(raf); tick(); };
    const restore = () => {
        if (restored || media.readyState < 1 || !Number.isFinite(media.duration))
            return;
        restored = true;
        media.currentTime = clamp(options.savedTime, 0, media.duration);
        if (options.resume)
            void media.play().catch(() => { sync(); });
        sync();
    };
    for (const event of ['timeupdate', 'seeking', 'seeked', 'play', 'pause', 'ended'])
        listen(media, event, update);
    listen(media, 'loadedmetadata', restore);
    const resize = new ResizeObserver(sync);
    options.plots.forEach(p => resize.observe(p.canvas));
    restore();
    sync();
    return () => { if (disposed)
        return; disposed = true; cancelAnimationFrame(raf); resize.disconnect(); removers.forEach(fn => fn()); };
}
