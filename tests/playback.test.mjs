import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPlayback,formatPlaybackTime} from '../dist/js/components/playback.js';
class Element extends EventTarget {
 constructor(){super();this.attrs=new Map();this.style={};this.dataset={};this.children=[];this.classes=new Set();this.classList={toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};this.offsetLeft=20;this.offsetTop=10;this.textContent='';}
 getAttribute(n){return this.attrs.get(n)??null;}setAttribute(n,v){this.attrs.set(n,String(v));}removeAttribute(n){this.attrs.delete(n);}
 append(child){child.parentElement=this;this.children.push(child);}remove(){this.parentElement.children=this.parentElement.children.filter(c=>c!==this);}
 getBoundingClientRect(){return {left:100,top:50,width:200,height:100};}focus(){}setPointerCapture(){}hasPointerCapture(){return false;}
}
class Media extends EventTarget {currentTime=0;duration=120;readyState=1;paused=true;ended=false;play(){this.paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve();}}
function setup(t,{savedTime=12,resume=false,readyState=1,canSeek=()=>true}={}){
 const originals={document:globalThis.document,ResizeObserver:globalThis.ResizeObserver,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 const frames=new Map();let counter=0;
 globalThis.document={createElement:()=>new Element()};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 globalThis.requestAnimationFrame=fn=>{frames.set(++counter,fn);return counter;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 const canvas=new Element(),parent=new Element(),media=new Media(),readout=new Element(),positions=[];parent.append(canvas);media.readyState=readyState;
 const dispose=bindPlayback(media,{plots:[{canvas,window:()=>({start:40,end:60}),bounds:()=>({left:40,top:5,width:100,height:70})}],readouts:[readout],savedTime,resume,canSeek,onPosition:(...args)=>positions.push(args)});
 t.after(()=>{dispose();Object.assign(globalThis,originals);});
 return {canvas,parent,media,readout,positions,frames,dispose,cursor:parent.children[1]};
}
function event(target,type,props){const e=new Event(type,{cancelable:true});Object.assign(e,props);target.dispatchEvent(e);}
test('Graph seeking uses the zoomed time range and updates the media and cursor',t=>{
 const {canvas,media,cursor,readout}=setup(t);
 event(canvas,'pointerdown',{button:0,pointerId:1,clientX:190,clientY:80});
 assert.equal(media.currentTime,50);assert.equal(cursor.dataset.time,'50');assert.equal(cursor.style.left,'110px');assert.match(readout.textContent,/00:50.0/);
 event(canvas,'pointermove',{pointerId:1,clientX:240,clientY:80});assert.equal(media.currentTime,60);
 event(canvas,'pointerup',{pointerId:1,clientX:140,clientY:80});assert.equal(media.currentTime,40);
});
test('Video seeking updates cursors and identifies time outside a zoomed view',t=>{
 const {media,cursor,canvas}=setup(t);media.currentTime=100;media.dispatchEvent(new Event('timeupdate'));
 assert.equal(cursor.dataset.time,'100');assert(cursor.classes.has('outside-window'));assert.match(cursor.children[0].textContent,/uden for udsnit/);
 assert.equal(canvas.getAttribute('aria-valuenow'),'100');assert.equal(cursor.style.left,'160px');
});
test('Keyboard seeking clamps to duration and respects disabled seeking',t=>{
 let enabled=true;const {canvas,media}=setup(t,{canSeek:()=>enabled});
 event(canvas,'keydown',{key:'ArrowRight',shiftKey:true});assert.equal(media.currentTime,22);
 event(canvas,'keydown',{key:'End'});assert.equal(media.currentTime,120);
 event(canvas,'keydown',{key:'ArrowRight'});assert.equal(media.currentTime,120);
 enabled=false;event(canvas,'keydown',{key:'Home'});event(canvas,'pointerdown',{button:0,pointerId:1,clientX:190,clientY:80});assert.equal(media.currentTime,120);
});
test('Saved time survives metadata loading and playback restoration, then cleans up',t=>{
 const {media,cursor,frames,positions,dispose,parent,canvas}=setup(t,{savedTime:25,resume:true,readyState:0});
 assert.equal(positions.length,0);
 media.readyState=1;media.dispatchEvent(new Event('loadedmetadata'));
 assert.equal(media.currentTime,25);assert.equal(media.paused,false);assert(frames.size>0);assert.equal(cursor.dataset.time,'25');
 dispose();assert.equal(frames.size,0);assert.equal(parent.children.length,1);
 event(canvas,'keydown',{key:'Home'});assert.equal(media.currentTime,25);
});
test('Playback labels show tenths without rolling 59 seconds into a false minute',()=>{
 assert.equal(formatPlaybackTime(59.99),'00:59.9');assert.equal(formatPlaybackTime(60),'01:00.0');assert.equal(formatPlaybackTime(1800),'30:00.0');
});

test('Horizontal wheel seeking follows the time scale without hijacking page scrolling',t=>{
 const {canvas,media}=setup(t);
 event(canvas,'wheel',{deltaX:0,deltaY:100,shiftKey:false});assert.equal(media.currentTime,12);
 event(canvas,'wheel',{deltaX:50,deltaY:0});assert.equal(media.currentTime,22);
 event(canvas,'wheel',{deltaX:0,deltaY:-50,shiftKey:true});assert.equal(media.currentTime,12);
 event(canvas,'wheel',{deltaX:50,deltaY:0,ctrlKey:true});assert.equal(media.currentTime,12);
});
