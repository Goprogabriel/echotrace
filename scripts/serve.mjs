/** Static, loopback-only server. No upload endpoint. No installation required. */
import http from 'node:http';
import {createReadStream, statSync, existsSync} from 'node:fs';
import {resolve, dirname, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT||4173);
if(!existsSync(resolve(root,'index.html'))){console.error('The built dist/ folder is missing. Run npm install && npm run build.');process.exit(1);}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.mp4':'video/mp4','.wav':'audio/wav','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method||'')){res.writeHead(405,{'Allow':'GET, HEAD'});res.end('No upload endpoint.');return;}
  let path;try{const url=new URL(req.url,'http://localhost');path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));}catch{res.writeHead(400);res.end();return;}
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{
    const stat=statSync(path);if(!stat.isFile())throw new Error('Not a file');
    const headers={'Content-Type':types[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
    const range=req.headers.range;
    if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);let start,end;if(m){if(m[1]){start=Number(m[1]);end=m[2]?Number(m[2]):stat.size-1;}else if(m[2]){start=Math.max(0,stat.size-Number(m[2]));end=stat.size-1;}}
      if(start===undefined||end===undefined||start>end||start<0||start>=stat.size||end>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}
      res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else createReadStream(path,{start,end}).on('error',()=>res.destroy()).pipe(res);return;
    }
    res.writeHead(200,{...headers,'Content-Length':stat.size});if(req.method==='HEAD')res.end();else createReadStream(path).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found. Open / for Echotrace.');}
});
server.on('error',e=>{console.error(`Cannot start: ${e.message}. Try PORT=4174 node scripts/serve.mjs`);process.exit(1);});
server.listen(port,'127.0.0.1',()=>{
  const url=`http://127.0.0.1:${port}`;console.log(`\nECHOTRACE · local acoustic lab\n\n  ${url}\n\nFiles are served locally. No media is uploaded.\nKeep this terminal open. Ctrl+C stops the server.\n`);
  if(process.argv.includes('--open')){
    const [cmd,args]=process.platform==='darwin'?['open',[url]]:process.platform==='win32'?['cmd',['/c','start','',url]]:['xdg-open',[url]];
    const p=spawn(cmd,args,{stdio:'ignore',detached:true});p.on('error',()=>{});p.unref();
  }
});
