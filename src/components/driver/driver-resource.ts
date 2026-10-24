'use client';
import {useRiderResource} from '../rider/rider-resource';
export function useDriverResource<T>(path:string,enabled=true,interval=0){return useRiderResource<T>(path,enabled,interval,'driver');}
