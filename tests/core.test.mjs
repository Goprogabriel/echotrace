import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fft,haversine,offsetPosition} from '../dist/js/core/math.js';
import {analyzeSignal,analyzeSignalAdaptive} from '../dist/js/core/signal.js';
import {dopplerFactor,ecef,prepareFlight,interpolate} from '../dist/js/core/physics.js';
import {matchFlights} from '../dist/js/core/matcher.js';
import {parseDataset,parseCsv,parseProvider,epochSeconds,buildQuery} from '../dist/js/core/data.js';
const load=name=>JSON.parse(readFileSync(new URL(`../public/examples/${name}`,import.meta.url),'utf8'));
const config=load('demo-session.json'),dataset=parseDataset(load('demo-flights.json'));
function wav(){const b=readFileSync(new URL('../public/assets/demo.wav',import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');let at=12;while(b.toString('ascii',at,at+4)!=='data')at+=8+b.readUInt32LE(at+4);const start=at+8,len=b.readUInt32LE(at+4)/2;return Float32Array.from({length:len},(_,i)=>b.readInt16LE(start+i*2)/32768);}
let analysis;
test('FFT identifies a known sine frequency',()=>{const n=1024,r=Float64Array.from({length:n},(_,i)=>Math.sin(2*Math.PI*81*i/n)),im=new Float64Array(n);fft(r,im);let best=0;for(let i=1;i<n/2;i++)if(Math.hypot(r[i],im[i])>Math.hypot(r[best],im[best]))best=i;assert.equal(best,81);});
test('FFT rejects invalid lengths',()=>assert.throws(()=>fft(new Float64Array(17),new Float64Array(17))));
test('Epoch parser accepts zoned timestamps and rejects milliseconds/ambiguous time',()=>{assert.equal(epochSeconds('2026-08-18T11:00:00Z'),config.startTime);assert.equal(epochSeconds(config.startTime),config.startTime);assert.throws(()=>epochSeconds(config.startTime*1000));assert.throws(()=>epochSeconds('2026-08-18T11:00:00'));});
test('Flight import sorts timestamps, preserves SI units and rejects invalid positions',()=>{assert.equal(dataset.flights.length,2);assert.equal(dataset.flights[0].points[0].altM,2100);assert.equal(dataset.synthetic,true);assert.throws(()=>parseDataset({flights:[{id:'x',points:[{t:config.startTime,lat:999,lon:0,altM:100},{t:config.startTime+1,lat:0,lon:0,altM:100}]}]}));});
test('Duplicate flight IDs are rejected',()=>assert.throws(()=>parseDataset({flights:[dataset.flights[0],dataset.flights[0]]})));
test('CSV supports quoted callsigns and exact unit headers',()=>{const csv='flight_id,callsign,timestamp,lat,lon,alt_m\r\na,"TEST, ONE",2026-08-18T11:00:00Z,55,12,2500\r\na,"TEST, ONE",2026-08-18T11:00:02Z,55.001,12.001,2500';const d=parseCsv(csv);assert.equal(d.flights[0].callsign,'TEST, ONE');assert.equal(d.flights[0].points.length,2);assert.throws(()=>parseCsv('lat,lon\n55,12'));});
test('API parser uses nested timestamps, converts feet, and ignores independent sparse speed series',()=>{const t=config.startTime;const d=parseProvider({flights:[{flight_id:'a',callsign:'TEST',icao_type:'TEST',path:{type:'MultiLineString',coordinates:[[[12,55,10000],[12.01,55,10000],[12.02,55,10000]]]},timestamps:[[t,t+2,t+4]],path_gs:[[[t,450]]]}],cursor:'next'},t-10,t+20);assert.equal(d.flights.length,1);assert.equal(d.flights[0].points[0].altM,3048);assert.equal(d.flights[0].points[2].t,t+4);assert(d.warnings.some(w=>w.includes('afkortet')));});
test('Query uses historical time bounds, includes emission lookback, and requests trajectories',()=>{const q=buildQuery(config,64);assert.equal(q.include_path,true);assert.equal(q.limit,100);assert.equal(q.match.trajectory_intersects.geometry.coordinates[0],config.lon);assert(Date.parse(q.match.trajectory_intersects.time_from)/1000<config.startTime-300);assert.equal(q.window_days,2);});
test('Interpolation does not cross coverage gaps or extrapolate',()=>{const f=prepareFlight({id:'x',callsign:'x',points:[{t:100,lat:55,lon:12,altM:2000},{t:200,lat:55.01,lon:12,altM:2000}]});assert.equal(interpolate(f,150),null);assert.equal(interpolate(f,99),null);});
test('Retarded-time Doppler shifts approaching tones up and departing tones down',()=>{const f=prepareFlight(dataset.flights[0]),receiver=ecef(config.lat,config.lon,0);const approach=dopplerFactor(f,receiver,config.startTime-20,343),depart=dopplerFactor(f,receiver,config.startTime+90,343);assert(approach>1);assert(depart<1);assert.equal(dopplerFactor(f,receiver,config.startTime-500,343),null);});
test('Silence does not invent tonal tracks',()=>{const a=analyzeSignal(new Float32Array(8000*16),8000);assert.equal(a.tracks.length,0);assert(a.warnings.some(w=>w.includes('lavt lydniveau')));});
test('Stationary 100 Hz tone is not a Doppler ridge',()=>{const pcm=Float32Array.from({length:8000*16},(_,i)=>.2*Math.sin(2*Math.PI*100*i/8000));assert.equal(analyzeSignal(pcm,8000).tracks.length,0);});
test('Seeded white noise does not produce a matchable ridge',()=>{let seed=1090;const pcm=Float32Array.from({length:8000*20},()=>{seed=(1664525*seed+1013904223)>>>0;return(seed/4294967296-.5)*.1;});assert.equal(analyzeSignal(pcm,8000).tracks.length,0);});
test('Short audio is rejected',()=>assert.throws(()=>analyzeSignal(new Float32Array(4000),8000)));
test('Synthetic audio contains two independently detected falling tones',()=>{analysis=analyzeSignal(wav(),8000);assert.equal(analysis.tracks.length,2);assert(analysis.tracks.every(t=>t.coverage>.9&&t.driftHz>30));});
test('Matcher recovers a nearby synthetic hypothesis without reading ground truth',()=>{analysis??=analyzeSignal(wav(),8000);const r=matchFlights(analysis.tracks,dataset.flights,config);const truth=load('demo-ground-truth.json');assert(r.candidates.length>0);assert.equal(r.candidates[0].matchedFlights,2);assert.equal(r.candidates[0].accepted,true);assert(haversine(r.candidates[0],truth)<400);assert(r.candidates[0].matches.every(m=>m.predicted.length>20));assert(r.warnings.some(w=>w.includes('ikke bevis')));console.log('Synthetic position difference:',haversine(r.candidates[0],truth).toFixed(1),'m (not real-world validation).');});
test('No timestamp overlap produces no location pin',()=>{analysis??=analyzeSignal(wav(),8000);const r=matchFlights(analysis.tracks,dataset.flights,{...config,startTime:config.startTime+86400});assert.equal(r.candidates.length,0);assert(r.warnings.some(w=>w.includes('Ingen kandidater')));});
test('Matcher rejects missing data and unreasonable parameters',()=>{assert.throws(()=>matchFlights([],dataset.flights,config));analysis??=analyzeSignal(wav(),8000);assert.throws(()=>matchFlights(analysis.tracks,[],config));assert.throws(()=>matchFlights(analysis.tracks,dataset.flights,{...config,radiusKm:200}));assert.throws(()=>matchFlights(analysis.tracks,dataset.flights,{...config,lat:NaN}));});
test('Local metric offset and Haversine agree to within two metres',()=>{assert(Math.abs(haversine(config,offsetPosition(config.lat,config.lon,1000,0))-1000)<2);});

test('Very quiet audio keeps its Doppler tracks without an absolute dB cutoff',()=>{
  const quiet=wav().map(s=>s*1e-5), a=analyzeSignal(quiet,8000);
  assert.equal(a.tracks.length,2);
  assert(a.tracks.every(t=>t.driftHz>30));
});
test('Separate passages in the same frequency band survive a long silent interval',()=>{
  const sr=8000,pcm=new Float32Array(sr*140);
  for(const start of [15,100]){
    let phase=0;
    for(let i=0;i<sr*25;i++){
      const t=i/sr,hz=165-55*t/25;
      phase+=2*Math.PI*hz/sr;
      pcm[Math.round(start*sr)+i]=.03*Math.sin(phase)*Math.sin(Math.PI*t/25)**2;
    }
  }
  const a=analyzeSignal(pcm,sr);
  assert.equal(a.tracks.length,2);
  const events=[...a.tracks].sort((a,b)=>a.start-b.start);
  assert(events[0].end<50);assert(events[1].start>90);
  assert(events.every(t=>t.coverage<.3));
});
test('Resolution and band are configurable and non-finite samples cannot poison FFTs',()=>{
  const pcm=wav();pcm[10]=NaN;pcm[100]=Infinity;
  const a=analyzeSignal(pcm,8000,()=>{},{fftSize:16384,minHz:70,maxHz:450});
  assert.equal(a.fftSize,16384);assert(a.minHz>=70&&a.maxHz<=450);
  assert(a.db.every(Number.isFinite));assert(a.tracks.length>=1);
  assert.throws(()=>analyzeSignal(pcm,8000,()=>{},{fftSize:1000,minHz:30,maxHz:500}));
});
test('A recording with events 920 seconds apart preserves the original event times',()=>{
  const sr=2000,pcm=new Float32Array(sr*980);
  for(const start of [10,930]){
    let phase=0;
    for(let i=0;i<sr*30;i++){
      const t=i/sr;phase+=2*Math.PI*(220-50*t/30)/sr;
      pcm[start*sr+i]=.02*Math.sin(phase)*Math.sin(Math.PI*t/30)**2;
    }
  }
  const a=analyzeSignal(pcm,sr,()=>{},{fftSize:8192,minHz:100,maxHz:300});
  assert.equal(a.tracks.length,2);
  const events=[...a.tracks].sort((a,b)=>a.start-b.start);
  assert(Math.abs(events[1].start-events[0].start-920)<2);
  assert(a.db.length<=4_000_000);
});

test('Matcher refuses more than three selected tracks instead of silently dropping events',()=>{
  analysis??=analyzeSignal(wav(),8000);
  assert.throws(()=>matchFlights([...analysis.tracks,...analysis.tracks],dataset.flights,config),/højst tre/);
});

test('Adaptive resolution finds a weak known falling tone without relaxing detection rules',()=>{
  let seed=1090,phase=0;
  const pcm=Float32Array.from({length:8000*30},(_,i)=>{
    seed=(1664525*seed+1013904223)>>>0;
    phase+=2*Math.PI*(150-12*i/(8000*30))/8000;
    return(seed/4294967296-.5)*.05+.0008*Math.sin(phase);
  });
  assert.equal(analyzeSignal(pcm,8000).tracks.length,0);
  const a=analyzeSignalAdaptive(pcm,8000);
  assert.equal(a.fftSize,16384);assert.deepEqual(a.resolutionAttempts,[8192,16384]);
  assert.equal(a.tracks.length,1);
  const points=a.tracks[0].points;
  assert(Math.sqrt(points.reduce((s,p)=>s+(p.hz-(150-.4*p.t))**2,0)/points.length)<.5);
});
test('Adaptive passes do not turn a seeded noise path or silence into a tonal event',()=>{
  let seed=1090;
  const noise=Float32Array.from({length:8000*30},()=>{seed=(1664525*seed+1013904223)>>>0;return(seed/4294967296-.5)*.05;});
  for(const pcm of [noise,new Float32Array(8000*10)]){
    const a=analyzeSignalAdaptive(pcm,8000);assert.equal(a.tracks.length,0);
    assert(a.warnings.some(w=>w.includes('Ingen automatiske spor ved FFT')));
    assert.equal(a.fftSize,a.resolutionAttempts.at(-1));
  }
});
test('Adaptive analysis preserves an already detected demo without extra FFT attempts',()=>{
  const a=analyzeSignalAdaptive(wav(),8000);
  assert.equal(a.tracks.length,2);assert.deepEqual(a.resolutionAttempts,[8192]);
});


test('The complete synthetic location also passes off-curve audio controls',async()=>{
  const {validateSpectralSupport}=await import('../dist/js/core/spectral-support.js');
  analysis??=analyzeSignal(wav(),8000);
  const result=matchFlights(analysis.tracks,dataset.flights,config);
  validateSpectralSupport(result,analysis);
  assert.equal(result.candidates[0].accepted,true);
  assert.equal(result.candidates[0].audioEvidence,'supported');
  assert(result.candidates[0].matches.every(m=>m.spectralSupport.excessDb>3));
  assert.equal(result.audioValidation.calibrated,false);
  assert.equal(result.audioValidation.shiftsBins.length,6);
});
