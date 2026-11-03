import type {Candidate, Flight, GridCell, SearchConfig} from '../types.js';
import {clamp} from '../core/math.js';
import {icon} from './ui.js';
interface MapOptions {config: SearchConfig; flights: Flight[]; candidates: Candidate[]; grid: GridCell[]; selected: number; onSelect: (i: number)=>void; onPick?: (lat: number, lon: number)=>void}
function project(lat: number, lon: number, zoom: number): [number,number] {
  const scale=256*2**zoom, s=Math.sin(clamp(lat,-85,85)*Math.PI/180);
  return [(lon+180)/360*scale,(.5-Math.log((1+s)/(1-s))/(4*Math.PI))*scale];
}
function unproject(x: number,y: number,z:number): [number,number] {
  const scale=256*2**z;return [Math.atan(Math.sinh(Math.PI*(1-2*y/scale)))*180/Math.PI,x/scale*360-180];
}
let mapTilesEnabled = true;
export function mountMap(container: HTMLElement, options: MapOptions): ()=>void {
  container.innerHTML=`<div class="map-tiles"></div><canvas class="geo-canvas" tabindex="0" aria-label="${options.onPick?'Vælg søgeområde på kortet. Klik for at sætte centrum.':'Kort med flybaner og kandidatområder.'} Brug piletaster til at flytte og plus/minus til at zoome. Ctrl eller Command og rul zoomer også."></canvas><div class="map-topline"><span class="map-tag">${icon('target')}<span data-map-kind>${mapTilesEnabled?'OPENSTREETMAP':'LOKALT KOORDINATKORT'}</span></span><span class="map-tag">${options.onPick?'KLIK FOR AT VÆLGE CENTRUM':'MODELFEJL · IKKE SANDSYNLIGHED'}</span></div><div class="map-controls"><button type="button" data-map="plus" aria-label="Zoom ind">${icon('plus')}</button><button type="button" data-map="minus" aria-label="Zoom ud">${icon('minus')}</button><button type="button" data-map="fit" aria-label="Vis hele søgeområdet">${icon('target')}</button></div><div class="map-bottom"><label class="tile-toggle"><input type="checkbox" data-map="tiles" ${mapTilesEnabled?'checked':''}><span>Vis baggrundskort</span></label><span class="map-attribution">${mapTilesEnabled?'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap-bidragsydere</a>':'Geografisk grid · træk for at flytte'}</span></div><div class="map-load-error" role="status" hidden>Kortfliser kunne ikke hentes. Du kan stadig bruge koordinater, markører og zoom.</div><div class="map-privacy">Baggrundskort sender kortudsnit og din IP til OpenStreetMap. Ingen video sendes.</div>`;
  const canvas=container.querySelector('canvas')!, tiles=container.querySelector<HTMLElement>('.map-tiles')!;
  let centerLat=options.config.lat, centerLon=options.config.lon, zoom=10, enabled=mapTilesEnabled;
  let dragging: {x:number;y:number;center:[number,number]}|null=null;
  let tileKey='';
  const tileError=container.querySelector<HTMLElement>('.map-load-error')!;
  const fit=()=>{const rect=container.getBoundingClientRect();zoom=clamp(Math.floor(Math.log2(40075016*Math.cos(options.config.lat*Math.PI/180)*Math.min(rect.width,rect.height)/(options.config.radiusKm*2600*256))),2,17);centerLat=options.config.lat;centerLon=options.config.lon;draw();};
  function draw():void {
    const rect=container.getBoundingClientRect(),w=rect.width,h=rect.height,dpr=Math.min(2,devicePixelRatio||1);
    canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);const ctx=canvas.getContext('2d')!;ctx.scale(dpr,dpr);
    const center=project(centerLat,centerLon,zoom);
    const xy=(lat:number,lon:number):[number,number]=>{const p=project(lat,lon,zoom),world=256*2**zoom;let dx=p[0]-center[0];dx-=Math.round(dx/world)*world;return[dx+w/2,p[1]-center[1]+h/2];};
    ctx.clearRect(0,0,w,h);
    if(!enabled){ctx.fillStyle='#0c1418';ctx.fillRect(0,0,w,h);}
    // Screen-aligned grid with correctly projected geographic tick labels.
    ctx.strokeStyle=enabled?'#a3b5bd22':'#33495155';ctx.lineWidth=.7;ctx.font='10px ui-monospace, monospace';ctx.fillStyle='#70818a';
    const gridStep=80;
    for(let x=((w/2-center[0])%gridStep+gridStep)%gridStep;x<w;x+=gridStep){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();const ll=unproject(center[0]+x-w/2,center[1],zoom);ctx.fillText(ll[1].toFixed(3)+'°',x+4,h-65);}
    for(let y=((h/2-center[1])%gridStep+gridStep)%gridStep;y<h;y+=gridStep){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();const ll=unproject(center[0],center[1]+y-h/2,zoom);ctx.fillText(ll[0].toFixed(3)+'°',8,y-5);}
    const searchCenter=xy(options.config.lat,options.config.lon),metersPerPixel=40075016*Math.cos(options.config.lat*Math.PI/180)/(256*2**zoom),r=options.config.radiusKm*1000/metersPerPixel;
    ctx.setLineDash([5,7]);ctx.strokeStyle='#9bae974f';ctx.beginPath();ctx.arc(...searchCenter,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    if(options.onPick){
      ctx.strokeStyle='#d0f6a1';ctx.fillStyle='#142016';ctx.lineWidth=2;ctx.beginPath();ctx.arc(...searchCenter,7,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(searchCenter[0]-15,searchCenter[1]);ctx.lineTo(searchCenter[0]+15,searchCenter[1]);ctx.moveTo(searchCenter[0],searchCenter[1]-15);ctx.lineTo(searchCenter[0],searchCenter[1]+15);ctx.stroke();
    }
    const sorted=options.grid.map(g=>g.misfit).sort((a,b)=>a-b),floor=sorted[0]||0,ceiling=sorted[Math.floor(sorted.length*.5)]||.05;
    for(const cell of options.grid){const p=xy(cell.lat,cell.lon),v=1-clamp((cell.misfit-floor)/Math.max(.001,ceiling-floor),0,1);if(v<.2)continue;ctx.fillStyle=`rgba(184,237,141,${v*.22})`;ctx.beginPath();ctx.arc(...p,clamp(r/9,2,18),0,Math.PI*2);ctx.fill();}
    const active=options.candidates[options.selected];const activeIds=new Set(active?.matches.map(m=>m.flightId)||[]);
    options.flights.forEach(f=>{
      const hot=activeIds.has(f.id);ctx.strokeStyle=hot?'#74cfe0b5':'#71889038';ctx.lineWidth=hot?1.7:.8;ctx.beginPath();
      f.points.forEach((p,i)=>{const v=xy(p.lat,p.lon);if(!i||p.t-f.points[i-1].t>30)ctx.moveTo(...v);else ctx.lineTo(...v);});ctx.stroke();
      if(hot){const p=f.points.reduce((a,b)=>Math.abs(b.t-options.config.startTime)<Math.abs(a.t-options.config.startTime)?b:a);const v=xy(p.lat,p.lon);ctx.fillStyle='#a3e4ed';ctx.beginPath();ctx.moveTo(v[0],v[1]-6);ctx.lineTo(v[0]+4,v[1]+5);ctx.lineTo(v[0],v[1]+2);ctx.lineTo(v[0]-4,v[1]+5);ctx.closePath();ctx.fill();ctx.font='11px ui-monospace, monospace';ctx.fillText(f.callsign,v[0]+10,v[1]-6);}
    });
    options.candidates.forEach((c,i)=>{const p=xy(c.lat,c.lon),selected=i===options.selected;ctx.strokeStyle=selected?'#d0f6a1':'#8c9d85';ctx.lineWidth=selected?2:1;
      ctx.fillStyle=selected?'#c9f69b17':'#d4e8bb0b';ctx.beginPath();ctx.arc(...p,selected?28:18,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=selected?'#d0f6a1':'#9fb58d';ctx.beginPath();ctx.arc(...p,4,0,Math.PI*2);ctx.fill();
      ctx.font='bold 11px ui-monospace, monospace';ctx.fillText(String(i+1).padStart(2,'0'),p[0]+12,p[1]-10);
    });
    if(enabled){
      const startX=Math.floor((center[0]-w/2)/256),endX=Math.floor((center[0]+w/2)/256),startY=Math.floor((center[1]-h/2)/256),endY=Math.floor((center[1]+h/2)/256);
      const key=`${zoom}/${startX}/${endX}/${startY}/${endY}`;
      if(key!==tileKey){tileKey=key;tileError.hidden=true;const n=2**zoom;
        const existing=new Map(Array.from(tiles.querySelectorAll('img'),img=>[`${img.dataset.z}/${img.dataset.x}/${img.dataset.y}`,img]));
        const wanted=new Set<string>();
        for(let y=startY;y<=endY;y++)for(let x=startX;x<=endX;x++){
          if(y<0||y>=n)continue;
          const id=`${zoom}/${x}/${y}`;wanted.add(id);if(existing.has(id))continue;
          const img=document.createElement('img');img.alt='';img.draggable=false;img.width=256;img.height=256;
          img.dataset.z=String(zoom);
          img.src=`https://tile.openstreetmap.org/${zoom}/${((x%n)+n)%n}/${y}.png`;img.dataset.x=String(x);img.dataset.y=String(y);
          img.onerror=()=>{if(enabled&&img.isConnected){img.style.visibility='hidden';tileError.hidden=false;}};tiles.append(img);
        }
        for(const [id,img] of existing)if(!wanted.has(id))img.remove();
      }
      for(const img of tiles.querySelectorAll('img')){img.style.left=`${Number(img.dataset.x)*256-center[0]+w/2}px`;img.style.top=`${Number(img.dataset.y)*256-center[1]+h/2}px`;}
    }
  }
  const pointers=new Map<number,[number,number]>();
  let pinchDistance=0, pinching=false;
  const distance=()=>{const [a,b]=Array.from(pointers.values());return a&&b?Math.hypot(a[0]-b[0],a[1]-b[1]):0;};
  canvas.onpointerdown=e=>{pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size>1){pinching=true;pinchDistance=distance();dragging=null;canvas.setPointerCapture(e.pointerId);return;}dragging={x:e.clientX,y:e.clientY,center:project(centerLat,centerLon,zoom)};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{
    if(pointers.has(e.pointerId))pointers.set(e.pointerId,[e.clientX,e.clientY]);
    if(pinching){const d=distance();if(d&&pinchDistance&&Math.abs(Math.log2(d/pinchDistance))>=.65){zoom=clamp(zoom+(d>pinchDistance?1:-1),2,18);pinchDistance=d;draw();}return;}
    if(!dragging)return;const ll=unproject(dragging.center[0]-(e.clientX-dragging.x),dragging.center[1]-(e.clientY-dragging.y),zoom);centerLat=clamp(ll[0],-80,80);centerLon=((ll[1]+540)%360)-180;draw();};
  canvas.onpointerup=e=>{
    pointers.delete(e.pointerId);if(pinching){if(!pointers.size)pinching=false;dragging=null;return;}
    if(dragging&&Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)<5){
      const r=canvas.getBoundingClientRect(),center=project(centerLat,centerLon,zoom);
      if(options.onPick){
        const ll=unproject(center[0]+e.clientX-r.left-r.width/2,center[1]+e.clientY-r.top-r.height/2,zoom);
        options.config.lat=clamp(ll[0],-80,80);options.config.lon=((ll[1]+540)%360)-180;
        options.onPick(options.config.lat,options.config.lon);draw();
      }
      options.candidates.forEach((c,i)=>{const p=project(c.lat,c.lon,zoom);if(Math.hypot(p[0]-center[0]+r.width/2-(e.clientX-r.left),p[1]-center[1]+r.height/2-(e.clientY-r.top))<24)options.onSelect(i);});
    }dragging=null;
  };
  canvas.onpointercancel=e=>{pointers.delete(e.pointerId);if(!pointers.size)pinching=false;dragging=null;};
  canvas.onkeydown=e=>{
    const center=project(centerLat,centerLon,zoom),moves:Record<string,[number,number]>={ArrowLeft:[-70,0],ArrowRight:[70,0],ArrowUp:[0,-70],ArrowDown:[0,70]};
    if(e.key in moves){e.preventDefault();const d=moves[e.key],p=unproject(center[0]+d[0],center[1]+d[1],zoom);centerLat=clamp(p[0],-80,80);centerLon=((p[1]+540)%360)-180;draw();}
    else if(options.onPick&&e.key==='Enter'){e.preventDefault();options.config.lat=centerLat;options.config.lon=centerLon;options.onPick(centerLat,centerLon);draw();}
    else if(e.key==='+'||e.key==='='){e.preventDefault();zoom=clamp(zoom+1,2,18);draw();}
    else if(e.key==='-'){e.preventDefault();zoom=clamp(zoom-1,2,18);draw();}
  };
  const wheel=(e:WheelEvent)=>{
    // Keep normal page scrolling; Ctrl/Command + wheel also handles trackpad pinch.
    if(!e.ctrlKey&&!e.metaKey)return;
    e.preventDefault();const next=clamp(zoom+(e.deltaY<0?1:-1),2,18);if(next===zoom)return;
    const rect=canvas.getBoundingClientRect(),center=project(centerLat,centerLon,zoom),x=e.clientX-rect.left-rect.width/2,y=e.clientY-rect.top-rect.height/2;
    const factor=2**(next-zoom),ll=unproject((center[0]+x)*factor-x,(center[1]+y)*factor-y,next);
    centerLat=clamp(ll[0],-80,80);centerLon=((ll[1]+540)%360)-180;zoom=next;draw();
  };
  canvas.addEventListener('wheel',wheel,{passive:false});
  container.querySelectorAll<HTMLButtonElement>('button[data-map]').forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.map;if(action==='plus')zoom=clamp(zoom+1,2,18);if(action==='minus')zoom=clamp(zoom-1,2,18);if(action==='fit'){fit();return;}draw();
  }));
  container.querySelector<HTMLInputElement>('[data-map="tiles"]')!.addEventListener('change',e=>{
    enabled=(e.target as HTMLInputElement).checked;mapTilesEnabled=enabled;tileError.hidden=true;tileKey='';if(!enabled)tiles.replaceChildren();
    container.querySelector('[data-map-kind]')!.textContent=enabled?'OPENSTREETMAP':'LOKALT KOORDINATKORT';
    container.querySelector('.map-attribution')!.innerHTML=enabled?'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap-bidragsydere</a>':'Geografisk grid · træk for at flytte';
    draw();
  });
  const observer=new ResizeObserver(()=>draw());observer.observe(container);fit();
  return()=>{observer.disconnect();canvas.onpointerdown=null;canvas.onpointermove=null;canvas.onpointerup=null;canvas.onkeydown=null;canvas.onpointercancel=null;canvas.removeEventListener('wheel',wheel);tiles.replaceChildren();};
}
