import assert from 'node:assert/strict';
import test from 'node:test';
import {readJsonRequest} from './request-body.ts';
test('JSON body limits reject oversized chunked input before reading the whole stream',async()=>{
  let reads=0;
  const stream=new ReadableStream<Uint8Array>({pull(controller){reads++;controller.enqueue(new Uint8Array(8192));}});
  const init={method:'POST',headers:{'Content-Type':'application/json'},body:stream,duplex:'half'};
  await assert.rejects(readJsonRequest(new Request('http://fixture.invalid',init)),{status:413});
  assert.ok(reads<=5,'large streams are cancelled instead of buffered to completion');
});
test('bounded JSON parsing handles empty requests and rejects malformed or unsupported bodies',async()=>{
  assert.deepEqual(await readJsonRequest(new Request('http://fixture.invalid',{method:'POST'})),{});
  assert.deepEqual(await readJsonRequest(new Request('http://fixture.invalid',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"limit":20}'})),{limit:20});
  await assert.rejects(readJsonRequest(new Request('http://fixture.invalid',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})),{status:400});
  await assert.rejects(readJsonRequest(new Request('http://fixture.invalid',{method:'POST',body:'hello'})),{status:415});
});
