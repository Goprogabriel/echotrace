import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeSignal} from '../dist/js/core/signal.js';
import {matchGlobalFlights} from '../dist/js/core/global-search.js';
import {parseDataset, buildQuery, fetchFlights} from '../dist/js/core/data.js';
import {haversine, offsetPosition} from '../dist/js/core/math.js';
import {initialState} from '../dist/js/state.js';
import {labPage} from '../dist/js/pages/lab.js';
const load=name=>JSON.parse(readFileSync(new URL(`../public/examples/${name}`,import.meta.url)));
const session=load('demo-session.json');
const config={...session,global:true,lat:0,lon:0};
const dataset=parseDataset(load('demo-flights.json'));
const wav=readFileSync(new URL('../public/assets/demo.wav',import.meta.url));
const pcm=Float32Array.from({length:(wav.length-44)/2},(_,i)=>wav.readInt16LE(44+i*2)/32768);
const analysis=analyzeSignal(pcm,8000);
const rotate=(f,angle)=>({...f,id:f.id+angle,points:f.points.map(p=>({...p,lon:((p.lon+angle+180)%360+360)%360-180}))});
const provider=f=>({flight_id:f.id,callsign:f.callsign,path:{type:'MultiLineString',coordinates:[f.points.map(p=>[p.lon,p.lat,p.altM/.3048])]},timestamps:[f.points.map(p=>p.t)]});

test('Global query contains time bounds and no geographic filter or assumed city',()=>{
 const q=buildQuery(config,analysis.duration);
 assert.equal(q.match.trajectory_intersects.geometry,undefined);
 assert.equal(q.include_path,true);assert.equal(q.limit,100);
 assert(Date.parse(q.start_from)<config.startTime*1000-86400*1000);
 assert(Date.parse(q.match.trajectory_intersects.time_from)<config.startTime*1000-300000);
});
test('Global matcher finds the synthetic location with no receiver coordinates',()=>{
 const r=matchGlobalFlights(analysis.tracks,dataset.flights,{...config,lat:NaN,lon:NaN,radiusKm:NaN});
 assert(r.candidates[0].accepted);assert.equal(r.candidates[0].matchedFlights,2);
 assert(haversine(r.candidates[0],load('demo-ground-truth.json'))<1000);
 assert.equal(r.search.mode,'global');assert.equal(r.search.flightsScanned,2);assert.equal(r.search.exhaustive,false);
});
test('Global search follows flight locations across the dateline',()=>{
 const r=matchGlobalFlights(analysis.tracks,dataset.flights.map(f=>rotate(f,167.5)),config);
 const truth=load('demo-ground-truth.json');truth.lon=((truth.lon+167.5+180)%360+360)%360-180;
 assert(r.candidates[0].accepted);assert(haversine(r.candidates[0],truth)<1000);
 assert(r.candidates.every(c=>Math.abs(c.lon)<=180&&Math.abs(c.lat)<=90));
});
test('Identical flight geometries on different continents remain ambiguous',()=>{
 const r=matchGlobalFlights(analysis.tracks,[...dataset.flights,...dataset.flights.map(f=>rotate(f,-120))],config);
 const accepted=r.candidates.filter(c=>c.accepted);
 assert(accepted.length>=2);assert(accepted.some(c=>haversine(c,accepted[0])>1_000_000));
 assert(r.warnings.some(w=>w.includes('tvetydigt')));
});
test('Missing time overlap returns no invented place',()=>{
 const r=matchGlobalFlights(analysis.tracks,dataset.flights,{...config,startTime:config.startTime+86400});
 assert.equal(r.candidates.length,0);assert.equal(r.search.flightsScanned,0);
 assert.throws(()=>matchGlobalFlights([],dataset.flights,config));
 assert.throws(()=>matchGlobalFlights(analysis.tracks,dataset.flights,{...config,soundSpeed:0}));
});
test('Geodesic offsets remain finite at the poles and wrap longitude',()=>{
 for(const lat of [-90,90]){const p=offsetPosition(lat,179.9,10000,10000);assert(Number.isFinite(p.lat)&&Number.isFinite(p.lon));assert(Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180);}
});
test('Search form asks for time and never latitude, longitude or radius',()=>{
 const html=labPage({...initialState(),soundTab:'aircraft',analysis,selectedTracks:analysis.tracks.map(t=>t.id)});
 assert(html.includes('name="date"'));assert(html.includes('Søg i Danmark'));
 assert(!/name="(?:lat|lon|radius)"|id="search-map"|data-preset/.test(html));
});
test('Global retrieval follows cursors, deduplicates and records actual completeness',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});const bodies=[];
 globalThis.fetch=async (url,options)=>{
  if(String(url).endsWith('/data-range'))return Response.json({first_date:'2026-01-01',last_date:'2026-12-31'});
  const body=JSON.parse(options.body);bodies.push(body);
  return Response.json(body.cursor?{flights:dataset.flights.map(provider),cursor:null}:{flights:[provider(dataset.flights[0])],cursor:'page-2'});
 };
 const r=await fetchFlights(config,analysis.duration);
 assert.equal(r.flights.length,2);assert.equal(r.retrieval.pages,2);assert.equal(r.retrieval.complete,true);
 assert.equal(r.retrieval.rawFlights,3);assert.equal(bodies[1].cursor,'page-2');
 assert(bodies.every(b=>b.start_from===bodies[0].start_from&&!b.match.trajectory_intersects.geometry));
 assert(!r.warnings.some(w=>w.includes('afkortet')));
});
test('Global retrieval exposes safety limits instead of claiming all data was fetched',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});let pages=0;
 globalThis.fetch=async url=>String(url).endsWith('/data-range')?Response.json({first_date:'2026-01-01',last_date:'2026-12-31'}):Response.json({flights:[provider(dataset.flights[0])],cursor:`page-${++pages}`});
 const r=await fetchFlights(config,analysis.duration);
 assert.equal(r.retrieval.complete,false);assert.equal(r.retrieval.pages,200);
 assert.match(r.retrieval.reason,/200 sider/);assert.equal(r.flights.length,1);
});
test('Global retrieval stops repeated cursors and surfaces network errors',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
 globalThis.fetch=async url=>String(url).endsWith('/data-range')?Response.json({first_date:'2026-01-01',last_date:'2026-12-31'}):Response.json({flights:[provider(dataset.flights[0])],cursor:'same'});
 await assert.rejects(fetchFlights(config,analysis.duration),/gentog/);
 globalThis.fetch=async()=>{throw new TypeError('network failed');};
 await assert.rejects(fetchFlights(config,analysis.duration),/kunne ikke kontaktes/);
});
