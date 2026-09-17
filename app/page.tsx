/*
 * Plain <img> is deliberate throughout this file, so every element below carries
 * its own eslint-disable-next-line rather than a blanket file-wide disable:
 *
 *   - Editable sources handed to Unlayer React Image Editor must stay the exact
 *     same-origin PNG. next/image would rewrite the URL through the optimizer
 *     and the editor would receive a re-encoded plate.
 *   - Saved editor output and the composited canvases are `data:` URLs, which
 *     next/image cannot accept.
 *   - The pre-encoded WebP derivatives in /art/display are already sized for
 *     their surface, so a second optimization pass would only add latency.
 */
"use client";
import { type SyntheticEvent, useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Radio,
  Phone,
  Pause,
  Play,
  Pencil,
  Download,
  RotateCcw,
  Check,
  Eye,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import ImageEditor, {
  type ImageEditorInstance,
  type ImageEditorRef,
  type ImageEditorSaveResult,
} from "@unlayer/react-image-editor";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  ATTENTION_SEGMENTS,
  PRESSURE_ATTENTION,
  attentionHot,
  attentionSegments,
  attentionTick,
  carriedAttention,
  cutReducer,
  emptyCut,
  ending,
  type Source,
} from "@/lib/broadcast";
import { judgeEditorSave } from "@/lib/editor-gate";
import { StationAudio } from "@/lib/audio";
import { warmImageEditor } from "@/lib/editor-warmup";
import { sponsorAt, sponsors } from "@/lib/sponsors";
import {
  DISPLAY_STACK,
  MONO_STACK,
  fitText,
  monoFont,
  registrationMarks,
  scanlines,
} from "@/lib/canvas-type";
import { BootSequence } from "@/components/dead-air/boot-sequence";
type Stage =
  | "intro"
  | "boot"
  | "name"
  | "watch"
  | "ident"
  | "source"
  | "edit"
  | "desk"
  | "call"
  | "ending"
  | "replay";
/**
 * Canonical artwork. These are the untouched 1672 x 941 same-origin PNGs and the
 * ONLY thing that may ever reach Unlayer React Image Editor: `openEditor` and
 * every value that can land in `Cut.onAir` (which `openEditor` can re-open) must
 * read from here, never from `display`.
 */
const art = {
  opening: "/art/opening.png",
  dock: "/art/dock.png",
  party: "/art/party-v2.png",
  fixer: "/art/fixer.png",
  getaway: "/art/getaway.png",
};

/**
 * Display-only WebP derivatives (see docs/art-provenance.md). Used for on-screen
 * surfaces and for the same-origin canvas composites, which never hand their
 * source image to the editor. Never pass any of these to `openEditor`.
 */
const display = {
  openingSmall: "/art/display/opening-768.webp",
  opening: "/art/display/opening-1440.webp",
  fixer: "/art/display/fixer-768.webp",
  getaway: "/art/display/getaway-1440.webp",
  feed: {
    dock: "/art/display/dock-1440.webp",
    party: "/art/display/party-v2-1440.webp",
  },
  thumb: {
    dock: "/art/display/dock-320.webp",
    party: "/art/display/party-v2-320.webp",
  },
};
// One stable configuration, defined at module scope. Changing `features`
// remounts the editor and discards the visitor's work, so this object is
// never rebuilt per render. `translations` is one of the few keys the wrapper
// applies through its lightweight update path, so renaming the rail is safe.
//
// The tools are relabelled in the station's own language: the image desk is
// part of the broadcast set, not a third-party widget parked inside it. The
// Save control keeps its name so the on-screen instructions, the README and
// Unlayer's own documentation all agree on what to press.
const options = {
  theme: "dark" as const,
  aiAssistantOpenState: "closed" as const,
  translations: {
    en: {
      "image_editor.tools.filter": "GRADE",
      "image_editor.tools.crop": "REFRAME",
      "image_editor.tools.draw": "MARK UP",
      "image_editor.tools.text": "LOWER THIRD",
      "image_editor.tools.shapes": "BLOCK OUT",
      "image_editor.tools.stickers": "BUGS",
      "image_editor.tools.frame": "BORDER",
    },
  },
  features: {
    imageEditor: {
      dock: "left" as const,
      tools: {
        filter: true,
        crop: true,
        draw: true,
        text: true,
        stickers: true,
        frame: true,
        resize: false,
      },
    },
  },
};
/**
 * Visible recovery state for any image that fails to load. Inline SVG, so it
 * needs no second network round trip: a dead feed shows a signal-lost card in
 * the right aspect ratio instead of a broken-image icon.
 */
const signalLost =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1672 941" width="1672" height="941">` +
      `<rect width="1672" height="941" fill="#101a20"/>` +
      `<g fill="none" stroke="#243139" stroke-width="3">` +
      Array.from({ length: 14 }, (_, i) => `<path d="M0 ${i * 72 + 36}H1672"/>`).join("") +
      `</g>` +
      `<rect x="596" y="404" width="480" height="134" fill="#e86151"/>` +
      // Single-quoted attributes: the font stacks carry double quotes of their
      // own (see lib/canvas-type.ts), which would close the attribute early.
      `<text x="836" y="472" fill="#12191d" font-family='${DISPLAY_STACK}' font-size="58" font-weight="900" text-anchor="middle">SIGNAL LOST</text>` +
      `<text x="836" y="514" fill="#2b1b16" font-family='${MONO_STACK}' font-size="21" text-anchor="middle" letter-spacing="3">THIS FEED DID NOT ARRIVE</text>` +
      `</svg>`,
  );

/** File-name-safe form of the callsign, so "SALT & STATIC TV" cannot leak
 * punctuation into a download name. */
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "station";

function download(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}
export default function Home() {
  const [stage, setStage] = useState<Stage>("intro");
  const [alias, setAlias] = useState("");
  const [cut, dispatch] = useReducer(cutReducer, emptyCut);
  const [source, setSource] = useState<Source>("dock");
  const [editorImage, setEditorImage] = useState("");
  const [returnStage, setReturnStage] = useState<Stage>("source");
  const [editorReady, setEditorReady] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [issue, setIssue] = useState("");
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [help, setHelp] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [assetError, setAssetError] = useState(false);
  const audio = useRef<StationAudio | null>(null);
  const soundRequest = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [watchPaused, setWatchPaused] = useState(false);
  const [pressureOpen, setPressureOpen] = useState(false);
  const [transmission, setTransmission] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmReload, setConfirmReload] = useState(false);
  /**
   * The image desk never connected — the hosted runtime, not the picture. It
   * gets its own recovery card inside the editor frame, because there is
   * nothing to lose by remounting something that never mounted.
   */
  const [editorFailed, setEditorFailed] = useState<"" | "runtime" | "image">("");
  /**
   * Broadcast attention: the station's own estimate of how many people are
   * on Channel 08. Diegetic fiction, labelled as an estimate on screen — see
   * lib/broadcast.ts. It climbs while the picture is out there and the
   * fixer's warning arrives when it fills the meter.
   */
  const [attention, setAttention] = useState(0);
  /** Which paid spot is currently on the air. Plain counter; wrapped on read. */
  const [spot, setSpot] = useState(0);
  /**
   * The editor's own canvas has collapsed to nothing.
   *
   * Measured, not guessed: on a 390 px viewport the hosted editor lays its
   * tool panel out at a fixed width next to the tool rail, and the two
   * together are wider than the frame — so opening MARK UP leaves the canvas
   * about four pixels wide. That is the editor runtime's layout, not
   * something this app can restyle from the outside, so it is detected and
   * explained with a way out instead of being left looking broken.
   */
  const [cramped, setCramped] = useState(false);
  /**
   * The visitor asked to switch to the other camera. They cut that angle in the
   * editor first; the switch is only recorded once their own frame goes live,
   * so the on-air monitor never falls back to raw camera art.
   */
  const [switchPending, setSwitchPending] = useState(false);
  /** Which night this is. A second run through is NIGHT 02, not NIGHT 01 again. */
  const [night, setNight] = useState(1);
  const [cutStyle, setCutStyle] = useState<"hard" | "dissolve">("hard");
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  /**
   * Phone-width layout. Read once at mount and kept current by the listener in
   * the mount effect below. Only consumed by surfaces that render long after
   * hydration (the editor's `minHeight`), so the initial server value never
   * shows up in the markup.
   */
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches,
  );
  const soundWanted = useRef(false);
  const imageEditorRef = useRef<ImageEditorRef>(null);
  /*
   * Editor-gate signals. See lib/editor-gate.ts: `hasChanges()` reports
   * *unsaved* changes, so it is tracked while the visitor works instead of
   * being read once after the save, and the starting image is snapshotted in
   * onLoad so a save can be compared against it.
   */
  const editorBaseline = useRef<string | null>(null);
  const sawEditorChanges = useRef(false);
  const changeTrackingAvailable = useRef(false);
  const readEditorImage = useCallback(() => {
    const editor = imageEditorRef.current?.editor;
    if (!editor || typeof editor.getImage !== "function") return null;
    try {
      return editor.getImage();
    } catch {
      return null;
    }
  }, []);
  const editorHost = useRef<HTMLDivElement>(null);
  /**
   * Visible recovery for any image that fails to load: the element is swapped
   * for the signal-lost card (in the same box, so nothing reflows) and the
   * visitor is told which feed died instead of being shown a broken icon.
   */
  const markSignalLost = useCallback((el: HTMLImageElement, what: string) => {
    if (el.dataset.signalLost) return;
    el.dataset.signalLost = "true";
    el.removeAttribute("srcset");
    el.src = signalLost;
    if (el.classList.contains("arrival-art")) setAssetError(true);
    setIssue(what + " could not load. Everything else still works.");
  }, []);
  const resetEditorGate = useCallback(() => {
    editorBaseline.current = null;
    sawEditorChanges.current = false;
    changeTrackingAvailable.current = false;
  }, []);
  const enterCallsign = useCallback(() => setStage("name"), []);
  /**
   * Committing to the night is the right moment to start paying for the
   * editor: the boot terminal and the callsign field are two screens of
   * unavoidable waiting, and Unlayer's hosted runtime can download through
   * both of them instead of after them. The default angle's canonical PNG
   * follows at low priority, behind the runtime. See lib/editor-warmup.ts.
   */
  const bootStation = useCallback(() => {
    warmImageEditor(art.dock);
    setStage("boot");
  }, []);
  const station = (alias.trim() || "AFTER HOURS").toUpperCase() + " TV";
  const isEditor = stage === "ident" || stage === "edit";
  const nightLabel = String(night).padStart(2, "0");
  const sponsor = sponsorAt(spot);
  const segments = attentionSegments(attention);
  const hot = attentionHot(attention);
  /*
   * Replay bounds. `retry()` can shorten the recorded episode, so the index is
   * clamped on read as well as reset on retry: nothing here may ever
   * dereference an out-of-range shot.
   */
  const replayLast = Math.max(0, cut.shots.length - 1);
  const replayAt = Math.min(replayIndex, replayLast);
  const replayShot = cut.shots[replayAt];
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(m.matches);
    m.addEventListener("change", change);
    const phone = window.matchMedia("(max-width: 700px)");
    const resize = () => setNarrow(phone.matches);
    phone.addEventListener("change", resize);
    audio.current = new StationAudio(() => {
      soundWanted.current = false;
      setSound(false);
      setMusicLoading(false);
    });
    return () => {
      m.removeEventListener("change", change);
      phone.removeEventListener("change", resize);
      audio.current?.close();
    };
  }, []);
  useEffect(() => {
    audio.current?.setScene(pressureOpen ? "pressure" : stage);
    if (!pressureOpen) heading.current?.focus();
  }, [stage, pressureOpen]);
  // The ON AIR timecode runs for as long as the station is on air, through the
  // caller and the warning. A broadcast clock frozen at 00:05 reads as broken.
  useEffect(() => {
    if (!live || (stage !== "desk" && stage !== "call")) return;
    const t = setInterval(() => setElapsed((current) => current + 1), 1000);
    return () => clearInterval(t);
  }, [live, stage]);
  // The incoming line arrives on its own after five seconds on air — but never
  // on top of a cut the visitor has saved and not yet aired.
  useEffect(() => {
    if (!live || stage !== "desk" || cut.decision !== "pending") return;
    if (cut.preview && cut.preview !== cut.onAir) return;
    const t = setTimeout(() => setStage("call"), Math.max(0, (5 - elapsed) * 1000));
    return () => clearTimeout(t);
  }, [live, stage, elapsed, cut.decision, cut.preview, cut.onAir]);
  useEffect(() => {
    if (!playing || stage !== "replay") return;
    // One timer per shot, so the last shot still holds for its full beat and no
    // state is written from inside an updater.
    if (replayIndex >= cut.shots.length - 1) {
      const end = setTimeout(() => setPlaying(false), 4200);
      return () => clearTimeout(end);
    }
    const t = setTimeout(() => setReplayIndex((i) => i + 1), 4200);
    return () => clearTimeout(t);
  }, [playing, stage, replayIndex, cut.shots.length]);
  // Track the editor's dirty flag while the visitor is working, and keep the
  // last-known-true value. Reading it only after a save races the runtime's own
  // post-save reset; see lib/editor-gate.ts.
  useEffect(() => {
    if (!isEditor || !editorReady) return;
    const read = () => {
      const editor = imageEditorRef.current?.editor;
      if (!editor || typeof editor.hasChanges !== "function") return;
      let dirty: boolean | null = null;
      try {
        dirty = editor.hasChanges();
        // Only a read that actually returned counts as trackable, so a runtime
        // that throws here stays "unverifiable" and the gate falls open.
        changeTrackingAvailable.current = true;
      } catch {
        /* The gate falls back to the image snapshots, then to allowing it. */
      }
      if (dirty) sawEditorChanges.current = true;
      // onLoad can fire before the image is in the canvas, where getImage()
      // still answers with the source URL or nothing. Take the baseline from
      // the first read that both reports clean and returns a real bitmap.
      if (dirty === false && editorBaseline.current === null) {
        const image = readEditorImage();
        if (image && image.startsWith("data:image/") && image.length > 512)
          editorBaseline.current = image;
      }
    };
    read();
    const t = setInterval(read, 350);
    /*
     * Also read on every interaction inside the editor, captured before the
     * editor's own handlers run. A press on the editor's Save button is itself
     * an interaction, so the flag is sampled while it is still pre-save —
     * closing the window where an edit made between two polls could be missed.
     */
    const host = editorHost.current;
    const events = ["pointerdown", "pointerup", "keyup"] as const;
    for (const name of events) host?.addEventListener(name, read, true);
    return () => {
      clearInterval(t);
      for (const name of events) host?.removeEventListener(name, read, true);
    };
  }, [isEditor, editorReady, editorKey, readEditorImage]);
  /*
   * Watch the editor's canvas box while the desk is open. Polled rather than
   * observed because the canvas element is replaced as tools mount, so a
   * ResizeObserver would have to be re-attached on the same interval anyway.
   */
  useEffect(() => {
    if (!isEditor || !editorReady) {
      return;
    }
    const read = () => {
      const canvases = editorHost.current?.querySelectorAll("canvas");
      const last = canvases?.[canvases.length - 1];
      setCramped(!!last && last.getBoundingClientRect().width < 90);
    };
    const first = setTimeout(read, 0);
    const t = setInterval(read, 400);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      setCramped(false);
    };
  }, [isEditor, editorReady, editorKey]);
  useEffect(() => {
    if (stage !== "watch" || watchPaused || reduced) return;
    const timer = setInterval(() => setSource((s) => (s === "dock" ? "party" : "dock")), 6500);
    return () => clearInterval(timer);
  }, [stage, watchPaused, reduced]);
  /*
   * Attention climbs for as long as the visitor's picture is on air. It is the
   * station's own estimate and the meter says so; nothing is measured and no
   * request is made. Paused with the stage, so a visitor reading the editor is
   * not accruing heat they cannot see.
   */
  useEffect(() => {
    if (!live || (stage !== "desk" && stage !== "call")) return;
    const t = setInterval(() => setAttention((a) => attentionTick(a, Math.random())), 700);
    return () => clearInterval(t);
  }, [live, stage]);
  /*
   * The fixer arrives when the meter fills, not on a stopwatch: the visitor
   * can watch the thing that summons him. The 2.5 s arm is a fail-safe, not
   * the mechanism — it is longer than one attention tick, so while attention
   * is climbing the threshold always wins, and if attention ever stalls (a
   * backgrounded tab, a paused clock) the warning still arrives.
   *
   * Deliberately independent of `sound`: toggling the music switch must not
   * restart the interruption.
   */
  useEffect(() => {
    if (stage !== "desk" || cut.decision === "pending" || cut.pressure !== "pending") return;
    const timer = setTimeout(() => setPressureOpen(true), attentionHot(attention) ? 0 : 2500);
    return () => clearTimeout(timer);
  }, [stage, cut.decision, cut.pressure, attention]);
  /*
   * Paid programming rotates on its own, the way a station bug does. Reduced
   * motion holds one spot and leaves the manual NEXT SPOT control as the only
   * way through them.
   */
  useEffect(() => {
    if (reduced || (stage !== "desk" && stage !== "watch")) return;
    const t = setInterval(() => setSpot((s) => s + 1), 8000);
    return () => clearInterval(t);
  }, [reduced, stage]);
  /*
   * An image in the server-rendered HTML can fail before React hydrates and
   * attaches its onError, so the error event is simply never delivered. Sweep
   * for already-broken images once mounted, and again on each stage.
   */
  useEffect(() => {
    const sweep = () => {
      for (const el of document.querySelectorAll("img")) {
        if (el.complete && el.src && !el.naturalWidth && !el.dataset.signalLost)
          markSignalLost(
            el,
            el.classList.contains("arrival-art") ? "The opening artwork" : "An image",
          );
      }
    };
    const soon = setTimeout(sweep, 0);
    const later = setTimeout(sweep, 1500);
    return () => {
      clearTimeout(soon);
      clearTimeout(later);
    };
  }, [stage, markSignalLost]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!transmission) return;
    const t = setTimeout(() => setTransmission(false), 650);
    return () => clearTimeout(t);
  }, [transmission]);
  const toggleSound = async (next: boolean) => {
    const request = ++soundRequest.current;
    soundWanted.current = next;
    setSound(next);
    setMusicLoading(next);
    if (!next) {
      audio.current?.stop();
      return;
    }
    try {
      await audio.current?.start();
      if (request !== soundRequest.current && !soundWanted.current) audio.current?.stop();
      if (request === soundRequest.current) setMusicLoading(false);
    } catch {
      if (request !== soundRequest.current) return;
      setSound(false);
      setMusicLoading(false);
      setIssue("Music could not load. You can keep broadcasting and try again.");
    }
  };
  const openEditor = useCallback(
    (image: string, kind: "ident" | "edit", back: Stage) => {
      setEditorImage(image);
      setEditorReady(false);
      setEditorFailed("");
      setEditorKey((k) => k + 1);
      setReturnStage(back);
      setConfirmReload(false);
      resetEditorGate();
      setStage(kind);
    },
    [resetEditorGate],
  );
  const leaveEditor = useCallback(() => {
    setConfirmReload(false);
    setSwitchPending(false);
    setStage(returnStage);
  }, [returnStage]);
  /**
   * Remount the image desk from scratch. Used both by the failure card (where
   * there is nothing to lose, because nothing ever mounted) and by the
   * confirmed "Discard & reload" in the footer.
   */
  const retryEditor = useCallback(() => {
    setConfirmReload(false);
    setEditorFailed("");
    setEditorReady(false);
    setIssue("");
    resetEditorGate();
    setEditorKey((k) => k + 1);
  }, [resetEditorGate]);
  /**
   * The station ident: the first thing the channel puts out, composed here and
   * handed straight to the visitor to author in Unlayer.
   *
   * This used to be one cream slab with `900 92px Impact` on it, horizontally
   * squashed by `fillText`'s maxWidth whenever a callsign ran long — and Impact
   * is absent on Linux and Android, so the two platforms without it silently
   * got an unrelated face. It is now a composed ident: a graded plate, a
   * channel tab, a shrink-to-fit callsign that keeps its letterforms, a coral
   * strap, registration marks and scanlines, all in the predictable stacks
   * from lib/canvas-type.ts.
   */
  const prepareIdent = async () => {
    setBusy(true);
    setIssue("");
    try {
      // Display derivative: this frame is composited to a canvas and exported as
      // a data URL, so it never becomes an editable source. 1440 px wide feeds a
      // 1280 x 720 canvas without upscaling.
      const im = new window.Image();
      im.src = display.feed.party;
      await im.decode();
      const W = 1280,
        H = 720;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d")!;
      g.drawImage(im, 0, 0, W, H);
      // Night grade: lightest at the top, deep enough at the bottom that cream
      // type on it is legible whatever the underlying artwork is doing.
      const grade = g.createLinearGradient(0, 0, 0, H);
      grade.addColorStop(0, "rgba(10,17,24,.34)");
      grade.addColorStop(0.45, "rgba(9,15,21,.56)");
      grade.addColorStop(1, "rgba(6,11,16,.88)");
      g.fillStyle = grade;
      g.fillRect(0, 0, W, H);
      scanlines(g, W, H, 0.12);
      // Channel tab and the slate line.
      g.fillStyle = "#e86151";
      g.fillRect(64, 56, 104, 40);
      g.fillStyle = "#13191d";
      g.font = monoFont(19, 700);
      g.letterSpacing = "2px";
      g.fillText("CH 08", 82, 83);
      g.fillStyle = "#f4eddb";
      g.font = monoFont(19);
      g.fillText("MARLIN KEY · 20:46 · PIRATE TELEVISION", 186, 83);
      // The ident plate. Deliberately not full width: the auction behind it is
      // the reason the channel exists, so it stays visible.
      const plateX = 64,
        plateW = 768,
        plateY = 402,
        plateH = 152;
      g.fillStyle = "#f4eddb";
      g.fillRect(plateX, plateY, plateW, plateH);
      g.fillStyle = "#e86151";
      g.fillRect(plateX, plateY, 12, plateH);
      g.letterSpacing = "1px";
      const size = fitText(g, station, plateW - 84, 84, 26);
      g.fillStyle = "#12191f";
      g.fillText(station, plateX + 44, plateY + plateH / 2 + size * 0.35, plateW - 84);
      // Coral strap under the plate carries the channel's one promise.
      g.fillStyle = "#e86151";
      g.fillRect(plateX, plateY + plateH, plateW, 48);
      g.fillStyle = "#1b1012";
      g.font = monoFont(20, 700);
      g.letterSpacing = "7px";
      g.fillText("YOUR COAST. YOUR CUT.", plateX + 44, plateY + plateH + 32);
      g.fillStyle = "#e6e0ce";
      g.font = monoFont(17);
      g.letterSpacing = "3px";
      g.textAlign = "right";
      g.fillText("INDEPENDENT COASTAL TELEVISION", W - 64, H - 62);
      g.textAlign = "left";
      g.letterSpacing = "0px";
      registrationMarks(g, W, H);
      dispatch({ type: "ident", image: c.toDataURL("image/png") });
      setSource("dock");
      setStage("watch");
    } catch {
      setIssue("The station artwork could not load. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };
  const onEditorLoad = useCallback((editor: ImageEditorInstance) => {
    setEditorReady(true);
    // Snapshot of the untouched starting image, for the save gate. Only a real
    // bitmap counts here; the poll effect retries if this fires too early.
    const starting = (() => {
      if (!editor || typeof editor.getImage !== "function") return null;
      try {
        return editor.getImage();
      } catch {
        return null;
      }
    })();
    editorBaseline.current =
      starting && starting.startsWith("data:image/") && starting.length > 512 ? starting : null;
    if (editor && typeof editor.hasChanges === "function") {
      try {
        const dirty = editor.hasChanges();
        changeTrackingAvailable.current = true;
        if (dirty) sawEditorChanges.current = true;
      } catch {
        /* ignore: the poll effect re-reads it, and the gate fails open. */
      }
    }
  }, []);
  const onSave = async ({ dataUrl, blob }: ImageEditorSaveResult) => {
    setBusy(true);
    setIssue("");
    try {
      const verdict = judgeEditorSave({
        saved: dataUrl,
        baseline: editorBaseline.current,
        current: readEditorImage(),
        sawChanges: sawEditorChanges.current,
        changeTrackingAvailable: changeTrackingAvailable.current,
      });
      if (!verdict.edited)
        throw Error(
          stage === "ident"
            ? "Make the ident yours before saving. Grade it, reframe it, mark it up, or drop a lower third on it."
            : "The city needs your cut, not the untouched camera feed. Make one visible edit before saving.",
        );
      if (!blob || !dataUrl.startsWith("data:image/"))
        throw Error("The image was not saved. Please try again.");
      const im = new window.Image();
      im.src = dataUrl;
      await im.decode();
      if (!im.naturalWidth) throw Error("The saved image is empty.");
      setConfirmReload(false);
      if (stage === "ident") {
        dispatch({ type: "ident", image: dataUrl });
        // Save and Back lead to the same place, whichever screen sent you here.
        setStage(returnStage === "watch" ? "watch" : "source");
        setToast("Your ident is ready to hit the city.");
      } else {
        dispatch({ type: "save", image: dataUrl, source });
        setStage("desk");
        setToast(
          switchPending
            ? "Your cut of the other angle is ready. Take it live to switch."
            : returnStage === "call"
              ? "New angle saved. Take it live — the caller is still holding."
              : "Your cut is ready. Put it on air.",
        );
      }
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "Save failed. Your current broadcast is safe.");
    } finally {
      setBusy(false);
    }
  };
  const takeLive = () => {
    setTransmission(true);
    dispatch({ type: "live" });
    // `decide` is one-shot, so only claim the switch while it can still be
    // recorded — answering the caller in between cancels the pending switch.
    if (switchPending && cut.decision === "pending") {
      // The switch is recorded now, against the visitor's own edit of the new
      // angle — the raw camera PNG never reaches the on-air monitor.
      dispatch({ type: "decide", decision: "switch" });
      setToast("SIGNAL OUT / Camera switched to your cut of the other angle.");
    } else {
      setToast("SIGNAL OUT / Your picture is on air.");
    }
    setSwitchPending(false);
    setLive(true);
    if (!live) setElapsed(0);
    setStage("desk");
  };
  const decide = (decision: "call" | "hold") => {
    dispatch({ type: "decide", decision });
    setSwitchPending(false);
    setStage("desk");
    setToast(
      decision === "call"
        ? "Caller patched through. Someone else is listening."
        : "You held your picture. The line stays open.",
    );
  };
  const startSwitch = () => {
    const other: Source = cut.source === "dock" ? "party" : "dock";
    setSwitchPending(true);
    setSource(other);
    openEditor(art[other], "edit", "call");
    setToast("The other camera is loaded. Cut it before it can go on air.");
  };
  const finish = async () => {
    if (cut.pressure === "pending") {
      setPressureOpen(true);
      return;
    }
    setBusy(true);
    try {
      /*
       * A frame the visitor saved but never aired would otherwise be dropped
       * from the sign-off and the episode card. It airs with the sign-off
       * instead, and the toast below says so.
       */
      const unaired = cut.preview && cut.preview !== cut.onAir ? cut.preview : "";
      if (unaired) dispatch({ type: "live" });
      const background = new window.Image(),
        plate = new window.Image();
      // Display derivative: composited to canvas and exported, never editable.
      background.src = display.getaway;
      plate.src = unaired || cut.shots.filter((s) => s.kind === "plate").at(-1)?.image || cut.onAir;
      await Promise.all([background.decode(), plate.decode()]);
      const W = 1280,
        H = 720;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d")!;
      g.drawImage(background, 0, 0, W, H);
      // A graded band rather than a flat 72% slab, so the marina behind the
      // sign-off does not disappear behind a grey rectangle.
      const band = g.createLinearGradient(0, 350, 0, H);
      band.addColorStop(0, "rgba(8,15,20,0)");
      band.addColorStop(0.35, "rgba(8,14,19,.78)");
      band.addColorStop(1, "rgba(5,10,14,.94)");
      g.fillStyle = band;
      g.fillRect(0, 350, W, H - 350);
      /*
       * Everything in the sign-off sits above y=620, leaving the bottom band
       * of the frame clear: the ending screen floats its own caption there,
       * and the two used to print straight through each other.
       */
      g.fillStyle = "#e86151";
      g.fillRect(42, 452, 10, 96);
      g.letterSpacing = "1px";
      const size = fitText(g, station, 690, 58, 22);
      g.fillStyle = "#f4ecdc";
      g.fillText(station, 74, 452 + size * 0.82, 690);
      g.font = monoFont(21);
      g.letterSpacing = "4px";
      g.fillText(cut.pressure === "air" ? "THE CITY HEARD YOU." : "THE PICTURE GOT OUT.", 74, 528);
      g.fillStyle = "#b8c2c4";
      g.font = monoFont(15);
      g.letterSpacing = "2px";
      g.fillText("PAID FOR BY " + sponsor.name, 74, 572);
      g.letterSpacing = "0px";
      // The visitor's plate, framed and captioned, as the thing the night was
      // actually about. 332 x 187 is 16:9, so the export is not letterboxed.
      g.fillStyle = "#f4ecdc";
      g.fillRect(886, 378, 348, 222);
      g.fillStyle = "#0a1216";
      g.fillRect(894, 386, 332, 187);
      g.drawImage(plate, 894, 386, 332, 187);
      g.fillStyle = "#e86151";
      g.fillRect(886, 378, 348, 7);
      g.fillStyle = "#12191f";
      g.font = monoFont(13, 700);
      g.letterSpacing = "2px";
      g.fillText("YOUR CUT / CH 08", 894, 592);
      g.letterSpacing = "0px";
      dispatch({ type: "close", image: c.toDataURL("image/png") });
      setStage("ending");
      setLive(false);
      setReplayIndex(0);
      if (unaired) setToast("Your newest cut aired with the sign-off. It is in the episode card.");
    } catch {
      setIssue("The closing shot could not load. Your broadcast is safe; try sign-off again.");
    } finally {
      setBusy(false);
    }
  };
  const handlePressure = (choice: "air" | "protect") => {
    dispatch({ type: "pressure", choice, image: art.fixer });
    setPressureOpen(false);
    setToast(
      choice === "air"
        ? "Warning recorded. Time to leave the marina."
        : "Source protected. Get the picture out.",
    );
  };
  const saveStill = async () => {
    try {
      const im = (stage === "replay" ? replayShot?.image : cut.shots.at(-1)?.image) || cut.onAir;
      const b = await (await fetch(im)).blob();
      download(b, "dead-air-" + slug(station) + ".png");
    } catch {
      setIssue("This frame could not download. Please try again.");
    }
  };
  const saveCard = async () => {
    setBusy(true);
    try {
      const { makeEpisodeCard } = await import("@/lib/episode-card");
      // The card used to print "EPISODE 01" on every night, including the ones
      // reached through RUN ANOTHER NIGHT, so it disagreed with the heading it
      // was exported from.
      const card = await makeEpisodeCard(station, cut, night, sponsor);
      download(card, "dead-air-" + slug(station) + "-episode-card.png");
      setToast("Episode card developed. Your exact cut is inside it.");
    } catch {
      setIssue("The episode card could not export. Your replay is still available.");
    } finally {
      setBusy(false);
    }
  };
  const retry = () => {
    setElapsed(0);
    setLive(true);
    // The night rewinds to the interruption, so the attention that summoned
    // the fixer rewinds with it — otherwise a full meter would fire the
    // warning the instant the caller is answered again.
    setAttention(Math.round(PRESSURE_ATTENTION * 0.45));
    setPlaying(false);
    // rewind() shortens the recorded episode, so the replay head goes back to
    // the top rather than pointing past the end of it.
    setReplayIndex(0);
    setPressureOpen(false);
    setSwitchPending(false);
    dispatch({ type: "rewind" });
    setStage("call");
    setToast("Back at the interruption. Your latest cut is still on air.");
  };
  /**
   * A second night, without re-running boot, callsign and the ident edit. The
   * station ident the visitor authored is carried over — `ident` resets every
   * other field of the cut — so the branches (2 warnings x 3 caller choices x
   * 2 angles) are explorable without a browser reload.
   */
  const runAnotherNight = () => {
    setPlaying(false);
    setReplayIndex(0);
    setLive(false);
    setElapsed(0);
    setIssue("");
    setPressureOpen(false);
    setSwitchPending(false);
    setWatchPaused(false);
    setCutStyle("hard");
    setSource("dock");
    // People who watched last night are still half-watching, so NIGHT 02 does
    // not open in silence — and the fixer has less of a climb to make.
    setAttention(carriedAttention);
    setSpot((s) => s + 1);
    dispatch({ type: "ident", image: cut.ident });
    setNight((n) => n + 1);
    setStage("watch");
    setToast("A new night. Same station, fresh cut. The cameras are rolling.");
  };
  const feedError = useCallback(
    (what: string) => (event: SyntheticEvent<HTMLImageElement>) =>
      markSignalLost(event.currentTarget, what),
    [markSignalLost],
  );
  return (
    <main
      className={"app stage-" + stage + " cut-" + cutStyle + (transmission ? " transmitting" : "")}
    >
      {transmission && (
        <div className="transmission-wipe" aria-hidden="true">
          <Radio /> SIGNAL OUT
        </div>
      )}
      {toast && (
        <div className="broadcast-toast" role="status">
          <Radio size={18} />
          {toast}
        </div>
      )}
      {/*
       * While the warning is unanswered this dialog is the only way forward, so
       * it cannot be dismissed: Esc, the overlay and the close X are all
       * withheld until a choice is made. (Dismissing it used to strand the
       * visitor — the reopen effect's deps never changed on dismissal.)
       */}
      <Dialog
        open={pressureOpen}
        onOpenChange={(open) => {
          if (open || cut.pressure !== "pending") setPressureOpen(open);
        }}
      >
        <DialogContent
          className="pressure-dialog"
          showCloseButton={cut.pressure !== "pending"}
          onEscapeKeyDown={(event) => {
            if (cut.pressure === "pending") event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (cut.pressure === "pending") event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (cut.pressure === "pending") event.preventDefault();
          }}
        >
          <div className="pressure-image">
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP derivative; see file header. */}
            <img
              src={display.fixer}
              width={768}
              height={433}
              loading="lazy"
              decoding="async"
              alt="An auction security fixer at the van doorway"
              onError={feedError("The message photo")}
            />
            <span>UNKNOWN NUMBER / INCOMING</span>
          </div>
          <div className="pressure-copy">
            <span className="eyebrow">SOMEONE FOUND YOUR VAN.</span>
            <DialogTitle>
              “Kill the feed.
              <br />
              We can see your antenna.”
            </DialogTitle>
            <DialogDescription>
              Your picture is still on air. Put the warning on record, or keep the source out of it.
            </DialogDescription>
            <div className="pressure-choices">
              <button className="primary" onClick={() => handlePressure("air")}>
                AIR THE WARNING <Radio size={17} />
              </button>
              <button className="secondary" onClick={() => handlePressure("protect")}>
                PROTECT THE SOURCE
              </button>
            </div>
            <small>Your choice changes the episode and the sign-off.</small>
          </div>
        </DialogContent>
      </Dialog>
      <header className="topbar">
        <span className="brand">
          <Radio size={20} /> DEAD AIR
        </span>
        <span className="station-label">
          {stage === "intro" ? "YOUR COAST. YOUR CUT." : station + " / NIGHT " + nightLabel}
        </span>
        <div className="top-actions">
          <button className="quiet help-toggle" onClick={() => setHelp(!help)} aria-expanded={help}>
            How to play
          </button>
          <label className="sound-label">
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{musicLoading ? "LOADING TRACK" : sound ? "SOUND ON" : "SOUND OFF"}</span>
            <Switch aria-label="Background music" checked={sound} onCheckedChange={toggleSound} />
          </label>
        </div>
      </header>
      {help && (
        <aside className="help">
          <strong>You run the broadcast.</strong>
          <p>
            Catch a camera moment and freeze it. Make your edit in Unlayer, then go live. Handle the
            caller and the warning at your van. Your cuts decide what the city sees. The EYES ON CH
            08 meter is the station’s own guess at who is watching — it is part of the fiction, not
            a real audience — and when it fills, someone comes looking for the antenna.
          </p>
          <button className="quiet" onClick={() => setHelp(false)}>
            Got it <X size={16} />
          </button>
        </aside>
      )}
      {issue && (
        <div className="notice" role="alert">
          {issue}
          <button aria-label="Dismiss message" onClick={() => setIssue("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {stage === "intro" && (
        <section className="arrival">
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP derivative; see file header. */}
          <img
            className="arrival-art"
            src={display.opening}
            srcSet={`${display.openingSmall} 768w, ${display.opening} 1440w`}
            sizes="100vw"
            width={1440}
            height={811}
            fetchPriority="high"
            decoding="async"
            alt="Inside an original pirate-TV van overlooking a waterfront auction, the operator offers you the production chair"
            onError={(event) => {
              setAssetError(true);
              feedError("The opening artwork")(event);
            }}
          />
          <div className="arrival-shade" />
          <div className="arrival-title">
            <h1 ref={heading} tabIndex={-1}>
              DEAD AIR
            </h1>
            <p>YOUR COAST. YOUR CUT.</p>
          </div>
          <div className="invitation">
            <span className="eyebrow">MARLIN KEY / 20:46</span>
            <h2>The city’s watching.</h2>
            <p>Give it something worth seeing.</p>
            <button className="primary" onClick={bootStation}>
              BOOT THE STATION <ArrowUpRight size={20} />
            </button>
            <small>A five-minute broadcast. Yours to run.</small>
            <button className="quiet soundtrack-invite" onClick={() => void toggleSound(!sound)}>
              {sound ? <Volume2 size={16} /> : <Play size={16} />}{" "}
              {musicLoading
                ? "NIGHT FREQUENCY / TUNING IN…"
                : sound
                  ? "NIGHT FREQUENCY / PLAYING"
                  : "NIGHT FREQUENCY / PLAY SOUNDTRACK"}
            </button>
            {assetError && (
              <p role="alert">
                The opening artwork did not arrive, so you are seeing a signal-lost card. You can
                still boot the station.
              </p>
            )}
          </div>
        </section>
      )}
      {stage === "boot" && <BootSequence onComplete={enterCallsign} />}
      {stage === "name" && (
        <section
          className="name-scene"
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(10,17,23,.95),rgba(10,17,23,.45)),url(${display.opening})`,
          }}
        >
          <div className="name-form">
            <span className="eyebrow">FIELD DESK READY / IDENTIFY OPERATOR</span>
            <h1 ref={heading} tabIndex={-1}>
              Your callsign.
              <br />
              Your frequency.
            </h1>
            <p>The channel is open. Put your name on the signal.</p>
            <label htmlFor="station-name">ENTER CALLSIGN</label>
            <input
              id="station-name"
              maxLength={18}
              value={alias}
              placeholder="AFTER HOURS"
              onChange={(e) => setAlias(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy && alias.trim()) void prepareIdent();
              }}
            />
            <p className="hint">
              {alias.trim()
                ? station + " · No account. No actual transmission."
                : "Type a callsign to open the channel. No account. No actual transmission."}
            </p>
            <button className="primary" disabled={busy || !alias.trim()} onClick={prepareIdent}>
              {busy ? "PREPARING YOUR IDENT…" : "CONNECT TO CAMERA 08"} <Pencil size={18} />
            </button>
            <button className="quiet" onClick={() => setStage("intro")}>
              <ArrowLeft size={16} /> Back to the van
            </button>
          </div>
        </section>
      )}
      {stage === "watch" && (
        <section className={"live-watch " + (watchPaused ? "paused" : "")}>
          <div className="watch-picture">
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP derivative; see file header. */}
            <img
              key={source}
              src={display.feed[source]}
              width={1440}
              height={811}
              loading="lazy"
              decoding="async"
              alt={
                source === "dock"
                  ? "The mascot makes a break along the dock"
                  : "A second angle shows the sculpture changing hands"
              }
              onError={feedError("This camera feed")}
            />
          </div>
          <div className="watch-vignette" />
          <div className="watch-head">
            <span>
              <i /> {source === "dock" ? "DOCK CAMERA" : "PARTY PHONE"} / ILLUSTRATED FEED
            </span>
            <button
              className="secondary"
              onClick={() => setWatchPaused(!watchPaused)}
              aria-label={watchPaused ? "Resume camera cuts" : "Pause camera cuts"}
            >
              {watchPaused ? <Play size={17} /> : <Pause size={17} />}
            </button>
          </div>
          {/* The channel's own ad break, running over the feed as a bug. */}
          <div className="feed-sponsor" key={"feed-spot-" + spot}>
            <span>PAID PROGRAMMING · CH 08</span>
            <strong>{sponsor.name}</strong>
            <em>“{sponsor.line}”</em>
          </div>
          <div className="watch-caption" key={"caption-" + source}>
            <span className="eyebrow">
              {source === "dock"
                ? "20:46 / THE AUCTION JUST WENT SIDEWAYS"
                : "20:41 / FIVE MINUTES EARLIER"}
            </span>
            <h1 ref={heading} tabIndex={-1}>
              {source === "dock" ? (
                <>
                  A golden fish.
                  <br />A very bad exit.
                </>
              ) : (
                <>
                  Wait. Who handed
                  <br />
                  over the fish?
                </>
              )}
            </h1>
            <p>
              {source === "dock"
                ? "You have the picture. What do you make of it?"
                : "Same night. A very different picture."}
            </p>
            <div className="watch-actions">
              <button className="primary" onClick={() => openEditor(art[source], "edit", "watch")}>
                FREEZE & EDIT THIS FRAME <Pencil size={19} />
              </button>
              {/* Co-primary: the camera desk holds both angles and the station
                  ident, so it is no longer hidden behind a quiet link. */}
              <button className="secondary" onClick={() => setStage("source")}>
                OPEN THE CAMERA DESK <ArrowUpRight size={18} />
              </button>
            </div>
            <div className="watch-cameras">
              {(["dock", "party"] as Source[]).map((s, i) => (
                <button
                  key={s}
                  className={source === s ? "active" : ""}
                  onClick={() => {
                    setSource(s);
                    setWatchPaused(true);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP derivative; see file header. */}
                  <img
                    src={display.thumb[s]}
                    width={320}
                    height={181}
                    loading="lazy"
                    decoding="async"
                    alt=""
                    onError={feedError("A camera thumbnail")}
                  />
                  <span>
                    0{i + 1} / {s === "dock" ? "THE GETAWAY" : "THE HANDOFF"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
      {isEditor && (
        <section className="workshop">
          <div className="workshop-heading">
            <button className="quiet" onClick={leaveEditor}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <span className="eyebrow">
                {stage === "ident" ? "01 / STATION IDENT" : "02 / BROADCAST PLATE"}
              </span>
              <h1 ref={heading} tabIndex={-1}>
                {stage === "ident" ? "Give the station a face." : "Make your angle visible."}
              </h1>
            </div>
            <a
              href="https://github.com/unlayer/react-image-editor"
              target="_blank"
              rel="noreferrer"
            >
              UNLAYER IMAGE EDITOR ↗
            </a>
          </div>
          <p className="editor-brief">
            {stage === "ident"
              ? "Add your tag, change the mood, make a mark. Your exact saved artwork opens the show."
              : "Reframe the moment. Mark up the detail or drop a lower third on it. Your exact saved image goes to Preview."}{" "}
            <b>An untouched frame cannot air. Finish with Save inside the editor.</b>
          </p>
          {/* Phone-only, via CSS: at 390 px the rail, the canvas and the Save
              control are all on screen but tight, and turning the handset
              sideways roughly doubles the usable canvas. */}
          <p className="editor-phone-hint">
            Tight on a phone? Turn it sideways. Tools run down the left edge, and at this width the
            editor’s own controls collapse to icons: <b>✕</b> cancels, <b>✓</b> saves.
          </p>
          <div className="editor-host" ref={editorHost} aria-busy={!editorReady || busy}>
            {!editorReady && !editorFailed && (
              <div className="editor-loading">
                <span className="editor-loading-bar" aria-hidden="true" />
                OPENING THE IMAGE DESK…
                <small>Unlayer React Image Editor is coming up on Channel 08.</small>
              </div>
            )}
            {/*
             * Two different failures, two different sentences, one recovery
             * control. This used to be a dismissible notice at the top of the
             * page whose only cure was a footer link that then asked for
             * confirmation — on a desk that had never opened, so there was
             * nothing to confirm.
             */}
            {editorFailed && (
              <div className="editor-down" role="alert">
                <span className="eyebrow">IMAGE DESK / NO CARRIER</span>
                <h2>
                  {editorFailed === "runtime"
                    ? "The image desk did not connect."
                    : "This frame did not reach the desk."}
                </h2>
                <p>
                  {editorFailed === "runtime"
                    ? "React Image Editor runs from Unlayer’s own CDN, so this step needs network access. Nothing of yours is lost — the plate was never opened."
                    : "The camera plate could not be decoded into the canvas. Retrying refetches it from this station, same origin, full resolution."}
                </p>
                <div className="editor-down-actions">
                  <button className="primary" onClick={retryEditor}>
                    TRY THE DESK AGAIN <RotateCcw size={16} />
                  </button>
                  <button className="quiet" onClick={leaveEditor}>
                    <ArrowLeft size={16} /> Back without editing
                  </button>
                </div>
              </div>
            )}
            {cramped && (
              <div className="editor-cramped" role="status">
                <strong>No room left for the picture.</strong>
                <span>
                  That panel is wider than this screen. Turn the phone sideways for a full canvas,
                  or close the panel with its × to get the frame back.
                </span>
              </div>
            )}
            {editorImage && (
              <ImageEditor
                ref={imageEditorRef}
                key={editorKey}
                image={editorImage}
                options={options}
                /* A phone gives the canvas every pixel the chrome does not
                   need; the desktop desk keeps the taller frame. Changing
                   minHeight is a style change, not an `options` change, so it
                   cannot remount the editor or discard an edit. */
                minHeight={narrow ? 520 : 570}
                onLoad={onEditorLoad}
                onSave={onSave}
                onCancel={leaveEditor}
                onError={() => setEditorFailed("runtime")}
                onLoadError={() => setEditorFailed("image")}
              />
            )}
          </div>
          <div className="editor-foot">
            <span>GRADE · REFRAME · MARK UP · LOWER THIRD · BLOCK OUT · BUGS · BORDER</span>
            {/* Remounting the editor clears every in-progress edit, so it asks
                first instead of quietly throwing the visitor's work away. */}
            {confirmReload ? (
              <span className="reload-confirm" role="status">
                Reloading clears the edits you have not saved.
                <button className="quiet reload-danger" onClick={retryEditor}>
                  Discard & reload
                </button>
                <button className="quiet" onClick={() => setConfirmReload(false)}>
                  Keep editing
                </button>
              </span>
            ) : (
              <button className="quiet" onClick={() => setConfirmReload(true)}>
                Reload image desk
              </button>
            )}
          </div>
        </section>
      )}
      {stage === "source" && (
        <section className="source-room">
          <div className="source-heading">
            <div>
              <span className="eyebrow">YOUR STATION / CAMERA DESK</span>
              <h1 ref={heading} tabIndex={-1}>
                One night.
                <br />
                Two cameras.
              </h1>
              <p>
                A mascot. A golden fish. An auction gone sideways.
                <br />
                Pick the frame you want the city to see.
              </p>
            </div>
            <figure className="ident-proof">
              {/* eslint-disable-next-line @next/next/no-img-element -- saved editor output is a data: URL; see file header. */}
              <img
                src={cut.ident}
                width={1672}
                height={941}
                loading="lazy"
                decoding="async"
                alt="Your station ident"
                onError={feedError("Your station ident")}
              />
              <figcaption>
                <Check size={14} /> STATION IDENT / READY TO AIR
              </figcaption>
            </figure>
          </div>
          <div className="source-pair">
            {(["dock", "party"] as Source[]).map((s, i) => (
              <button
                key={s}
                className="source-choice"
                onClick={() => {
                  setSource(s);
                  openEditor(art[s], "edit", "source");
                }}
              >
                <div className="source-image">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP derivative; see file header. */}
                  <img
                    src={display.feed[s]}
                    width={1440}
                    height={811}
                    loading="lazy"
                    decoding="async"
                    alt={
                      s === "dock"
                        ? "A pink marlin mascot carries a golden fish along the auction dock"
                        : "A stage manager hands the golden fish to the mascot"
                    }
                    onError={feedError("This camera feed")}
                  />
                  <span className="source-number">0{i + 1}</span>
                </div>
                <div className="source-caption">
                  <div>
                    <h2>{s === "dock" ? "The getaway?" : "Before the commotion."}</h2>
                    <p>
                      {s === "dock"
                        ? "DOCK CAMERA / THE MOMENT EVERYONE SAW"
                        : "PARTY PHONE / THE ANGLE THEY MISSED"}
                    </p>
                  </div>
                  <span>
                    EDIT FRAME <ArrowUpRight size={18} />
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="source-extras">
            <button className="secondary" onClick={() => openEditor(cut.ident, "ident", "source")}>
              STYLE MY STATION IDENT <Pencil size={16} />
            </button>
            <button className="quiet" onClick={() => setStage("watch")}>
              Return to the camera feed <Play size={16} />
            </button>
          </div>
        </section>
      )}
      {(stage === "desk" || stage === "call") && (
        <section className="studio">
          <div className="studio-caption">
            <span className="eyebrow">MARLIN KEY AUCTION / CONTROL ROOM</span>
            {/*
             * Broadcast attention. The pressure in this world is being
             * noticed, so the thing that summons the fixer is on screen and
             * filling, not hidden in a timer. It is labelled as the station's
             * own estimate because that is all it is: see lib/broadcast.ts —
             * nothing is measured, nothing is requested, no one is counted.
             */}
            <div className={"attention" + (hot ? " attention-hot" : "")}>
              <Eye size={15} />
              <span className="attention-label">EYES ON CH 08</span>
              <span className="attention-count">{attention.toLocaleString("en-US")}</span>
              <span className="attention-bars" aria-hidden="true">
                {Array.from({ length: ATTENTION_SEGMENTS }, (_, i) => (
                  <i key={i} className={i < segments ? "on" : ""} />
                ))}
              </span>
              <small>
                {hot
                  ? "SOMEONE IS TRIANGULATING THE ANTENNA"
                  : "STATION ESTIMATE / NOT A REAL AUDIENCE"}
              </small>
            </div>
            <span className="studio-clock">
              {live ? "ON AIR" : "STANDING BY"} ·{" "}
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
              {String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>
          {/* The desk is the most-entered screen, so it gets the page heading
              (and the arrival focus target) rather than going without one. */}
          {stage === "desk" && (
            <h1 className="studio-title" ref={heading} tabIndex={-1}>
              Run the desk.
            </h1>
          )}
          <div className="console-grid">
            <aside className="preview-monitor">
              {stage === "call" ? (
                <div className="caller">
                  <span className="caller-heading">
                    <Phone /> CALLER 01
                  </span>
                  <div className="waveform" aria-hidden="true">
                    ▂ ▄ ▆ ▃ ▅ ▇ ▄ ▂ ▅ ▃
                  </div>
                  <h1 ref={heading} tabIndex={-1}>
                    {cut.source === "dock" ? (
                      <>
                        “That’s our performer.
                        <br />
                        The fish is a prop.”
                      </>
                    ) : (
                      <>
                        “That isn’t a prop.
                        <br />
                        Our trophy is missing.”
                      </>
                    )}
                  </h1>
                  <p>
                    {cut.source === "dock"
                      ? "Stage manager. One very different account."
                      : "Auction organizer. One very different account."}
                  </p>
                  <button className="primary" onClick={() => decide("call")}>
                    <Phone size={18} /> TAKE CALL
                  </button>
                  <button className="secondary" onClick={() => decide("hold")}>
                    HOLD THE SHOT
                  </button>
                  {/* The switch used to put the raw camera PNG on air, wiping
                      the visitor's edit off the monitor. Now it loads the other
                      angle into the editor first and only records the switch
                      once their own cut of it goes live. */}
                  <button className="secondary" onClick={startSwitch}>
                    SWITCH ANGLE — CUT IT FIRST <Pencil size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="monitor-label">
                    <span className="preview-dot" />
                    PREVIEW / YOUR CUT <span>NOT ON AIR</span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element -- saved editor output is a data: URL; see file header. */}
                  <img
                    className="preview-image"
                    src={cut.preview || cut.ident}
                    width={1672}
                    height={941}
                    loading="lazy"
                    decoding="async"
                    alt="Your saved image queued in Preview"
                    onError={feedError("The preview image")}
                  />
                  <div className="cut-style" role="group" aria-label="Broadcast transition">
                    <button aria-pressed={cutStyle === "hard"} onClick={() => setCutStyle("hard")}>
                      HARD CUT
                    </button>
                    <button
                      aria-pressed={cutStyle === "dissolve"}
                      onClick={() => setCutStyle("dissolve")}
                    >
                      DISSOLVE
                    </button>
                  </div>
                  <div className="preview-actions">
                    <button
                      className="primary"
                      disabled={!cut.preview || cut.preview === cut.onAir}
                      onClick={takeLive}
                    >
                      <Radio size={18} /> TAKE LIVE
                    </button>
                    <button
                      className="secondary"
                      onClick={() => openEditor(cut.preview || art[source], "edit", "desk")}
                    >
                      <Pencil size={16} /> EDIT FRAME
                    </button>
                  </div>
                  <p className="monitor-note">
                    {switchPending
                      ? "Your cut of the other angle is in Preview. Take it live to switch cameras."
                      : !live
                        ? "Your image is ready. Take it live to start the show."
                        : cut.preview && cut.preview !== cut.onAir
                          ? "A newer cut is waiting in Preview. Take it live so the city sees it."
                          : cut.decision === "call"
                            ? "The caller is on record. Keep your eyes on the incoming line."
                            : cut.decision === "hold"
                              ? "You held your frame. Someone at the auction noticed."
                              : cut.decision === "switch"
                                ? "Your cut of the second angle is on air. The night is not over."
                                : elapsed < 5
                                  ? "Your picture is out there. Stay on the line."
                                  : "An incoming call needs your attention."}
                  </p>
                </>
              )}
            </aside>
            <div className="onair-monitor">
              <div className="monitor-label">
                <span className={live ? "live-dot" : ""} />
                {live ? "ON AIR" : "STATION IDENT"}
                <span>{station}</span>
              </div>
              <div className="program-image">
                {/* eslint-disable-next-line @next/next/no-img-element -- saved editor output, or a canonical PNG that `openEditor` can re-open; see file header. */}
                <img
                  key={cut.onAir}
                  src={cut.onAir || cut.ident}
                  width={1672}
                  height={941}
                  loading="lazy"
                  decoding="async"
                  alt="The exact image currently on air"
                  onError={feedError("The on-air image")}
                />
                {/* The channel bug belongs on programme. While the monitor is
                    holding the station ident — which already carries the
                    callsign, in the visitor's own artwork — a second copy of
                    the same name on top of it is just noise. */}
                {live && <span className="station-bug">{station}</span>}
              </div>
              <div className="onair-foot">
                {stage === "call"
                  ? "YOUR FRAME IS STILL ON AIR"
                  : cut.corrected
                    ? "REVISED PLATE / ON AIR"
                    : "YOUR COAST. YOUR CUT."}
                <span>
                  {live ? attention.toLocaleString("en-US") + " WATCHING · CH 08" : "CH 08"}
                </span>
              </div>
            </div>
            <div className="camera-strip">
              {(["dock", "party"] as Source[]).map((s, i) => (
                <button
                  key={s}
                  className={"camera " + (source === s ? "selected" : "")}
                  /*
                   * Opening an angle in the editor is NOT an answer to the
                   * caller. This used to dispatch the one-shot `decide`
                   * action, which permanently and silently skipped the caller
                   * scene; now the call is still waiting when you come back.
                   */
                  onClick={() => {
                    setSource(s);
                    openEditor(art[s], "edit", stage === "call" ? "call" : "desk");
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP derivative; see file header. */}
                  <img
                    src={display.thumb[s]}
                    width={320}
                    height={181}
                    loading="lazy"
                    decoding="async"
                    alt={s === "dock" ? "Dock camera angle" : "Party phone angle"}
                    onError={feedError("A camera thumbnail")}
                  />
                  <span>
                    0{i + 1} /{" "}
                    {s === "dock" ? "DOCK CAMERA" : stage === "call" ? "NEW ANGLE" : "PARTY PHONE"}{" "}
                    <Pencil size={14} />
                  </span>
                </button>
              ))}
            </div>
          </div>
          {/*
           * Paid programming. A pirate station still has to sell airtime, and
           * in Marlin Key the only businesses buying it are the fronts — so
           * the ad breaks are where the town describes itself. Ten original
           * spots in lib/sponsors.ts; this one rotates every eight seconds,
           * or on request under reduced motion.
           */}
          <div className="sponsor-strip" key={"spot-" + spot}>
            <span className="sponsor-tag">PAID PROGRAMMING</span>
            <span className="sponsor-name">{sponsor.name}</span>
            <span className="sponsor-line">“{sponsor.line}”</span>
            <span className="sponsor-strap">{sponsor.strap}</span>
            <button className="quiet sponsor-next" onClick={() => setSpot((value) => value + 1)}>
              NEXT SPOT <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="direction-strip">
            <p>
              {stage === "call"
                ? "Answer the line, switch the camera, or recut your picture instead of answering. The thumbnails below just open the editor — the call keeps holding."
                : cut.pressure !== "pending"
                  ? "Your van is made. Get the picture out."
                  : switchPending
                    ? "Take your new angle live to switch cameras."
                    : cut.decision !== "pending"
                      ? hot
                        ? "Too many eyes on Channel 08. Someone has found the antenna."
                        : "The channel is filling up. An unknown number is dialling."
                      : live
                        ? "The night has another angle."
                        : "Your next click puts this picture on air."}
            </p>
            {stage === "call" ? (
              /* This one IS an answer to the caller — it is recorded as the
                 'revise' branch — so the label says so before the click. */
              <button
                className="quiet"
                onClick={() => {
                  dispatch({ type: "decide", decision: "revise" });
                  openEditor(cut.onAir, "edit", "desk");
                }}
              >
                Recut instead of answering <Pencil size={16} />
              </button>
            ) : cut.decision !== "pending" ? (
              <button className="primary" disabled={busy} onClick={finish}>
                {busy
                  ? "CUTTING THE LAST SHOT…"
                  : cut.pressure === "pending"
                    ? "READ INCOMING MESSAGE"
                    : "CUT & GET OUT"}{" "}
                <ArrowUpRight size={18} />
              </button>
            ) : live ? (
              <button className="quiet" onClick={() => setStage("call")}>
                Answer incoming line <Phone size={16} />
              </button>
            ) : null}
          </div>
        </section>
      )}
      {(stage === "ending" || stage === "replay") && (
        <section className="episode">
          <div className="episode-heading">
            <div>
              <span className="eyebrow">
                {station} / EPISODE {nightLabel}
              </span>
              <h1 ref={heading} tabIndex={-1}>
                {stage === "ending" ? "That’s your broadcast." : "Your night, on record."}
              </h1>
              <p>{ending(cut)}</p>
            </div>
            <span className="episode-stamp">
              OFF AIR
              <br />
              <small>{cut.shots.length} CUTS / ONE NIGHT</small>
            </span>
          </div>
          <div className="episode-screen">
            {/* eslint-disable-next-line @next/next/no-img-element -- recorded shot: a data: URL or a canonical PNG; see file header. */}
            <img
              key={stage === "replay" ? replayAt : "closing"}
              src={
                (stage === "replay" ? replayShot?.image : cut.shots.at(-1)?.image) ||
                cut.onAir ||
                cut.ident
              }
              width={1672}
              height={941}
              loading="lazy"
              decoding="async"
              alt={
                stage === "replay"
                  ? replayShot?.caption || "A recorded cut"
                  : "Your final on-air image"
              }
              onError={feedError("This recorded frame")}
            />
            <span className="station-bug">{station}</span>
            <div className="episode-subtitle">
              {stage === "replay"
                ? replayShot?.caption || "A recorded cut"
                : "No perfect story. Just the cut you chose."}
            </div>
          </div>
          {stage === "replay" && (
            <div className="replay-controls">
              <button
                className="secondary"
                aria-label={playing ? "Pause replay" : "Play replay"}
                onClick={() => {
                  if (replayAt >= replayLast) setReplayIndex(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <Slider
                min={0}
                max={replayLast}
                value={[replayAt]}
                step={1}
                disabled={replayLast === 0}
                onValueChange={(v) => {
                  setPlaying(false);
                  setReplayIndex(Math.min(v[0], replayLast));
                }}
                aria-label="Episode cut"
              />
              <span>
                CUT {replayAt + 1} / {cut.shots.length}
              </span>
            </div>
          )}
          <div className="episode-actions">
            <button
              className="primary"
              onClick={() => {
                setReplayIndex(0);
                setPlaying(true);
                setStage("replay");
              }}
            >
              <Play size={18} /> REPLAY MY CUT
            </button>
            <button className="secondary" onClick={saveStill}>
              <Download size={18} /> KEEP FRAME
            </button>
            <button className="secondary episode-card-action" disabled={busy} onClick={saveCard}>
              <Download size={18} />
              {busy ? "DEVELOPING…" : "KEEP EPISODE CARD"}
            </button>
            {/* A second night without re-running boot, callsign and the ident:
                the branches are meant to be explored. */}
            <button className="secondary run-another" onClick={runAnotherNight}>
              <Radio size={18} /> RUN ANOTHER NIGHT
            </button>
            <button className="quiet" onClick={retry}>
              <RotateCcw size={16} /> Recut from interruption
            </button>
          </div>
          <div className="episode-sponsor">
            <span className="eyebrow">TONIGHT’S BROADCAST WAS PAID FOR BY</span>
            <strong>{sponsor.name}</strong>
            <p>“{sponsor.line}”</p>
            <small>{sponsor.strap}</small>
          </div>
          <p className="episode-note">
            Your saved artwork, callsign, choices, and closing frame become one downloadable episode
            card. <b>RUN ANOTHER NIGHT</b> keeps your station ident and takes you back to the
            cameras, so you can try the other angle, the other caller answer and the other warning
            choice. Everything stays in this tab. Channel 08 sells airtime to {sponsors.length}{" "}
            Marlin Key businesses, none of which exist.
          </p>
        </section>
      )}
      <footer className="footer">
        <span>DEAD AIR / INDEPENDENT COASTAL TELEVISION</span>
        <span>
          Music:{" "}
          <a
            href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100383"
            target="_blank"
            rel="noreferrer"
          >
            “Chase Pulse” · Kevin MacLeod
          </a>{" "}
          /{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>
        </span>
      </footer>
    </main>
  );
}
