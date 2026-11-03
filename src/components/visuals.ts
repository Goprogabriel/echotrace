import type {Candidate, SignalAnalysis, SpectrumView} from '../types.js';
import {clamp, median} from '../core/math.js';
export function setupCanvas(canvas: HTMLCanvasElement, height?: number): CanvasRenderingContext2D {
  const dpr = Math.min(2, window.devicePixelRatio || 1), rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr)); canvas.height = Math.max(1, Math.floor((height || rect.height) * dpr));
  const ctx = canvas.getContext('2d')!; ctx.scale(dpr, dpr); return ctx;
}
export function drawWaveform(canvas: HTMLCanvasElement, values: Float32Array): void {
  const ctx = setupCanvas(canvas), {width: w, height: h} = canvas.getBoundingClientRect();
  const max = Math.max(.001, ...values); ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#27674d'; ctx.lineWidth = 1;
  for (let i = 0; i < values.length; i++) {
    const x = i / values.length * w, amp = values[i] / max * h * .42;
    ctx.beginPath(); ctx.moveTo(x, h/2 - amp); ctx.lineTo(x, h/2 + amp); ctx.stroke();
  }
}
export function spectrumColor(value: number): [number, number, number] {
  const stops = [[8,12,27],[30,20,64],[80,32,105],[164,49,121],[237,112,127],[255,224,153]];
  const v = clamp(value, 0, .999) * (stops.length - 1), i = Math.floor(v), t = v - i;
  return stops[i].map((c, k) => Math.round(c + (stops[i+1][k] - c) * t)) as [number,number,number];
}
export function spectrumBounds(width: number, height: number): {left: number; top: number; width: number; height: number} {
  return {left: 45, top: 12, width: Math.max(1, Math.floor(width - 57)), height: Math.max(1, Math.floor(height - 39))};
}
export function drawSpectrogram(canvas: HTMLCanvasElement, analysis: SignalAnalysis, candidate?: Candidate, view?: SpectrumView, selectedTracks?: string[]): void {
  const ctx = setupCanvas(canvas), {width: w, height: h} = canvas.getBoundingClientRect();
  const {left, top, width: pw, height: ph} = spectrumBounds(w, h);
  const start = view?.start ?? 0, end = view?.end || analysis.duration;
  const minHz = view?.minHz ?? analysis.minHz, maxHz = view?.maxHz ?? analysis.maxHz;
  const timeSpan = Math.max(.1, end - start), band = Math.max(1, maxHz - minHz);
  ctx.fillStyle = '#080c1b'; ctx.fillRect(0, 0, w, h);
  // Estimate each frame's spectral floor so faint tones remain visible without changing PCM.
  const floors = new Float32Array(analysis.frames);
  for (let f = 0; f < analysis.frames; f++) {
    const values: number[] = [];
    for (let b = 0; b < analysis.bins; b += 8) values.push(analysis.db[f * analysis.bins + b]);
    floors[f] = median(values);
  }
  const image = new ImageData(pw, ph);
  for (let x = 0; x < pw; x++) {
    const t = start + x / pw * timeSpan;
    const frame = Math.round((t * analysis.sampleRate - analysis.fftSize / 2) / analysis.hopSize);
    const f = clamp(frame, 0, analysis.frames - 1);
    for (let y = 0; y < ph; y++) {
      const hz = maxHz - y / ph * band;
      const b = clamp(Math.round((hz - analysis.minHz) * analysis.fftSize / analysis.sampleRate), 0, analysis.bins - 1);
      const db = analysis.db[f * analysis.bins + b];
      const c = spectrumColor(frame < 0 || frame >= analysis.frames ? 0 : (db - floors[f] + (view?.gain ?? 0) - 3) / 45), p = (y * pw + x) * 4;
      image.data[p] = c[0]; image.data[p + 1] = c[1]; image.data[p + 2] = c[2]; image.data[p + 3] = 255;
    }
  }
  const temp = document.createElement('canvas'); temp.width = pw; temp.height = ph; temp.getContext('2d')!.putImageData(image, 0, 0); ctx.drawImage(temp, left, top, pw, ph);
  ctx.font = '10px ui-monospace, monospace'; ctx.fillStyle = '#a6b3cd'; ctx.strokeStyle = '#d8e5ff18'; ctx.lineWidth = 1;
  const step = band <= 100 ? 20 : band <= 300 ? 50 : band <= 700 ? 100 : 200;
  for (let hz = Math.ceil(minHz / step) * step; hz < maxHz; hz += step) {
    const y = top + (maxHz - hz) / band * ph;
    ctx.fillText(String(hz), 8, y + 3); ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + pw, y); ctx.stroke();
  }
  for (let i = 0; i <= 4; i++) {const x = left + i * pw / 4; ctx.fillText(`${Math.round(start + i * timeSpan / 4)}s`, Math.min(w - 35, x - 5), h - 5);}
  ctx.save(); ctx.beginPath(); ctx.rect(left, top, pw, ph); ctx.clip();
  const xy = (p: {t: number; hz: number}): [number, number] => [left + (p.t - start) / timeSpan * pw, top + (maxHz - p.hz) / band * ph];
  const line = (points: {t: number; hz: number}[], gaps = true): void => {
    ctx.beginPath();
    points.forEach((p, k) => { const [x, y] = xy(p); if (!k || (gaps && p.t - points[k - 1].t > Math.max(1.5, analysis.hopSize / analysis.sampleRate * 3))) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke();
  };
  const colors = ['#d6f79a', '#ffb777', '#edb5ff'];
  analysis.tracks.forEach((track, i) => {
    ctx.globalAlpha = selectedTracks && !selectedTracks.includes(track.id) ? .25 : 1;
    ctx.strokeStyle = colors[i % 3]; ctx.lineWidth = 1.2; line(track.points);
    const p = track.points[Math.floor(track.points.length * .6)], [x, y] = xy(p); ctx.fillStyle = colors[i % 3]; ctx.fillText(track.id, x + 6, y - 8);
  });
  ctx.globalAlpha = 1;
  if (candidate) candidate.matches.forEach(m => {
    ctx.strokeStyle = '#001a24'; ctx.lineWidth = 4; line(m.predicted);
    ctx.strokeStyle = '#65efff'; ctx.lineWidth = 2; line(m.predicted);
  });
  ctx.restore();
}
/** Illustration only. Never used as analysis data or a result. */
export function startHeroCanvas(canvas: HTMLCanvasElement): () => void {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf=0, visible=true; const start=performance.now();
  const render=()=>{
    const ctx=setupCanvas(canvas), {width:w,height:h}=canvas.getBoundingClientRect(), t=reduced?1:(performance.now()-start)/1000;
    ctx.clearRect(0,0,w,h);
    const cx=w*.51,cy=h*.49,r=Math.min(w,h)*.38;
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,r*1.5);glow.addColorStop(0,'#a4df6520');glow.addColorStop(.65,'#a4df6506');glow.addColorStop(1,'#a4df6500');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#688b7233';ctx.lineWidth=.7;
    for(let i=1;i<=5;i++){ctx.beginPath();ctx.ellipse(cx,cy,r*i/5,r*i/5*.64,-.32,0,Math.PI*2);ctx.stroke();}
    for(let i=0;i<28;i++){const a=i/28*Math.PI*2;ctx.fillStyle='#a3bba855';ctx.fillRect(cx+Math.cos(a)*r*1.22,cy+Math.sin(a)*r*.84,1.2,1.2);}
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.32);
    for(let i=-18;i<=18;i++){
      const x=i*r/21, envelope=Math.exp(-Math.pow(i/10,2));const hh=(.12+.72*Math.abs(Math.sin(i*.57-t*1.4)))*r*envelope;
      ctx.strokeStyle=`rgba(196,247,155,${.2+.7*envelope})`;ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(x,-hh*.51);ctx.lineTo(x,hh*.51);ctx.stroke();
    }ctx.restore();
    const angle=t*.19-.7,px=cx+Math.cos(angle)*r*.94,py=cy+Math.sin(angle)*r*.6;
    ctx.fillStyle='#d0f8a4';ctx.shadowColor='#c3f99b';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='#b5dd8d55';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(cx,cy);ctx.stroke();
    ctx.fillStyle='#e4f4de';ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill();
    if(!reduced&&visible) raf=requestAnimationFrame(render);
  };
  const observer=new IntersectionObserver(e=>{visible=e[0].isIntersecting;if(visible){cancelAnimationFrame(raf);render();}else cancelAnimationFrame(raf);});observer.observe(canvas);
  render(); return()=>{observer.disconnect();cancelAnimationFrame(raf);};
}
export function drawIllustrationSpectrum(canvas: HTMLCanvasElement): void {
  const ctx=setupCanvas(canvas),{width:w,height:h}=canvas.getBoundingClientRect();
  ctx.fillStyle='#080f12';ctx.fillRect(0,0,w,h);
  // Deterministic illustrative field, visibly labelled as synthetic in the UI.
  for(let x=0;x<w;x+=2) for(let y=0;y<h;y+=2){
    const norm=x/w,curve=.40+.18*Math.tanh((norm-.45)*7),curve2=.60+.13*Math.tanh((norm-.64)*9);
    const d=Math.min(Math.abs(y/h-curve),Math.abs(y/h-curve2));
    const noise=(Math.sin(x*31.7+y*27.13)*43758.5453)%1;
    const v=Math.max(0,.12+noise*.09+Math.exp(-d*d/ .00010)*.72);const c=spectrumColor(v);ctx.fillStyle=`rgb(${c.join(',')})`;ctx.fillRect(x,y,2,2);
  }
  ctx.strokeStyle='#ffffff0b'; for(let i=1;i<6;i++){ctx.beginPath();ctx.moveTo(0,h*i/6);ctx.lineTo(w,h*i/6);ctx.stroke();}
}
