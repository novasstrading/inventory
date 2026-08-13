"use client";

import QRCode from "qrcode";
import { withBasePath } from "@/lib/base-path";
import type { Asset } from "@/lib/types";

/**
 * Client-side canvas rendering of the physical sticker — ported 1:1 from the legacy
 * renderStickerCanvas() (vercel-deploy/index.html), same 340x150 layout at 4x scale,
 * same navy/gold brand styling. The `qrcode` npm package replaces the bundled
 * qrcode.min.js but encodes the identical JSON payload.
 */

function buildQrData(asset: Asset, label: string): string {
  const o: Record<string, string> = { code: asset.code ?? "", name: asset.name, category: asset.category };
  if (asset.brandModel) o.model = asset.brandModel;
  if (asset.serial) o.serial = asset.serial;
  if (label) o.label = label;
  return JSON.stringify(o);
}

function clip(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let t = text;
  while (ctx.measureText(t).width > maxWidth && t.length > 3) t = t.slice(0, -1);
  return t === text ? t : `${t.slice(0, -1)}…`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the Nova SS logo."));
    img.src = src;
  });
}

export async function renderStickerCanvas(asset: Asset, label: string): Promise<HTMLCanvasElement> {
  const SC = 4;
  const W = 340;
  const H = 150;
  const canvas = document.createElement("canvas");
  canvas.width = W * SC;
  canvas.height = H * SC;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.scale(SC, SC);

  const qrCanvas = document.createElement("canvas");
  const [, logoImg] = await Promise.all([
    QRCode.toCanvas(qrCanvas, buildQrData(asset, label), {
      width: 96 * SC,
      margin: 0,
      errorCorrectionLevel: "M",
    }),
    loadImage(withBasePath("/logo-icon.png")),
  ]);

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#001E46";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
  ctx.fillStyle = "#001E46";
  ctx.fillRect(2, 2, W - 4, 26);
  ctx.fillStyle = "#fff";
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("NOVA SS TRADING", 10, 16);

  // Logo mark, top-right of the header bar — on a white badge since the logo's
  // navy strokes would disappear directly against the navy header background.
  const badgeSize = 20;
  const badgeX = W - 8 - badgeSize;
  const badgeY = 2 + (26 - badgeSize) / 2;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 4);
  ctx.fill();
  const pad = 3;
  const logoAspect = logoImg.width / logoImg.height;
  let drawW = badgeSize - pad * 2;
  let drawH = drawW / logoAspect;
  if (drawH > badgeSize - pad * 2) {
    drawH = badgeSize - pad * 2;
    drawW = drawH * logoAspect;
  }
  ctx.drawImage(logoImg, badgeX + (badgeSize - drawW) / 2, badgeY + (badgeSize - drawH) / 2, drawW, drawH);

  ctx.drawImage(qrCanvas, 10, 36, 100, 100);

  const x = 122;
  ctx.fillStyle = "#001E46";
  ctx.font = '800 19px "SF Mono", monospace';
  ctx.textBaseline = "alphabetic";
  ctx.fillText(asset.code ?? "", x, 58);
  let y = 58;
  if (label) {
    y += 18;
    ctx.fillStyle = "#BE9646";
    ctx.font = "700 11px Inter, sans-serif";
    ctx.fillText(label.toUpperCase(), x, y);
  }
  y += 17;
  ctx.fillStyle = "#222";
  ctx.font = "400 12px Inter, sans-serif";
  ctx.fillText(clip(ctx, asset.name, W - x - 12), x, y);
  y += 15;
  ctx.fillStyle = "#666";
  ctx.font = "400 10px Inter, sans-serif";
  ctx.fillText(asset.category.toUpperCase(), x, y);
  if (asset.serial) {
    y += 14;
    ctx.fillStyle = "#555";
    ctx.font = '400 9px "SF Mono", monospace';
    ctx.fillText(`SN: ${clip(ctx, asset.serial, W - x - 12)}`, x, y);
  }
  ctx.fillStyle = "#999";
  ctx.font = "400 8px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Property of Nova SS Trading · do not remove", W / 2, H - 7);
  ctx.textAlign = "left";

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not render the sticker image."))), "image/png");
  });
}
