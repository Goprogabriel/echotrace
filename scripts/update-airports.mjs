/** Enrich the Danish catalogue with public-domain OurAirports positions.
 * node scripts/update-airports.mjs [saved-airports.csv]
 * Run npm run build first; failures preserve the existing catalogue. */
import {readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {parseCatalog} from '../dist/js/core/source-catalog.js';
import {inRegion} from '../dist/js/core/regions.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const upstream='https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv';
const raw=process.argv[2]?await readFile(process.argv[2],'utf8'):await(async()=>{const r=await fetch(upstream,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(`OurAirports HTTP ${r.status}`);return r.text();})();
function csv(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(!quoted&&(c===','||c==='\n'||c==='\r')){row.push(field);field='';if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;rows.push(row);row=[];}}
    else field+=c;
  }
  if(quoted)throw Error('Unclosed CSV quote');if(field||row.length){row.push(field);rows.push(row);}return rows;
}
const [header,...rows]=csv(raw),needed=['ident','name','type','latitude_deg','longitude_deg','iso_country'];
if(needed.some(key=>!header.includes(key)))throw Error('Unexpected OurAirports columns');
const airports=rows.map(values=>Object.fromEntries(header.map((key,i)=>[key,values[i]])))
  .filter(r=>r.iso_country==='DK'&&['small_airport','medium_airport','large_airport'].includes(r.type))
  .map(r=>({id:`ourairports:${r.ident}`,country:'DK',kind:'airport',name:`${r.name} (${r.ident})`,lat:Number(r.latitude_deg),lon:Number(r.longitude_deg),
    url:`https://ourairports.com/airports/${encodeURIComponent(r.ident)}/`,provenance:'OurAirports · https://ourairports.com/data/',license:'Public domain'}))
  .filter(p=>inRegion(p,'DK'));
if(airports.length<10)throw Error('Unexpectedly few Danish airports; catalogue preserved');
const path=resolve(root,'public/data/dk-sources.json'),old=parseCatalog(JSON.parse(await readFile(path,'utf8')));
const coverage=old.coverage.split(' Flypladser:')[0]+` Flypladser: ${airports.length} geografiske punkter fra OurAirports; omfatter små, mellemstore og store flypladser, ikke heliporte eller registrerede lukkede pladser. Ingen garanti for aktuel driftsstatus eller flybanedækning.`;
const catalog=parseCatalog({...old,source:'Wikidata (CC0) + OurAirports (public domain)',license:'Kildernes egne licenser · CC0 / public domain',coverage,sources:[...old.sources.filter(p=>p.kind!=='airport'),...airports]});
const data=JSON.stringify(catalog,null,2)+'\n';await writeFile(path+'.tmp',data);await rename(path+'.tmp',path);
await writeFile(resolve(root,'public/data/dk-airports.provenance.json'),JSON.stringify({source:upstream,sourcePage:'https://ourairports.com/data/',fetchedAt:new Date().toISOString(),license:'Public domain',rawCsvSha256:createHash('sha256').update(raw).digest('hex'),count:airports.length,includedTypes:['small_airport','medium_airport','large_airport'],country:'DK',excluded:'heliports, closed airports, seaplane bases, Greenland, Faroe Islands',datasetSha256:createHash('sha256').update(data).digest('hex')},null,2)+'\n');
console.log(`Saved ${airports.length} Danish airport positions; no ADS-B or audio coverage inferred.`);
