import test from "node:test";
import assert from "node:assert/strict";
import type { DriverApplication, LiveDriver } from "../contracts/admin.ts";
import { buildServiceReview, liveServiceDrivers, showServiceMarker, confirmedApplication } from "./driver-services.ts";

function application(): DriverApplication {
  return {
    userId:"test-partner",name:"Test partner",status:"pending",version:"exact-profile-version",submittedAt:null,reviewedAt:null,address:null,make:null,model:null,year:null,plate:null,rejectionReason:null,documents:[],allowedActions:["review-services"],asOf:"2026-10-16T12:00:00Z",
    serviceSettings:{version:2,vehicleCategory:"car",requestedVehicleCategory:"car",services:{ride:{status:"pending",enabled:false,consentAccepted:true,review:null},courier:{status:"pending",enabled:false,consentAccepted:true,review:null}},consent:{version:"test-version",descriptions:{ride:"Passenger consent",courier:"Courier consent"}}},
  };
}
test("reviewing both services sends independent decisions and the exact version",()=>{
  const result=buildServiceReview(application(),{ride:"approved",courier:"rejected"},"car");
  assert.deepEqual(result.payload.services,{ride:"approved",courier:"rejected"});
  assert.equal(result.payload.expectedVersion,"exact-profile-version");
  assert.equal(result.changes.length,2);
  assert.equal("acceptsRide" in result.payload,false);
  assert.equal("acceptsCourier" in result.payload,false);
});
test("a second-service decision leaves the existing passenger service out of the payload",()=>{
  const value=application();value.status="approved";value.serviceSettings!.services.ride={status:"approved",enabled:true,consentAccepted:true,review:null};
  const result=buildServiceReview(value,{courier:"approved"},"car");
  assert.deepEqual(result.payload.services,{courier:"approved"});
});
test("unrequested, stale and unconsented approvals cannot be submitted",()=>{
  const value=application();
  value.serviceSettings!.services.ride.status="none";
  assert.throws(()=>buildServiceReview(value,{ride:"approved"},"car"),/no longer matches/);
  value.serviceSettings!.services.ride.status="pending";
  value.serviceSettings!.services.ride.consentAccepted=false;
  assert.throws(()=>buildServiceReview(value,{ride:"approved"},"car"),/requirements/);
  value.allowedActions=[];
  assert.throws(()=>buildServiceReview(value,{courier:"approved"},"car"),/not available/);
  value.serviceSettings=undefined;
  assert.throws(()=>buildServiceReview(value,{courier:"approved"},"car"),/not returned/);
});
test("motorcycle classification requires rejection of a pending passenger application",()=>{
  const value=application();value.serviceSettings!.vehicleCategory=null;
  assert.throws(()=>buildServiceReview(value,{courier:"approved"},"motorcycle"),/Reject the passenger/);
  assert.throws(()=>buildServiceReview(value,{ride:"approved",courier:"approved"},"motorcycle"),/requirements/);
  const result=buildServiceReview(value,{ride:"rejected",courier:"approved"},"motorcycle");
  assert.equal(result.payload.vehicleCategory,"motorcycle");
});
test("legacy classification never guesses the category and makes passenger suspension explicit",()=>{
  const value=application();value.status="approved";value.serviceSettings!.vehicleCategory=null;value.serviceSettings!.services.ride.status="approved";value.serviceSettings!.services.courier.status="none";
  assert.throws(()=>buildServiceReview(value,{},""),/Confirm the vehicle/);
  const car=buildServiceReview(value,{},"car");
  assert.deepEqual(car.payload.services,{});
  assert.equal(car.changes.length,1);
  const motorcycle=buildServiceReview(value,{},"motorcycle");
  assert.ok(motorcycle.changes.some(change=>change.label==="Passenger rides"&&change.after==="suspended"));
});
test("suspension and restoration touch only the selected service and preserve driver preference ownership",()=>{
  const value=application();value.serviceSettings!.services.courier.status="approved";
  assert.deepEqual(buildServiceReview(value,{courier:"suspended"},"car").payload.services,{courier:"suspended"});
  value.serviceSettings!.services.courier.status="suspended";
  assert.deepEqual(buildServiceReview(value,{courier:"approved"},"car").payload.services,{courier:"approved"});
  assert.throws(()=>buildServiceReview(value,{},"car"),/at least one/);
});
test("service-specific supply keeps courier-only drivers and other-service jobs off passenger markers",()=>{
  const courier:LiveDriver={id:"courier",name:"Courier",approval:"approved",vehicle:"Motorcycle",plate:"TEST",courierOptIn:true,rideOptIn:false,rideServiceStatus:"none",courierServiceStatus:"approved",activeTripId:null,availability:"available",location:null};
  const both:LiveDriver={...courier,id:"both",rideOptIn:true,rideServiceStatus:"approved"};
  const busy:LiveDriver={...both,id:"busy",availability:"busy",activeTripId:"delivery",activeTripService:"courier"};
  assert.deepEqual(liveServiceDrivers([courier,both],"ride").map(driver=>driver.id),["both"]);
  assert.equal(showServiceMarker(courier,"ride"),false);
  assert.equal(showServiceMarker(courier,"courier"),true);
  assert.equal(showServiceMarker(busy,"ride"),false);
  assert.equal(showServiceMarker(busy,"courier"),true);
  assert.equal(showServiceMarker({...both,availability:"ineligible"},"ride"),false);
});
test("suspension and rejection do not depend on legacy vehicle classification", () => {
  const value = application();
  value.serviceSettings!.vehicleCategory = null;
  value.serviceSettings!.services.ride.status = "approved";
  const suspension = buildServiceReview(value, { ride: "suspended" }, "");
  assert.deepEqual(suspension.payload.services, { ride: "suspended" });
  assert.equal("vehicleCategory" in suspension.payload, false);
  assert.deepEqual(buildServiceReview(value, { courier: "rejected" }, "").payload.services, { courier: "rejected" });
  assert.throws(() => buildServiceReview(value, { courier: "approved" }, ""), /Confirm the vehicle/);
});
test("displayed approval and suspension must come from a complete API record for this driver", () => {
  const saved = application();
  saved.serviceSettings!.services.ride.status = "approved";
  saved.serviceSettings!.services.courier.status = "suspended";
  assert.equal(confirmedApplication(saved, saved.userId), saved);
  assert.throws(() => confirmedApplication(saved, "another-driver"), /saved application/);
  assert.throws(() => confirmedApplication({ ...saved, version: "" }, saved.userId), /saved application/);
  assert.throws(() => confirmedApplication({ ...saved, serviceSettings: undefined }, saved.userId), /saved passenger/);
  const incomplete = structuredClone(saved);
  Reflect.deleteProperty(incomplete.serviceSettings!.services.courier, "enabled");
  assert.throws(() => confirmedApplication(incomplete, saved.userId), /incomplete service/);
});
