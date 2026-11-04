/** Rebuild the bundled CC0 geographic catalogue. Never invent audio references.
 * Run: node scripts/update-source-catalog.mjs [saved-sparql-response.json ...]
 * Without files, performs one bounded public Wikidata query. Atomic replacement. */
import {readFile, writeFile, rename, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {inRegion} from '../dist/js/core/regions.js';
import {parseCatalog} from '../dist/js/core/source-catalog.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const QUERY=`SELECT ?item ?itemLabel ?coord ?class WHERE {
  VALUES ?class { wd:Q16970 wd:Q2977 wd:Q49833 wd:Q194356 }
  ?item wdt:P31 ?class; wdt:P17 wd:Q35; wdt:P625 ?coord.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "da,en". }
}`;
const files=process.argv.slice(2), sources=new Map();
const responses=files.length?await Promise.all(files.map(async file=>JSON.parse(await readFile(file,'utf8')))):[await (async()=>{
  const url=new URL('https://query.wikidata.org/sparql');url.searchParams.set('query',QUERY);url.searchParams.set('format','json');
  const r=await fetch(url,{signal:AbortSignal.timeout(45000),headers:{Accept:'application/sparql-results+json','User-Agent':'Echotrace/0.2 (https://github.com/Goprogabriel/echotrace)'}});
  if(!r.ok)throw new Error(`Wikidata HTTP ${r.status}; previous catalogue preserved.`);return r.json();
})()];
for(const response of responses){
  if(!Array.isArray(response.results?.bindings))throw new Error('Not a SPARQL results response.');
  for(const row of response.results.bindings){
    const klass=row.class?.value?.split('/').pop();
    const kind=['Q16970','Q2977'].includes(klass)?'church_bell':['Q49833','Q194356'].includes(klass)?'wind_turbine':null;
    const coordinate=/^Point\((-?[\d.]+) (-?[\d.]+)\)$/.exec(row.coord?.value||'');
    const qid=row.item?.value?.split('/').pop();
    if(!kind||!coordinate||!/^Q\d+$/.test(qid))continue;
    const point={lat:Number(coordinate[2]),lon:Number(coordinate[1])};if(!inRegion(point,'DK'))continue;
    const source={id:`wikidata:${qid}`,country:'DK',kind,name:row.itemLabel?.value||qid,...point,url:`https://www.wikidata.org/wiki/${qid}`};
    const previous=sources.get(source.id);
    // Multiple coordinates are not silently resolved into a spurious precise location.
    if(previous&&(previous.lat!==source.lat||previous.lon!==source.lon))continue;
    sources.set(source.id,source);
  }
}
const existing=await readFile(resolve(root,'public/data/dk-sources.json'),'utf8').then(JSON.parse).catch(()=>null);
const airports=existing?parseCatalog(existing).sources.filter(s=>s.kind==='airport'):[];
const catalog=parseCatalog({schema:'echotrace-sources/1',country:'DK',source:airports.length?'Wikidata (CC0) + OurAirports (public domain)':'Wikidata · structured data (CC0)',license:airports.length?'Kildernes egne licenser · CC0 / public domain':'CC0 1.0 · https://creativecommons.org/publicdomain/zero/1.0/',fetchedAt:new Date().toISOString(),
  coverage:'Ufuldstændigt dansk kortkatalog fra Wikidata. Kirker, enkelte møller og vindmølleparker; en parkposition er ikke hver enkelt mølles placering. Kirkebygninger er ikke verificerede aktive klokkekilder. Ingen stedbundne lydreferencer medfølger.',
  sources:[...sources.values()].map(s=>({...s,provenance:'Wikidata · structured data (CC0)',license:'CC0 1.0'})).concat(airports).sort((a,b)=>a.id.localeCompare(b.id)),references:[]});
if(catalog.sources.length<100)throw new Error('Unexpectedly small result; previous catalogue preserved.');
await mkdir(resolve(root,'public/data'),{recursive:true});
const path=resolve(root,'public/data/dk-sources.json'), data=JSON.stringify(catalog,null,2)+'\n';
await writeFile(path+'.tmp',data);await rename(path+'.tmp',path);
await writeFile(resolve(root,'public/data/dk-sources.provenance.json'),JSON.stringify({query:QUERY,retrievedAt:catalog.fetchedAt,sha256:createHash('sha256').update(data).digest('hex'),license:catalog.license,counts:{churches:catalog.sources.filter(s=>s.kind==='church_bell').length,windSites:catalog.sources.filter(s=>s.kind==='wind_turbine').length},rawResponseHashes:responses.map(r=>createHash('sha256').update(JSON.stringify(r)).digest('hex')),geography:'DK bounding box; excludes Greenland and the Faroe Islands',audioReferences:0},null,2)+'\n');
console.log(`Saved ${catalog.sources.length} real geographic sources; no audio references.`);
