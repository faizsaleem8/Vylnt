import {it,expect} from 'vitest';
import {readNativeProjectExposures,assertFreshNativeSources} from '../packages/ml/project-source-exposure';

const fresh=()=>({familyId:'upstream:independent/example',repository:'https://github.com/independent/example',repositoryId:987654321,
  securityImplementationHashes:['a'.repeat(64)],revisions:[{commit:'b'.repeat(40),sourceHashes:['c'.repeat(64)]}]});
const exposures=await readNativeProjectExposures();
it('excludes the executed Etherpad prototype by revision and by renamed preference implementation',()=>{
  const record=exposures.find(e=>e.familyId==='upstream:ether/etherpad')!;
  expect(record).toBeDefined();
  const revision=fresh();revision.revisions[0].commit=record.revision;
  expect(()=>assertFreshNativeSources([revision],exposures)).toThrow('development-exposed');
  const implementation=fresh();implementation.securityImplementationHashes=[record.sourceSha256!['src/static/js/pad_cookie.ts']];
  expect(()=>assertFreshNativeSources([implementation],exposures)).toThrow('development-exposed');
});
it('keeps the native preference UI implementation out of a renamed future holdout family',()=>{
  const record=exposures.find(e=>e.familyId==='upstream:asdteke/homeinventory')!;
  const family=fresh();
  family.securityImplementationHashes=[record.sourceSha256!['client/src/components/LanguageSwitcher.tsx']];
  expect(()=>assertFreshNativeSources([family],exposures)).toThrow('development-exposed');
});
it('allows unrelated sources without certifying their independence',async()=>{
  expect(()=>assertFreshNativeSources([fresh()],exposures)).not.toThrow();
});
it.each(['family','repository','repositoryId','commit','source','implementation'])('rejects known development exposure via %s even after relabelling',async mode=>{
  const record=exposures.find(record=>record.familyId==='upstream:lennysh/tabinator')!;const family=fresh();
  if(mode==='family')family.familyId=record.familyId.toUpperCase();
  if(mode==='repository')family.repository=record.repository.toUpperCase();
  if(mode==='repositoryId')family.repositoryId=record.repositoryId!;
  if(mode==='commit')family.revisions[0].commit=record.revision;
  const implementation=record.sourceSha256!['server.js'];
  if(mode==='source')family.revisions[0].sourceHashes=[implementation];
  if(mode==='implementation')family.securityImplementationHashes=[implementation];
  expect(()=>assertFreshNativeSources([family],exposures)).toThrow('development-exposed');
});
it('does not treat a shared licence text as a reused security implementation',()=>{
  const family=fresh();family.revisions[0].sourceHashes=[exposures.find(record=>record.sourceSha256?.LICENSE)!.sourceSha256!.LICENSE];
  expect(()=>assertFreshNativeSources([family],exposures)).not.toThrow();
});
it('rejects the renamed Jingo implementation even with a new repository and commit',()=>{
  const family=fresh();family.securityImplementationHashes=[exposures.find(record=>record.familyId==='upstream:claudioc/jingo')!.sourceSha256!['lib/app.js']];
  expect(()=>assertFreshNativeSources([family],exposures)).toThrow('development-exposed');
});
it.each(['upstream:egeyigit/fieldpoint','upstream:stammig/yoyo-collection','upstream:joesalaz/bookwise','upstream:aialra-0/wikiflow','upstream:larsmikki/portal','upstream:fufu1209/personal-knowledge-manager','upstream:joshuaengine7/stockbase','upstream:timom84/8star-links','upstream:ntkhang03/anonymous-notepad','upstream:brixdorf/habit-tracker','upstream:asdteke/homeinventory'])('keeps expanded native source %s out of a fresh holdout',id=>{
  const record=exposures.find(e=>e.familyId===id)!;expect(record).toBeDefined();
  const family=fresh();family.repositoryId=record.repositoryId!;
  expect(()=>assertFreshNativeSources([family],exposures)).toThrow('development-exposed');
  family.repositoryId=987654321;family.securityImplementationHashes=[Object.entries(record.sourceSha256!).find(([p])=>/\.[jt]s$/.test(p))![1]];
  expect(()=>assertFreshNativeSources([family],exposures)).toThrow('development-exposed');
});
