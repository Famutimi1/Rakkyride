'use client';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {RiderAccount} from '../rider/rider-account';
import {RiderNotifications} from '../rider/rider-care';
import {RiderSupport} from '../rider/rider-support';
import {useDriver} from './driver-provider';
import {DriverHero} from './driver-common';
export function DriverAccountPage(){const driver=useDriver();return <RiderAccount identity={driver.identity} onUpdate={driver.updateIdentity} onLogout={driver.logout} mode="driver"/>;}
export function DriverInbox(){return <RiderNotifications mode="driver"/>;}
export function DriverHelp(){const search=useSearchParams(),trip=search.get('trip'),id=trip&&/^[a-f0-9-]{36}$/i.test(trip)?trip:null;return <><DriverHero art="application" title="Support for every mile." description="Get help with your driver account, a journey, your vehicle or a payout."/><div className="dd-support-links"><Link className="rr-panel" href="/drive/application"><h2>Vehicle & approval</h2><p>Check feedback, documents and service status.</p></Link><Link className="rr-panel" href="/drive/payouts"><h2>Bank & payouts</h2><p>Review your recent withdrawal status before starting another request.</p></Link></div><p className="rr-small">For immediate danger, contact local emergency services. Browser tracking may pause in the background; keep Rakky open while working.</p><RiderSupport tripId={id}/></>;}
