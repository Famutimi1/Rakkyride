"use client";
import {create} from "zustand";
import type {CourierDetails,Place,Quote} from "@/contracts/rider";
interface BookingDraft {
  pickup:Place|null;dropoff:Place|null;quote:Quote|null;payment:"cash"|"wallet";scheduledAt:string;service:"ride"|"courier";
  courier:CourierDetails & {acceptedRestrictions:boolean};key:string|null;
}
interface RiderDraftStore {draft:BookingDraft;patch:(patch:Partial<BookingDraft>)=>void;reset:()=>void}
const initial=():BookingDraft=>({pickup:null,dropoff:null,quote:null,payment:"cash",scheduledAt:"",service:"ride",courier:{description:"",weightKg:1,recipientName:"",recipientPhone:"",pickupInstructions:"",dropoffInstructions:"",acceptedRestrictions:false},key:null});
export const useRiderDraft=create<RiderDraftStore>(set=>({draft:initial(),patch:patch=>set(s=>({draft:{...s.draft,...patch}})),reset:()=>set({draft:initial()})}));
