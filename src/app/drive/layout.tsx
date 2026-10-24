import type {Metadata} from 'next';
import {Suspense} from 'react';
import {DriverProvider} from '@/components/driver/driver-provider';
export const metadata:Metadata={title:{absolute:'Rakky Ride · Driver partner'}};
export default function DriverLayout({children}:{children:React.ReactNode}){return <Suspense fallback={<p>Loading your driver workspace…</p>}><DriverProvider>{children}</DriverProvider></Suspense>;}
