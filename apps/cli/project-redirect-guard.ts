import type {Page} from 'playwright';

/** Browser response-stage guard: Playwright route handlers do not run again
 * for every URL in an HTTP redirect chain. No response body is read. */
export function redirectAllowed(raw:string,status:number,headers:readonly {name:string;value:string}[],origins:ReadonlySet<string>){
  if(![301,302,303,307,308].includes(status))return true;
  const locations=headers.filter(h=>h.name.toLowerCase()==='location');
  if(locations.length!==1||locations[0].value.length>8192)return false;
  try{const url=new URL(locations[0].value,raw);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&origins.has(url.origin);}catch{return false;}
}
export async function guardProjectRedirects(page:Page,origins:ReadonlySet<string>,options:{rejectAll?:boolean;rejected?:()=>void}={}){
  const session=await page.context().newCDPSession(page);let count=0,closed=false;
  session.on('Fetch.requestPaused',async event=>{
    if(closed)return;
    try{
      const status=event.responseStatusCode??0,isRedirect=[301,302,303,307,308].includes(status);
      if(++count>1000||isRedirect&&(options.rejectAll||!redirectAllowed(event.request.url,status,event.responseHeaders??[],origins))){
        options.rejected?.();await session.send('Fetch.failRequest',{requestId:event.requestId,errorReason:'BlockedByClient'});return;
      }
      await session.send('Fetch.continueResponse',{requestId:event.requestId});
    }catch{options.rejected?.();await session.send('Fetch.failRequest',{requestId:event.requestId,errorReason:'BlockedByClient'}).catch(()=>{});}
  });
  await session.send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Response'}]});
  return {async close(){if(closed)return;closed=true;await session.detach().catch(()=>{});}};
}
