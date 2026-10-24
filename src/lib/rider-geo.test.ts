import assert from 'node:assert/strict';
import test from 'node:test';
import {nearbyQuery,freshDriver,decodeRoute} from './rider-geo.ts';
test('nearby lookup requires valid coordinates, bounds radius and strips unrelated queries',()=>{
  assert.equal(nearbyQuery(new URLSearchParams('latitude=6.4&longitude=3.5&radiusKm=10&serviceType=courier&userId=other')),'?latitude=6.4&longitude=3.5&radiusKm=10&serviceType=courier');
  for(const value of ['longitude=3.5','latitude=&longitude=3','latitude=91&longitude=3','latitude=6&longitude=181','latitude=NaN&longitude=3','latitude=6&longitude=3&radiusKm=999','latitude=6&longitude=3&radiusKm=0','latitude=6&longitude=3&serviceType=driver'])assert.equal(nearbyQuery(new URLSearchParams(value)),null,value);
});
test('car markers expire after 30 seconds and reject future or invalid coordinates',()=>{
  const now=100000,point={latitude:6.4,longitude:3.5,timestamp:now};assert.equal(freshDriver(point,now),true);assert.equal(freshDriver({...point,timestamp:now-30000},now),false);assert.equal(freshDriver({...point,timestamp:now+6000},now),false);assert.equal(freshDriver({...point,longitude:Infinity},now),false);
});
test('estimated route decoder reads the documented Google E5 example and rejects broken routes',()=>{
  assert.deepEqual(decodeRoute('_p~iF~ps|U_ulLnnqC_mqNvxq`@'),[{lat:38.5,lng:-120.2},{lat:40.7,lng:-120.95},{lat:43.252,lng:-126.453}]);for(const value of ['~','\u0001','_'.repeat(200001),null])assert.deepEqual(decodeRoute(value),[]);
});
