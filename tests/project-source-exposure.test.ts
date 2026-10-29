import {it,expect} from 'vitest';
import {readNativeProjectExposures,assertFreshNativeSources} from '../packages/ml/project-source-exposure';

const fresh=()=>({familyId:'upstream:independent/example',repository:'https://github.com/independent/example',repositoryId:987654321,
  securityImplementationHashes:['a'.repeat(64)],revisions:[{commit:'b'.repeat(40),sourceHashes:['c'.repeat(64)]}]});
const exposures=await readNativeProjectExposures();
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
