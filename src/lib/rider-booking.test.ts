import assert from "node:assert/strict";
import test from "node:test";
import {scheduleToIso,topupAmount,validCourier} from "./rider-booking.ts";
test("scheduled pickups use Lagos time and enforce the backend booking window",()=>{
 const now=Date.parse("2026-10-22T08:00:00Z");
 assert.equal(scheduleToIso("2026-10-22T10:00",now),"2026-10-22T09:00:00.000Z");
 for(const value of ["2026-10-22T09:10","2026-11-01T10:00","garbage"])assert.throws(()=>scheduleToIso(value,now));
});
test("wallet funding converts naira to integer kobo without float rounding",()=>{
 assert.equal(topupAmount("1500.05"),150005);assert.equal(topupAmount("10.1"),1010);
 for(const value of ["0","-100","1e3","5.005","NaN","9999999999999"])assert.throws(()=>topupAmount(value));
});
test("courier booking requires a bounded parcel, recipient and restrictions consent",()=>{
 const valid={description:"Sealed clothing",weightKg:2,recipientName:"Recipient",recipientPhone:"+2348000000000",pickupInstructions:null,dropoffInstructions:null,acceptedRestrictions:true};
 assert.doesNotThrow(()=>validCourier(valid));for(const change of [{weightKg:6},{recipientPhone:"08000000000"},{acceptedRestrictions:false},{description:"x"}])assert.throws(()=>validCourier({...valid,...change}));
});
