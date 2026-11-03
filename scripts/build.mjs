import {cpSync, existsSync, mkdirSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
rmSync('dist',{recursive:true,force:true});mkdirSync('dist',{recursive:true});cpSync('public','dist',{recursive:true});
const local=resolve('node_modules/typescript/bin/tsc');
const custom=process.env.TSC_PATH;
const result=existsSync(local)?spawnSync(process.execPath,[local,'--pretty','false'],{stdio:'inherit'}):custom?spawnSync(process.execPath,[custom,'--pretty','false'],{stdio:'inherit'}):spawnSync('tsc',['--pretty','false'],{stdio:'inherit',shell:process.platform==='win32'});
if(result.error||result.status!==0){console.error('Build failed. Install development dependencies with npm install, then npm run build.');process.exit(1);}
mkdirSync('dist/js/workers',{recursive:true});cpSync('src/workers/capture-worklet.js','dist/js/workers/capture-worklet.js');
console.log('Built dist/. The site has zero runtime dependencies and no upload backend.');
