export function loadPreferenceSource(options?:{pinnedObjects?:boolean}):Promise<{meta:{version:number;role:string;familyId:string;repository:string;repositoryId:number;revision:string;license:string;
  sourceSha256:Record<string,string>;dependencyLockSha256:string;clientDependencyLockSha256:string;excludeFromFutureHoldout:boolean;qualificationClaimed:boolean;
  licenseGitBlob:string;scope:string;sourceBytePolicy:string};source:string;destination:string;verified:{file:string;bytes:Uint8Array}[];total:number}>;
