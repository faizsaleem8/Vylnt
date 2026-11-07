import assert from 'node:assert/strict';
import {execFile, spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createServer as createTlsServer} from 'node:https';
import {request} from 'node:http';
import {once} from 'node:events';
import {mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile} from 'node:fs/promises';
import {basename, delimiter, dirname, join, relative, resolve, sep} from 'node:path';
import {promisify} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';

assert.ok(Number(process.versions.node.split('.')[0]) >= 24, 'Use Node 24');
const workspace = await realpath('.');
const root = await realpath('.local');
const staged = await realpath(process.argv[2] ?? '');
const temporaryStage=process.platform==='linux'&&/^\/tmp\/vylnt-etherpad-runtime\.[a-zA-Z0-9]+\/application$/.test(staged);
assert.ok(temporaryStage||dirname(staged) === root && /^etherpad-development-[a-z0-9-]+$/.test(staged.slice(root.length + 1)));
const run = promisify(execFile);
const pnpm = await realpath(process.argv[3] ?? '');
const mode = process.argv[4];
const profile = process.argv[6]?.match(/^--cookie-profile=(.+)$/)?.[1];
const hsts = process.argv[6]?.match(/^--hsts-profile=(.+)$/)?.[1];
const signed = mode === '--registered' && (process.argv.length === 6 || process.argv.length === 7 && profile);
assert.ok(process.argv.length === 4 || (mode === '--preference' && process.argv.length === 5) || signed||
  (temporaryStage&&mode==='--registered'&&process.argv.length===7&&hsts));
assert.ok(pnpm.startsWith(root + sep) && ['pnpm', 'pnpm.exe'].includes(basename(pnpm)), 'Supply the local pnpm 12.4.2 binary');
const capture = signed ? await (await import('./native-etherpad-capture.ts')).openEtherpadCapture(process.argv[5],profile) : undefined;
const hstsCapture=hsts?await (await import('./native-etherpad-capture.ts')).openEtherpadHstsCapture(process.argv[5],hsts):undefined;
const {stdout: pnpmVersion} = await run(pnpm, ['--version'], {cwd: root, timeout: 10000, windowsHide: true});
assert.equal(pnpmVersion.trim(), '12.4.2');
await run(process.execPath, ['scripts/native-etherpad-stage.mjs', '--verify', '--output', staged], {timeout: 45000, windowsHide: true});
const scratchParent=temporaryStage?dirname(staged):root;
const scratch = await mkdtemp(join(scratchParent, 'etherpad-smoke-'));
const cancel = new AbortController();
const interrupt = () => cancel.abort();
process.on('SIGINT', interrupt);
process.on('SIGTERM', interrupt);
const password = randomBytes(24).toString('hex');
const username = 'vylnt-local-fixture';
const settings = join(scratch, 'settings.json');
const preload = join(scratch, 'loopback.cjs');
const dbFile=join(scratch,'pads.db'),apiKeyFile=join(scratch,'APIKEY.txt'),apiKey=randomBytes(24).toString('hex');
let child;
let proxy;
let result;
let startupLog = '';
const appendLog = chunk => { startupLog = (startupLog + chunk.toString()).slice(-32768); };
try {
  await mkdir(join(scratch, 'tmp'));
  await writeFile(apiKeyFile,apiKey,{flag:'wx',mode:0o600});
  await writeFile(settings, JSON.stringify({
    ip: '127.0.0.1', port: 0, dbType: 'dirty', dbSettings: {filename: dbFile},
    requireAuthentication: true, authenticationMethod: 'apikey', cookie: {prefix: 'session-'},
    users: {[username]: {password: '${VYLNT_ETHERPAD_SMOKE_PASSWORD}', is_admin: false}},
    privacy: {updateCheck: false, pluginCatalog: false}, enablePluginPadOptions: false,
  }), {flag: 'wx'});
  await writeFile(preload, `
const net = require('node:net');
const originalListen = net.Server.prototype.listen;
net.Server.prototype.listen = function(port, host, ...rest) {
  if (host !== '127.0.0.1' || Number(port) !== 0) throw Error('Native listener must use ephemeral loopback');
  this.once('listening', () => { const address = this.address(); process.send?.({port: address.port, host: address.address}); });
  return originalListen.call(this, 0, '127.0.0.1', ...rest);
};
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function(...args) {
  const [first, second] = Array.isArray(args[0]) ? args[0] : args;
  const host = typeof first === 'number' ? (typeof second === 'string' ? second : 'localhost')
    : first && typeof first === 'object' && !first.path ? (first.host ?? 'localhost') : null;
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw Error('Native socket destination must be loopback');
  return originalConnect.apply(this, args);
};
`, {flag: 'wx'});
  const env = {};
  for (const key of ['PATHEXT', 'SystemRoot', 'WINDIR', 'SystemDrive', 'ComSpec']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, {PATH: [dirname(pnpm), dirname(process.execPath), join(env.SystemRoot ?? env.WINDIR ?? '', 'System32')].join(delimiter),
    NODE_ENV: 'production', pnpm_config_offline: 'true', pnpm_config_manage_package_manager_versions: 'false',
    VYLNT_ETHERPAD_SMOKE_PASSWORD: password, TEMP: join(scratch, 'tmp'), TMP: join(scratch, 'tmp')});
  child = spawn(process.execPath, ['--require', preload, '--require', 'tsx/cjs', 'node/server.ts', '--settings', settings, '--credentials', join(scratch, 'unused.json'),'--apikey',apiKeyFile], {
    cwd: join(staged, 'src'), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  child.stdout.on('data', appendLog);
  child.stderr.on('data', appendLog);
  const signal = AbortSignal.any([cancel.signal, AbortSignal.timeout(temporaryStage?120000:90000)]);
  const port = await new Promise((done, reject) => {
    const abort = () => reject(Error('Etherpad readiness cancelled or timed out'));
    signal.addEventListener('abort', abort, {once: true});
    child.once('error', () => reject(Error('Etherpad process could not start')));
    child.once('close', code => {
      const reasons = [/Cannot find (?:package|module)/i, /EACCES|EPERM/i, /Native (?:listener|socket)/i,
        /ENOENT/i, /SyntaxError/i, /Error while parsing/i, /esbuild/i, /EADDRINUSE/i];
      const missing = [...startupLog.matchAll(/ENOENT:[^\r\n]*?['"]([^'"\r\n]+)['"]/g)].at(-1)?.[1];
      const stagePath = missing && resolve(missing).startsWith(staged + sep) ? relative(staged, missing) : undefined;
      const frames = [...new Set([...startupLog.matchAll(/(src[\\/]node[\\/][a-zA-Z0-9_./\\-]+\.ts:\d+:\d+)/g)].map(match => match[1]))].slice(-5);
      const reason = [...reasons.map(pattern => startupLog.match(pattern)?.[0]),
        stagePath && /^[a-zA-Z0-9_./\\-]{1,180}$/.test(stagePath) ? stagePath : undefined, ...frames].filter(Boolean).join(', ');
      reject(Error(`Etherpad exited before readiness (${code}${reason ? ', ' + reason : ''})`));
    });
    child.on('message', message => {
      if (message?.host === '127.0.0.1' && Number.isInteger(message.port) && message.port > 0 && message.port <= 65535) {
        signal.removeEventListener('abort', abort);
        done(message.port);
      }
    });
  });
  const url = `http://127.0.0.1:${port}/p/vylnt-disposable`;
  const anonymous = await fetch(url, {redirect: 'manual', signal});
  const anonymousDenied = anonymous.status === 401;
  await anonymous.body?.cancel();
  assert.ok(anonymousDenied, `Anonymous pad request returned ${anonymous.status}`);
  const authenticated = await fetch(url, {redirect: 'manual', signal,
    headers: {Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')}});
  const padServed = authenticated.status === 200 && Boolean(authenticated.headers.get('content-type')?.startsWith('text/html'));
  await authenticated.body?.cancel();
  assert.ok(padServed, `Authenticated pad request returned ${authenticated.status}`);
  let preference;
  if (mode === '--preference' || signed) {
    const {checkEtherpadPreference} = await import('./native-etherpad-preference.mjs');
    preference = await checkEtherpadPreference(url, username, password,
      AbortSignal.any([cancel.signal, AbortSignal.timeout(150000)]), capture?.snapshot,profile);
  }
  result = {version: 1, loopback: true, anonymousDenied, padServed, preference, eligibleExamples: 0};
  if(hstsCapture){
    const writeSignal=AbortSignal.any([cancel.signal,AbortSignal.timeout(30000)]);
    const padID='vylnt-disposable',text='VYLNT '+randomBytes(16).toString('hex');
    const api=async(operation,data,authorized)=>{
      const response=await fetch(`http://127.0.0.1:${port}/api/1.3.1/${operation}`,{
        method:'POST',redirect:'manual',signal:writeSignal,
        headers:{'content-type':'application/json',...(authorized?{authorization:apiKey}:{})},
        body:JSON.stringify({padID,...data})});
      return {status:response.status,code:(await response.json()).code};
    };
    for(const [operation,data] of [['createPad',{}],['setText',{text}]]){
      const response=await api(operation,data,true);
      assert.ok(response.status===200&&response.code===0,'Native Etherpad API write failed');
    }
    const storedText=async()=>{
      assert.ok((await stat(dbFile)).size<512*1024,'Disposable database budget exceeded');
      const lines=(await readFile(dbFile,'utf8')).split('\n');
      if(lines.pop()!=='')return undefined;
      const latest=lines.map(line=>JSON.parse(line)).findLast(row=>row.key==='pad:'+padID);
      const value=typeof latest?.val==='string'?JSON.parse(latest.val):latest?.val;
      return value?.atext?.text;
    };
    while(await storedText()!==text+'\n')await delay(100,undefined,{signal:writeSignal});
    const denied=await api('setText',{text:'VYLNT denied mutation'},false);
    assert.ok(denied.status===401&&await storedText()===text+'\n','Unauthenticated pad write must leave storage unchanged');
    const {tls,wireHsts}=hstsCapture;
    proxy=createTlsServer({key:tls.key,cert:tls.cert},(incoming,outgoing)=>{
      const upstream=request({hostname:'127.0.0.1',port,path:incoming.url,method:incoming.method,
        headers:{...incoming.headers,host:'127.0.0.1:'+port},agent:false},response=>{
        const headers={...response.headers};
        if(incoming.url==='/p/vylnt-disposable'&&response.statusCode===200){
          if(wireHsts==='absent')delete headers['strict-transport-security'];
          else headers['strict-transport-security']=wireHsts;
        }
        outgoing.writeHead(response.statusCode??502,headers);response.on('error',()=>outgoing.destroy());response.pipe(outgoing);
      });
      upstream.setTimeout(10000,()=>upstream.destroy());
      upstream.on('error',()=>outgoing.destroy());incoming.on('aborted',()=>upstream.destroy());outgoing.on('close',()=>upstream.destroy());
      incoming.pipe(upstream);
    });
    await new Promise((done,reject)=>{proxy.once('error',reject);proxy.listen(0,'127.0.0.1',done);});
    const origin='https://vylnt-resource.test:'+proxy.address().port;
    await hstsCapture.collect(origin,username,password,AbortSignal.any([cancel.signal,AbortSignal.timeout(120000)]));
    result.nativePadWriteReadback=true;
    result.anonymousPadWriteDenied=true;
    result.privateValues=[username,password,Buffer.from(username+':'+password).toString('base64'),apiKey,text];
  }
} finally {
  if(proxy?.listening){proxy.closeAllConnections();await new Promise(done=>proxy.close(done));}
  if (child?.pid && child.exitCode === null && child.signalCode === null) {
    const stopped = once(child, 'exit', {signal: AbortSignal.timeout(20000)});
    if (process.platform === 'win32') {
      await run('taskkill', ['/pid', String(child.pid), '/T', '/F'], {timeout: 10000, windowsHide: true}).catch(() => child.kill());
    } else child.kill('SIGKILL');
    await stopped;
  }
  const actual = await realpath(scratch);
  assert.ok(root.startsWith(workspace + sep) && dirname(actual) === scratchParent && actual === scratch);
  await rm(actual, {recursive: true, maxRetries: 5, retryDelay: 200});
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
}
if(hstsCapture){
  await run(process.execPath,['scripts/native-etherpad-stage.mjs','--verify','--output',staged],{timeout:45000,windowsHide:true});
  const {privateValues,...controls}=result;
  console.log(JSON.stringify({...(await hstsCapture.save(controls,privateValues)),cleanupCompleted:true,qualification:false}));
}else if (capture) {
  await run(process.execPath, ['scripts/native-etherpad-stage.mjs', '--verify', '--output', staged], {timeout: 45000, windowsHide: true});
  console.log(JSON.stringify({...(await capture.save(result, [username, password])), cleanupCompleted: true, qualification: false}));
} else {
  const receipt = {...result, cleanupCompleted: true};
  const results = resolve('test-results/native-projects');
  await mkdir(results, {recursive: true});
  await writeFile(join(results, `etherpad-${result.preference ? 'preference' : 'startup'}-prototype.json`), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt));
}
