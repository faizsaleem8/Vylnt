export const preferenceAlias='session-language-preference';

export function preferenceProfile(file,text){
  if(Buffer.byteLength(text)>256*1024)throw Error('Preference source exceeds its profile budget');
  if(file==='client/src/i18n.ts'){
    if(text.split('i18next=').length!==3||text.split("lookupCookie: 'i18next'").length!==2)throw Error('Native client cookie layout differs');
    return text.replaceAll('i18next=',preferenceAlias+'=').replace("lookupCookie: 'i18next'","lookupCookie: '"+preferenceAlias+"'");
  }
  if(file==='config/i18n.js'){
    if(text.split("lookupCookie: 'i18next'").length!==2)throw Error('Native server cookie layout differs');
    return text.replace("lookupCookie: 'i18next'","lookupCookie: '"+preferenceAlias+"'");
  }
  throw Error('Unsupported native preference profile source');
}
