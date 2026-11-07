/** Browser mechanics only. These pages supply no ML corpus examples. */
import {it,expect} from 'vitest';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {scanProjectPage} from '../apps/cli/project-scanner';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
async function fixture(){
  const server=createServer((_request,response)=>{
    response.setHeader('Content-Type','text/html');
    response.end('<!doctype html><html lang="en"><head><script>setTimeout(()=>{document.cookie="session-preference=public-test-state; SameSite=Strict; Path=/";document.documentElement.lang="de"},650)</script></head><body>Controlled browser mechanics</body></html>');
  });
  await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
  const origin='http://127.0.0.1:'+(server.address() as {port:number}).port;
  return {origin,close:()=>new Promise<void>(done=>{server.closeAllConnections();server.close(()=>done());})};
}
it('collects the settled native state after bounded readiness without retaining cookie values',async()=>{
  const f=await fixture();let readyAt=0;
  try{
    const {report}=await scanProjectPage(f.origin+'/',{allowedLocalOrigins:[f.origin],requireComplete:true,waitMs:0,
      hooks:{ready:async page=>{await page.waitForFunction(()=>document.documentElement.lang==='de',undefined,{timeout:10000});readyAt=Date.now();}}});
    expect(readyAt).toBeGreaterThan(0);expect(Date.parse(report.observation.scannedAt)).toBeGreaterThanOrEqual(readyAt);
    expect(report.observation.cookies?.find(cookie=>cookie.name==='session-preference')?.sameSite).toBe('strict');
    expect(JSON.stringify(report)).not.toContain('public-test-state');
  }finally{await f.close();}
},30000);
it('fails the scan on missing native readiness and closes the browser session',async()=>{
  const f=await fixture();let pageUsed:import('playwright').Page|undefined;
  try{
    await expect(scanProjectPage(f.origin+'/',{allowedLocalOrigins:[f.origin],requireComplete:true,waitMs:0,
      hooks:{ready:async page=>{pageUsed=page;await page.waitForFunction(()=>false,undefined,{timeout:300});}}})).rejects.toThrow();
    expect(pageUsed?.isClosed()).toBe(true);
  }finally{await f.close();}
},30000);
