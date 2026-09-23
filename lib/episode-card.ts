import { ending, episodeBeats, type Cut, type Shot } from "./broadcast";
import { displayFont, fitText, fitTextLines, monoFont, registrationMarks } from "./canvas-type";
import { type Sponsor } from "./sponsors";

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = source;
  });
}

function fitImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale,
    drawHeight = image.naturalHeight * scale;
  context.fillStyle = "#071016";
  context.fillRect(x, y, width, height);
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function wrap(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 5,
) {
  const originalFont = context.font;
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(originalFont)?.[1] ?? 17);
  const lines = fitTextLines(context, text, maxWidth, maxLines, size, 12,
    (next) => originalFont.replace(/\d+(?:\.\d+)?px/, `${next}px`));
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  context.font = originalFont;
}

export async function makeEpisodeCard(station: string, cut: Cut, night = 1, sponsor?: Sponsor) {
  const authored = cut.shots.filter((shot) => shot.kind === "plate").at(-1)?.image ?? cut.onAir;
  const select = (kind: Shot["kind"], last = false) => {
    const matches = cut.shots.filter((shot) => shot.kind === kind);
    return last ? matches.at(-1) : matches[0];
  };
  // Five frames read like a real edit log: ident, authored plate, interruption,
  // warning and sign-off. Missing beats are simply omitted, and duplicate shot
  // IDs are removed without touching the underlying editor exports.
  const storyShots = [
    select("ident"),
    select("plate", true),
    select("caller"),
    select("pressure"),
    select("closing", true),
  ].filter(
    (shot, index, shots): shot is Shot =>
      !!shot && shots.findIndex((s) => s?.id === shot.id) === index,
  );
  const [plate, ...storyFrames] = await Promise.all([
    loadImage(authored),
    ...storyShots.map((shot) => loadImage(shot.image)),
  ]);
  const beats = episodeBeats(cut);
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1200;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.fillStyle = "#efe7d4";
  context.fillRect(0, 0, 1600, 1200);
  context.fillStyle = "#10191f";
  context.fillRect(0, 0, 1600, 178);
  context.fillStyle = "#f3ecdc";
  // Display type via lib/canvas-type.ts rather than a bare Impact stack: the
  // card is downloaded and looked at, so it must not silently change face on
  // the platforms that have no Impact. The station line is shrink-to-fit, so a
  // long callsign stays readable instead of being squashed by fillText.
  context.letterSpacing = "1px";
  fitText(context, "DEAD AIR", 1080, 78, 40);
  context.fillText("DEAD AIR", 72, 105);
  context.font = monoFont(22);
  context.letterSpacing = "3px";
  fitText(
    context,
    `${station} / EPISODE ${String(night).padStart(2, "0")}`,
    1100,
    22,
    13,
    monoFont,
  );
  context.fillText(`${station} / EPISODE ${String(night).padStart(2, "0")}`, 72, 145);
  context.fillStyle = "#e86151";
  context.fillRect(1240, 0, 360, 178);
  context.fillStyle = "#111b21";
  context.letterSpacing = "1px";
  fitText(context, "OFF AIR", 290, 46, 26);
  context.fillText("OFF AIR", 1310, 92);
  context.font = monoFont(18);
  context.letterSpacing = "2px";
  context.fillText(`${cut.shots.length} CUTS / ARCHIVE`, 1282, 132);
  context.letterSpacing = "0px";
  fitImage(context, plate, 72, 235, 930, 525);
  context.strokeStyle = "#111b21";
  context.lineWidth = 8;
  context.strokeRect(68, 231, 938, 533);
  context.fillStyle = "#111b21";
  context.fillRect(72, 786, 930, 54);
  context.fillStyle = "#f3ecdc";
  context.font = monoFont(18);
  context.letterSpacing = "2px";
  context.fillText("YOUR EXACT EDITED BROADCAST PLATE", 94, 820);
  context.letterSpacing = "0px";
  context.fillStyle = "#111b21";
  context.fillRect(1050, 235, 478, 746);
  context.fillStyle = "#efeadc";
  context.font = monoFont(20);
  context.letterSpacing = "2px";
  context.fillText("THE NIGHT ON RECORD", 1090, 290);
  context.letterSpacing = "0px";
  context.fillStyle = "#e86151";
  context.font = displayFont(46);
  wrap(context, ending(cut).toUpperCase(), 1090, 360, 395, 56, 4);
  beats.forEach((beat, index) => {
    const y = 610 + index * 112;
    context.fillStyle = "#e86151";
    context.font = monoFont(14, 700);
    context.letterSpacing = "2px";
    context.fillText(`0${index + 1} / ${beat.label}`, 1090, y);
    context.fillStyle = "#efe7d4";
    context.font = monoFont(20, 700);
    context.letterSpacing = "0px";
    context.fillText(beat.headline, 1090, y + 29);
    context.fillStyle = "#aebbbd";
    context.font = "17px Georgia, serif";
    wrap(context, beat.detail, 1090, y + 57, 390, 23, 2);
  });
  context.fillStyle = "#111b21";
  context.font = monoFont(15, 700);
  context.letterSpacing = "2px";
  context.fillText("BROADCAST LOG / EXACT RECORDED FRAMES", 72, 876);
  const gap = 14;
  const frameWidth = (930 - gap * Math.max(0, storyFrames.length - 1)) / storyFrames.length;
  storyFrames.forEach((frame, index) => {
    const x = 72 + index * (frameWidth + gap);
    fitImage(context, frame, x, 896, frameWidth, frameWidth * (9 / 16));
    context.strokeStyle = index === 1 ? "#e86151" : "#111b21";
    context.lineWidth = index === 1 ? 5 : 3;
    context.strokeRect(x, 896, frameWidth, frameWidth * (9 / 16));
    context.fillStyle = "#111b21";
    context.font = monoFont(12, 700);
    context.letterSpacing = "1px";
    context.fillText(
      `CUT ${String(index + 1).padStart(2, "0")}`,
      x,
      896 + frameWidth * (9 / 16) + 22,
    );
  });
  context.fillStyle = "#111b21";
  context.font = monoFont(18);
  context.letterSpacing = "1px";
  context.fillText("YOUR COAST. YOUR CUT. YOUR RECORD.", 72, 1080);
  context.fillText("EDITED WITH UNLAYER REACT IMAGE EDITOR", 72, 1116);
  if (sponsor) {
    // The night's paid spot, printed on the card the way a broadcaster credits
    // the sponsor that covered the airtime.
    context.fillStyle = "#4b5a5f";
    context.font = monoFont(15);
    context.fillText("PAID FOR BY " + sponsor.name + " — " + sponsor.strap, 72, 1152);
  }
  context.textAlign = "right";
  context.fillStyle = "#111b21";
  context.font = monoFont(18);
  context.fillText("INDEPENDENT COASTAL TELEVISION / MARLIN KEY", 1528, 1116);
  context.textAlign = "left";
  context.letterSpacing = "0px";
  registrationMarks(context, 1600, 1200, 30, 38, "#111b2166");
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))),
      "image/png",
    ),
  );
}
