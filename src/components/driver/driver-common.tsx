'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';
import type {DriverTrip} from '@/contracts/driver';
import {naira,riderDate} from '@/lib/rider-api';
import {RiderIcon} from '../rider/rider-icon';
export {ErrorNotice,Loading,Empty} from '../rider/rider-common';
export const driverTripLabels:Record<string,string>={driver_assigned:'On the way to pickup',driver_arrived:'At the pickup',in_progress:'Journey in progress',returning:'Returning package',completed:'Completed',returned:'Returned',cancelled:'Cancelled',searching:'Searching',no_drivers_found:'No driver found'};
export function DriverHero({art,title,description,eyebrow='Your work. Your way.',children}:{art:string;title:string;description:string;eyebrow?:string;children?:ReactNode}){return <section className="dd-hero"><div><span className="rr-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p>{children&&<div className="dd-hero-actions">{children}</div>}</div><img src={`/driver/${art}.webp`} alt=""/></section>;}
export function DriverTripRows({trips}:{trips:DriverTrip[]}){return <div className="rr-rides">{trips.map(trip=><Link className="rr-ride-row" key={trip.id} href={`/drive/trips/${trip.id}`}><span className="rr-ride-icon"><RiderIcon name={trip.service_type==='courier'?'box':'car'}/></span><span className="rr-ride-route"><strong>{trip.dropoff_address}</strong><small>From {trip.pickup_address}</small></span><span className="rr-ride-date">{riderDate(trip.requested_at)}</span><span className="rr-ride-price">{naira(trip.fare_kobo)}<small className="rr-status">{driverTripLabels[trip.status]??trip.status}</small></span><RiderIcon name="chevron"/></Link>)}</div>;}
export function MoneyStat({label,value,note}:{label:string;value?:number;note?:string}){return <div className="dd-stat"><span>{label}</span><strong>{value===undefined?'—':naira(value)}</strong>{note&&<small>{note}</small>}</div>;}
