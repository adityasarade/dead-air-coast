# Music license and playback

This is the single source of truth for the soundtrack shipped in Dead Air. It supersedes the
two earlier procedural-music documents, which described four WAV stems that this repository
never contained and which no longer matched the shipped audio. They have been removed.

## Required attribution

> “Chase Pulse” Kevin MacLeod (incompetech.com)
> Licensed under Creative Commons: By Attribution 4.0 License
> https://creativecommons.org/licenses/by/4.0/

This attribution is reproduced verbatim in the app footer, with the source and license as
live links. It must be preserved in any redistribution.

## Provenance

|              |                                                                                       |
| ------------ | ------------------------------------------------------------------------------------- |
| Shipped file | `public/audio/chase-pulse.mp3`                                                        |
| Title        | Chase Pulse                                                                           |
| Composer     | Kevin MacLeod                                                                         |
| Album        | Dark World (2007)                                                                     |
| License      | Creative Commons Attribution 4.0 International (CC BY 4.0)                            |
| License text | https://creativecommons.org/licenses/by/4.0/                                          |
| Source page  | https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100383 |
| ISRC         | USUAN1100383                                                                          |
| Obtained     | Downloaded from the track page's official MP3 link on 2026-09-14 IST                  |

This is **third-party licensed music, not original music written for Dead Air**. No endorsement
by Kevin MacLeod or incompetech.com is implied. The source describes a dark, driving 135 BPM
synth and percussion track.

## Encoding

The recording itself is unmodified — no edits, no added or removed material, no pitch or tempo
change. The file was re-encoded once, to reduce transfer weight for a browser-delivered
soundtrack that is off by default.

|                 |       Before |        After |
| --------------- | -----------: | -----------: |
| File size       |  4,788,279 B |  1,869,496 B |
| Overall bitrate |  328,129 bps |  128,112 bps |
| Audio bitrate   |     320 kbps |     128 kbps |
| Duration        | 116.741225 s | 116.741224 s |
| Sample rate     |    44,100 Hz |    44,100 Hz |
| Channels        |            2 |            2 |
| Mean volume     |   −18.1 dBFS |   −18.6 dBFS |
| Peak volume     |    −0.3 dBFS |    −0.7 dBFS |

Re-encoded on 17 September 2026 with ffmpeg and libmp3lame:

```sh
ffmpeg -i chase-pulse-original-320k.mp3 \
  -map 0:a:0 -c:a libmp3lame -b:a 128k -ar 44100 -ac 2 \
  -map_metadata 0 -id3v2_version 3 \
  public/audio/chase-pulse.mp3
```

That is a 60.96% reduction in encoded bytes. Duration is preserved to the microsecond, levels
are within 0.5 dB, and a full decode pass reports no errors. The ID3 `title`, `artist`, `album`
and `date` tags carrying the attribution are preserved, and the `comment` tag now also states
the license and its URL. The 400 × 400 embedded cover art was dropped, since it is never
displayed and the footer carries the visible attribution instead.

The re-encode is a lossy generation loss relative to the 320 kbps download. This is a
numerical and decode-level verification; perceived quality is necessarily device- and
listener-dependent.

## Playback behaviour

Implemented in `lib/audio.ts`.

- One looping `HTMLAudioElement`. No Web Audio oscillator cues.
- Starts at zero gain and fades smoothly; maximum configured gain is 0.32.
- Gain is scene-dependent, so the mix ducks and lifts with the broadcast stage.
- A same-origin `BroadcastChannel` stops another tab's player when music starts here, so only
  one Dead Air player is audible at a time.
- Music is optional and **off by default**. Nothing plays until the visitor asks for it.
- A failed load surfaces a dismissible in-app notice and leaves the broadcast running.
