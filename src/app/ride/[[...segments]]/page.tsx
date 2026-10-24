import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {Suspense} from "react";
import {RiderWebsite,type RiderView} from "@/components/rider/rider-website";
export const metadata:Metadata={title:{absolute:"Rakky Ride · Passenger website"}};
const views:Record<string,RiderView>={"":"home",book:"book",schedule:"schedule",courier:"courier",trip:"trip",trips:"trips",wallet:"wallet",safety:"safety",help:"help",account:"account",notifications:"notifications","sign-in":"sign-in",register:"register"};
export default async function PassengerPage({params}:{params:Promise<{segments?:string[]}>}){
  const path=((await params).segments??[]).join("/");
  const match=/^trips\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.exec(path);
  if(match)return <Suspense fallback={<p>Loading your trip…</p>}><RiderWebsite view="trips" tripId={match[1]}/></Suspense>;
  if(!Object.hasOwn(views,path))notFound();
  return <Suspense fallback={<p>Loading Rakky Ride…</p>}><RiderWebsite view={views[path]}/></Suspense>;
}
