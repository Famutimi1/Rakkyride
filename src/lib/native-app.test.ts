import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { appStoreLink,nativeAppLink } from './native-app.ts';
import app from './native-app.generated.json' with {type:'json'};

test('email handoff uses the registered app scheme and only known protected screens',()=>{
  const source=JSON.parse(readFileSync(new URL('../../../ride_app/mobile/app.json',import.meta.url),'utf8')) as {expo:{scheme:string;android:{package:string}}};
  assert.equal(app.scheme,source.expo.scheme,'Run npm run sync:brand after changing mobile app identity');
  assert.equal(app.androidPackage,source.expo.android.package);
  for(const path of ['/home','/driver-onboarding','/driver-status','/driver-dashboard','/account/trips','/account/driver-trips','/account/payment','/account/driver-wallet','/account/support'])assert.equal(nativeAppLink(path),`${source.expo.scheme}://${path}`);
  for(const path of [undefined,null,[],['/driver-status'],'//evil.test','https://evil.test','javascript:alert(1)','/admin','/account/support?token=private','/../admin','/account/%73upport'])assert.equal(nativeAppLink(path),`${source.expo.scheme}:///home`);
});

test('store fallback rejects external hosts, unsafe protocols and other Android apps',()=>{
  const android=`https://play.google.com/store/apps/details?id=${app.androidPackage}`;
  assert.equal(appStoreLink(android,'android'),android);
  assert.equal(appStoreLink('https://apps.apple.com/ng/app/rakky-ride/id123456789','ios'),'https://apps.apple.com/ng/app/rakky-ride/id123456789');
  for(const value of [undefined,'','javascript:alert(1)','https://evil.test','https://play.google.com.evil.test/store/apps/details?id='+app.androidPackage,'http://play.google.com/store/apps/details?id='+app.androidPackage,'https://private@play.google.com/store/apps/details?id='+app.androidPackage,'https://play.google.com/store/apps/details?id=another.app'])assert.equal(appStoreLink(value,'android'),null);
  assert.equal(appStoreLink('https://apps.apple.com/not-a-listing','ios'),null);
});
