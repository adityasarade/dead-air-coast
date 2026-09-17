"use client";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Radio, ArrowUpRight, Check } from "lucide-react";
export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const append = (line: string) => {
      if (active) setLines((old) => [...old, line]);
    };
    const delay = () => new Promise<void>((r) => setTimeout(r, motion ? 0 : 550));
    const run = async () => {
      append("FIELD DESK 08 / STARTING LOCAL SESSION");
      await delay();
      if (!active) return;
      const supported = !!document.createElement("canvas").getContext("2d");
      if (!supported) throw Error("Canvas unavailable");
      append("IMAGE BUFFER ................ READY");
      await delay();
      // Warm the display derivatives (~410 KB total), not the canonical PNGs
      // (~4.98 MB). The full-resolution plate is only needed once a visitor
      // actually opens the editor, so blocking callsign entry on it is waste.
      for (const [name, url] of [
        ["DOCK CAMERA", "/art/display/dock-1440.webp"],
        ["PARTY PHONE", "/art/display/party-v2-1440.webp"],
      ]) {
        const im = new Image();
        im.src = url;
        await im.decode();
        if (!active) return;
        append(name.padEnd(29, ".") + " CACHED");
        await delay();
      }
      if (active) {
        append("CHANNEL 08 .................. YOURS");
        setReady(true);
      }
    };
    void run().catch(() => {
      if (active) {
        setFailed(true);
        append("CAMERA CACHE MISSED / CONTINUE TO RETRY");
      }
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(onComplete, 800);
    return () => clearTimeout(t);
  }, [ready, onComplete]);
  /*
   * A failed decode used to leave the terminal stalled forever, with a
   * quiet-styled SKIP INTRO as the only way out. Now the terminal always
   * advances on its own: after a failure, and after a hard 8 s watchdog for a
   * decode that neither resolves nor rejects.
   */
  useEffect(() => {
    if (!failed) return;
    const t = setTimeout(onComplete, 1600);
    return () => clearTimeout(t);
  }, [failed, onComplete]);
  useEffect(() => {
    if (ready || failed) return;
    const t = setTimeout(() => setFailed(true), 8000);
    return () => clearTimeout(t);
  }, [ready, failed]);
  return (
    <section className="boot-room">
      <div className="boot-surround" />
      <div className="boot-terminal">
        <div className="boot-titlebar">
          <span>
            <Radio size={17} /> DEAD AIR / MOBILE UPLINK
          </span>
          <span>CH 08</span>
        </div>
        <div className="boot-body">
          <span className="boot-kicker">MARLIN KEY · AFTER HOURS</span>
          <h1>
            Someone left
            <br />
            the channel open.
          </h1>
          <div className="boot-log" aria-live="polite" aria-atomic="false">
            {lines.map((line, i) => (
              <div key={line}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <code>{line}</code>
                {i > 0 && !line.includes("MISSED") && <Check size={14} />}
              </div>
            ))}
            {!ready && !failed && (
              <span className="terminal-cursor" aria-hidden="true">
                ▌
              </span>
            )}
          </div>
          <Progress
            value={Math.min(100, (lines.length / 5) * 100)}
            aria-label="Camera preparation"
          />
          <div className="boot-bottom">
            <span>
              {failed
                ? "Feed previews will retry on entry. Continuing…"
                : ready
                  ? "STATION READY"
                  : "PREPARING CAMERA PREVIEWS"}
            </span>
            <button className={ready || failed ? "primary" : "quiet"} onClick={onComplete}>
              {ready ? "ENTER" : failed ? "ENTER ANYWAY" : "SKIP INTRO"} <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </div>
      <p className="boot-context">A borrowed van. Two cameras. Your cut of the night.</p>
    </section>
  );
}
