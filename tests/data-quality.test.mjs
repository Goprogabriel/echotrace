import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProvider,parseFlightInput,parseReadsbTrace,importFlightFiles} from '../dist/js/core/data.js';
import {prepareFlight,interpolate} from '../dist/js/core/physics.js';
const t=1791028800;
const provider=(changes)=>({flights:[{flight_id:'sample',path:{type:'MultiLineString',coordinates:[[[12,55,10000],[12.001,55,10000],[12.002,55,10000],[12.003,55,10000]]]},timestamps:[[t,t+2,t+4,t+6]],...changes}]});
const row=(at,flags=0,alt=10000)=>[at,55,12+at*.0001,alt,100,90,flags,0,{flight:'TRACE01'}];
const trace=(rows)=>({icao:'abcdef',timestamp:t,t:'AT72',trace:rows});

test('QNH corrections use independent timestamps and never reach backwards',()=>{
 const d=parseProvider(provider({alt_correction_ft:[[[t+3,200],[t+5,-100]]]}),t,t+6,true);
 const p=d.flights[0].points;
 assert.deepEqual(p.map(p=>p.altM),[3048,3048,10200*.3048,9900*.3048]);
 assert.deepEqual(p.map(p=>p.altitudeReference),['pressure','pressure','qnh-msl','qnh-msl']);
 assert.equal(interpolate(prepareFlight(d.flights[0]),t+3),null);
 assert(d.warnings.some(w=>w.includes('QNH')));
});
test('QNH correction does not leak between coverage segments, including short gaps',()=>{
 const raw=provider({path:{type:'MultiLineString',coordinates:[[[12,55,10000],[12.001,55,10000]],[[12.002,55,10000],[12.003,55,10000]]]},timestamps:[[t,t+2],[t+4,t+6]],alt_correction_ft:[[[t,200]],[]]});
 const d=parseProvider(raw,t,t+6,true),p=d.flights[0].points;
 assert.equal(p[0].altM,10200*.3048);assert.equal(p[2].altM,3048);
 assert.equal(interpolate(prepareFlight(d.flights[0]),t+3),null);
});
test('Original readsb traces convert relative seconds and feet, and separate flight legs',()=>{
 const d=parseReadsbTrace(trace([row(0),row(2),row(4,2),row(6)]));
 assert.equal(d.flights.length,2);assert.equal(d.flights[0].callsign,'TRACE01');
 assert.equal(d.flights[0].points[0].t,t);assert.equal(d.flights[1].points[0].t,t+4);
 assert.equal(d.flights[0].points[0].altM,3048);assert.equal(d.flights[0].type,'AT72');
 assert.notEqual(d.flights[0].id,d.flights[1].id);
 assert.match(d.license,/kontrollér/);
});
test('Stale, ground and ellipsoid-height trace rows cannot bridge a valid flight',()=>{
 const d=parseReadsbTrace(trace([row(0),row(2),row(3,1),row(4),row(6),row(7,0,'ground'),row(8),row(9,8),row(10),row(12)]));
 const f=prepareFlight(d.flights[0]);
 assert.equal(interpolate(f,t+3),null);assert.equal(interpolate(f,t+7),null);assert.equal(interpolate(f,t+9),null);
 assert.notEqual(interpolate(f,t+1),null);
 assert.throws(()=>parseReadsbTrace(trace([row(2),row(0)])),/stigende tid/);
 assert.throws(()=>parseReadsbTrace({...trace([row(0),row(2)]),timestamp:t*1000}));
});
test('Native imports preserve data-quality fields and provider imports expose truncation',()=>{
 const d=parseFlightInput({...provider({}),cursor:'next'});
 assert.equal(d.flights[0].points[0].segment,0);assert.equal(d.flights[0].points[0].altitudeReference,'pressure');
 assert(d.warnings.some(w=>w.includes('flere sider')));
 const one=parseFlightInput(provider({}).flights[0]);assert.equal(one.flights.length,1);
 const again=parseFlightInput(d);assert.deepEqual(again.flights,d.flights);
});
test('Multiple files merge distinct routes, reject duplicate IDs and enforce total byte limit',async()=>{
 const file=(input)=>({name:'trace.json',size:100,text:async()=>JSON.stringify(input)});
 const d=await importFlightFiles([file(trace([row(0),row(2)])),file({...trace([row(4),row(6)]),icao:'123456'})]);
 assert.equal(d.flights.length,2);
 await assert.rejects(importFlightFiles([file(trace([row(0),row(2)])),file(trace([row(0),row(2)]))]),/unikke/);
 await assert.rejects(importFlightFiles([{size:26*1024*1024}]),/25 MB/);
});
