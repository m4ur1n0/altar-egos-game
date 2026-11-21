// Alter Egos party server. No dependencies. Run: npm run build, then node server.js (or just: npm start)
// Same protocol as worker/index.ts, which runs this game on Cloudflare.
const http=require('http'),fs=require('fs'),os=require('os'),path=require('path');
const OUT=path.join(__dirname,'out'),PORT=process.env.PORT||3000,rooms={};
const PROXY_OK=['https://api.openverse.org/']; // image search (components/ImageSearch.tsx); keep in sync with worker
const TYPES={html:'text/html; charset=utf-8',js:'text/javascript',css:'text/css',json:'application/json',webp:'image/webp',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',ico:'image/x-icon',txt:'text/plain',woff2:'font/woff2'};
const R=n=>rooms[n]||(rooms[n]={docs:{},clients:new Set()});
const send=(r,o)=>{const s='data:'+JSON.stringify(o)+'\n\n';r.clients.forEach(c=>c.write(s))};
http.createServer((req,res)=>{
 const u=new URL(req.url,'http://x'),room=R(u.searchParams.get('room')||'main');
 if(u.pathname==='/events'){
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive','X-Accel-Buffering':'no'});
  res.write('data:'+JSON.stringify({t:'init',docs:room.docs})+'\n\n');room.clients.add(res);req.on('close',()=>room.clients.delete(res));return;
 }
 if(req.method==='POST'&&u.pathname==='/set'){
  let b='';req.on('data',c=>{b+=c;if(b.length>3e6)req.destroy()});
  req.on('end',()=>{try{const m=JSON.parse(b),r=R(m.room||'main');if(typeof m.path==='string'&&m.path.length<200){r.docs[m.path]=m.data;send(r,{t:'set',path:m.path,data:m.data,by:m.by})}}catch(e){}res.end('ok')});return;
 }
 if(u.pathname==='/proxy'){const t=u.searchParams.get('u')||'';if(!PROXY_OK.some(p=>t.startsWith(p))){res.writeHead(403);res.end();return}
  fetch(t).then(async r=>{res.writeHead(r.status,{'Content-Type':r.headers.get('content-type')||'application/octet-stream'});res.end(Buffer.from(await r.arrayBuffer()))}).catch(()=>{res.writeHead(502);res.end()});return}
 if(u.pathname==='/reset'){room.docs={};send(room,{t:'init',docs:room.docs});res.end('reset');return}
 let f=path.join(OUT,decodeURIComponent(u.pathname));
 if(!f.startsWith(OUT))f=OUT;
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 else if(!path.extname(f))f+='.html';
 fs.readFile(f,(e,d)=>{
  if(e)return fs.readFile(path.join(OUT,'404.html'),(e2,d2)=>{res.writeHead(404,{'Content-Type':TYPES.html});res.end(e2?'Not found. Did you run npm run build?':d2)});
  res.writeHead(200,{'Content-Type':TYPES[path.extname(f).slice(1)]||'application/octet-stream'});res.end(d);
 });
}).listen(PORT,'0.0.0.0',()=>{
 console.log('\nAlter Egos is running. Friends on the same Wi-Fi can open:');
 for(const l of Object.values(os.networkInterfaces()))for(const i of l)if(i.family==='IPv4'&&!i.internal)console.log('   http://'+i.address+':'+PORT);
 console.log('   (you: http://localhost:'+PORT+')\n');
});
setInterval(()=>Object.values(rooms).forEach(r=>r.clients.forEach(c=>c.write(': ping\n\n'))),20000);
