import {homePage} from './pages/home.js';
import {labPage} from './pages/lab.js';
import {docsPage} from './pages/docs.js';
import {initialState, isBusy, type AppState} from './state.js';
import {captureMedia, decodeMedia, validateMedia} from './core/audio.js';
import {fetchFlights, importFlights, parseDataset} from './core/data.js';
import {startReveals} from './components/ui.js';
import {drawIllustrationSpectrum, drawSpectrogram, drawWaveform, startHeroCanvas} from './components/visuals.js';
import {mountMap} from './components/map.js';
import type {DecodedAudio, FitResult, FlightDataset, Progress, SearchConfig, SignalAnalysis} from './types.js';

const root = document.querySelector<HTMLElement>('#app')!;
const fileInput = document.querySelector<HTMLInputElement>('#media-input')!;
const dataInput = document.querySelector<HTMLInputElement>('#data-input')!;
let state: AppState = initialState(), cleanups: (()=>void)[] = [];
let worker: Worker | null = null, controller = new AbortController(), job = 0;
let toastTimer: ReturnType<typeof setTimeout>;
const route = (): string => location.hash.split('?')[0] || '#/';

function toast(message: string): void {
  const el=document.querySelector<HTMLElement>('#toast')!;el.textContent=message;el.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),5500);
}
function render(): void {
  cleanups.forEach(fn=>fn());cleanups=[];
  const r=route();
  root.innerHTML=r==='#/lab'?labPage(state):r==='#/privacy'?docsPage('privacy'):r==='#/method'?docsPage('method'):homePage();
  document.title=r==='#/lab'?'Signal-lab — Echotrace':r==='#/privacy'?'Privatliv — Echotrace':r==='#/method'?'Metoden — Echotrace':'Echotrace — Find sporet i lyden';
  cleanups.push(startReveals(root));
  const hero=root.querySelector<HTMLCanvasElement>('#hero-canvas');if(hero)cleanups.push(startHeroCanvas(hero));
  const preview=root.querySelector<HTMLCanvasElement>('#preview-spectrum');
  if(preview){const obs=new ResizeObserver(()=>drawIllustrationSpectrum(preview));obs.observe(preview);cleanups.push(()=>obs.disconnect());drawIllustrationSpectrum(preview);}
  const slider=root.querySelector<HTMLInputElement>('#doppler-slider');
  if(slider)slider.oninput=()=>{
    const x=Number(slider.value)/100*6000,vr=100*x/Math.hypot(x,1800),hz=130*343/(343+vr);
    root.querySelector('#doppler-hz')!.textContent=Math.round(hz).toString();
    root.querySelector<HTMLElement>('#demo-plane')!.style.left=`${15+(Number(slider.value)+100)/200*70}%`;
  };
  if(r==='#/lab')initLab();
}
function initLab(): void {
  const draw=()=>{
    const spectrum=root.querySelector<HTMLCanvasElement>('#lab-spectrum');if(spectrum&&state.analysis)drawSpectrogram(spectrum,state.analysis);
    const wave=root.querySelector<HTMLCanvasElement>('#waveform'),values=state.analysis?.waveform||state.waveform;if(wave&&values)drawWaveform(wave,values);
    const result=root.querySelector<HTMLCanvasElement>('#result-spectrum');if(result&&state.analysis)drawSpectrogram(result,state.analysis,state.result?.candidates[state.selected]);
  };
  const observer=new ResizeObserver(draw);root.querySelectorAll<HTMLCanvasElement>('canvas').forEach(c=>observer.observe(c));cleanups.push(()=>observer.disconnect());draw();
  if(state.result&&state.config&&state.dataset){
    const map=root.querySelector<HTMLElement>('#result-map');
    if(map)cleanups.push(mountMap(map,{config:state.config,flights:state.dataset.flights,candidates:state.result.candidates,grid:state.result.grid,selected:state.selected,onSelect:i=>{state.selected=i;render();}}));
  }
  root.querySelector('#search-form')?.addEventListener('submit',e=>{e.preventDefault();void runMatching();});
  if(isBusy(state))root.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLButtonElement>('#search-form input,#search-form select,#search-form button').forEach(el=>el.disabled=true);
}
function updateProgress(progress: Progress): void {
  state.progress=progress;
  const text=root.querySelector('#progress-text');if(text)text.textContent=progress.text;
  const number=root.querySelector('#progress-percent');if(number)number.textContent=`${Math.round(progress.progress*100)}%`;
  const bar=root.querySelector<HTMLElement>('#progress-bar');if(bar)bar.style.width=`${progress.progress*100}%`;
}
function stopJob(): void {job++;controller.abort();worker?.terminate();worker=null;controller=new AbortController();}
function cancel(): void {
  stopJob();state.stage=state.analysis?'ready':'idle';state.progress={phase:'cancelled',text:'Analysen er annulleret',progress:0};state.error='';render();toast('Beregningen er stoppet. Ingen video blev sendt.');
}
function navigateLab(): void {
  if(route()!=='#/lab')location.hash='/lab';else render();
}
function fail(error: unknown, currentJob: number): void {
  if(currentJob!==job)return;
  if(error instanceof DOMException&&error.name==='AbortError')return;
  worker?.terminate();worker=null;
  state.error=error instanceof Error?error.message:'Der opstod en uventet fejl.';
  state.stage=state.analysis?'ready':'error';state.progress={phase:'error',text:'Beregningen er stoppet',progress:state.progress.progress};render();
}
interface DemoSetup {dataset: FlightDataset; config: SearchConfig}
async function analyzeFile(file: File, demo?: DemoSetup, capture=false): Promise<void> {
  stopJob();const id=job;
  try {
    validateMedia(file);
    if(!capture){
      if(state.blobUrl)URL.revokeObjectURL(state.blobUrl);
      state=initialState();state.file=file;state.blobUrl=URL.createObjectURL(file);
      if(demo){state.demo=true;state.dataset=demo.dataset;state.config=demo.config;state.consent=true;
        const c=demo.config;state.form={date:new Date(c.startTime*1000).toISOString().slice(0,19),lat:String(c.lat),lon:String(c.lon),radius:String(c.radiusKm),clock:String(c.clockUncertainty),altitude:String(c.receiverAltitudeM),sound:String(c.soundSpeed)};}
    }
    state.stage='decoding';state.error='';state.canFallback=false;state.progress={phase:'decode',text:'Åbner din optagelse lokalt',progress:.01};navigateLab();render();
    const decoded=await(capture?captureMedia(file,updateProgress,controller.signal):decodeMedia(file,updateProgress,controller.signal));
    if(id!==job)return;
    state.decoded={sampleRate:decoded.sampleRate,duration:decoded.duration,channels:decoded.channels,method:decoded.method,warnings:decoded.warnings};
    state.waveform=new Float32Array(700);
    for(let i=0;i<decoded.samples.length;i++){const k=Math.min(699,Math.floor(i*700/decoded.samples.length));state.waveform[k]=Math.max(state.waveform[k],Math.abs(decoded.samples[i]));}
    state.stage='analyzing';render();
    runSignalWorker(decoded,id);
  } catch(error){
    if(id===job&&error instanceof Error&&error.message.includes('direkte'))state.canFallback=true;
    fail(error,id);
  }
}
function runSignalWorker(decoded: DecodedAudio, id: number): void {
  worker=new Worker(new URL('./workers/analysis.worker.js',import.meta.url),{type:'module'});
  worker.onerror=()=>fail(new Error('Analysearbejderen kunne ikke startes. Åbn appen via localhost eller HTTPS — ikke direkte som en file://-fil.'),id);
  worker.onmessage=(e:MessageEvent)=>{
    if(id!==job)return;
    if(e.data.type==='progress')updateProgress(e.data.data as Progress);
    if(e.data.type==='error')fail(new Error(e.data.message),id);
    if(e.data.type==='analysis'){
      state.analysis=e.data.data as SignalAnalysis;state.stage='ready';worker?.terminate();worker=null;render();
      if(state.demo&&state.analysis.tracks.length)void runMatching();
      else root.querySelector('#search-section')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  };
  worker.postMessage({type:'analyze',samples:decoded.samples,sampleRate:decoded.sampleRate},[decoded.samples.buffer]);
}
function getConfig(): SearchConfig {
  const f=state.form;
  if(!f.date||!f.lat.trim()||!f.lon.trim())throw new Error('Angiv optagelsens starttid i UTC og centrum for søgeområdet.');
  const date=Date.parse(`${f.date}Z`)/1000;
  if(!Number.isFinite(date)||date<946684800||date>4133980800)throw new Error('Angiv en gyldig optagelsestid mellem år 2000 og 2100.');
  const config={lat:Number(f.lat),lon:Number(f.lon),radiusKm:Number(f.radius),startTime:date,clockUncertainty:Number(f.clock),receiverAltitudeM:Number(f.altitude),soundSpeed:Number(f.sound)};
  if(!Object.values(config).every(Number.isFinite)||Math.abs(config.lat)>80||Math.abs(config.lon)>180||config.radiusKm<1||config.radiusKm>30||config.clockUncertainty<0||config.clockUncertainty>60||config.receiverAltitudeM< -400||config.receiverAltitudeM>9000||config.soundSpeed<300||config.soundSpeed>370)throw new Error('Kontrollér koordinater, radius (1–30 km), urusikkerhed, mikrofonhøjde og lydhastighed.');
  return config;
}
async function runMatching(): Promise<void> {
  if(isBusy(state)||!state.analysis)return;
  stopJob();const id=job;
  try {
    if(!state.analysis.tracks.length)throw new Error('Der blev ikke fundet et brugbart tonalt spor at matche.');
    if(!state.consent)throw new Error('Bekræft, at du har ret til at undersøge denne optagelse.');
    const config=getConfig();state.config=config;state.error='';state.result=null;state.selected=0;
    if(!state.dataset){
      if(!state.network)throw new Error('Tillad forespørgslen til flytjenesten, eller importér lokale flydata. Din video bliver på enheden.');
      state.stage='fetching';state.progress={phase:'fetching',text:'Kontrollerer arkiv og henter historiske flybaner',progress:.02};render();
      const dataset=await fetchFlights(config,state.analysis.duration,controller.signal);if(id!==job)return;state.dataset=dataset;
    }
    state.stage='matching';state.progress={phase:'matching',text:`Sammenligner ${state.analysis.tracks.length} spor med ${state.dataset.flights.length} flybaner`,progress:.02};render();
    root.querySelector('.processing-panel')?.scrollIntoView({behavior:'smooth',block:'center'});
    worker=new Worker(new URL('./workers/analysis.worker.js',import.meta.url),{type:'module'});
    worker.onerror=()=>fail(new Error('Modelberegningen kunne ikke gennemføres i denne browser.'),id);
    worker.onmessage=(e:MessageEvent)=>{
      if(id!==job)return;
      if(e.data.type==='progress')updateProgress(e.data.data as Progress);
      if(e.data.type==='error')fail(new Error(e.data.message),id);
      if(e.data.type==='result'){
        state.result=e.data.data as FitResult;state.stage='done';worker?.terminate();worker=null;render();
        root.querySelector('#results')?.scrollIntoView({behavior:'smooth',block:'start'});
      }
    };
    worker.postMessage({type:'match',tracks:state.analysis.tracks,flights:state.dataset.flights,config});
  }catch(error){fail(error,id);}
}
async function loadDemo(): Promise<void> {
  if(isBusy(state))cancel();
  toast('Åbner den medfølgende testoptagelse. Alle beregninger kører lokalt.');
  try {
    const [media,data,session]=await Promise.all([fetch('./assets/demo.mp4').then(r=>{if(!r.ok)throw new Error('Testvideoen mangler.');return r.blob();}),fetch('./examples/demo-flights.json').then(r=>r.json()),fetch('./examples/demo-session.json').then(r=>r.json())]);
    await analyzeFile(new File([media],'echotrace-synthetic-demo.mp4',{type:'video/mp4'}),{dataset:parseDataset(data),config:session as SearchConfig});
  }catch(error){toast(error instanceof Error?error.message:'Demoen kunne ikke åbnes.');}
}
function exportReport():void{
  if(!state.result||!state.config||!state.analysis)return;
  const report={schema:'echotrace-report/1',engineVersion:'0.1.0',exportedAt:new Date().toISOString(),synthetic:state.demo||state.dataset?.synthetic,
    disclaimer:'Experimental hypotheses, not verified locations. Scores are frequency errors, not probabilities. No calibrated position accuracy. Do not identify a person from this report.',
    file:{name:state.file?.name,size:state.file?.size,type:state.file?.type},decoding:state.decoded,search:state.config,
    signal:{duration:state.analysis.duration,sampleRate:state.analysis.sampleRate,fftSize:state.analysis.fftSize,hopSize:state.analysis.hopSize,tracks:state.analysis.tracks,warnings:state.analysis.warnings},
    data:{source:state.dataset?.source,license:state.dataset?.license,fetchedAt:state.dataset?.fetchedAt,flightCount:state.dataset?.flights.length,warnings:state.dataset?.warnings},result:state.result};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`echotrace-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Rapporten indeholder tid og kandidatområder. Del den med omtanke.');
}
root.addEventListener('click',e=>{
  const target=(e.target as Element).closest<HTMLElement>('[data-action],[data-scroll],[data-preset],[data-candidate]');if(!target)return;
  if(target.hasAttribute('disabled'))return;
  if(target.dataset.scroll){
    const go=()=>root.querySelector(`#${target.dataset.scroll}`)?.scrollIntoView({behavior:'smooth'});
    if(route()!=='#/'){location.hash='/';setTimeout(go,20);}else go();return;
  }
  if(target.dataset.preset){const presets:Record<string,[number,number]>={cph:[55.6761,12.5683],aar:[56.1629,10.2039],ber:[52.52,13.405]};const p=presets[target.dataset.preset];state.form.lat=String(p[0]);state.form.lon=String(p[1]);for(const name of ['lat','lon']){const el=root.querySelector<HTMLInputElement>(`input[name="${name}"]`);if(el)el.value=state.form[name];}return;}
  if(target.dataset.candidate!==undefined){state.selected=Number(target.dataset.candidate);render();return;}
  switch(target.dataset.action){
    case 'upload':fileInput.value='';fileInput.click();break;
    case 'demo':void loadDemo();break;
    case 'cancel':cancel();break;
    case 'capture':if(state.file)void analyzeFile(state.file,undefined,true);break;
    case 'import':dataInput.value='';dataInput.click();break;
    case 'clear-data':state.dataset=null;state.network=false;render();break;
    case 'report':exportReport();break;
    case 'reconfigure':state.result=null;state.stage='ready';render();root.querySelector('#search-section')?.scrollIntoView({behavior:'smooth'});break;
  }
});
root.addEventListener('input',e=>{
  const el=e.target as HTMLInputElement|HTMLSelectElement;
  if(!el.name)return;
  if(el.name==='consent')state.consent=(el as HTMLInputElement).checked;
  else if(el.name==='network')state.network=(el as HTMLInputElement).checked;
  else state.form[el.name]=el.value;
});
root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&(e.target as HTMLElement).id==='dropzone'){e.preventDefault();fileInput.click();}});
fileInput.onchange=()=>{if(fileInput.files?.[0])void analyzeFile(fileInput.files[0]);};
dataInput.onchange=async()=>{
  const file=dataInput.files?.[0];if(!file)return;
  try{state.dataset=await importFlights(file);state.error='';render();toast(`${state.dataset.flights.length} flybaner indlæst lokalt.`);}catch(error){state.error=error instanceof Error?error.message:'Data kunne ikke indlæses.';render();}
};
window.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();document.body.classList.add('file-drag');}});
window.addEventListener('dragleave',e=>{if(!e.relatedTarget)document.body.classList.remove('file-drag');});
window.addEventListener('drop',e=>{e.preventDefault();document.body.classList.remove('file-drag');if(e.dataTransfer?.files[0])void analyzeFile(e.dataTransfer.files[0]);});
window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0});});
window.addEventListener('beforeunload',()=>{controller.abort();worker?.terminate();if(state.blobUrl)URL.revokeObjectURL(state.blobUrl);});
render();
