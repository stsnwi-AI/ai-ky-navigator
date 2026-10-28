import http from 'node:http';
import {readFile} from 'node:fs/promises';

const files = {'/':'index.html','/index.html':'index.html','/app.js':'app.js','/flow.js':'flow.js','/ui.js':'ui.js','/voicevox.js':'voicevox.js','/style.css':'style.css','/helmet.svg':'helmet.svg','/site-scene.svg':'site-scene.svg'};
const types = {html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'};
const port=Number(process.env.PORT||3000);
const upstream='http://127.0.0.1:50021';
const allowedVoicePaths=new Set(['/speakers','/audio_query','/synthesis']);
const server=http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(path.startsWith('/voicevox/')){
    const sub=path.slice('/voicevox'.length);
    if(!allowedVoicePaths.has(sub)||!['GET','POST'].includes(req.method)){res.writeHead(404);res.end('Not found');return;}
    try{
      const address=new URL(req.url,'http://localhost');
      const url=upstream+sub+address.search;
      const parts=[];let length=0;
      for await(const part of req){length+=part.length;if(length>1048576){res.writeHead(413);res.end('Request too large');return;}parts.push(part);}
      const response=await fetch(url,{method:req.method,headers:req.method==='POST'?{'Content-Type':req.headers['content-type']||'application/json'}:{},body:req.method==='POST'?Buffer.concat(parts):undefined,signal:AbortSignal.timeout(30000)});
      res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/octet-stream'});
      res.end(Buffer.from(await response.arrayBuffer()));
    }catch(e){res.writeHead(502,{'Content-Type':'text/plain; charset=utf-8'});res.end('VOICEVOXに接続できません。VOICEVOXを起動してください。 '+e.message);}
    return;
  }
  const file=files[path];if(!file||req.method!=='GET'){res.writeHead(404);res.end('Not found');return;}
  try{const data=await readFile(new URL(file,import.meta.url));res.writeHead(200,{'Content-Type':types[file.split('.').pop()]||'application/octet-stream'});res.end(data);}
  catch{res.writeHead(500);res.end('File unavailable');}
});
server.listen(port,'127.0.0.1',()=>console.log('KY活動ナビゲーター: http://127.0.0.1:'+port+'\nVOICEVOX起動中に開いてください。終了は Ctrl+C'));
