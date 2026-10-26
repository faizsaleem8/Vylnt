import ts from 'typescript';
import { readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep, isAbsolute } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import type { SnapshotContext } from '../cli/gate-runner';
import { projectInspectionSchema } from '../../packages/core/project-evidence';

/** Syntax inventory only: these counts never establish authentication, necessity or protection. */
export async function inspectProject(context:SnapshotContext) {
  context.signal.throwIfAborted();
  const env={...process.env};for(const name of Object.keys(env))if(name.startsWith('GIT_'))delete env[name];
  const {stdout}=await promisify(execFile)('git',['ls-files','-z'],{cwd:context.app,env,signal:context.signal,windowsHide:true,maxBuffer:1024*1024});
  const files=stdout.split('\0').filter(p=>/\.[cm]?[jt]s$/.test(p)&&!p.split(/[\\/]/).includes('node_modules')).sort();
  let partial=files.length>200,total=0,express=false,headers=0,cookies=0,sessions=0;
  const sourceHashes:string[]=[];
  for(const name of files.slice(0,200)){
    context.signal.throwIfAborted();const path=resolve(context.app,name),within=relative(context.app,path);
    if(isAbsolute(within)||within.startsWith('..'+sep)||within==='..'||resolve(path)===resolve(context.app)){partial=true;continue;}
    const info=await stat(path);if(info.size>64*1024||total+info.size>4*1024*1024){partial=true;continue;}total+=info.size;
    const source=await readFile(path,'utf8');sourceHashes.push(createHash('sha256').update(source).digest('hex'));
    const file=ts.createSourceFile('local.ts',source,ts.ScriptTarget.Latest,true);
    const imports=new Map<string,string>(),applications=new Set<string>();
    for(const statement of file.statements){
      if(ts.isImportDeclaration(statement)&&ts.isStringLiteral(statement.moduleSpecifier)&&statement.importClause?.name)imports.set(statement.importClause.name.text,statement.moduleSpecifier.text);
      if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations){
        if(!ts.isIdentifier(declaration.name)||!declaration.initializer)continue;const init=declaration.initializer;
        if(ts.isCallExpression(init)&&ts.isIdentifier(init.expression)&&init.expression.text==='require'&&init.arguments.length===1&&ts.isStringLiteral(init.arguments[0]))imports.set(declaration.name.text,init.arguments[0].text);
        if(ts.isCallExpression(init)&&ts.isIdentifier(init.expression)&&imports.get(init.expression.text)==='express'&&init.arguments.length===0)applications.add(declaration.name.text);
      }
    }
    if(applications.size)express=true;
    function inspect(node:ts.Node){
      if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&applications.has(node.expression.expression.text)){
        const method=node.expression.name.text;
        if(method==='use')for(const argument of node.arguments)if(ts.isCallExpression(argument)&&ts.isIdentifier(argument.expression)&&imports.get(argument.expression.text)==='express-session')sessions++;
        if(['get','post','put','patch','delete','use','all'].includes(method))for(const argument of node.arguments){
          if(!ts.isArrowFunction(argument)&&!ts.isFunctionExpression(argument))continue;
          const response=argument.parameters[1]?.name;if(!response||!ts.isIdentifier(response))continue;
          function body(child:ts.Node){
            // Nested scopes/aliases/dynamic targets remain unresolved.
            if(child!==argument&&ts.isFunctionLike(child)){partial=true;return;}
            if(ts.isCallExpression(child)&&ts.isPropertyAccessExpression(child.expression)&&ts.isIdentifier(child.expression.expression)&&child.expression.expression.text===(response as ts.Identifier).text){
              if(['set','header','setHeader','append'].includes(child.expression.name.text))headers++;
              if(child.expression.name.text==='cookie')cookies++;
            }
            ts.forEachChild(child,body);
          }
          body(argument.body);
        }
      }
      ts.forEachChild(node,inspect);
    }
    inspect(file);
  }
  return projectInspectionSchema.parse({version:'vylnt-express-inspection-v1',framework:express?'express':'unsupported',coverage:partial?'partial':'complete',sourceHashes,
    headerOperations:Math.min(headers,10000),cookieOperations:Math.min(cookies,10000),sessionMiddlewareRegistrations:Math.min(sessions,10000)});
}
