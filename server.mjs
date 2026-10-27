import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files = {'/':'index.html','/index.html':'index.html','/app.js':'app.js','/flow.js':'flow.js','/draft.js':'draft.js','/style.css':'style.css'};
const types = {html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8'};
const port = Number(process.env.PORT || 3000);
http.createServer(async(req,res)=>{
  const path = new URL(req.url,'http://localhost').pathname;
  if (!files[path]) {res.writeHead(404);res.end('Not found');return;}
  try {const data=await readFile(new URL(files[path],import.meta.url));res.writeHead(200,{'Content-Type':types[files[path].split('.').pop()],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);} catch {res.writeHead(500);res.end('Unable to load file');}
}).listen(port,'0.0.0.0',()=>console.log(`AI KY活動ナビゲーター Ver.0.6: http://localhost:${port}\nスマホでは同じWi-Fiから http://PCのIPv4アドレス:${port} を開いてください。終了: Ctrl+C`));
