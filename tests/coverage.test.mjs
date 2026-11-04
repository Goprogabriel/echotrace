import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coveragePoints,filterCoverage,clusterSources} from '../dist/js/core/coverage.js';
import {parseCatalog} from '../dist/js/core/source-catalog.js';
import {sourcesPage} from '../dist/js/pages/sources.js';
import {initialState} from '../dist/js/state.js';
const catalog=parseCatalog(JSON.parse(readFileSync(new URL('../public/data/dk-sources.json',import.meta.url),'utf8')));
const points=coveragePoints(catalog),filter={kinds:['church_bell','airport','wind_turbine'],query:'',referencesOnly:false};
test('Coverage includes actual Danish airport positions without claiming aircraft tracks or audio',()=>{
 const airports=points.filter(p=>p.kind==='airport');assert(airports.length>=100);assert(airports.every(p=>p.referenceCount===0&&p.provenance.includes('OurAirports')&&p.license==='Public domain'));
 assert(airports.some(p=>p.name.includes('Billund')));assert(points.some(p=>p.kind==='church_bell'));assert(points.some(p=>p.kind==='wind_turbine'));
});
test('Type, search and real-reference filters compose; zero layers yields zero points',()=>{
 const airports=filterCoverage(points,{...filter,kinds:['airport']});assert(airports.every(p=>p.kind==='airport'));
 assert.equal(filterCoverage(points,{...filter,kinds:[]}).length,0);
 const found=filterCoverage(points,{...filter,query:'  bILLUND  '});assert(found.some(p=>p.kind==='airport'&&p.name.includes('Billund')));
 assert.equal(filterCoverage(points,{...filter,referencesOnly:true}).length,0);
 const sample={sources:catalog.sources.slice(0,2),references:[{sourceId:catalog.sources[0].id,synthetic:false},{sourceId:catalog.sources[0].id,synthetic:true},{sourceId:catalog.sources[1].id,synthetic:true}]};
 assert.deepEqual(coveragePoints(sample).map(p=>p.referenceCount),[1,0]);assert.equal(filterCoverage(coveragePoints(sample),{...filter,referencesOnly:true}).length,1);
});
test('Marker clusters retain every in-view source and keep categories separate',()=>{
 const samples=[{...points[0],kind:'church_bell'},{...points[0],id:'airport-test',kind:'airport'},{...points[0],id:'bell-test',kind:'church_bell'}];
 const clusters=clusterSources(samples,()=>[50,50],400,300,6);
 assert.equal(clusters.length,2);assert.equal(clusters.find(c=>c.kind==='church_bell').points.length,2);assert.equal(clusters.reduce((n,c)=>n+c.points.length,0),3);
 assert.equal(clusterSources(samples,()=>[1000,1000],400,300,6).length,0);
});
test('Airport sources cannot masquerade as acoustic references',()=>{
 const c=structuredClone(catalog),airport=c.sources.find(s=>s.kind==='airport');
 c.references=[{id:'bad',sourceId:airport.id,kind:'airport',signature:{},provenance:'test',license:'test',synthetic:false}];assert.throws(()=>parseCatalog(c));
});
test('Coverage page is available without uploading audio; names and source details are escaped',()=>{
 const state={...initialState(),catalog},view={filter,selectedId:points.find(p=>p.kind==='airport').id,page:0};
 const html=sourcesPage(state,view);assert(html.includes('id="coverage-map"'));assert(html.includes('data-source-kind="airport"'));assert(html.includes('Kun steder med lydreferencer'));assert(html.includes('En flyplads er ikke en flybane.'));
 const evil=structuredClone(state);evil.catalog.sources[0].name='<script>alert(1)</script>';
 const escaped=sourcesPage(evil,{...view,selectedId:evil.catalog.sources[0].id});assert(!escaped.includes('<script>'));assert(escaped.includes('&lt;script&gt;'));
 const empty=sourcesPage(initialState(),view);assert(empty.includes('Indlæser datakilder'));assert(!empty.includes('undefined'));
});
