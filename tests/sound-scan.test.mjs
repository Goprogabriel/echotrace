import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {signature,screenSounds,signatureDistance} from '../dist/js/core/sound-scan.js';
import {parseCatalog,matchSources,mergeCatalogs,referenceBundle} from '../dist/js/core/source-catalog.js';
import {harmonicGroups,selectTracksAfterAnalysis} from '../dist/js/core/tracks.js';
import {inRegion} from '../dist/js/core/regions.js';
const sr=8000;
const bells=(gain=1,shift=0,rate=sr)=>Float32Array.from({length:rate*24},(_,i)=>{const t=i/rate,u=t%3;return u<2.5?[330,517,701,1023].reduce((s,h,j)=>s+gain*.1*Math.sin(2*Math.PI*(h+shift)*t)*Math.exp(-u*(1+j*.15)),0):0;});
const noise=(modulated=false)=>{let seed=123;return Float32Array.from({length:sr*24},(_,i)=>{seed=(1664525*seed+1013904223)>>>0;return(seed/4294967296-.5)*.1*(modulated?1+.6*Math.sin(2*Math.PI*.8*i/sr):1);});};
const scan=(pcm,rate=sr)=>screenSounds(pcm,rate,{tracks:[]});
const kind=(s,k)=>s.detections.find(d=>d.kind===k).status;
const source={id:'test:church',country:'DK',kind:'church_bell',name:'Test source, not a real recording',lat:56,lon:10,url:'https://example.test/source'};
const reference={id:'test:ref',sourceId:source.id,kind:source.kind,signature:signature(bells(),sr),provenance:'Test fixture',license:'CC0',synthetic:false};
const bundle=()=>referenceBundle(source,reference);
test('Repeated decaying inharmonic tones trigger bell screening without any Doppler track',()=>{
 const s=scan(bells());assert.equal(kind(s,'church_bell'),'possible');assert.equal(kind(s,'aircraft'),'no_evidence');assert.equal(kind(s,'wind_turbine'),'no_evidence');assert(s.detections[1].segments.length);
});
test('Modulated broadband noise is only an experimental turbine-like indication',()=>{
 const s=scan(noise(true));assert.equal(kind(s,'wind_turbine'),'possible');assert.equal(kind(s,'church_bell'),'no_evidence');assert.equal(s.calibrated,false);
});
test('Silence, stationary tones and seeded unmodulated noise yield no source location or indication',()=>{
 for(const pcm of [new Float32Array(sr*24),noise(),Float32Array.from({length:sr*24},(_,i)=>.1*Math.sin(2*Math.PI*300*i/sr))]){
  const s=scan(pcm);assert(s.detections.every(d=>d.status==='no_evidence'));assert.deepEqual(matchSources(s,bundle()),[]);
 }
});
test('Mixed clips preserve both bell and modulated-noise windows and actual event times',()=>{
 const pcm=new Float32Array(sr*50);pcm.set(bells());pcm.set(noise(true),sr*26);
 const s=scan(pcm);assert.equal(kind(s,'church_bell'),'possible');assert.equal(kind(s,'wind_turbine'),'possible');assert(s.detections.find(d=>d.kind==='wind_turbine').segments.some(w=>w.start>=20));
});
test('Descriptors retain frequency and gain invariance across recording rates',()=>{
 const a=signature(bells(),sr),quiet=signature(bells(.001),sr),resampled=signature(bells(1,0,48000),48000);
 assert(signatureDistance(a,quiet)<1e-8);assert(signatureDistance(a,resampled)<.01);
 assert(signatureDistance(a,signature(bells(1,100),sr))>.055);
});
test('Catalog metadata alone never supplies a place match; references retain source vs microphone distinction',()=>{
 const c=bundle(),s=scan(bells());assert.equal(matchSources(s,{...c,references:[]}).length,0);
 const m=matchSources(s,c);assert.equal(m.length,1);assert.equal(m[0].receiverLocationKnown,false);assert.equal(m[0].status,'reference_similarity');
 assert.equal(matchSources(s,{...c,references:[{...reference,synthetic:true}]}).length,0);
 assert.equal(matchSources(scan(bells(1,100)),c).length,0);
});
test('Catalog importer rejects country errors, conflicts, malformed signatures, unknown sources and unsafe links',()=>{
 const c=bundle();
 for(const mutate of [x=>x.country='DE',x=>x.sources[0].lat=20,x=>x.sources[0].url='javascript:alert(1)',x=>x.references[0].signature.spectrum=[1],x=>x.references[0].signature.periodicity=NaN,x=>x.references[0].sourceId='missing',x=>x.sources.push(x.sources[0]),x=>x.references[0].synthetic='false']){
  const invalid=structuredClone(c);mutate(invalid);assert.throws(()=>parseCatalog(invalid));
 }
 assert.throws(()=>mergeCatalogs(c,{...c,sources:[{...source,lat:56.1}]}));
});
test('Bundled Danish real geography has provenance and contains no invented acoustic references',()=>{
 const c=parseCatalog(JSON.parse(readFileSync(new URL('../public/data/dk-sources.json',import.meta.url),'utf8')));
 assert(c.sources.length>2000);assert(c.sources.some(s=>s.kind==='wind_turbine'));assert.equal(c.references.length,0);assert(c.sources.every(s=>inRegion(s,'DK')));assert(c.coverage.includes('Ufuldstændigt'));
});
function track(id,multiple=1,shift=0){return {id,start:shift,end:20+shift,medianSnr:20,points:Array.from({length:41},(_,i)=>({t:shift+i/2,hz:multiple*(200-i),snr:20}))};}
test('Harmonics are anchor-grouped without counting the same flyby as independent evidence',()=>{
 const a=track('fund'),b=track('h2',2),c=track('other',1,40);
 assert.deepEqual(harmonicGroups([b,c,a]).map(g=>g.map(t=>t.id)),[['fund','h2'],['other']]);
 assert.deepEqual(selectTracksAfterAnalysis(null,[a,b,c]),['fund','other']);
 assert.equal(harmonicGroups([a,track('different-curve',2.2)]).length,2);
});
