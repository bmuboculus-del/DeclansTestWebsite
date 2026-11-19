'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const production = process.env.NODE_ENV === 'production';
if (!ADMIN_PASSWORD || !SESSION_SECRET || (production && (ADMIN_PASSWORD.length < 12 || SESSION_SECRET.length < 32))) {
  console.error('Set ADMIN_PASSWORD and SESSION_SECRET in your environment. In production use a password of at least 12 characters and a session secret of at least 32.');
  process.exit(1);
}
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'content.json');
fs.mkdirSync(path.dirname(DATA_FILE), {recursive:true});
if (!fs.existsSync(DATA_FILE)) fs.copyFileSync(path.join(__dirname,'data','content.json'), DATA_FILE);
const attempts = new Map();
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};

function headers(req,extra={}) { return {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'", ...extra}; }
function send(res,code,value,req,extra={}) { const body=JSON.stringify(value); res.writeHead(code,headers(req,{'Content-Type':'application/json; charset=utf-8',...extra}));res.end(body); }
function readBody(req) {return new Promise((resolve,reject)=>{let size=0, chunks=[];req.on('data',chunk=>{size+=chunk.length;if(size>1024*1024){reject(new Error('Request too large'));req.destroy();return;}chunks.push(chunk);});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch(e){reject(new Error('Invalid JSON'));}});req.on('error',reject);});}
function hmac(payload) {return crypto.createHmac('sha256',SESSION_SECRET).update(payload).digest('base64url');}
function session(req) { const raw=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('cm_session='));if(!raw)return false; const v=raw.slice(11), dot=v.lastIndexOf('.');if(dot<0)return false;const payload=v.slice(0,dot),sign=v.slice(dot+1),expected=hmac(payload);if(sign.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sign),Buffer.from(expected)))return false;try{const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.role==='admin' && Date.now()<data.exp;}catch{return false;} }
function validOrigin(req){const origin=req.headers.origin; if(!origin)return true;try{const u=new URL(origin);return u.host===req.headers.host && (u.protocol==='https:' || u.protocol==='http:');}catch{return false;}}
function permitted(req,res){if(!session(req)){send(res,401,{error:'Please log in.'},req);return false;}if(!validOrigin(req)){send(res,403,{error:'Invalid request origin.'},req);return false;}return true;}
function readData(){return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));}
function clean(value) {const text=String(value ?? '').trim();return text.slice(0,2000);}
function validate(doc){if(!doc||typeof doc!=='object'||Array.isArray(doc)) throw new Error('Invalid content'); const out={};for(const key of ['brand','eyebrow','heroLine1','heroLine2','heroDescription','announcement','discordInvite']) {if(typeof doc[key]!=='string')throw new Error('Missing '+key);out[key]=clean(doc[key]);}if(out.discordInvite){const url=new URL(out.discordInvite);if(url.protocol!=='https:' || !['discord.gg','discord.com','www.discord.com'].includes(url.hostname))throw new Error('Discord link must be a https://discord.gg/... or discord.com invite');}for(const [key,fields] of Object.entries({rules:['title','description'],departments:['icon','title','description'],events:['title','date','description']})) {if(!Array.isArray(doc[key])||doc[key].length>40)throw new Error('Invalid '+key);out[key]=doc[key].map(item=>{if(!item||typeof item!=='object')throw new Error('Invalid entry in '+key);const entry={};for(const field of fields){if(typeof item[field]!=='string')throw new Error('Invalid '+field+' in '+key);entry[field]=clean(item[field]);}return entry;});}return out;}
function saveData(data){const tmp=DATA_FILE+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2)+'\n',{mode:0o600});fs.renameSync(tmp,DATA_FILE);}
function staticFile(req,res,url){let file=url.pathname==='/'?'/index.html':url.pathname;try{file=decodeURIComponent(file)}catch{res.writeHead(400);res.end();return;}const resolved=path.resolve(PUBLIC_DIR,'.'+file);if(resolved!==PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR+path.sep)){res.writeHead(403);res.end();return;}fs.stat(resolved,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404,headers(req,{'Content-Type':'text/plain'}));res.end('Not found');return;}res.writeHead(200,headers(req,{'Content-Type':mime[path.extname(resolved)]||'application/octet-stream'}));fs.createReadStream(resolved).pipe(res);});}
const server=http.createServer(async(req,res)=>{let url;try{url=new URL(req.url,'http://localhost')}catch{send(res,400,{error:'Invalid URL'},req);return;}const p=url.pathname;
try{
 if(req.method==='GET'&&p==='/health'){send(res,200,{ok:true},req);return;}
 if(req.method==='GET'&&p==='/api/content'){send(res,200,readData(),req);return;}
 if(req.method==='GET'&&p==='/api/admin/session'){send(res,200,{authenticated:session(req)},req);return;}
 if(req.method==='POST'&&p==='/api/admin/login'){
   if(!validOrigin(req)){send(res,403,{error:'Invalid request origin.'},req);return;}
   const ip=req.socket.remoteAddress||'unknown', now=Date.now();let a=attempts.get(ip)||{count:0,until:0};if(a.until>now){send(res,429,{error:'Too many attempts. Try again later.'},req);return;}
   const body=await readBody(req), attempt=crypto.createHash('sha256').update(String(body.password||'')).digest(), actual=crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
   if(!crypto.timingSafeEqual(attempt,actual)){a.count++;a.until=a.count>=8?now+15*60*1000:0;attempts.set(ip,a);send(res,401,{error:'Incorrect password.'},req);return;}
   attempts.delete(ip);const payload=Buffer.from(JSON.stringify({role:'admin',exp:now+12*60*60*1000})).toString('base64url');const token=payload+'.'+hmac(payload);
   send(res,200,{ok:true},req,{'Set-Cookie':`cm_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${production?'; Secure':''}`});return;
 }
 if(req.method==='POST'&&p==='/api/admin/logout'){if(!validOrigin(req)){send(res,403,{error:'Invalid request origin.'},req);return;}send(res,200,{ok:true},req,{'Set-Cookie':`cm_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${production?'; Secure':''}`});return;}
 if(req.method==='PUT'&&p==='/api/admin/content'){if(!permitted(req,res))return;let data;try{data=validate(await readBody(req));}catch(e){send(res,400,{error:e.message},req);return;}saveData(data);send(res,200,{ok:true,updatedAt:new Date().toISOString()},req);return;}
 if(p.startsWith('/api/')){send(res,404,{error:'Not found'},req);return;}
 if(req.method==='GET'||req.method==='HEAD')return staticFile(req,res,url);
 send(res,405,{error:'Method not allowed'},req);
}catch(e){console.error(e);if(!res.headersSent)send(res,500,{error:'Server error'},req);else res.end();}
});
server.listen(PORT,HOST,()=>console.log(`Craic Mountain listening on http://${HOST}:${PORT}`));
