import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseFlights} from '../dist/js/core/flight-diagnostics.js';
import {matchFlights} from '../dist/js/core/matcher.js';
import {matchGlobalFlights} from '../dist/js/core/global-search.js';
import {analyzeSignal} from '../dist/js/core/signal.js';
import {validateSpectralSupport} from '../dist/js/core/spectral-support.js';
import {readFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL('../public/examples/'+name,import.meta.url),'utf8'));
const config=read('demo-session.json'),flights=read('demo-flights.json').flights;
function wav(){const b=readFileSync(new URL('../public/assets/demo.wav',import.meta.url));let at=12;while(b.toString('ascii',at,at+4)!=='data')at+=8+b.readUInt32LE(at+4);return Float32Array.from({length:b.readUInt32LE(at+4)/2},(_,i)=>b.readInt16LE(at+8+i*2)/32768);}
const analysis=analyzeSignal(wav(),8000);
test('Additional checks retain the honest demo, record insufficient null coverage and never alter shared offsets',()=>{
 const context={flights,tracks:analysis.tracks,config},r=matchFlights(analysis.tracks,flights,config);
 validateSpectralSupport(r,analysis,context);const offsets=r.candidates.map(c=>c.offset);
 diagnoseFlights(r,analysis,context);
 assert(r.candidates[0].accepted);assert.equal(r.candidates[0].diagnostics.independentEvents,2);
 assert(r.candidates.every(c=>offsets.includes(c.offset)));assert.equal(r.candidates[0].diagnostics.calibrated,false);
 assert(r.candidates[0].diagnostics.chanceMatch.some(c=>c.status==='insufficient'));
});
test('Country filter applies inside refinements and before candidate ranking',()=>{
 const r=matchGlobalFlights(analysis.tracks,flights,{...config,country:'DK'});
 assert(r.candidates.length);assert(r.candidates.every(c=>c.lat>=54.45&&c.lat<=57.9&&c.lon>=7.5&&c.lon<=15.3));
 assert.equal(r.search.country,'DK');
 assert.throws(()=>matchGlobalFlights(analysis.tracks,flights,{...config,country:'DE'}));
 const outside=matchFlights(analysis.tracks,flights,{...config,country:'DK',lat:30,lon:10});assert.equal(outside.candidates.length,0);
});
test('A repeated curve at other times is rejected by same-recording controls',()=>{
 const frames=1200,bins=200,fftSize=8000,sampleRate=8000,hopSize=800;
 const fake={frames,bins,fftSize,sampleRate,hopSize,minHz:0,duration:120,db:new Float32Array(frames*bins).fill(-90)};
 const predicted=Array.from({length:101},(_,i)=>({t:5+i/10,hz:100-i*.2}));
 // Fill every frequency in a narrow peak band in every frame: many disjoint windows
 // support this same repeated spectral pattern, so it is not time-specific evidence.
 for(let f=0;f<frames;f++)for(let b=78;b<=102;b++)fake.db[f*bins+b]=-30;
 const c={lat:56,lon:10,offset:0,misfit:.001,matches:[{trackId:'x',flightId:'f',predicted,spectralSupport:{contrastDb:1,samples:90}}],curveAccepted:true,accepted:true};
 const track={id:'x',start:5,end:15,points:predicted.map(p=>({...p,snr:20}))};
 diagnoseFlights({candidates:[c],warnings:[]},fake,{tracks:[track],flights:[],config:{clockUncertainty:0}});
 assert(c.diagnostics.chanceMatch[0].controls>=4);assert.equal(c.diagnostics.chanceMatch[0].status,'weak');assert.equal(c.accepted,false);
});
