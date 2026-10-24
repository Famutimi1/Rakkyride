export interface RiderIdentity {
  user: { id: string; name: string; phone: string | null; email?: string | null; avatarUrl?: string | null; avatarVersion?: string | number };
  activeRole: "rider" | "driver";
  driverStatus: string;
}
export interface Place { latitude: number; longitude: number; address: string; placeId?: string }
export interface NearbyDriver {driverId:string;latitude:number;longitude:number;distanceKm:number}
export interface Prediction { placeId: string; address: string; primaryText: string; secondaryText: string }
export interface Quote { quoteId: string; quoteExpiresAt: string; fareKobo: number; distanceM: number; durationS: number; encodedPolyline: string; currency: "NGN" }
export type TripStatus = "scheduled" | "searching" | "driver_assigned" | "driver_arrived" | "in_progress" | "returning" | "returned" | "completed" | "cancelled" | "no_drivers_found";
export interface CourierDetails { description: string; weightKg: number; recipientName: string; recipientPhone: string; pickupInstructions: string | null; dropoffInstructions: string | null }
export interface RiderTrip {
  id: string; rider_id: string; driver_id: string | null; status: TripStatus; service_type: "ride" | "courier";
  payment_method: "cash" | "wallet" | "card"; payment_status?: string; fare_kobo: number;
  pickup_lat: number; pickup_lng: number; pickup_address: string; dropoff_lat: number; dropoff_lng: number; dropoff_address: string;
  requested_at: string; scheduled_at?: string | null; completed_at?: string | null; cancelled_at?: string | null; returned_at?: string | null; cancel_reason?: string | null;
  estimated_distance_m: number; estimated_duration_s: number; route_polyline?: string | null;
  driver_name?: string | null; driver_avatar?: string | null; driver_rating?: string | null; vehicle_make?: string | null; vehicle_model?: string | null; vehicle_color?: string | null; plate_number?: string | null;
  courier_details?: CourierDetails | null;
  latestDriverLocation?: { latitude: number; longitude: number; timestamp: number } | null;
}
export interface RiderWallet { walletKobo: number }
export interface WalletEntry { id: string; direction: "debit" | "credit"; amountKobo: number; balanceAfterKobo: number; createdAt: string; type: string; description: string | null }
export interface RiderNotification { id: string; title: string; body: string; createdAt: string; readAt: string | null; category: string; data: Record<string, unknown> }
export interface SupportSettings { phone: string | null; email: string | null; staffedHours: string; availabilityMessage: string }
export interface RiderPreferences { driverOffersEnabled?:boolean; pushEnabled:boolean; tripUpdatesEnabled:boolean; scheduledRemindersEnabled:boolean; walletUpdatesEnabled:boolean; promotionsEnabled:boolean; soundEnabled:boolean; vibrationEnabled:boolean }
export interface RiderSupportCase { id:string; subject:string; category:string; status:string; tripId:string|null; createdAt:string; updatedAt:string }
export interface RiderSupportDetail extends RiderSupportCase { messages:{id:string;body:string;createdAt:string;from:"you"|"support"}[] }
