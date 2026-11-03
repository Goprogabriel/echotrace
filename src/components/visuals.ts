import type {Candidate, SignalAnalysis} from '../types.js';
import {clamp} from '../core/math.js';
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
  const stops = [[248,250,245],[229,239,221],[190,216,181],[125,174,130],[58,123,88],[24,76,56]];
  const v = clamp(value, 0, .999) * (stops.length - 1), i = Math.floor(v), t = v - i;
  return stops[i].map((c, k) => Math.round(c + (stops[i+1][k] - c) * t)) as [number,number,number];
}
export function drawSpectrogram(canvas: HTMLCanvasElement, analysis: SignalAnalysis, candidate?: Candidate): void {
  const ctx = setupCanvas(canvas), {width: w, height: h} = canvas.getBoundingClientRect();
  const left = 45, right = 12, top = 12, bottom = 27, pw = Math.max(1, Math.floor(w-left-right)), ph = Math.max(1, Math.floor(h-top-bottom));
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h);
  const image = new ImageData(pw,ph);
  const maxHz = 520;
  for (let y = 0; y < ph; y++) {
    const hz = maxHz - y/ph * (maxHz-analysis.minHz), b = clamp(Math.round((hz-analysis.minHz) / (analysis.maxHz-analysis.minHz) * (analysis.bins-1)),0,analysis.bins-1);
    for (let x = 0; x < pw; x++) {
      const f = Math.min(analysis.frames-1, Math.floor(x/pw*analysis.frames)), db = analysis.db[f*analysis.bins+b];
      const c = spectrumColor((db + 85)/70), p = (y*pw+x)*4;
      image.data[p]=c[0]; image.data[p+1]=c[1]; image.data[p+2]=c[2]; image.data[p+3]=255;
    }
  }
  const temp = document.createElement('canvas'); temp.width=pw; temp.height=ph; temp.getContext('2d')!.putImageData(image,0,0); ctx.drawImage(temp,left,top,pw,ph);
  ctx.font = '10px ui-monospace, monospace'; ctx.fillStyle = '#52654f'; ctx.strokeStyle = '#243d2012'; ctx.lineWidth = 1;
  for (let hz = 100; hz <= 500; hz += 100) {
    const y = top + (maxHz-hz)/(maxHz-analysis.minHz)*ph;
    ctx.fillText(String(hz), 8,y+3); ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
  }
  for (let i=0;i<=4;i++) {const x=left+i*pw/4;ctx.fillText(`${Math.round(i*analysis.duration/4)}s`,Math.min(w-28,x-5),h-5);}
  const colors = ['#215a3b','#175e8a','#784795'];
  analysis.tracks.forEach((track, i) => {
    ctx.strokeStyle=colors[i%3];ctx.lineWidth=1.1;ctx.beginPath();
    track.points.forEach((p,k)=>{const x=left+p.t/analysis.duration*pw,y=top+(maxHz-p.hz)/(maxHz-analysis.minHz)*ph;k?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
    const p=track.points[Math.floor(track.points.length*.6)];ctx.fillStyle=colors[i%3];ctx.fillText(track.id,left+p.t/analysis.duration*pw+6,top+(maxHz-p.hz)/(maxHz-analysis.minHz)*ph-8);
  });
  if (candidate) candidate.matches.forEach(m=>{
    ctx.setLineDash([5,4]);ctx.strokeStyle='#171f23';ctx.lineWidth=1.5;ctx.beginPath();
    m.predicted.forEach((p,i)=>{const x=left+p.t/analysis.duration*pw,y=top+(maxHz-p.hz)/(maxHz-analysis.minHz)*ph;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.setLineDash([]);
  });
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
