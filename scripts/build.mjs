import {cpSync, existsSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
rmSync('dist',{recursive:true,force:true});mkdirSync('dist',{recursive:true});cpSync('public','dist',{recursive:true});
const local=resolve('node_modules/typescript/bin/tsc');
const custom=process.env.TSC_PATH;
const result=existsSync(local)?spawnSync(process.execPath,[local,'--pretty','false'],{stdio:'inherit'}):custom?spawnSync(process.execPath,[custom,'--pretty','false'],{stdio:'inherit'}):spawnSync('tsc',['--pretty','false'],{stdio:'inherit',shell:process.platform==='win32'});
if(result.error||result.status!==0){console.error('Build failed. Install development dependencies with npm install, then npm run build.');process.exit(1);}
for(const notice of ['LICENSE','THIRD_PARTY_NOTICES.md'])if(existsSync(notice))cpSync(notice,`dist/${notice}`);
mkdirSync('dist/js/workers',{recursive:true});cpSync('src/workers/capture-worklet.js','dist/js/workers/capture-worklet.js');
// Content-address the complete browser module graph. A new entry point alone is
// insufficient: its relative imports and workers would still reuse cached URLs.
// Keep the ordinary compiler output for tests and source inspection.
const hash=createHash('sha256');
function hashTree(directory){
  for(const entry of readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
    const path=`${directory}/${entry.name}`;
    if(entry.isDirectory())hashTree(path);else{hash.update(path);hash.update(readFileSync(path));}
  }
}
hashTree('dist/js');hash.update(readFileSync('dist/styles.css'));
const version=hash.digest('hex').slice(0,16),runtime=`dist/runtime/${version}`;
mkdirSync(runtime,{recursive:true});cpSync('dist/js',`${runtime}/js`,{recursive:true});cpSync('dist/styles.css',`${runtime}/styles.css`);
const html=readFileSync('dist/index.html','utf8').replace('./js/app.js',`./runtime/${version}/js/app.js`).replace('./styles.css',`./runtime/${version}/styles.css`);
writeFileSync('dist/index.html',html);
console.log('Built dist/. Versioned modules, workers and styles are ready; zero runtime dependencies.');
