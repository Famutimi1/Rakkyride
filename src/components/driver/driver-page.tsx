'use client';
import Link from 'next/link';
import {useDriver} from './driver-provider';
import {DriverDashboard} from './driver-dashboard';
import {DriverApplicationPage} from './driver-application';
import {DriverEarningsPage,DriverPayouts} from './driver-finance';
import {DriverHistory,DriverTripDetail} from './driver-trips';
import {DriverAccountPage,DriverHelp,DriverInbox} from './driver-care';
import {DriverHero} from './driver-common';
export function DriverPage({view,id}:{view:string;id?:string}){
 const driver=useDriver();if(!['application','account','help','notifications'].includes(view)&&driver.identity.driverStatus!=='approved'&&!driver.active)return <DriverHero art="application" title="Your driver profile needs a review." description="Review your current application and service status before taking new jobs."><Link className="rr-primary" href="/drive/application">View application →</Link></DriverHero>;
 switch(view){case 'home':return <DriverDashboard/>;case 'application':return <DriverApplicationPage/>;case 'earnings':return <DriverEarningsPage/>;case 'payouts':return <DriverPayouts/>;case 'trips':return id?<DriverTripDetail id={id}/>:<DriverHistory/>;case 'account':return <DriverAccountPage/>;case 'notifications':return <DriverInbox/>;case 'help':return <DriverHelp/>;default:return null;}
}
