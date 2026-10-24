"use client";
import Link from "next/link";
import type {ReactNode} from "react";
import type {RiderTrip,TripStatus} from "@/contracts/rider";
import {naira,riderDate} from "@/lib/rider-api";
import {RiderIcon} from "./rider-icon";
export const tripLabels:Record<TripStatus,string>={scheduled:"Scheduled",searching:"Finding your driver",driver_assigned:"Driver on the way",driver_arrived:"Your driver has arrived",in_progress:"Ride in progress",returning:"Package returning",returned:"Package returned",completed:"Completed",cancelled:"Cancelled",no_drivers_found:"No drivers found"};
export function Heading({title,subtitle,action}:{title:string;subtitle?:string;action?:ReactNode}){return <div className="rr-heading"><div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>;}
export function ErrorNotice({error,retry}:{error:string;retry?:()=>void}){return error?<div className="rr-alert" role="alert"><span>{error}</span>{retry&&<button type="button" onClick={retry}>Try again</button>}</div>:null;}
export function Empty({title,children}:{title:string;children?:ReactNode}){return <div className="rr-empty"><RiderIcon name="car"/><h3>{title}</h3>{children&&<p>{children}</p>}</div>;}
export function Loading(){return <div className="rr-loading" role="status">Getting things ready…</div>;}
export function TripRows({trips}:{trips:RiderTrip[]}){return <div className="rr-rides">{trips.map(t=><Link href={`/ride/trips/${t.id}`} className="rr-ride-row" key={t.id}><span className="rr-ride-icon"><RiderIcon name={t.service_type==="courier"?"box":"car"}/></span><span className="rr-ride-route"><strong>{t.dropoff_address}</strong><small>From {t.pickup_address}</small></span><span className="rr-ride-date">{riderDate(t.scheduled_at??t.requested_at)}</span><span className="rr-ride-price">{naira(t.fare_kobo)}<small className={`rr-status rr-status-${t.status}`}>{tripLabels[t.status]}</small></span><RiderIcon name="chevron"/></Link>)}</div>;}
