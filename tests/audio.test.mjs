import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {MAX_DURATION,validateMedia} from '../dist/js/core/audio.js';

test('Playback capture keeps a non-silent stereo channel and acknowledges the last PCM chunk',()=>{
  let Worklet;
  const messages=[];
  class Processor {constructor(){this.port={postMessage:data=>messages.push(data)};}}
  vm.runInNewContext(readFileSync(new URL('../dist/js/workers/capture-worklet.js',import.meta.url),'utf8'),{
    AudioWorkletProcessor:Processor,Float32Array,registerProcessor:(_name,klass)=>{Worklet=klass;}
  });
  const processor=new Worklet();
  processor.port.onmessage({data:'start'});
  const right=Float32Array.from({length:128},(_,i)=>Math.sin(i*.1)),silent=new Float32Array(128),output=new Float32Array(128).fill(1);
  processor.process([[silent,right]],[[output]]);
  processor.port.onmessage({data:'flush'});
  assert.equal(messages.length,2);assert.deepEqual(messages[0],right);assert.equal(messages[1],'flushed');
  assert(output.every(v=>v===0));
  processor.process([[right]],[[output]]);processor.port.onmessage({data:'flush'});
  assert.equal(messages.length,3);assert.equal(messages[2],'flushed');
});
test('Long recordings allow separated passages while retaining the media byte limit',()=>{
  assert.equal(MAX_DURATION,1800);
  validateMedia({name:'recording.wav',type:'audio/wav',size:1024});
  assert.throws(()=>validateMedia({name:'recording.wav',type:'audio/wav',size:151*1024*1024}));
});
