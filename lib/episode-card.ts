import { ending, type Cut } from "./broadcast";

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
  const words = text.split(/\s+/);
  let line = "",
    lineNumber = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    context.fillText(line, x, y + lineNumber * lineHeight);
    line = word;
    lineNumber += 1;
    if (lineNumber >= maxLines - 1) break;
  }
  if (line && lineNumber < maxLines) context.fillText(line, x, y + lineNumber * lineHeight);
}

export async function makeEpisodeCard(station: string, cut: Cut) {
  const authored = cut.shots.filter((shot) => shot.kind === "plate").at(-1)?.image ?? cut.onAir;
  const closing = cut.shots.at(-1)?.image ?? cut.onAir;
  const [plate, finalFrame] = await Promise.all([loadImage(authored), loadImage(closing)]);
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
  context.font = "900 78px Impact, Arial Black, sans-serif";
  context.fillText("DEAD AIR", 72, 105);
  context.font = "22px ui-monospace, monospace";
  context.letterSpacing = "3px";
  context.fillText(`${station} / EPISODE 01`, 72, 145);
  context.fillStyle = "#e86151";
  context.fillRect(1240, 0, 360, 178);
  context.fillStyle = "#111b21";
  context.font = "900 46px Impact, Arial Black, sans-serif";
  context.fillText("OFF AIR", 1310, 92);
  context.font = "18px ui-monospace, monospace";
  context.fillText(`${cut.shots.length} CUTS / ONE NIGHT`, 1282, 132);
  fitImage(context, plate, 72, 235, 930, 525);
  context.strokeStyle = "#111b21";
  context.lineWidth = 8;
  context.strokeRect(68, 231, 938, 533);
  context.fillStyle = "#111b21";
  context.fillRect(72, 786, 930, 54);
  context.fillStyle = "#f3ecdc";
  context.font = "18px ui-monospace, monospace";
  context.fillText("YOUR EXACT EDITED BROADCAST PLATE", 94, 820);
  context.fillStyle = "#111b21";
  context.fillRect(1050, 235, 478, 746);
  context.fillStyle = "#efeadc";
  context.font = "20px ui-monospace, monospace";
  context.fillText("THE CUT YOU CHOSE", 1090, 290);
  context.fillStyle = "#e86151";
  context.font = "900 50px Impact, Arial Black, sans-serif";
  wrap(context, ending(cut).toUpperCase(), 1090, 360, 395, 58, 4);
  context.fillStyle = "#b9c3b9";
  context.font = "22px Georgia, serif";
  wrap(
    context,
    cut.pressure === "air"
      ? "You put the warning on record. The city heard the threat and the picture."
      : "You kept the source out of frame. The picture crossed the city without giving them a face.",
    1090,
    610,
    390,
    34,
    5,
  );
  fitImage(context, finalFrame, 1090, 770, 398, 224);
  context.strokeStyle = "#efe7d4";
  context.lineWidth = 3;
  context.strokeRect(1090, 770, 398, 224);
  context.fillStyle = "#111b21";
  context.font = "18px ui-monospace, monospace";
  context.fillText("YOUR COAST. YOUR CUT.", 72, 1080);
  context.fillText("EDITED WITH UNLAYER REACT IMAGE EDITOR", 72, 1116);
  context.textAlign = "right";
  context.fillText("INDEPENDENT COASTAL TELEVISION / MARLIN KEY", 1528, 1116);
  context.textAlign = "left";
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))),
      "image/png",
    ),
  );
}
