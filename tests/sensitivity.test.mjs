import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sensitivityProfile,audioValidation} from '../dist/js/core/sensitivity.js';
import {analyzeSignal} from '../dist/js/core/signal.js';
import {compareSpectralControls} from '../dist/js/core/spectral-support.js';
import {matchFlights} from '../dist/js/core/matcher.js';
import {dopplerFactor,ecef,prepareFlight} from '../dist/js/core/physics.js';
import {initialState} from '../dist/js/state.js';
import {sensitivityPending} from '../dist/js/components/sensitivity.js';

const load=name=>JSON.parse(readFileSync(new URL(`../public/examples/${name}`,import.meta.url)));

test('A single sensitivity value changes all criteria monotonically and preserves the normal defaults',()=>{
 const normal=sensitivityProfile();assert.equal(normal.value,50);
 assert.equal(normal.minDurationSeconds,8);assert.equal(normal.maxRelativeRmse,.02);
 assert.equal(normal.minPointContrastDb,10);assert.equal(normal.minContrastDb,3);
 for(let level=1;level<=100;level++){
  const a=sensitivityProfile(level-1),b=sensitivityProfile(level);
  for(const key of ['minDurationSeconds','minPointContrastDb','minTrackCoverage','minFitCoverage','minImprovement','minContrastDb','minExcessDb','minTemporalExcessDb','minSupportedFraction','minAudioCoverage','minSamples'])assert(b[key]<=a[key],`${key}/${level}`);
  for(const key of ['maxRelativeRmse','maxTrackRmse','maxVariationRatio'])assert(b[key]>=a[key],`${key}/${level}`);
 }
 for(const value of [-1,101,NaN,Infinity])assert.throws(()=>sensitivityProfile(value));
 assert.equal(sensitivityProfile(100).calibrated,false);assert.equal(audioValidation(100).sensitivity,100);
});
test('Sensitivity controls real audio acceptance rather than just changing a displayed number',()=>{
 const a={sampleRate:128,fftSize:128,hopSize:16,frames:16,bins:192,minHz:0,db:new Float32Array(16*192).fill(-70)};
 const curve=Array.from({length:16},(_,f)=>({t:.5+f/8,hz:100-f}));
 curve.forEach((p,f)=>a.db[f*192+p.hz]=-68);
 assert.equal(compareSpectralControls(a,curve,audioValidation(50)).status,'weak');
 assert.equal(compareSpectralControls(a,curve,audioValidation(100)).status,'supported');
 a.db.fill(-70);assert.notEqual(compareSpectralControls(a,curve,audioValidation(100)).status,'supported');
});
test('A seven-second ideal flight curve needs the relaxed duration limit',()=>{
 const config=load('demo-session.json'),truth=load('demo-ground-truth.json'),flight=load('demo-flights.json').flights[0];
 const local={...config,lat:truth.lat,lon:truth.lon,radiusKm:1,startTime:config.startTime+20};
 const f=prepareFlight(flight),receiver=ecef(local.lat,local.lon,local.receiverAltitudeM);
 const points=Array.from({length:64},(_,i)=>{const t=i*7/63;return{t,hz:130*dopplerFactor(f,receiver,local.startTime+t,local.soundSpeed),snr:20};});
 const track={id:'SHORT',source:'auto',start:0,end:7,points,coverage:1,driftHz:points[0].hz-points.at(-1).hz,medianSnr:20};
 assert(!matchFlights([track],[flight],{...local,sensitivity:50}).candidates.some(c=>c.accepted));
 const relaxed=matchFlights([track],[flight],{...local,sensitivity:100});
 assert(relaxed.candidates.some(c=>c.accepted));assert.equal(relaxed.sensitivityProfile.value,100);
 assert.equal(relaxed.candidates[0].matches[0].durationSeconds,7);
});
test('Changed settings require a new signal analysis before searching',()=>{
 const state=initialState();state.analysis={sensitivity:50};assert.equal(sensitivityPending(state),false);
 state.sensitivity=85;assert.equal(sensitivityPending(state),true);
 state.analysis.sensitivity=85;assert.equal(sensitivityPending(state),false);
});
test('High sensitivity still rejects fixed Doppler models in seeded noise and stationary backgrounds',()=>{
 const sr=8000;
 for(const kind of ['white','stationary'])for(const initialSeed of [47,1090,7139]){
  let seed=initialSeed;
  const pcm=Float32Array.from({length:sr*18},(_,i)=>{seed=(1664525*seed+1013904223)>>>0;return(seed/4294967296-.5)*.05+(kind==='stationary'?.015*Math.sin(2*Math.PI*137*i/sr):0);});
  const a=analyzeSignal(pcm,sr,()=>{},{fftSize:8192,minHz:30,maxHz:1000,sensitivity:100});
  const curve=Array.from({length:80},(_,i)=>({t:2+i*14/79,hz:200-i*.5}));
  assert.notEqual(compareSpectralControls(a,curve,audioValidation(100))?.status,'supported',`${kind}/${initialSeed}`);
 }
});


test('Changing sensitivity retains the chosen event instead of selecting newly admitted noise',async()=>{
 const {selectTracksAfterAnalysis}=await import('../dist/js/core/tracks.js');
 const track=(id,hz)=>({id,start:0,end:20,points:[{t:0,hz},{t:10,hz:hz-10},{t:20,hz:hz-20}]});
 const old=track('S2',150),next=[track('S1',300),track('S4',150),track('S5',600)];
 assert.deepEqual(selectTracksAfterAnalysis([old],next),['S4']);
 assert.deepEqual(selectTracksAfterAnalysis([],next),[]);
 assert.deepEqual(selectTracksAfterAnalysis(null,next),['S1','S4','S5']);
});
