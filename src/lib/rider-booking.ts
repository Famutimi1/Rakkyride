import type {CourierDetails,Place} from "../contracts/rider.ts";
export function scheduleToIso(value:string,now=Date.now()) {
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error("Choose a pickup date and time.");
  const date=new Date(`${value}:00+01:00`),delay=date.getTime()-now;
  if(!Number.isFinite(delay)||delay<30*60_000||delay>7*24*60*60_000)throw new Error("Choose a pickup between 30 minutes and 7 days from now. Times are in Lagos.");
  return date.toISOString();
}
export function validCourier(input:CourierDetails&{acceptedRestrictions:boolean}) {
  if(input.description.trim().length<3||input.description.trim().length>160)throw new Error("Describe your parcel in 3 to 160 characters.");
  if(input.recipientName.trim().length<2||input.recipientName.trim().length>80)throw new Error("Enter the recipient’s name.");
  if(!/^\+[1-9]\d{7,14}$/.test(input.recipientPhone.trim()))throw new Error("Enter the recipient’s phone in international format, for example +2348012345678.");
  if(!Number.isFinite(input.weightKg)||input.weightKg<=0||input.weightKg>5)throw new Error("Packages must weigh more than 0 kg and no more than 5 kg.");
  if(!input.acceptedRestrictions)throw new Error("Confirm that the parcel is sealed and contains no prohibited items.");
}
export function bookingSignature(value:{pickup:Place|null;dropoff:Place|null;service:string;payment:string;scheduledAt:string;courier:CourierDetails&{acceptedRestrictions:boolean}}) {
  return JSON.stringify([value.pickup,value.dropoff,value.service,value.payment,value.scheduledAt,value.service==="courier"?value.courier:null]);
}
export function topupAmount(value:string){
  if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(value.trim()))throw new Error("Enter a positive naira amount with no more than two decimal places.");
  const [whole,fraction=""]=value.trim().split(".");const kobo=Number(whole)*100+Number(fraction.padEnd(2,"0"));
  if(!Number.isSafeInteger(kobo)||kobo<=0)throw new Error("Enter a valid top-up amount.");return kobo;
}
