#!/usr/bin/env python3
"""Render Dead Air's original 8-bar coastal funk groove.

No samples or external assets are used: every tone is generated with math.
The 20 second length is exactly 8 bars at 96 BPM (44.1 kHz stereo WAV).
"""
import math, os, random, struct, wave

SR = 44100
BPM = 96
BEAT = 60.0 / BPM
DURATION = 20.0
N = int(SR * DURATION)
OUT = os.path.dirname(os.path.abspath(__file__))
random.seed(2741)

def midi(n): return 440.0 * 2.0 ** ((n - 69) / 12.0)

def write_wav(name, samples):
    path = os.path.join(OUT, name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        buf = bytearray()
        for l, r in samples:
            # conservative headroom; values are already bounded by mix scale
            l = max(-1.0, min(1.0, l)); r = max(-1.0, min(1.0, r))
            buf += struct.pack('<hh', int(l * 32767), int(r * 32767))
        w.writeframes(buf)
    return path

def env(t, dur, attack=0.008, release=0.06):
    if t < 0 or t >= dur: return 0.0
    if t < attack: return t / attack
    if t > dur - release: return max(0.0, (dur - t) / release)
    return 1.0

def osc(f, t, shape='sine'):
    p = (f * t) % 1.0
    if shape == 'tri': return 1.0 - 4.0 * abs(p - 0.5)
    if shape == 'saw': return 2.0 * p - 1.0
    return math.sin(2.0 * math.pi * p)

def stereo_pan(x, pan):
    # equal-power-ish compact pan
    return x * (0.72 - 0.28 * pan), x * (0.72 + 0.28 * pan)

def render_bass():
    out=[]
    # roots and chromatic approach notes, 16th syncopated pattern per bar
    roots = [33,31,29,28,33,31,29,28]
    pat = [(0.00,0.42,0),(0.75,0.30,0),(1.50,0.24,7),(1.75,0.30,0),
           (2.50,0.28,0),(3.00,0.24,7),(3.50,0.38,0)]
    for i in range(N):
        t=i/SR; bar=int(t/(4*BEAT))%8; bt=t%(4*BEAT); v=0.0
        for beat,dur,off in pat:
            st=beat*BEAT
            if st <= bt < st+dur*BEAT:
                u=bt-st; f=midi(roots[bar]+off)
                # warm, picked fundamental with subtle octave and fifth
                v += env(u,dur*BEAT,0.012,0.10) * (0.70*osc(f,u,'tri') + 0.22*osc(f*2,u,'sine') + 0.08*osc(f*1.5,u,'sine'))
        v *= 0.68
        out.append((v*(0.96+0.04*math.sin(t*2)), v*(0.96-0.04*math.sin(t*2))))
    return out

def render_ep():
    out=[]; chords=[[57,60,64,67],[55,59,62,65],[53,57,60,64],[52,56,59,62]]
    for i in range(N):
        t=i/SR; bar=int(t/(4*BEAT))%8; bt=t%(4*BEAT); v=0.0
        # chord enters on each bar, leaving a clean 0.18 beat release gap
        dur=3.70*BEAT
        for j,note in enumerate(chords[bar%4]):
            u=bt; a=env(u,dur,0.055,0.26)
            if a:
                f=midi(note); wob=1.0+0.002*math.sin(2*math.pi*4.1*t+j)
                v += a*(0.34*osc(f*wob,u,'sine') + 0.10*osc(f*2.01,u,'sine') + 0.045*osc(f*3.0,u,'tri'))
        # gentle tremolo gives electric-piano movement
        v *= (0.75 + 0.25*math.sin(2*math.pi*4.0*t)) * 0.42
        out.append((v*0.86, v*1.04))
    return out

def kick(u):
    # descending pitch body + short click, fully deterministic
    f=92.0*math.exp(-u*18.0)+42.0
    return math.sin(2*math.pi*f*u)*math.exp(-u*10.5) + 0.13*math.sin(2*math.pi*160*u)*math.exp(-u*55)

def snare(u, seed):
    # compact synthesized wire/body, noise stream is deterministic by time
    n=math.sin(2*math.pi*(1731+seed*13)*u)+math.sin(2*math.pi*(2449+seed*7)*u)
    return (0.55*n*0.5 + 0.45*math.sin(2*math.pi*190*u))*math.exp(-u*25)

def render_drums():
    out=[]
    for i in range(N):
        t=i/SR; v=0.0
        # kicks at quarter notes and one late pickup per bar
        for k in range(32):
            st=k*BEAT
            if st <= t < st+0.22: v += 0.66*kick(t-st)
        for k in range(64):
            st=k*0.5*BEAT + 0.02*BEAT
            if st <= t < st+0.13: v += 0.43*snare(t-st,k)
        # backbeat snare, swung ghost rim touches, and bright closed hats
        for k in range(16):
            st=k*0.5*BEAT
            if st <= t < st+0.08:
                u=t-st; noise=math.sin(2*math.pi*3811*u)+math.sin(2*math.pi*5173*u)
                v += (0.10*noise*math.exp(-u*70))
        for bar in range(8):
            for b in (1,3):
                st=(bar*4+b)*BEAT
                if st <= t < st+0.19: v += 0.40*snare(t-st,bar+b)
        # modest stereo image: kick center, hat shimmer alternates
        pan=0.18*math.sin(2*math.pi*t/BEAT)
        l,r=stereo_pan(v*0.58,pan)
        out.append((l,r))
    return out

def render_tension():
    out=[]
    # sparse, original 2-note call/response hook, each note short enough for seam
    calls=[(0.50,67,0.26),(1.25,72,0.22),(2.75,69,0.32),
           (4.50,67,0.22),(5.25,74,0.20),(6.50,72,0.30)]
    for i in range(N):
        t=i/SR; bar=int(t/(4*BEAT))%8; bt=t%(4*BEAT); v=0.0
        if bar in (1,3,5,7):
            for beat,note,dur in calls:
                if beat <= bt/BEAT < beat+dur:
                    u=bt-beat*BEAT; d=dur*BEAT; a=env(u,d,0.018,0.10)
                    f=midi(note)
                    v += a*(0.46*osc(f,u,'sine')+0.13*osc(f*2,u,'sine'))
        # quiet filtered-tape-like noise swell only at bar 8 pickup
        v *= 0.48
        pan=0.38*math.sin(2*math.pi*t/3.2)
        out.append(stereo_pan(v,pan))
    return out

def mix(a,b,c): return [(x[0]+y[0]+z[0], x[1]+y[1]+z[1]) for x,y,z in zip(a,b,c)]

def main():
    bass=render_bass(); ep=render_ep(); drums=render_drums(); tension=render_tension()
    # Normalize only the audition mix; stems retain their production-ready scale.
    write_wav('dead_air_bass.wav',bass); write_wav('dead_air_epiano.wav',ep)
    write_wav('dead_air_drums.wav',drums); write_wav('dead_air_tension.wav',tension)
    m=mix(bass,ep,drums)
    m=[(l+t[0],r+t[1]) for (l,r),t in zip(m,tension)]
    peak=max(max(abs(l),abs(r)) for l,r in m)
    gain=0.82/peak if peak else 1.0
    write_wav('dead_air_coastal_groove_mix.wav',[(l*gain,r*gain) for l,r in m])
    print('Rendered', N, 'frames /', N/SR, 'seconds; mix peak pre-gain', round(peak,6), 'gain', round(gain,6))

if __name__ == '__main__': main()
