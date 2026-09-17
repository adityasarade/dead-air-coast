"use client";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Radio, ArrowUpRight, Check } from "lucide-react";
/*
 * Per-line dwell. The terminal exists to set the scene, not to make anyone
 * wait: five lines at this pace is about a second of texture, and the whole
 * screen can be dismissed at any moment by the SKIP INTRO button, Enter, or
 * Escape.
 */
const LINE_MS = 240;
/** Hold on "STATION READY" before entering on our own. */
const READY_MS = 320;
/**
 * A decode that neither resolves nor rejects must not strand the terminal.
 * This is the "it is taking too long" path, which is a different statement
 * from "it failed", so the two are reported separately.
 */
const STALL_MS = 6000;
export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<"running" | "ready" | "slow" | "failed">("running");
  const ready = outcome === "ready";
  const settled = outcome !== "running";
  useEffect(() => {
    let active = true;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const append = (line: string) => {
      if (active) setLines((old) => [...old, line]);
    };
    const delay = () => new Promise<void>((r) => setTimeout(r, motion ? 0 : LINE_MS));
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
      // actually opens the editor, and app/page.tsx pulls it in the
      // background from here on, at low priority, behind the editor runtime.
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
        setOutcome("ready");
      }
    };
    void run().catch(() => {
      if (active) {
        setOutcome("failed");
        append("CAMERA CACHE MISSED / CONTINUE TO RETRY");
      }
    });
    return () => {
      active = false;
    };
  }, []);
  /*
   * The terminal always advances on its own: on success, on a decode failure,
   * and on the stall watchdog. It never waits for a click, and a click never
   * has to wait for it.
   */
  useEffect(() => {
    if (!settled) return;
    const t = setTimeout(onComplete, ready ? READY_MS : 1200);
    return () => clearTimeout(t);
  }, [settled, ready, onComplete]);
  useEffect(() => {
    if (settled) return;
    const t = setTimeout(() => {
      setOutcome("slow");
      setLines((old) => [...old, "PREVIEWS STILL WARMING / GOING IN ANYWAY"]);
    }, STALL_MS);
    return () => clearTimeout(t);
  }, [settled]);
  /** Enter or Escape leaves the intro, wherever the focus happens to be. */
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === "Escape") onComplete();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onComplete]);
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
                {i > 0 && !line.includes("MISSED") && !line.includes("WARMING") && (
                  <Check size={14} />
                )}
              </div>
            ))}
            {!settled && (
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
              {outcome === "failed"
                ? "Feed previews will retry on entry."
                : outcome === "slow"
                  ? "The previews are slow tonight. They retry on entry."
                  : ready
                    ? "STATION READY"
                    : "PREPARING CAMERA PREVIEWS"}
            </span>
            {/*
             * One always-primary exit. It used to be styled `.quiet` until the
             * boot finished, which made the only fast way past the intro the
             * least visible control on the screen.
             */}
            <button className="primary boot-skip" onClick={onComplete} autoFocus>
              {ready ? "ENTER" : "SKIP INTRO"} <ArrowUpRight size={16} />
            </button>
          </div>
          <p className="boot-skip-hint">
            {ready ? "Entering the van…" : "Skip straight to the desk — Enter or Esc also works."}
          </p>
        </div>
      </div>
      <p className="boot-context">A borrowed van. Two cameras. Your cut of the night.</p>
    </section>
  );
}
