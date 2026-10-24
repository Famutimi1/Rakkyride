import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
test('push worker never caches account data and only opens known same-origin passenger destinations',()=>{
  const handlers=new Map<string,unknown>();const context:{self:object;URL:typeof URL;safeDestination?:(value:unknown)=>string}={self:{addEventListener:(event:string,handler:unknown)=>handlers.set(event,handler),location:{origin:'https://rakky.example'}},URL};
  const source=readFileSync(new URL('../../public/rakky-sw.js',import.meta.url),'utf8');runInNewContext(source,context);assert.equal(handlers.has('fetch'),false);assert.ok(handlers.has('push'));assert.ok(handlers.has('notificationclick'));
  const safe=context.safeDestination!;assert.equal(safe('/ride/wallet?token=secret'),'https://rakky.example/ride/wallet');for(const value of ['https://evil.example/ride/wallet','javascript:alert(1)','/api/session/logout','/admin','/ride/../open-app','//evil.example/ride'])assert.equal(safe(value),'https://rakky.example/ride/notifications');
});

test('push payloads stay generic and notification clicks preserve an open staff dashboard',async()=>{
  const handlers=new Map<string,(event:unknown)=>void>();let displayed:{title:string;options:{body:string;data:{url:string;notificationId:string|null}}}|undefined,opened='',marked='';
  const context={self:{addEventListener:(event:string,handler:(event:unknown)=>void)=>handlers.set(event,handler),location:{origin:'https://rakky.example'},registration:{showNotification:async(title:string,options:NonNullable<typeof displayed>['options'])=>{displayed={title,options};}},clients:{matchAll:async()=>[{url:'https://rakky.example/admin',navigate:()=>{throw new Error('A push must not replace the staff dashboard');}}],openWindow:async(url:string)=>{opened=url;}}},URL,fetch:async(url:string)=>{marked=url;}};
  runInNewContext(readFileSync(new URL('../../public/rakky-sw.js',import.meta.url),'utf8'),context);
  let completion:Promise<unknown>=Promise.resolve();const waitUntil=(promise:Promise<unknown>)=>{completion=promise;};
  const id='00000000-0000-4000-8000-000000000001';
  handlers.get('push')!({data:{text:()=>JSON.stringify({title:'Private customer',body:'Sensitive pickup address',notificationId:id,url:'/ride/wallet?token=private'})},waitUntil});await completion;
  assert.equal(displayed!.title,'Rakky Ride');assert.equal(displayed!.options.body,'You have a new Rakky Ride update.');assert.equal(JSON.stringify(displayed).includes('Sensitive'),false);
  handlers.get('notificationclick')!({notification:{close(){},data:displayed!.options.data},waitUntil});await completion;
  assert.equal(opened,'https://rakky.example/ride/wallet');assert.equal(marked,`/api/rider/notifications/${id}/opened`);
});
