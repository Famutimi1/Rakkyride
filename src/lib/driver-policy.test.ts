import assert from 'node:assert/strict';
import test from 'node:test';
import {driverOperationAllowed,driverQuery,offerSeconds} from './driver-policy.ts';
import {freshBrowserPosition,socketAck} from './driver-live.ts';
const id='00000000-0000-4000-8000-000000000001';
test('driver gateway covers driver workflows but cannot reach staff or passenger booking operations',()=>{
 for(const [method,path] of [['GET','trips/offers/current'],['POST',`trips/${id}/accept`],['POST',`trips/${id}/complete`],['GET','driver/application/status'],['PUT','driver/service-preferences'],['POST','driver/service-applications'],['GET','payments/withdrawal-policy'],['POST','withdrawals'],['DELETE',`payout-accounts/${id}`],['POST',`trips/${id}/messages`]])assert.ok(driverOperationAllowed(method,path),method+path);
 for(const [method,path] of [['GET','admin/drivers'],['POST','trips'],['POST','trips/estimate'],['PATCH','driver/application/status'],['POST','driver/onboarding/documents'],['GET',`trips/${id}/delivery-code`],['POST',`trips/${id}/delivery-code/rotate`],['GET','wallet/../admin']])assert.equal(driverOperationAllowed(method,path),false,method+path);
 assert.equal(driverQuery('wallet/transactions',new URLSearchParams('account=wallet&userId=other&cursor=7')),'?cursor=7&account=earnings');
 assert.equal(driverQuery('notifications',new URLSearchParams('role=rider&cursor=8')),'?cursor=8&role=driver');
});
test('offer timers use server time and elapsed receipt time, including expired and invalid offers',()=>{
 const offer={serverNow:'2026-10-23T12:00:00Z',expiresAt:'2026-10-23T12:00:20Z'};
 assert.equal(offerSeconds(offer,1000,11000),10);assert.equal(offerSeconds(offer,1000,22000),0);assert.equal(offerSeconds({...offer,expiresAt:'invalid'},1000,2000),0);
});
test('driver location cannot be published as fresh when inaccurate, stale or invalid, and disconnected sockets cannot confirm online',async()=>{
 const point={latitude:6.4,longitude:3.4,timestamp:100000,accuracy:20};assert.ok(freshBrowserPosition(point,101000));
 for(const invalid of [{...point,accuracy:500},{...point,timestamp:1},{...point,latitude:NaN},{...point,longitude:190}])assert.equal(freshBrowserPosition(invalid,101000),false);
 await assert.rejects(socketAck(null,'driver:offline'),/connection unavailable/);
});
