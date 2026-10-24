const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const rules:Record<string,RegExp[]>={
 GET:[/^driver\/(application\/status|service-settings|earnings\/summary)$/,/^trips\/(active|history|offers\/current)$/,new RegExp(`^trips/${uuid}(?:/messages)?$`,'i'),/^wallet(?:\/transactions)?$/,/^payments\/(banks|withdrawal-policy)$/,/^payments\/topups\/tu_[a-f0-9]{32}$/i,/^payout-accounts$/,/^withdrawals$/,new RegExp(`^withdrawals/${uuid}$`,'i'),/^notifications(?:\/(unread-count|preferences|browser\/config))?$/],
 POST:[/^driver\/onboarding\/(personal-info|vehicle-info|submit)$/,/^driver\/(service-applications|service-consent\/withdraw)$/,new RegExp(`^trips/${uuid}/(accept|decline|arrived|start|return|complete|cancel|messages)$`,'i'),/^payments\/topups$/,/^payout-accounts(?:\/(resolve|otp))?$/,/^withdrawals(?:\/otp)?$/,/^notifications\/(read-all|browser\/(status|subscriptions))$/,new RegExp(`^notifications/${uuid}/(read|opened)$`,'i')],
 PUT:[/^driver\/service-preferences$/],PATCH:[/^auth\/active-role$/,/^notifications\/preferences$/],
 DELETE:[new RegExp(`^payout-accounts/${uuid}$`,'i'),new RegExp(`^notifications/browser/subscriptions/${uuid}$`,'i')]
};
export const driverOperationAllowed=(method:string,path:string)=>(rules[method]??[]).some(rule=>rule.test(path));
export function driverQuery(path:string,input:URLSearchParams){
 const output=new URLSearchParams();const keys=path==='trips/history'?['cursor','limit','status','serviceType']:path==='driver/earnings/summary'?['range']:path==='wallet/transactions'||path==='notifications'?['cursor','limit']:/^trips\/[0-9a-f-]+\/messages$/i.test(path)?['before']:[];
 for(const key of keys){const value=input.get(key);if(value&&value.length<=512)output.set(key,value);}
 if(path==='wallet/transactions')output.set('account','earnings');if(path.startsWith('notifications'))output.set('role','driver');return output.size?`?${output}`:'';
}
export function offerSeconds(offer:{expiresAt:string;serverNow:string},receivedAt:number,now=Date.now()){
 const duration=new Date(offer.expiresAt).getTime()-new Date(offer.serverNow).getTime();return Number.isFinite(duration)?Math.max(0,Math.ceil((duration-Math.max(0,now-receivedAt))/1000)):0;
}
