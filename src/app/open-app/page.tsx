import type { Metadata } from 'next';
import { BrandLogo } from '@/components/brand-logo';
import { appStoreLink,nativeAppLink } from '@/lib/native-app';
import styles from './page.module.css';

export const metadata:Metadata={title:{absolute:'Open Rakky Ride'},robots:{index:false,follow:false},referrer:'no-referrer'};

// Public branding only: customer links never require an administrator session.
export default async function OpenAppPage({searchParams}:{searchParams:Promise<{path?:string|string[]}>}) {
  const {path}=await searchParams;
  const android=appStoreLink(process.env.RAKKY_ANDROID_STORE_URL,'android');
  const ios=appStoreLink(process.env.RAKKY_IOS_STORE_URL,'ios');
  return <main className={styles.page}>
    <div className={styles.card}>
      <BrandLogo/>
      <p className={styles.eyebrow}>YOUR JOURNEY, MADE SIMPLE.</p>
      <h1>Let’s get you<br/>back to Rakky Ride.</h1>
      <p className={styles.description}>Open the app on your phone to continue. Your trips, driver application and account are waiting for you there.</p>
      <a className={styles.primary} href={nativeAppLink(path)}>Open Rakky Ride <span aria-hidden="true">↗</span></a>
      <p className={styles.hint}>If asked, allow your browser to open Rakky Ride.<br/>You may need to sign in to view your account.</p>
      <div className={styles.install}>
        <h2>Need the app?</h2>
        <p>{android||ios?'Install Rakky Ride, then return to this page and tap the button above.':'Install Rakky Ride on your phone, then return to this page and tap the button above.'}</p>
        {(android||ios)&&<div className={styles.stores}>
          {android&&<a href={android} rel="noreferrer">Get it on Google Play <span aria-hidden="true">↗</span></a>}
          {ios&&<a href={ios} rel="noreferrer">Download on the App Store <span aria-hidden="true">↗</span></a>}
        </div>}
      </div>
      <p className={styles.footer}>Reading this on a computer? Open the email on your phone.</p>
    </div>
    <p className={styles.signature}>Rakky Ride · Lagos, Nigeria</p>
  </main>;
}
