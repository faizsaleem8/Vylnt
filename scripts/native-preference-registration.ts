import {parseArgs} from 'node:util';
import {registerNativePreference} from '../packages/ml/native-preference-registration';
// The same exact-blob loader runs at registration and at both ends of collection.
const {loadPreferenceSource}=await import('./native-preference-source.mjs');
const {values}=parseArgs({options:{output:{type:'string'}}});
if(!values.output)throw Error('Provide --output <new folder directly under .local>');
const {meta}=await loadPreferenceSource();
await registerNativePreference(values.output,meta);
console.log('Registered native preference source, controls and producer before collection. No model fitting or qualification.');
