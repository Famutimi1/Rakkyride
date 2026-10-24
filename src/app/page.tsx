import type { Metadata } from "next";
import {Suspense} from "react";
import {RiderWebsite} from "@/components/rider/rider-website";
import {appStoreLink} from "@/lib/native-app";
export const metadata:Metadata={title:"Rakky Ride · Your city. Your plans. Your Rakky.",description:"Everyday rides, planned pickups and small deliveries with Rakky Ride."};
export default function Home() {
  return <Suspense fallback={<p>Loading Rakky Ride…</p>}><RiderWebsite view="welcome" appLinks={{android:appStoreLink(process.env.RAKKY_ANDROID_STORE_URL,"android"),ios:appStoreLink(process.env.RAKKY_IOS_STORE_URL,"ios")}}/></Suspense>;
}
