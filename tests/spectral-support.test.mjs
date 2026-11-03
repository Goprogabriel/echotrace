import test from 'node:test';
import assert from 'node:assert/strict';
import {measureSpectralSupport,attachSpectralSupport} from '../dist/js/core/spectral-support.js';

const fixture=()=>({sampleRate:128,fftSize:128,hopSize:16,frames:16,bins:64,minHz:0,db:new Float32Array(16*64).fill(-70)});
const curve=Array.from({length:16},(_,i)=>({t:.5+i/8,hz:40-i}));
test('Spectral evidence distinguishes a falling tone from a displaced curve',()=>{
  const a=fixture();
  for(let f=0;f<16;f++)a.db[f*64+40-f]=-40;
  const on=measureSpectralSupport(a,curve);
  const off=measureSpectralSupport(a,curve.map(p=>({...p,hz:p.hz+15})));
  assert.equal(on.contrastDb,30);assert.equal(on.coverage,1);assert.equal(on.samples,16);
  assert.equal(off.contrastDb,0);
});
test('Uniform background has zero evidence; missing bins and time are not clamped to data',()=>{
  const a=fixture();assert.equal(measureSpectralSupport(a,curve).contrastDb,0);
  assert.equal(measureSpectralSupport(a,[{t:-1,hz:40},{t:100,hz:40},{t:1,hz:2}]),undefined);
  const partial=measureSpectralSupport(a,[curve[0],{t:100,hz:40}]);
  assert.equal(partial.coverage,.5);
});
test('Diagnostic preserves candidate order, error and acceptance',()=>{
  const a=fixture();const result={candidates:[{misfit:.01,accepted:true,matches:[{predicted:curve}]}]};
  attachSpectralSupport(result,a);assert.equal(result.candidates[0].misfit,.01);
  assert.equal(result.candidates[0].accepted,true);assert.equal(result.candidates[0].matches[0].spectralSupport.contrastDb,0);
});

const wideFixture=()=>({sampleRate:128,fftSize:128,hopSize:16,frames:16,bins:192,minHz:0,db:new Float32Array(16*192).fill(-70)});
const wideCurve=curve.map(p=>({...p,hz:p.hz+60}));
const {compareSpectralControls,validateSpectralSupport}=await import('../dist/js/core/spectral-support.js');
test('A planted falling tone must beat all six controls at identical times',()=>{
 const a=wideFixture();wideCurve.forEach((p,f)=>a.db[f*192+p.hz]=-40);
 const r=compareSpectralControls(a,wideCurve);
 assert.equal(r.status,'supported');assert.equal(r.controls,6);assert.equal(r.excessDb,30);assert.equal(r.coverage,1);
 // An equally strong nearby ridge makes the result ambiguous, rather than better.
 wideCurve.forEach((p,f)=>a.db[f*192+p.hz+20]=-40);
 assert.equal(compareSpectralControls(a,wideCurve).status,'weak');
});
test('Flat noise and a phantom curve cannot pass final audio acceptance',()=>{
 const result={candidates:[{accepted:true,misfit:.001,matches:[{predicted:wideCurve}]}],warnings:[]};
 validateSpectralSupport(result,wideFixture());
 assert.equal(result.candidates[0].curveAccepted,true);assert.equal(result.candidates[0].accepted,false);
 assert.equal(result.candidates[0].audioEvidence,'weak');assert(result.warnings.some(w=>w.includes('Ingen kurvekandidater')));
});
test('Insufficient or unequal control coverage cannot count as audio support',()=>{
 const a=wideFixture();wideCurve.forEach((p,f)=>a.db[f*192+p.hz]=-40);
 const outside=wideCurve.map((p,i)=>({...p,t:i<8?p.t:100}));
 assert.equal(compareSpectralControls(a,outside).status,'insufficient');
 assert.equal(compareSpectralControls(a,wideCurve.slice(0,8)).status,'insufficient');
 assert.equal(compareSpectralControls(a,[{t:1,hz:2}]),undefined);
});
