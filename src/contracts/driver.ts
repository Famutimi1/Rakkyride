import type {RiderTrip,Place} from './rider';
export type DriverService='ride'|'courier';
export interface DriverSettings {
 version:number;vehicleCategory:'car'|'motorcycle'|null;requestedVehicleCategory?:'car'|'motorcycle'|null;vehicleReviewRequired:boolean;
 vehicle:{make:string|null;model:string|null;year:number|null;color:string|null;registrationNumber:string|null}|null;
 services:Record<DriverService,{status:'none'|'pending'|'approved'|'rejected'|'suspended';enabled:boolean;consentAccepted:boolean;review:{reason?:string}|null}>;
 consent:{version:string;descriptions:Record<DriverService,string>};
}
export interface DriverApplication {materialVersion?:string;status:string;rejection_reason?:string|null;submitted_at?:string|null;reviewed_at?:string|null;vehicle:DriverSettings['vehicle'];documents:{kind:string;available:boolean}[];serviceSettings:DriverSettings}
export interface DriverWallet {walletKobo:number;earningsKobo:number;withdrawableKobo:number;owedKobo:number;cashDebtLimitKobo:number;canGoOnline:boolean}
export interface DriverEarnings {range:string;trips:number;grossKobo:number;commissionKobo:number;netKobo:number;cashTrips:number;walletTrips:number}
export interface DriverOffer {tripId:string;serviceType:DriverService;packageDescription?:string;pickup:Place;dropoff:Place;fareKobo:number;distanceToPickupM:number;expiresAt:string;serverNow:string}
export interface DriverTrip extends RiderTrip {rider_name?:string;rider_avatar?:string|null;rider_rating?:string|null;commission_kobo?:number;driver_earning_kobo?:number}
export interface PayoutAccount {id:string;bank_name:string;bank_code:string;account_last4:string;account_name:string;created_at:string}
export interface Withdrawal {id:string;amount_kobo:number;fee_kobo:number;status:string;requested_at:string;completed_at:string|null;bank_name?:string;account_last4?:string}
