import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import {createServer,type IncomingMessage} from "node:http";
import type {AddressInfo} from "node:net";
import {spawn} from "node:child_process";
import {setTimeout as delay} from "node:timers/promises";

// Isolated fixture only. No real database, OTP, driver, Google Maps or payment call.
const userId="00000000-0000-4000-8000-000000000001",tripId="00000000-0000-4000-8000-000000000002";
const identity={user:{avatarVersion:"0",avatarUrl:null as string|null,id:userId,name:"Website Test Rider",phone:"+2348000000000",email:"rider@example.test"},activeRole:"rider",driverStatus:"approved"};
const fixtureTrip={id:tripId,rider_id:userId,driver_id:null,status:"searching",service_type:"ride",payment_method:"cash",payment_status:"unpaid",fare_kobo:320000,pickup_lat:6.4474,pickup_lng:3.4723,pickup_address:"Admiralty Way, Lekki",dropoff_lat:6.4281,dropoff_lng:3.4219,dropoff_address:"Victoria Island, Lagos",estimated_distance_m:8200,estimated_duration_s:1320,requested_at:"2026-10-22T08:00:00Z"};
const supportId="00000000-0000-4000-8000-000000000004";
const driverSettings={version:1,vehicleCategory:"car",vehicleReviewRequired:false,vehicle:{make:"Toyota",model:"Corolla",year:2022,color:"Silver",registrationNumber:"TEST 001"},services:{ride:{status:"approved",enabled:true,consentAccepted:true,review:null},courier:{status:"approved",enabled:false,consentAccepted:true,review:null}},consent:{version:"fixture-v1",descriptions:{ride:"Fixture passenger service responsibilities.",courier:"Fixture courier service responsibilities."}}};
const preferences={pushEnabled:true,tripUpdatesEnabled:true,scheduledRemindersEnabled:true,walletUpdatesEnabled:true,promotionsEnabled:false,soundEnabled:true,vibrationEnabled:true,driverOffersEnabled:true};
const fixtureWithdrawals:{id:string;amount_kobo:number;fee_kobo:number;status:string;requested_at:string;completed_at:null;bank_name:string;account_last4:string}[]=[];
const supportCases:{id:string;subject:string;category:string;status:string;tripId:string|null;createdAt:string;updatedAt:string;messages:object[];nextBefore:null}[]=[];
let refreshCount=0,expired=false,meUnavailable=false,logoutUnavailable=false,tripRequests=0;
const forwarded:{path:string;method:string;body:Record<string,unknown>;key?:string}[]=[];
const chatMessages:{id:string;recordId:string;tripId:string;senderId:string;senderRole:string;text:string;sentAt:number}[]=[];
let browserEnabled=false;
const browserId="00000000-0000-4000-8000-000000000006";
function saveMessage(body:Record<string,unknown>){const existing=chatMessages.find(m=>m.id===body.id);if(existing)return {message:existing,created:false};const message={id:String(body.id),recordId:String(chatMessages.length+1),tripId,senderId:userId,senderRole:"rider",text:String(body.text),sentAt:Date.now()};chatMessages.push(message);return {message,created:true};}
const bookings=new Map<string,typeof fixtureTrip>();
async function read(req:IncomingMessage){let raw="";for await(const chunk of req)raw+=chunk;if(req.headers["content-type"]?.startsWith("multipart/form-data"))return {multipart:raw.includes('name="avatar"')};if(!req.headers["content-type"]?.startsWith("application/json"))return {packet:raw};return raw?JSON.parse(raw) as Record<string,unknown>:{};}
const mock=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url??"/","http://fixture.invalid"),path=url.pathname;
    const body=await read(req);res.setHeader("Content-Type","application/json");
    const send=(value:unknown,status=200)=>{res.statusCode=status;res.end(JSON.stringify(value));};
    forwarded.push({path:url.pathname+url.search,method:req.method??"GET",body,key:req.headers["idempotency-key"] as string|undefined});
    if(path==="/api/auth/login/initiate"||path==="/api/auth/register/initiate"||path==="/api/auth/otp/resend")return send({phone:"+2348000000000",retryAfterSeconds:1});
    if(path==="/api/auth/login/verify"||path==="/api/auth/register/verify"){if(body.code!=="123456")return send({error:"otp_invalid"},400);return send({...identity,tokens:{accessToken:"fixture-rider-access",refreshToken:"fixture-rider-refresh"}});}
    if(path==="/api/auth/refresh"){refreshCount++;expired=false;return send({tokens:{accessToken:"fixture-rider-rotated",refreshToken:"fixture-rider-refresh-rotated"}});}
    if(path==="/api/auth/google/web")return send(body.idToken==="google-existing"?{...identity,tokens:{accessToken:"fixture-rider-access",refreshToken:"fixture-rider-refresh"}}:{needsPhoneVerification:true,phoneVerificationToken:"fixture-phone-link-secret",user:{name:"Google Fixture Rider"}});
    if(path==="/api/auth/logout")return send(logoutUnavailable?{error:"unavailable"}:{success:true},logoutUnavailable?503:200);
    const token=req.headers.authorization;
    if(!["Bearer fixture-rider-access","Bearer fixture-rider-rotated"].includes(token??"")||expired)return send({error:"invalid_or_expired_token"},401);
    if(path==="/api/auth/me")return send(meUnavailable?{error:"unavailable"}:identity,meUnavailable?503:200);
    if(path==="/api/auth/profile"){identity.user.name=String(body.name??identity.user.name);identity.user.email=String(body.email??"");return send(identity);}
    if(path==="/socket.io/socket.io.min.js"){res.setHeader("Content-Type","application/javascript");return res.end("/* fixture transport asset */");}
    if(path==="/socket.io/"){res.setHeader("Content-Type","text/plain");return res.end(req.method==="GET"?'0{"sid":"fixture-socket","upgrades":[],"pingInterval":25000,"pingTimeout":20000}':"ok");}
    if(path==="/api/auth/profile/avatar"){if(req.headers["if-match"]!==identity.user.avatarVersion)return send({error:"profile_photo_changed"},412);if(req.method==="POST"&&!body.multipart)return send({error:"avatar_required"},400);identity.user.avatarVersion=String(Number(identity.user.avatarVersion)+1);identity.user.avatarUrl=req.method==="DELETE"?null:"https://images.example.test/fixture.webp";return send(identity);}
    if(path==="/api/auth/phone-change/initiate")return send({phone:body.phone,challenge:"fixture-phone-change",retryAfterSeconds:1});
    if(path==="/api/auth/phone-change/verify"){if(body.code!=="123456")return send({error:"otp_invalid"},400);identity.user.phone="+2348000000001";return send(identity);}
    if(path==="/api/auth/active-role"){identity.activeRole=String(body.role);return send({activeRole:identity.activeRole});}
    if(path==="/api/driver/application/status")return send({status:identity.driverStatus,materialVersion:"fixture-version",vehicle:{make:"Toyota",model:"Corolla",year:2022,color:"Silver",registrationNumber:"TEST 001"},documents:[{kind:"license",available:true},{kind:"registration",available:true},{kind:"insurance",available:true}],serviceSettings:driverSettings});
    if(path==="/api/driver/service-settings")return send(driverSettings);
    if(path==="/api/driver/service-preferences"){driverSettings.services.ride.enabled=Boolean(body.acceptsRide);driverSettings.services.courier.enabled=Boolean(body.acceptsCourier);driverSettings.version++;return send(driverSettings);}
    if(path.startsWith("/api/driver/onboarding/")||path==="/api/driver/service-applications")return send({saved:true});
    if(path==="/api/driver/earnings/summary")return send({range:url.searchParams.get("range"),trips:4,grossKobo:2200000,commissionKobo:330000,netKobo:870000,cashTrips:2,walletTrips:2});
    if(path==="/api/trips/offers/current")return send(null);
    if(path==="/api/payments/banks")return send([{name:"Fixture Bank",code:"999"}]);
    if(path==="/api/payments/withdrawal-policy")return send({minWithdrawalKobo:100000,maxDailyWithdrawalKobo:50000000,withdrawalFeeKobo:10000,newAccountCooldownHours:24});
    if(path==="/api/payout-accounts"&&req.method==="GET")return send({accounts:[{id:browserId,bank_name:"Fixture Bank",bank_code:"999",account_last4:"0123",account_name:"WEBSITE TEST RIDER",created_at:"2026-01-01T00:00:00Z"}]});
    if(path==="/api/payout-accounts/resolve")return send({accountName:"WEBSITE TEST RIDER"});
    if(path.startsWith("/api/payout-accounts"))return send({success:true});
    if(path==="/api/withdrawals"&&req.method==="GET")return send({withdrawals:fixtureWithdrawals});
    if(path==="/api/withdrawals/otp")return send({sent:true});
    if(path==="/api/withdrawals"){const id=crypto.randomUUID();fixtureWithdrawals.push({id,amount_kobo:Number(body.amountKobo),fee_kobo:10000,status:"pending",requested_at:new Date().toISOString(),completed_at:null,bank_name:"Fixture Bank",account_last4:"0123"});return send({id,status:"pending"});}
    if(path==="/api/wallet")return send({walletKobo:1250000,earningsKobo:870000,withdrawableKobo:870000,owedKobo:0,cashDebtLimitKobo:500000,canGoOnline:true});
    if(path==="/api/wallet/transactions")return send({items:[{id:"wallet-fixture",direction:"credit",amountKobo:1000000,balanceAfterKobo:1250000,createdAt:"2026-10-22T08:00:00Z",type:"topup",description:"Fixture top-up"}],nextCursor:null});
    if(path==="/api/places/autocomplete"){const isLekki=String(body.input).toLowerCase().includes("lekki");return send({predictions:[{placeId:isLekki?"pickup":"dropoff",address:isLekki?"Admiralty Way, Lekki":"Victoria Island, Lagos",primaryText:isLekki?"Admiralty Way, Lekki":"Victoria Island",secondaryText:"Lagos, Nigeria"}]});}
    if(path==="/api/places/details")return send(body.placeId==="pickup"?{latitude:6.4474,longitude:3.4723,address:"Admiralty Way, Lekki",placeId:"pickup"}:{latitude:6.4281,longitude:3.4219,address:"Victoria Island, Lagos",placeId:"dropoff"});
    if(path==="/api/location/nearby")return send({drivers:[{driverId:"fixture-nearby-1",latitude:6.4482,longitude:3.4731,distanceKm:.4},{driverId:"fixture-nearby-2",latitude:6.4448,longitude:3.4718,distanceKm:.8}]});
    if(path===`/api/trips/${tripId}/messages`){if(req.method==="POST"){const result=saveMessage(body);return send(result,result.created?201:200);}return send({messages:chatMessages,nextBefore:null});}
    if(path==="/api/notifications/browser/config")return send({configured:true,publicKey:"fixture-public-key"});
    if(path==="/api/notifications/browser/status")return send({id:browserEnabled?browserId:null,enabled:browserEnabled});
    if(path==="/api/notifications/browser/subscriptions"){browserEnabled=true;return send({id:browserId,enabled:true});}
    if(path===`/api/notifications/browser/subscriptions/${browserId}`){browserEnabled=false;return send({success:true});}
    if(path==="/api/trips/estimate")return send({quoteId:"fixture-quote",quoteExpiresAt:new Date(Date.now()+120000).toISOString(),fareKobo:320000,distanceM:8200,durationS:1320,encodedPolyline:"",currency:"NGN"});
    if(path==="/api/trips"&&req.method==="POST"){tripRequests++;const key=String(req.headers["idempotency-key"]);const known=bookings.get(key);if(known)return send({trip:known,created:false});const trip={...fixtureTrip,payment_method:String(body.paymentMethod),service_type:String(body.serviceType??"ride"),status:body.scheduledAt?"scheduled":"searching",...(body.scheduledAt?{scheduled_at:body.scheduledAt}:{}),...(body.courierDetails?{courier_details:body.courierDetails}:{})};bookings.set(key,trip);return send({trip,created:true},201);}
    if(path==="/api/trips/active"){const active=[...bookings.values()].find(v=>["searching","driver_assigned","driver_arrived","in_progress","returning"].includes(v.status));return send(active?{...active,latestDriverLocation:{latitude:6.4465+Math.sin(Date.now()/10000)*.0005,longitude:3.4705+Math.cos(Date.now()/10000)*.0005,timestamp:Date.now()}}:null);}
    if(path==="/api/trips/history")return send({trips:[{...fixtureTrip,status:"completed",payment_status:"settled"}],nextCursor:null});
    if(path==="/api/trips/scheduled")return send([...bookings.values()].filter(t=>t.status==="scheduled"));
    if(path===`/api/trips/${tripId}`)return send([...bookings.values()][0]??{...fixtureTrip,status:"completed",payment_status:"settled"});
    if(/\/(accept|decline|arrived|start|return|complete)$/.test(path)){const action=path.split('/').at(-1);if(action==='decline')return send({success:true});for(const trip of bookings.values()){trip.status=action==='arrived'?'driver_arrived':action==='start'?'in_progress':action==='return'?'returning':action==='complete'?'completed':'driver_assigned';if(action==='complete')trip.payment_status='settled';}return send([...bookings.values()][0]??fixtureTrip);}
    if(path.endsWith("/cancel")){for(const t of bookings.values())t.status="cancelled";return send({...fixtureTrip,status:"cancelled"});}
    if(path.endsWith("/rating"))return send({success:true});
    if(path.endsWith("/delivery-code"))return send({code:"654321"});
    if(path==="/api/payments/topups")return send({reference:"tu_"+"a".repeat(32),authorizationUrl:"https://checkout.paystack.com/fixture-only",accessCode:"must-not-leak"});
    if(path.startsWith("/api/payments/topups/"))return send({status:"pending",amountKobo:500000});
    if(path==="/api/care/settings")return send({phone:null,email:"support@example.test",staffedHours:"Fixture hours",availabilityMessage:"Isolated test support contacts."});
    if(path==="/api/care/support"){
      if(req.method==="GET")return send({cases:supportCases,nextCursor:null});
      const known=supportCases.find(c=>c.subject===body.subject);if(known)return send({id:known.id});
      supportCases.push({id:supportCases.length?crypto.randomUUID():supportId,subject:String(body.subject),category:String(body.category),status:"new",tripId:body.tripId as string|null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),messages:[{id:"1",body:body.body,from:"you",createdAt:new Date().toISOString()}],nextBefore:null});return send({id:supportCases.at(-1)!.id});
    }
    if(/^\/api\/care\/support\/[^/]+$/.test(path))return send(supportCases.find(c=>c.id===path.split("/").at(-1)));
    if(/^\/api\/care\/support\/[^/]+\/messages$/.test(path)){const record=supportCases.find(c=>c.id===path.split("/").at(-2))!;record.messages.push({id:String(record.messages.length+1),body:body.body,from:"you",createdAt:new Date().toISOString()});return send({success:true});}
    if(path==="/api/notifications/preferences"){if(req.method==="PATCH")Object.assign(preferences,body);return send(preferences);}
    if(path==="/api/notifications")return send({notifications:[{id:"00000000-0000-4000-8000-000000000003",title:"Fixture journey update",body:"Your trip status is available.",createdAt:"2026-10-22T08:00:00Z",readAt:null,category:"trip_updates",data:{tripId}}],nextCursor:null});
    if(path.includes("/notifications/"))return send({success:true});
    return send({error:"fixture_endpoint_not_found"},404);
  }catch{res.statusCode=500;res.end(JSON.stringify({error:"fixture_failure"}));}
});
// Optional local browser QA reuses the existing backend Socket.IO package. No production dependency is added.
let fixtureIo:{close:()=>void}|undefined;
if(process.argv.includes("--serve-ui")){
  const backendRequire=createRequire(resolve("../ride_app/backend/package.json"));
  type FixtureSocket={handshake:{headers:{authorization?:string}};data:Record<string,unknown>;join:(room:string)=>void;emit:(event:string,...args:unknown[])=>void;on:(event:string,fn:(...args:unknown[])=>void)=>void};
  const {Server}=backendRequire("socket.io") as {Server:new(server:unknown,options:object)=>{use:(fn:(socket:FixtureSocket,next:(error?:Error)=>void)=>void)=>void;on:(event:string,fn:(socket:FixtureSocket)=>void)=>void;close:()=>void}};
  const io=new Server(mock,{cors:{origin:false}});fixtureIo=io;
  io.use((socket,next)=>socket.handshake.headers.authorization?.startsWith("Bearer fixture-rider-")?next():next(new Error("unauthorized")));
  io.on("connection",socket=>{
    socket.on("driver:location:update",(_value,ack)=>{if(typeof ack==='function')ack({ok:true});});socket.on("driver:offline",ack=>{if(typeof ack==='function')ack({ok:true});});
    socket.on("trip:join",(id,ack)=>{socket.join(`trip:${String(id)}`);if(typeof ack==='function')ack({ok:true});});
    socket.on("trip:message:send",(value,ack)=>{const message=value as {id:string;tripId:string;text:string};socket.emit("trip:message",saveMessage(message).message);if(typeof ack==='function')ack({ok:true});socket.emit("trip:message",{id:crypto.randomUUID(),tripId:message.tripId,text:"Thanks, I’m by the main entrance. This is an isolated test driver reply.",senderId:"fixture-driver",senderRole:"driver",sentAt:Date.now()});});
  });
}
mock.listen(0,"127.0.0.1");await new Promise<void>(resolve=>mock.once("listening",resolve));
const reservation=createServer();reservation.listen(0,"127.0.0.1");await new Promise<void>(resolve=>reservation.once("listening",resolve));const port=(reservation.address() as AddressInfo).port;await new Promise<void>(resolve=>reservation.close(()=>resolve()));
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",String(port)],{env:{...process.env,NODE_ENV:"production",RAKKY_API_URL:`http://127.0.0.1:${(mock.address() as AddressInfo).port}`,RIDER_ORIGIN:base,DASHBOARD_ORIGIN:base,DASHBOARD_PREVIEW:"false",NEXT_PUBLIC_GOOGLE_CLIENT_ID:"fixture.apps.googleusercontent.com"},stdio:["ignore","pipe","pipe"]});
let childOutput="";child.stdout.on("data",chunk=>{childOutput+=String(chunk);});child.stderr.on("data",chunk=>{childOutput+=String(chunk);});
let cookie="";
function remember(response:Response){const values=new Map(cookie.split("; ").filter(Boolean).map(v=>[v.split("=")[0],v]));for(const item of response.headers.getSetCookie()){const pair=item.split(";")[0];values.set(pair.split("=")[0],pair);}cookie=[...values.values()].join("; ");}
const request=(path:string,method="GET",body?:unknown,extra:Record<string,string>={})=>fetch(base+"/api/rider/"+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method!=="GET"?{Origin:base,"Content-Type":"application/json"}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
try{
  let ready=false;for(let n=0;n<100;n++){try{if((await fetch(base+"/")).ok){ready=true;break;}}catch{}await delay(100);}assert.ok(ready,childOutput);
  const publicHome=await (await fetch(base+"/")).text();assert.match(publicHome,/Your city/);assert.equal(publicHome.includes("sample data"),false);
  assert.equal((await request("wallet")).status,401);
  assert.equal((await request("session/login-initiate","POST",{phone:"+2348000000000"},{Origin:"https://attacker.invalid"})).status,403);
  assert.equal((await request("session/login-verify","POST",{phone:"+2348000000000",code:"000000"})).status,400);
  assert.equal((await request("session/login-initiate","POST",{phone:"+2348000000000"})).status,200);
  const signedIn=await request("session/login-verify","POST",{phone:"+2348000000000",code:"123456"});assert.equal(signedIn.status,200);const text=await signedIn.clone().text();assert.equal(text.includes("fixture-rider-access"),false);assert.equal(text.includes("fixture-rider-refresh"),false);
  for(const value of signedIn.headers.getSetCookie().filter(value=>/rider-(access|refresh)=/.test(value))){assert.match(value,/HttpOnly/i);assert.match(value,/SameSite=strict/i);assert.match(value,/Secure/i);assert.match(value,/__Host-rakky-rider-/);}
  remember(signedIn);assert.equal((await request("wallet")).status,200);
  assert.equal((await request("session/register-initiate","POST",{fullName:"Fixture Rider",phone:"+2348000000000",accountType:"driver"})).status,200);
  assert.equal(forwarded.find(v=>v.path==="/api/auth/register/initiate")?.body.accountType,"rider","browser cannot register a driver through the passenger website");
  const registered=await request("session/register-verify","POST",{fullName:"Fixture Rider",phone:"+2348000000000",code:"123456",accountType:"driver"});assert.equal(registered.status,200);assert.equal((await registered.text()).includes("fixture-rider-refresh"),false);
  assert.equal((await fetch(base+"/api/admin/emails/configuration",{headers:{Cookie:cookie}})).status,401,"rider cookie cannot create a staff session");
  assert.equal((await request("admin/users")).status,404);assert.equal((await request(`trips/${tripId}/complete`,"POST",{})).status,404);
  await request("wallet/transactions?account=earnings&userId=other");assert.ok(forwarded.some(v=>v.path==="/api/wallet/transactions?account=wallet"));
  await request("notifications?role=driver");assert.ok(forwarded.some(v=>v.path==="/api/notifications?role=rider"));
  assert.equal((await request("location/nearby?latitude=91&longitude=3")).status,400);
  assert.equal((await request("location/nearby?latitude=6.4474&longitude=3.4723&radiusKm=5&serviceType=ride&userId=other")).status,200);
  assert.ok(forwarded.some(v=>v.path==="/api/location/nearby?latitude=6.4474&longitude=3.4723&radiusKm=5&serviceType=ride"));
  const chatInput={id:crypto.randomUUID(),text:"Isolated saved message"};
  assert.equal((await request(`trips/${tripId}/messages`,"POST",chatInput)).status,201);
  assert.equal((await request(`trips/${tripId}/messages`,"POST",chatInput)).status,200);
  assert.equal((await (await request(`trips/${tripId}/messages?before=100&userId=other`)).json()).messages.length,1);
  assert.ok(forwarded.some(v=>v.path===`/api/trips/${tripId}/messages?before=100`));
  assert.equal((await request("notifications/browser/config")).status,200);
  assert.equal((await request("notifications/browser/subscriptions","POST",{endpoint:"https://fcm.googleapis.com/fixture"})).status,200);
  assert.equal((await request(`notifications/browser/subscriptions/${browserId}`,"DELETE",undefined,{Origin:"https://attacker.invalid"})).status,403);
  assert.equal((await request(`notifications/browser/subscriptions/${browserId}`,"DELETE")).status,200);
  assert.equal(browserEnabled,false);
  const worker=await fetch(base+"/rakky-sw.js");assert.equal(worker.status,200);assert.match(await worker.text(),/notificationclick/);
  assert.equal((await request("trips","POST",{})).status,400,"booking requires idempotency");
  const booking={pickup:{latitude:6.4474,longitude:3.4723,address:"Lekki"},dropoff:{latitude:6.4281,longitude:3.4219,address:"Victoria Island"},quoteId:"fixture-quote",paymentMethod:"cash",serviceType:"ride"};
  const key="fixture-booking-key-0001";assert.equal((await request("trips","POST",booking,{"Idempotency-Key":key})).status,201);assert.equal((await request("trips","POST",booking,{"Idempotency-Key":key})).status,200);assert.equal(bookings.size,1);assert.equal(tripRequests,2);
  const checkout=await request("payments/topups","POST",{amountKobo:500000,target:"earnings"});assert.equal(checkout.status,200);assert.equal((await checkout.text()).includes("must-not-leak"),false);assert.equal(forwarded.find(v=>v.path==="/api/payments/topups")?.body.target,"wallet");
  assert.equal((await request("auth/profile","PATCH",{name:"Website Test Rider",email:"updated@example.test"})).status,200);
  assert.equal((await request("auth/phone-change/initiate","POST",{phone:"+2348000000001"})).status,200);
  assert.equal((await request("auth/phone-change/verify","POST",{challenge:"fixture-phone-change",code:"000000"})).status,400);
  assert.equal((await request("auth/phone-change/verify","POST",{challenge:"fixture-phone-change",code:"123456"})).status,200);
  const prefs=await (await request("notifications/preferences")).json();assert.equal(prefs.driverOffersEnabled,undefined);
  await request("notifications/preferences","PATCH",{promotionsEnabled:true,driverOffersEnabled:false});assert.equal(preferences.promotionsEnabled,true);assert.equal(preferences.driverOffersEnabled,true,"passenger settings preserve driver preferences");
  const avatarBody=new FormData();avatarBody.set("avatar",new File([new Uint8Array([1,2,3])],"fixture.png",{type:"image/png"}));
  const photo=await fetch(base+"/api/rider/avatar",{method:"POST",headers:{Cookie:cookie,Origin:base,"If-Match":"0"},body:avatarBody});assert.equal(photo.status,200);
  const conflict=await fetch(base+"/api/rider/avatar",{method:"DELETE",headers:{Cookie:cookie,Origin:base,"If-Match":"0"}});assert.equal(conflict.status,412);
  const removed=await fetch(base+"/api/rider/avatar",{method:"DELETE",headers:{Cookie:cookie,Origin:base,"If-Match":"1"}});assert.equal(removed.status,200);
  const tooLarge=await fetch(base+"/api/rider/avatar",{method:"POST",headers:{Cookie:cookie,Origin:base,"If-Match":"2"},body:new FormData()});assert.equal(tooLarge.status,400);
  const support=await request("care/support","POST",{subject:"Fixture account question",category:"account",body:"This is an isolated fixture request.",requestKey:crypto.randomUUID()});assert.equal(support.status,200);
  assert.equal((await request(`care/support/${supportId}/messages`,"POST",{body:"This is a test reply.",requestKey:crypto.randomUUID()})).status,200);assert.equal((await (await request(`care/support/${supportId}`)).json()).messages.length,2);
  assert.equal((await request("realtime?EIO=4&transport=websocket")).status,400);
  const handshake=await request("realtime?EIO=4&transport=polling");assert.equal(handshake.status,200);assert.match(await handshake.text(),/"sid"/);
  assert.equal((await fetch(base+"/api/rider/realtime?EIO=4&transport=polling&sid=fixture-socket",{method:"POST",headers:{Cookie:cookie,Origin:"https://attacker.invalid","Content-Type":"text/plain"},body:"40"})).status,403);
  assert.equal((await request("session/google","POST",{idToken:"google-new"})).status,400,"Google requires a browser challenge");
  const challenge=await request("session/google-challenge","POST",{});assert.equal(challenge.status,200);remember(challenge);
  const google=await request("session/google","POST",{idToken:"google-new"});assert.equal(google.status,200);assert.equal((await google.clone().text()).includes("fixture-phone-link-secret"),false);remember(google);assert.match(google.headers.getSetCookie().join(";"),/HttpOnly/);
  assert.equal((await request("session/register-verify","POST",{phone:"+2348000000000",code:"123456",fullName:"Google Fixture Rider",googlePhoneLink:true})).status,200);
  assert.equal(forwarded.filter(v=>v.path==="/api/auth/register/verify").at(-1)?.body.phoneVerificationToken,"fixture-phone-link-secret");
  expired=true;assert.equal((await request("wallet")).status,401);meUnavailable=true;const refresh=await request("session/refresh","POST",{});assert.equal(refresh.status,503);assert.equal(refreshCount,1);remember(refresh);assert.ok(cookie.includes("fixture-rider-refresh-rotated"),"rotated credential survives a temporary identity failure");meUnavailable=false;assert.equal((await request("session/me")).status,200);
  logoutUnavailable=true;const failedLogout=await request("session/logout","POST",{});assert.equal(failedLogout.status,503);assert.equal(failedLogout.headers.getSetCookie().length,0);logoutUnavailable=false;const logout=await request("session/logout","POST",{});assert.equal(logout.status,200);assert.ok(logout.headers.getSetCookie().every(v=>/expires=/i.test(v)));
  for(const path of ["/ride","/ride/sign-in","/ride/register","/ride/book","/ride/schedule","/ride/courier","/ride/wallet","/ride/help","/ride/safety","/ride/account","/ride/notifications",`/ride/trips/${tripId}`])assert.equal((await fetch(base+path)).status,200,path);
  assert.equal((await fetch(base+"/api/driver/wallet",{headers:{Cookie:cookie}})).status,403,"driver operations require active driver mode");
  const driveRequest=(path:string,method="GET",body?:unknown,extra:Record<string,string>={})=>fetch(base+"/api/driver/"+path,{method,headers:{Cookie:cookie,...(method!=="GET"?{Origin:base,"Content-Type":"application/json"}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal((await driveRequest("auth/active-role","PATCH",{role:"driver"},{Origin:"https://attacker.invalid"})).status,403);
  assert.equal((await driveRequest("auth/active-role","PATCH",{role:"driver"})).status,200);
  assert.equal((await driveRequest("wallet")).status,200);assert.equal((await driveRequest("admin/users")).status,404);assert.equal((await driveRequest("trips","POST",{})).status,404);
  assert.equal((await driveRequest("payments/withdrawal-policy")).status,200);
  assert.equal((await fetch(base+"/api/driver/documents",{method:"POST",headers:{Cookie:cookie,Origin:"https://attacker.invalid"}})).status,403);
  assert.equal((await fetch(base+"/api/driver/documents",{method:"POST",headers:{Cookie:cookie,Origin:base}})).status,428);
  const invalidDocuments=new FormData();invalidDocuments.set("license",new File(["not a document"],"fixture.txt",{type:"text/plain"}));
  assert.equal((await fetch(base+"/api/driver/documents",{method:"POST",headers:{Cookie:cookie,Origin:base,"If-Match":"fixture-version"},body:invalidDocuments})).status,415);
  await driveRequest("wallet/transactions?account=wallet&userId=other");assert.ok(forwarded.some(v=>v.path==="/api/wallet/transactions?account=earnings"));
  await driveRequest("notifications?role=rider");assert.ok(forwarded.some(v=>v.path==="/api/notifications?role=driver"));
  const earningsCheckout=await driveRequest("payments/topups","POST",{amountKobo:100000,target:"wallet"});assert.equal(earningsCheckout.status,200);assert.equal((await earningsCheckout.text()).includes("must-not-leak"),false);assert.equal(forwarded.filter(v=>v.path==="/api/payments/topups").at(-1)?.body.target,"earnings");
  assert.equal((await driveRequest("driver/service-preferences","PUT",{acceptsRide:true,acceptsCourier:false,expectedVersion:1})).status,200);
  for(const route of ["/drive","/drive/trips","/drive/earnings","/drive/payouts","/drive/application","/drive/account","/drive/notifications","/drive/help",`/drive/trips/${tripId}`])assert.equal((await fetch(base+route)).status,200,route);
  console.log("PASS: driver mode, strict gateway methods, scoped earnings/inbox, checkout redaction, service preferences and all driver routes.");
  identity.activeRole=process.argv.includes("--driver-ui")?"driver":"rider";
  console.log("PASS: rider auth, private cookies, CSRF, staff separation, endpoint restrictions, scoped queries, booking idempotency, checkout redaction, profile updates, rotated-session recovery, logout recovery, Google phone linking, avatar versions, phone changes, passenger preferences, support messages, live transport, nearby query validation, persisted chat retries, browser push controls, worker delivery and passenger routes.");
  if(process.argv.includes("--serve-ui")){bookings.clear();bookings.set("fixture-ui-trip",{...fixtureTrip,status:"driver_assigned",driver_id:process.argv.includes("--driver-ui")?userId:"00000000-0000-4000-8000-000000000005",rider_name:"Test Customer",driver_name:"Test Driver",vehicle_make:"Toyota",vehicle_model:"Corolla",vehicle_color:"Silver",plate_number:"TEST 001"} as typeof fixtureTrip);console.log(`Fixture passenger website: ${base}`);console.log("Isolated login: +2348000000000 · OTP 123456. No real services are used.");await new Promise<void>(resolve=>{process.once("SIGINT",resolve);process.once("SIGTERM",resolve);});}
}finally{child.kill("SIGTERM");fixtureIo?.close();await new Promise<void>(resolve=>mock.close(()=>resolve()));}
