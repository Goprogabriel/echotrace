// Deterministic, original CC0 fixtures; no real location or measured turbine audio.
import {writeFileSync} from 'node:fs';
const sr=8000,duration=24;
function write(name, sample){
  const data=Buffer.alloc(44+sr*duration*2);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(sr,24);data.writeUInt32LE(sr*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(data.length-44,40);
  for(let i=0;i<sr*duration;i++)data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample(i/sr)))*32767),44+i*2);
  writeFileSync(`public/assets/${name}.wav`,data);
}
write('synthetic-bells',t=>{const u=t%3;return u<2.5?[330,517,701,1023].reduce((s,h,j)=>s+.1*Math.sin(2*Math.PI*h*t)*Math.exp(-u*(1+j*.15)),0):0;});
let seed=123;
write('synthetic-turbine',t=>{seed=(1664525*seed+1013904223)>>>0;return(seed/4294967296-.5)*.12*(1+.6*Math.sin(2*Math.PI*.8*t));});
console.log('Generated two synthetic CC0 sound fixtures. Neither identifies a real source.');
