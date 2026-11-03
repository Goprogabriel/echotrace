#!/usr/bin/env python3
"""Rebuild synthetic fixtures. Optional developer tool; requires numpy and system ffmpeg.
This does not validate real-world localization. Ground truth is never read by the app.
"""
from pathlib import Path
from datetime import datetime, timezone
import json, wave, subprocess
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
EXAMPLES = ROOT / 'public/examples'; ASSETS = ROOT / 'public/assets'
EXAMPLES.mkdir(parents=True, exist_ok=True); ASSETS.mkdir(parents=True, exist_ok=True)
START = datetime(2026, 8, 18, 11, 0, 0, tzinfo=timezone.utc).timestamp()
LAT, LON = 55.70, 12.55
DURATION, SR = 64, 8000
R = 6371000

def offset(east, north):
    return LAT + north / 111195, LON + east / (111195 * np.cos(np.radians(LAT)))
def xyz(lat, lon, alt):
    lat, lon = np.radians(lat), np.radians(lon)
    r = R + alt
    return np.array([r*np.cos(lat)*np.cos(lon), r*np.cos(lat)*np.sin(lon), r*np.sin(lat)]).T

# Two independent, subsonic trajectories. Purely fabricated, not real flight identifiers.
flight_specs = [('SYNTH-A', 130, 115, 'east'), ('SYNTH-B', 260, 95, 'north')]
times = np.arange(-150, 181, 2, dtype=float)
flights = []
for name, freq, speed, direction in flight_specs:
    east = speed*(times-18) if direction=='east' else np.full_like(times,-2200)
    north = np.full_like(times,2500) if direction=='east' else speed*(times-12)
    alt = 2100 if direction=='east' else 3000
    lat,lon = offset(east,north)
    points=[{'t':float(START+t),'lat':float(la),'lon':float(lo),'altM':alt} for t,la,lo in zip(times,lat,lon)]
    flights.append({'id':name,'callsign':name,'type':'SYNTHETIC','points':points})
obs_lat,obs_lon=offset(1350,-650); receiver=xyz(obs_lat,obs_lon,12)
rt=np.arange(0,DURATION+.05,.05)
frequencies=[]
for flight,spec in zip(flights,flight_specs):
    positions=xyz(np.array([p['lat'] for p in flight['points']]),np.array([p['lon'] for p in flight['points']]),np.array([p['altM'] for p in flight['points']]))
    te=rt-20
    for _ in range(10):
        ix=np.clip(np.searchsorted(times,te,side='right')-1,0,len(times)-2)
        delta=positions[ix+1]-positions[ix]
        pos=positions[ix]+((te-times[ix])/2)[:,None]*delta
        velocity=delta/2
        displacement=pos-receiver
        distance=np.linalg.norm(displacement,axis=1)
        radial=np.sum(displacement*velocity,axis=1)/distance
        factor=343/(343+radial)
        te-=(te+distance/343-rt)*factor
    frequencies.append(spec[1]*factor)
rng=np.random.default_rng(1090)
t=np.arange(DURATION*SR)/SR
signal=np.zeros_like(t)
for curve,amplitude in zip(frequencies,[.20,.14]):
    frequency=np.interp(t,rt,curve)
    phase=2*np.pi*np.cumsum(frequency)/SR
    signal+=amplitude*np.sin(phase)
signal+=.018*np.sin(2*np.pi*50*t)+.009*rng.normal(size=t.shape)
signal*=np.minimum(1,t/.12)*np.minimum(1,(DURATION-t)/.12)
with wave.open(str(ASSETS/'demo.wav'),'wb') as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(signal,-1,1)*32767).astype('<i2').tobytes())
(EXAMPLES/'demo-flights.json').write_text(json.dumps({'schema':'echotrace-flights/1','synthetic':True,'source':'Echotrace syntetisk test — ingen virkelige fly','license':'CC0 — generated synthetic fixture','flights':flights},ensure_ascii=False,separators=(',',':')))
(EXAMPLES/'demo-session.json').write_text(json.dumps({'lat':LAT,'lon':LON,'radiusKm':6,'startTime':START,'clockUncertainty':0,'receiverAltitudeM':12,'soundSpeed':343},indent=2))
(EXAMPLES/'demo-ground-truth.json').write_text(json.dumps({'synthetic':True,'notUsedByApp':True,'lat':float(obs_lat),'lon':float(obs_lon),'receiverAltitudeM':12,'sourceHz':[130,260],'notes':'Independent synthetic round-trip test. Not real-world validation.'},indent=2))
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
filter_spec=("[0:a]showspectrum=s=960x440:slide=scroll:mode=combined:color=green:scale=log:fscale=lin:fps=12:win_func=hann,"
             "pad=960:540:0:70:color=0x0b0e10,format=yuv420p,"
             f"drawtext=fontfile={font}:text='ECHOTRACE   /   SYNTHETIC SIGNAL':x=32:y=25:fontsize=21:fontcolor=0xcbf69e,"
             f"drawtext=fontfile={font}:text='TEST AUDIO + SIMULATED FLIGHTS. NOT A REAL RECORDING.':x=32:y=514:fontsize=12:fontcolor=0x91a18e[v]")
cmd=['ffmpeg','-y','-loglevel','error','-i',str(ASSETS/'demo.wav'),'-filter_complex',filter_spec,'-map','[v]','-map','0:a','-c:v','libx264','-preset','veryfast','-crf','25','-c:a','aac','-b:a','64k','-movflags','+faststart','-t',str(DURATION),str(ASSETS/'demo.mp4')]
subprocess.run(cmd,check=True)
print('Synthetic demo regenerated:',float(obs_lat),float(obs_lon))
