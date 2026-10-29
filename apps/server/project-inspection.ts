import ts from 'typescript';
import { readFile, lstat, realpath } from 'node:fs/promises';
import { relative, resolve, sep, isAbsolute } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import type { SnapshotContext } from '../cli/gate-runner';
import { projectInspectionSchema } from '../../packages/core/project-evidence';

/** Syntax inventory only: these counts never establish authentication, necessity or protection. */
export async function inspectProject(context:SnapshotContext) {
  context.signal.throwIfAborted();
  const actualRoot=await realpath(context.app);
  const env={...process.env};for(const name of Object.keys(env))if(name.startsWith('GIT_'))delete env[name];
  const {stdout}=await promisify(execFile)('git',['ls-files','-z'],{cwd:context.app,env,signal:context.signal,windowsHide:true,maxBuffer:1024*1024});
  const files=stdout.split('\0').filter(p=>/\.[cm]?[jt]s$/.test(p)&&!p.split(/[\\/]/).includes('node_modules')).sort();
  let partial=files.length>200,total=0,express=false,headers=0,cookies=0,sessions=0;
  const sourceHashes:string[]=[];
  for(const name of files.slice(0,200)){
    context.signal.throwIfAborted();const path=resolve(context.app,name),within=relative(context.app,path);
    if(isAbsolute(within)||within.startsWith('..'+sep)||within==='..'||resolve(path)===resolve(context.app)){partial=true;continue;}
    const info=await lstat(path),actual=await realpath(path),inside=relative(actualRoot,actual);
    if(info.isSymbolicLink()||!info.isFile()||isAbsolute(inside)||inside==='..'||inside.startsWith('..'+sep)){partial=true;continue;}
    if(info.size>64*1024||total+info.size>4*1024*1024){partial=true;continue;}total+=info.size;
    const source=await readFile(path,'utf8');sourceHashes.push(createHash('sha256').update(source).digest('hex'));
    const file=ts.createSourceFile('local.ts',source,ts.ScriptTarget.Latest,true);
    const imports=new Map<string,string>(),applications=new Set<string>(),uninitialized=new Set<string>(),topNames=new Map<string,number>();
    for(const statement of file.statements){
      const declare=(name:string)=>topNames.set(name,(topNames.get(name)??0)+1);
      const declareBindings=(name:ts.BindingName)=>{if(ts.isIdentifier(name))declare(name.text);else for(const item of name.elements)if(ts.isBindingElement(item))declareBindings(item.name);};
      if(ts.isImportDeclaration(statement)&&statement.importClause){
        if(statement.importClause.name)declare(statement.importClause.name.text);
        const named=statement.importClause.namedBindings;
        if(named){if(ts.isNamespaceImport(named))declare(named.name.text);else for(const entry of named.elements)declare(entry.name.text);}
      }
      if((ts.isFunctionDeclaration(statement)||ts.isClassDeclaration(statement))&&statement.name)declare(statement.name.text);
      if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)declareBindings(declaration.name);
      if(ts.isImportDeclaration(statement)&&ts.isStringLiteral(statement.moduleSpecifier)&&statement.importClause?.name)imports.set(statement.importClause.name.text,statement.moduleSpecifier.text);
      if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations){
        if(!ts.isIdentifier(declaration.name)||!declaration.initializer)continue;const init=declaration.initializer;
        if(ts.isCallExpression(init)&&ts.isIdentifier(init.expression)&&init.expression.text==='require'&&init.arguments.length===1&&ts.isStringLiteral(init.arguments[0]))imports.set(declaration.name.text,init.arguments[0].text);
        if(ts.isCallExpression(init)&&ts.isIdentifier(init.expression)&&imports.get(init.expression.text)==='express'&&init.arguments.length===0)applications.add(declaration.name.text);
      }
      if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)if(ts.isIdentifier(declaration.name)&&!declaration.initializer)uninitialized.add(declaration.name.text);
    }
    const factories=new Map<ts.Node,Set<string>>();
    for(const statement of file.statements){
      if(!ts.isExpressionStatement(statement)||!ts.isBinaryExpression(statement.expression)||statement.expression.operatorToken.kind!==ts.SyntaxKind.EqualsToken)continue;
      const {left,right}=statement.expression;
      if(!ts.isPropertyAccessExpression(left)||!ts.isFunctionExpression(right)||!right.body)continue;
      const owner=left.expression;
      if(!(ts.isIdentifier(owner)&&owner.text==='exports'||ts.isPropertyAccessExpression(owner)&&ts.isIdentifier(owner.expression)&&owner.expression.text==='module'&&owner.name.text==='exports'))continue;
      for(const entry of right.body.statements){
        if(!ts.isExpressionStatement(entry)||!ts.isBinaryExpression(entry.expression)||entry.expression.operatorToken.kind!==ts.SyntaxKind.EqualsToken)continue;
        const assignment=entry.expression;
        if(!ts.isIdentifier(assignment.left)||!uninitialized.has(assignment.left.text)||!ts.isCallExpression(assignment.right)||!ts.isIdentifier(assignment.right.expression)||assignment.right.arguments.length||imports.get(assignment.right.expression.text)!=='express')continue;
        const app=assignment.left.text,factory=assignment.right.expression.text;let writes=0,shadowed=false;
        if(topNames.get(app)!==1||topNames.get(factory)!==1||topNames.has('module')||topNames.has('exports')||topNames.has('require'))continue;
        const protectedNames=new Set([app,factory,'module','exports','require']);
        function audit(node:ts.Node){
          if(ts.isBinaryExpression(node)&&ts.isIdentifier(node.left)&&node.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&node.operatorToken.kind<=ts.SyntaxKind.LastAssignment){if(node.left.text===app)writes++;if([factory,'module','exports','require'].includes(node.left.text))shadowed=true;}
          if((ts.isVariableDeclaration(node)||ts.isParameter(node)||ts.isFunctionDeclaration(node)||ts.isClassDeclaration(node))&&node.name){
            const names: string[]=[];const bindings=(name:ts.BindingName|ts.DeclarationName)=>{if(ts.isIdentifier(name))names.push(name.text);else if(ts.isObjectBindingPattern(name)||ts.isArrayBindingPattern(name))for(const item of name.elements)if(ts.isBindingElement(item))bindings(item.name);};bindings(node.name);
            if(names.some(name=>protectedNames.has(name))&&!(node.parent?.parent&&ts.isVariableStatement(node.parent.parent)&&node.parent.parent.parent===file&&ts.isIdentifier(node.name)&&node.name.text===app&&!('initializer' in node&&node.initializer)))shadowed=true;
          }
          if((ts.isPrefixUnaryExpression(node)||ts.isPostfixUnaryExpression(node))&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(node.operator)&&ts.isIdentifier(node.operand)&&protectedNames.has(node.operand.text))shadowed=true;
          ts.forEachChild(node,audit);
        }
        // Top-level require declarations are legitimate; audit the initializer
        // scope for lexical shadowing, and the whole file for reassignment.
        function assignments(node:ts.Node){if(ts.isBinaryExpression(node)&&ts.isIdentifier(node.left)&&node.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&node.operatorToken.kind<=ts.SyntaxKind.LastAssignment){if(node.left.text===app)writes++;if([factory,'module','exports','require'].includes(node.left.text))shadowed=true;}if((ts.isPrefixUnaryExpression(node)||ts.isPostfixUnaryExpression(node))&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(node.operator)&&ts.isIdentifier(node.operand)&&protectedNames.has(node.operand.text))shadowed=true;ts.forEachChild(node,assignments);}
        assignments(file);const totalWrites=writes;writes=0;audit(right);
        if(shadowed||totalWrites!==1||writes!==1)continue;
        const selected=factories.get(right)??new Set<string>();selected.add(app);factories.set(right,selected);express=true;partial=true;
      }
    }
    if(applications.size)express=true;
    function inspect(node:ts.Node,active=applications){
      const scoped=factories.get(node)??active;
      if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&scoped.has(node.expression.expression.text)){
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
      ts.forEachChild(node,child=>inspect(child,scoped));
    }
    inspect(file);
  }
  return projectInspectionSchema.parse({version:'vylnt-express-inspection-v1',framework:express?'express':'unsupported',coverage:partial?'partial':'complete',sourceHashes,
    headerOperations:Math.min(headers,10000),cookieOperations:Math.min(cookies,10000),sessionMiddlewareRegistrations:Math.min(sessions,10000)});
}
