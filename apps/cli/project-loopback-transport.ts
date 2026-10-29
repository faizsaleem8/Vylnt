import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

/** Bounded transient transport for trusted local interventions. It never follows
 * redirects or shares Playwright's cookie jar, and does not persist payloads. */
export function transfer(url:URL,method:string,headers:Record<string,string>,body:Buffer|null,signal:AbortSignal,account:(bytes:number)=>void){
  if(!['http:','https:'].includes(url.protocol)||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password)throw Error('Transport requires loopback');
  return new Promise<{status:number;headers:Record<string,string>;cookies:string[];body:Buffer}>((resolve,reject)=>{
    const request=(url.protocol==='https:'?httpsRequest:httpRequest)(url,{method,headers,agent:false,signal},response=>{
      const chunks:Buffer[]=[];let size=0;
      response.on('data',(chunk:Buffer)=>{try{size+=chunk.length;account(chunk.length);if(size>2*1024*1024)throw Error('Local response budget exceeded');chunks.push(chunk);}catch{response.destroy(Error('Local response budget exceeded'));}});
      response.on('error',reject);response.on('aborted',()=>reject(Error('Local response interrupted')));
      response.on('end',()=>{
        const forwarded:Record<string,string>={};
        for(const [name,value] of Object.entries(response.headers))if(value!==undefined)forwarded[name]=Array.isArray(value)?value.join(name==='set-cookie'?'\n':', '):value;
        resolve({status:response.statusCode??502,headers:forwarded,cookies:response.headers['set-cookie']??[],body:Buffer.concat(chunks)});
      });
    });
    request.setTimeout(5000,()=>request.destroy(Error('Local request timed out')));request.on('error',reject);
    if(body)request.write(body);request.end();
  });
}
