import {createHash} from 'node:crypto';
import {evalScriptDirective,hasFixtureEvalPolicy,hasHashedInlineFallbackPolicy,permissiveInlineDirective} from '../core/project-evidence';
export const hashedFallbackForExternalScripts=`${permissiveInlineDirective} 'sha256-${createHash('sha256').update('').digest('base64')}'`;

/** Move only the one developer-generated, pinned hash allowlist. */
export function nativeHashedResponse(html:string,mode:'inline'|'eval'='inline'){
  const metas=[...html.matchAll(/<meta http-equiv="Content-Security-Policy" content="script-src 'self'((?: 'sha256-[A-Za-z0-9+/]{43}='){1,4})">/g)];
  if(metas.length!==1)throw Error('Expected one generated hash allowlist');
  const policy=(mode==='eval'?evalScriptDirective:permissiveInlineDirective)+metas[0][1],body=html.replace(metas[0][0],'');
  if(!(mode==='eval'?hasFixtureEvalPolicy(policy):hasHashedInlineFallbackPolicy(policy))||/http-equiv\s*=\s*["']?content-security-policy/i.test(body))throw Error('Competing script policy');
  return {html:body,policy};
}
export const jingoScriptProfiles=['missing','early-meta','late-meta','broad-response','broad-meta','layered-meta','hashed-response','eval-response','framed-write','framed-write-broad','framing-policy','framing-duplicate-deny'] as const;
export type JingoScriptProfile=typeof jingoScriptProfiles[number];
export const jingoEditorStylesheet='/vendor/bootstrap/css/bootstrap.min.css';
export const nativeTransportProfiles=['hsts-disabled','hsts-positive','hsts-missing','hsts-host','hsts-invalid','hsts-invalid-host','hsts-disable-active','hsts-activate-native','http-editor','https-upgrade-editor','http-style','https-upgrade-style'] as const;
export type NativeTransportProfile=typeof nativeTransportProfiles[number];
/** Serve the pinned editor asset over its native HTTP listener. Only the
 * disposable page is changed. Cookie-bearing requests never cross to the asset host. */
export function applyJingoTransportProfile(html:string,editor:boolean,profile:NativeTransportProfile,port:number){
  if(!nativeTransportProfiles.includes(profile)||!Number.isInteger(port)||port<1||port>65535||Buffer.byteLength(html)>512*1024)throw Error('Unsupported transport profile');
  const offline=html.replace(/<link\b[^>]*href="https:\/\/fonts\.googleapis\.com\/css\?family=Ubuntu\|Ubuntu\+Condensed"[^>]*>/g,'');
  if(!editor||!['http-editor','https-upgrade-editor','http-style','https-upgrade-style'].includes(profile))return offline;
  const style=profile.endsWith('-style'),attribute=style?'href':'src',asset=style?jingoEditorStylesheet:'/vendor/codemirror/codemirror.min.js';
  const reference=`${attribute}="${asset}"`;
  if(offline.split(reference).length!==2)throw Error('Expected one native editor asset reference');
  const host=profile.startsWith('https-upgrade-')?'vylnt-resource.test':'127.0.0.1';
  return offline.replace(reference,`${attribute}="http://${host}:${port}${asset}"`);
}
/** Git's Windows text checkout may use CRLF. Accept only exact blob bytes or
 * losslessly decoded CRLF text that hashes to that exact pinned Git blob. */
export function pinnedJingoBytes(data:Buffer,expectedBlob:string){
  const blob=(bytes:Buffer)=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(blob(data)===expectedBlob)return data;
  const text=data.toString('utf8');
  if(!data.includes(0)&&Buffer.from(text).equals(data)){
    const canonical=Buffer.from(text.replace(/\r\n/g,'\n'));if(blob(canonical)===expectedBlob)return canonical;
  }
  throw Error('Native source differs from the pinned Git blob');
}
/** Controlled development intervention, exclusively on pinned, disposable
 * Jingo pages. No source/body is retained or fed into inference. */
export function applyJingoScriptProfile(html:string,profile:JingoScriptProfile){
  if(!jingoScriptProfiles.includes(profile)||Buffer.byteLength(html)>512*1024)throw Error('Unsupported native HTML profile');
  if(profile==='missing'||profile==='broad-response')return html;
  if(profile==='framed-write'||profile==='framed-write-broad'||profile==='framing-policy'||profile==='framing-duplicate-deny')return html.replace(/<link\b[^>]*href="https:\/\/fonts\.googleapis\.com\/css\?family=Ubuntu\|Ubuntu\+Condensed"[^>]*>/g,'');
  if((html.match(/<head(?:\s[^>]*)?>/g)??[]).length!==1||(html.match(/<\/body>/g)??[]).length!==1
    ||/http-equiv\s*=\s*["']?content-security-policy/i.test(html))throw Error('Unexpected native policy layout');
  if(profile==='broad-meta')return html.replace(/<head(?:\s[^>]*)?>/, head=>head+`<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline'">`);
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
  if(scripts.length<1||scripts.length>2||scripts[0].trim()!=='Jingo.init("");'
    ||scripts[1]&&!scripts[1].trim().startsWith('Jingo.cmInstance = CodeMirror.fromTextArea('))throw Error('Unexpected native inline script layout');
  const hashes=scripts.map(script=>"'sha256-"+createHash('sha256').update(script).digest('base64')+"'");
  const meta='<meta http-equiv="Content-Security-Policy" content="script-src \'self\' '+hashes.join(' ')+'">';
  return profile==='early-meta'||profile==='layered-meta'||profile==='hashed-response'||profile==='eval-response'?html.replace(/<head(?:\s[^>]*)?>/,head=>head+meta):html.replace('</body>',meta+'</body>');
}
