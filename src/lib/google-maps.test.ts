import assert from 'node:assert/strict';
import test from 'node:test';
import {loadGoogleMaps} from './google-maps.ts';

test('Maps can initialize after Google Identity has already created the global google object',async()=>{
  const previousWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),previousDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  const scripts:object[]=[];
  const host={google:{accounts:{},maps:undefined as unknown},setTimeout,clearTimeout,__rakkyMapsReady:undefined as undefined|(()=>void)};
  Object.defineProperty(globalThis,'window',{configurable:true,value:host});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({remove(){}}),head:{append:(script:object)=>scripts.push(script)}}});
  try{
    const pending=loadGoogleMaps('isolated-key');
    assert.equal(scripts.length,1,'Google Identity alone must not be mistaken for loaded Maps');
    const maps={marker:{},Map:class {}};host.google.maps=maps;host.__rakkyMapsReady!();
    assert.equal(await pending,maps);assert.equal(await loadGoogleMaps('isolated-key'),maps);assert.equal(scripts.length,1,'a loaded Maps runtime is reused');
  }finally{
    if(previousWindow)Object.defineProperty(globalThis,'window',previousWindow);else Reflect.deleteProperty(globalThis,'window');
    if(previousDocument)Object.defineProperty(globalThis,'document',previousDocument);else Reflect.deleteProperty(globalThis,'document');
  }
});
