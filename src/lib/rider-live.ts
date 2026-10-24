"use client";
import {create} from "zustand";
export const riderEvents={join:"trip:join",leave:"trip:leave",location:"driver:location",status:"trip:status",message:"trip:message",send:"trip:message:send",messageError:"trip:message:error",wallet:"wallet:updated",notification:"notification:new"} as const;
export interface LiveMessage {id:string;recordId?:string;tripId:string;senderId:string;senderRole:"rider"|"driver";text:string;sentAt:number}
export interface LiveSocket {connected:boolean;on(event:string,callback:(...args:unknown[])=>void):LiveSocket;emit(event:string,...args:unknown[]):LiveSocket;connect():LiveSocket;disconnect():LiveSocket}
export type LiveLocation={latitude:number;longitude:number;timestamp:number;tripId:string};
interface LiveState {phase:"connecting"|"connected"|"offline";socket:LiveSocket|null;tripId:string|null;locations:Record<string,LiveLocation>;messages:LiveMessage[];error:string;reset:()=>void}
export const useRiderLive=create<LiveState>(set=>({phase:"offline",socket:null,tripId:null,locations:{},messages:[],error:"",reset:()=>set({phase:"offline",socket:null,tripId:null,locations:{},messages:[],error:""})}));
export function liveChanged(kind:"trip"|"wallet"|"notifications"){window.dispatchEvent(new CustomEvent("rakky-rider-live",{detail:kind}));}

export function messageKey(message:LiveMessage){return message.recordId??`${message.tripId}:${message.senderId}:${message.id}`;}
export function mergeMessages(...groups:LiveMessage[][]){const map=new Map<string,LiveMessage>();for(const message of groups.flat())map.set(messageKey(message),message);return [...map.values()].sort((a,b)=>a.sentAt-b.sentAt||messageKey(a).localeCompare(messageKey(b),undefined,{numeric:true}));}
