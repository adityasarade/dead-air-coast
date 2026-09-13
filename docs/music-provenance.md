# Dead Air coastal groove

This asset is an original procedural composition for the Dead Air game. The renderer uses only Python's standard library (`math`, `wave`, `struct`, and deterministic `random`) and does not read samples, recordings, APIs, or network resources. It does not copy or transform the existing SecondTake loop.

Run from this directory:

```sh
python3 render_dead_air_groove.py
```

The output is one 20-second stereo audition mix plus four synchronized stereo stems: bass, electric piano, drums, and tension/hook. The groove is 8 bars at 96 BPM (32 beats × 60/96 = exactly 20 seconds), rendered at 44,100 Hz, 16-bit PCM. The arrangement is in an Am7–G7–Fmaj7–E7 color cycle with a syncopated bass, seventh-chord electric piano voicing, dry synthesized drums, and sparse two-note melodic calls.

## Numeric render check (2026-09-13)

All five files contain exactly 882,000 frames, 44,100 Hz, 2 channels, and 20.0 seconds. Measured int16 absolute peaks after render:

| file | peak |
| --- | ---: |
| `dead_air_bass.wav` | 0.530381 |
| `dead_air_epiano.wav` | 0.701102 |
| `dead_air_drums.wav` | 0.471358 |
| `dead_air_tension.wav` | 0.204688 |
| `dead_air_coastal_groove_mix.wav` | 0.819971 |

The mix is gain-limited to approximately −1.72 dBFS. The check confirms no digital clipping and exact loop duration. This is a numerical verification; it does not claim human listening verification.
