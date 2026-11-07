import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {contentHash} from '../core/integrity';

// One immutable acquisition identity for the prospective twelve-family experiment.
// The same pinned source may use several scenarios without becoming a new family.
const producers=[
  'packages/ml/native-producer-identity.ts','packages/ml/project-seed-corpus.ts','packages/ml/project-policy-facts.ts',
  'packages/ml/native-jingo-profile.ts','packages/ml/local-tls.ts','packages/core/project-evidence.ts','packages/core/evidence-v3.ts',
  'packages/core/evidence-context.ts','packages/core/index.ts','packages/core/validation.ts','packages/core/integrity.ts','packages/core/frame-policy-scope.ts',
  'apps/server/project-inspection.ts','apps/server/project-signing.ts','apps/cli/project-scanner.ts','apps/cli/project-probes.ts',
  'apps/cli/project-cross-site.ts','apps/cli/project-loopback-transport.ts','apps/cli/project-cookie-access.ts','apps/cli/project-functional.ts',
  'apps/cli/project-framing.ts','apps/cli/project-frame-policy.ts','apps/cli/project-meta-policy.ts','apps/cli/project-resource-function.ts',
  'apps/cli/project-script-function.ts','apps/cli/project-redirect-guard.ts','tests/native-operation-data.ts',
  'tests/native-operation-adapters.ts','tests/native-next-family-adapters.ts','tests/native-expansion-data.ts','tests/native-bookwise-script.ts',
  'tests/native-jingo-script-data.ts','tests/native-tabinator-acceptance.ts','package-lock.json',
  'packages/ml/native-preference-evidence.ts','packages/ml/native-preference-registration.ts',
  'scripts/native-preference-probe.mjs','scripts/native-preference-source.mjs','scripts/native-preference-profile.mjs',
  'scripts/native-preference-data.mjs','scripts/native-preference-build.mjs',
  'tests/native-yoyo-editor.ts','scripts/native-expansion-data.mjs',
  'scripts/native-session-profile.mjs','scripts/native-tabinator-acceptance.mjs','scripts/native-cookie-matrix.mjs',
  'tests/native-jingo-session.ts','scripts/native-jingo-script-data.mjs',
  'tests/native-tabinator-editor.ts',
  'scripts/ml-resource-upgrade-linux.sh','apps/cli/project-dom.ts','apps/cli/project-hsts-plaintext.ts',
  'tests/native-fieldpoint-cross-site.ts',
];
export async function nativeHarnessHash(){
  return contentHash(await Promise.all(producers.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
}
export async function nativeAdapterIdentity(meta:{revision:string;dependencyLockSha256:string}){
  return contentHash({version:'vylnt-native-producer-v1',revision:meta.revision,dependencyLock:meta.dependencyLockSha256,harness:await nativeHarnessHash()});
}
