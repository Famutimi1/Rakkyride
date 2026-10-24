import assert from "node:assert/strict";
import test from "node:test";
import {riderOperationAllowed,riderQuery,validCheckoutUrl} from "./rider-policy.ts";
test("passenger proxy allows participant operations and denies staff and driver mutations",()=>{
 const id="00000000-0000-4000-8000-000000000001";
 for(const [method,path] of [["GET","location/nearby"],["GET",`trips/${id}/messages`],["POST",`trips/${id}/messages`],["GET","notifications/browser/config"],["POST","notifications/browser/subscriptions"],["DELETE",`notifications/browser/subscriptions/${id}`],["GET","wallet"],["GET",`trips/${id}`],["POST","trips"],["POST",`trips/${id}/cancel`],["PATCH","auth/profile"],["POST","places/autocomplete"],["POST","auth/phone-change/verify"],["GET","notifications/preferences"],["PATCH","notifications/preferences"],["POST","care/support"],["GET",`care/support/${id}`],["POST",`care/support/${id}/messages`]])assert.equal(riderOperationAllowed(method,path),true,method+path);
 for(const [method,path] of [["GET","admin/users"],["POST",`trips/${id}/complete`],["POST",`trips/${id}/accept`],["POST","withdrawals"],["POST","auth/google/staff"],["DELETE","wallet"],["PATCH",`care/support/${id}`],["POST","care/support-settings"],["POST","care/safety"],["GET","trips/../admin"],["GET","https://example.com"],["GET","payments/topups/../banks"]])assert.equal(riderOperationAllowed(method,path),false,method+path);
});
test("passenger query forwarding locks wallet and notification audience",()=>{
 assert.equal(riderQuery("wallet/transactions",new URLSearchParams("account=earnings&userId=other&cursor=50")),"?cursor=50&account=wallet");
 assert.equal(riderQuery("notifications",new URLSearchParams("role=driver&cursor=abc")),"?cursor=abc&role=rider");
 assert.equal(riderQuery("trips/history",new URLSearchParams("riderId=other&status=completed&limit=10")),"?limit=10&status=completed");
});
test("checkout URL must be a credential-free Paystack HTTPS URL",()=>{
 assert.equal(validCheckoutUrl("https://checkout.paystack.com/real-reference"),true);
 for(const value of ["javascript:alert(1)","http://checkout.paystack.com/x","https://checkout.paystack.com.attacker.test/x","https://name:secret@checkout.paystack.com/x",null])assert.equal(validCheckoutUrl(value),false);
});
