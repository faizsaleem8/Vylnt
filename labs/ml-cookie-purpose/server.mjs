// Controlled source-reviewed mechanism reference. Never a production account or
// an independent application family for ML qualification.
import express from 'express';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

if(process.env.VYLNT_COOKIE_REFERENCE!=='local')throw Error('Enable the disposable local reference explicitly');
const user=process.env.VYLNT_REFERENCE_USER,password=process.env.VYLNT_REFERENCE_PASSWORD;
if(!user||!password)throw Error('Supply disposable synthetic credentials');
const instance=process.env.VYLNT_REFERENCE_RUN;if(!instance)throw Error('Supply a disposable run identity');
const authenticationHttpOnly=process.env.VYLNT_REFERENCE_HTTPONLY!=='false';
const client=await readFile(new URL('./client.js',import.meta.url));
const session=randomBytes(32).toString('hex'),app=express();
const accountCookie=req=>(req.headers.cookie??'').split(';').some(part=>part.trim()==='account_sid='+session);
app.disable('x-powered-by');app.use(express.json({limit:'2kb'}));
app.get('/ready',(_req,res)=>res.set('x-vylnt-reference-instance',instance).json({ready:true}));
app.get('/',(_req,res)=>res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Local preference reference</title>
<style>body{font-family:system-ui;margin:32px}html[data-density=compact] body{margin:8px}</style>
<script src="/client.js" defer></script></head><body><h1>Local preference reference</h1>
<label for="density">Layout density</label><select id="density"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select>
<p id="account" role="status"></p></body></html>`));
app.get('/client.js',(_req,res)=>res.type('js').send(client));
app.post('/api/login',(req,res)=>{
  if(req.body?.user!==user||req.body?.password!==password){res.status(401).json({authenticated:false});return;}
  res.cookie('account_sid',session,{httpOnly:authenticationHttpOnly,sameSite:'lax',path:'/'});res.json({authenticated:true});
});
app.get('/api/protected',(req,res)=>res.status(accountCookie(req)?200:401).json({authenticated:accountCookie(req)}));
app.use((_error,_req,res,_next)=>res.status(400).json({error:'Invalid reference request'}));
app.listen(Number(process.env.PORT)||0,'127.0.0.1');
