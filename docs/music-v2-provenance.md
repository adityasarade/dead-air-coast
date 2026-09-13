# Dead Air heist-v2 groove

This is a replacement original procedural composition for the darker criminal/heist pass. Every sound is synthesized by `render_dead_air_groove.py` with Python's standard library (`math`, `wave`, `struct`, deterministic `random`); it reads no samples or external assets and uses no APIs, keys, or borrowed musical material. The existing lounge loop was not copied or transformed.

Run `python3 render_dead_air_groove.py` from this directory to reproduce the files. The four synchronized stereo stems keep the prior drop-in names: bass (driven syncopated sub), epiano (repurposed as short dark minor stabs), drums (punchy kick/snare with ticking hats), and tension (sparse high-register motif), plus the mixed audition file.

The arrangement is 16 bars at 126 BPM, so its exact duration is 16 × 4 × 60/126 = 30.4761904762 seconds. Files are 44,100 Hz, 16-bit PCM stereo WAV.

## Numeric render check (2026-09-13)

Each file contains exactly 1,344,000 frames, 44,100 Hz, 2 channels, and 30.4761904762 seconds. Measured absolute int16 peaks:

| file | peak |
| --- | ---: |
| `dead_air_bass.wav` | 0.669332 |
| `dead_air_epiano.wav` | 0.568224 |
| `dead_air_drums.wav` | 0.471908 |
| `dead_air_tension.wav` | 0.201727 |
| `dead_air_coastal_groove_mix.wav` | 0.819971 |

The mixed audition is gain-limited below 0 dBFS, with no digital clipping. This is a numerical check only and makes no claim of human listening verification.
