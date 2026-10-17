import app from './native-app.generated.json' with { type: 'json' };

const destinations=new Set([
  '/home','/driver-onboarding','/driver-status','/driver-dashboard',
  '/account/trips','/account/driver-trips','/account/payment','/account/driver-wallet','/account/support',
]);

/** Never accept an external redirect, arbitrary scheme, query or credential. */
export function nativeAppLink(path:unknown):string {
  const destination=typeof path==='string'&&destinations.has(path)?path:'/home';
  return `${app.scheme}://${destination}`;
}

export function appStoreLink(value:string|undefined,platform:'android'|'ios'):string|null {
  if(!value)return null;
  try {
    const link=new URL(value);
    if(link.protocol!=='https:'||link.username||link.password||link.port||link.hash)return null;
    if(platform==='android')return link.hostname==='play.google.com'&&link.pathname==='/store/apps/details'&&link.searchParams.get('id')===app.androidPackage?link.toString():null;
    return link.hostname==='apps.apple.com'&&/^\/(?:[a-z]{2}\/)?app\/(?:[^/]+\/)?id\d+\/?$/.test(link.pathname)?link.toString():null;
  }catch{return null;}
}
