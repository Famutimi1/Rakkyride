'use client';
import {riderApi} from './rider-api';
export function driverApi<T>(path:string,options:Parameters<typeof riderApi>[1]={}){return riderApi<T>(path,{...options,scope:'driver'});}
