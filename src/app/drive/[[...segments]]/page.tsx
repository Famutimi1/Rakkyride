import {notFound} from 'next/navigation';
import {DriverPage} from '@/components/driver/driver-page';
export default async function DriverRoute({params}:{params:Promise<{segments?:string[]}>}){
 const path=((await params).segments??[]).join('/'),match=/^trips\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.exec(path);if(match)return <DriverPage view="trips" id={match[1]}/>;
 const views:Record<string,string>={'':'home',trips:'trips',earnings:'earnings',payouts:'payouts',application:'application',account:'account',notifications:'notifications',help:'help'};if(!Object.hasOwn(views,path))notFound();return <DriverPage view={views[path]}/>;
}
