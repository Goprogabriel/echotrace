import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeSignalAdaptive} from '../dist/js/core/signal.js';
import {compareSpectralControls} from '../dist/js/core/spectral-support.js';

test('Multiple seeded noise, tonal background and burst mixtures produce no Doppler ridges',()=>{
 const sr=8000,seconds=18;
 for(const kind of ['white','coloured','stationary','bursts']){
  for(const initialSeed of [47,1090,7139]){
   let seed=initialSeed,filtered=0;
   const pcm=Float32Array.from({length:sr*seconds},(_,i)=>{
    seed=(1664525*seed+1013904223)>>>0;const noise=(seed/4294967296-.5)*.05;
    filtered=.97*filtered+noise*.03;
    if(kind==='white')return noise;
    if(kind==='coloured')return filtered;
    const tone=.01*Math.sin(2*Math.PI*137*i/sr)+.008*Math.sin(2*Math.PI*311*i/sr);
    return noise+tone*(kind==='bursts'?Math.sin(Math.PI*i/(sr*2))**8:1);
   });
   const a=analyzeSignalAdaptive(pcm,sr);
   assert.equal(a.tracks.length,0,`${kind}/${initialSeed}`);
   // Direct comparison against a plausible falling curve is also a negative control.
   const predicted=Array.from({length:80},(_,i)=>({t:2+i*14/79,hz:200-i*.5}));
   assert.notEqual(compareSpectralControls(a,predicted)?.status,'supported',`${kind}/${initialSeed} spectral`);
  }
 }
});
