/** Narrow response-policy scope for controlled HTTP loopback ancestor checks.
 * Returned identifiers are transient matching data, never model features. */
export function framePolicyScope(policy:string|undefined,target:string):{supported:boolean;origins:string[];policies:number}{
  const unknown={supported:false,origins:[],policies:0};
  if(!policy||policy.length>=8192||/[^\x09\x20-\x7e]/.test(policy))return unknown;
  let self:URL;try{self=new URL(target);}catch{return unknown;}
  if(self.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(self.hostname)||self.username||self.password)return unknown;
  const parts=policy.split(',');if(parts.length>16)return unknown;
  let intersection:Set<string>|undefined,count=0;
  for(const part of parts){
    let values:string[]|undefined;
    for(const directive of part.split(';')){
      const [name,...tokens]=directive.trim().split(/\s+/);
      if(name?.toLowerCase()==='frame-ancestors'){values=tokens;break;}
    }
    if(!values)continue;
    count++;if(!values.length||values.length>16)return unknown;
    const origins=new Set<string>();
    for(const value of values){
      if(value==="'none'"){if(values.length!==1)return unknown;continue;}
      if(value==="'self'"){origins.add(self.origin);continue;}
      if(!/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?\/?$/.test(value))return unknown;
      try{const url=new URL(value);if(url.username||url.password||url.search||url.hash||url.pathname!=='/')return unknown;origins.add(url.origin);}catch{return unknown;}
    }
    intersection=intersection===undefined?origins:new Set([...intersection].filter(origin=>origins.has(origin)));
  }
  return count?{supported:true,origins:[...intersection!].sort(),policies:count}:unknown;
}
