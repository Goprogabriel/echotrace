import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeBells} from '../dist/js/core/bells.js';
import {signature} from '../dist/js/core/sound-scan.js';
const sr=8000;
function peal(gain=1){
 return Float32Array.from({length:sr*24},(_,i)=>{
  const t=i/sr;let result=0;
  for(const [base,period,offset] of [[201,1.9,0],[251,2.3,.7],[303,2.7,1.2]]){
   const tau=(t+offset)%period,amp=.25+.75*Math.exp(-tau*2);
   for(const ratio of [1,1.19,1.5,2,2.72]){
    // Integral of a slowly wobbling modal frequency, not an arbitrary volume pulse.
    const freq=base*ratio,phase=2*Math.PI*freq*t-.012*freq*Math.cos(2*Math.PI*t/period)*period;
    result+=gain*.012*amp*Math.sin(phase);
   }
  }return result;
 });
}
test('Overlapping swinging resonances survive when RMS strike gating misses the peal',()=>{
 const pcm=peal(),old=signature(pcm,sr,0,20),b=analyzeBells(pcm,sr);
 assert(old.onsetRate<.09||old.tonality<.45,'Fixture exercises the old false-negative mode');
 assert(b.windows.every(w=>w.accepted));assert(b.events.length>10);assert(b.intervals.length>0);
 assert(b.events.every((e,i)=>!i||e.t-b.events[i-1].t>=.35-1e-8));
});
test('Unchanging inharmonic resonances, harmonic machine pulses and noise do not become bells',()=>{
 let seed=991;const noise=Float32Array.from({length:sr*20},()=>{seed=(1664525*seed+1013904223)>>>0;return(seed/4294967296-.5)*.1;});
 const stationary=Float32Array.from({length:sr*20},(_,i)=>[201,251,405,607,1034].reduce((s,h)=>s+.03*Math.sin(2*Math.PI*h*i/sr),0));
 const machine=Float32Array.from({length:sr*20},(_,i)=>[200,400,600,800].reduce((s,h)=>s+.03*Math.sin(2*Math.PI*h*i/sr),0)*(1+.7*Math.sin(2*Math.PI*.7*i/sr)));
 for(const pcm of [noise,stationary,machine,new Float32Array(sr*20)]){
  const b=analyzeBells(pcm,sr);assert(!b.windows.some(w=>w.accepted));assert.equal(b.events.length,0);assert.equal(b.intervals.length,0);
 }
});
test('Ringing intervals do not bridge a long silent gap despite overlapping screening windows',()=>{
 const pcm=new Float32Array(sr*70);pcm.set(peal());pcm.set(peal(),sr*45);
 const b=analyzeBells(pcm,sr);assert(b.intervals.some(p=>p.start<20));assert(b.intervals.some(p=>p.start>=44));assert(!b.intervals.some(p=>p.start<30&&p.end>40));
 assert(!b.events.some(e=>e.t>=26&&e.t<=43));
});
test('Quiet recordings retain proposals; non-finite samples cannot poison frame evidence',()=>{
 const loud=analyzeBells(peal(),sr),pcm=peal(.001);pcm[500]=NaN;pcm[600]=Infinity;
 const quiet=analyzeBells(pcm,sr);assert(quiet.windows.every(w=>w.accepted));assert(Math.abs(loud.events.length-quiet.events.length)<4);
 assert(quiet.windows.every(w=>Number.isFinite(w.tonalFraction)&&Number.isFinite(w.inharmonicFraction)));
});
