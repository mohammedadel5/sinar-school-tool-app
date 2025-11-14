#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');

async function resizeWithJimp(basePath, sizes) {
  const Jimp = require('jimp');
  const image = await Jimp.read(basePath);
  const out = [];
  for (const s of sizes) {
    const clone = image.clone();
    // Force exact s x s to satisfy ICO constraints and avoid >255 metadata
    clone.resize(s, s);
    const buf = await clone.getBufferAsync(Jimp.MIME_PNG);
    out.push(buf);
  }
  return out;
}

async function resizeWithSharp(baseBuffer, sizes) {
  const sharp = require('sharp');
  const out = [];
  for (const s of sizes) {
    const buf = await sharp(baseBuffer)
      .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    out.push(buf);
  }
  return out;
}

async function main() {
  const srcPng = path.resolve(__dirname, '..', 'build', 'icon.png');
  const outIco = path.resolve(__dirname, '..', 'build', 'icon.ico');
  if (!fs.existsSync(srcPng)) {
    console.error('Source PNG not found at', srcPng);
    process.exit(1);
  }

  const sizes = [256, 128, 64, 48, 32, 16];
  let buffers = null;

  // Prefer Jimp (pure JS) to avoid native builds on Windows
  try {
    buffers = await resizeWithJimp(srcPng, sizes);
  } catch (e) {
    try {
      const base = fs.readFileSync(srcPng);
      buffers = await resizeWithSharp(base, sizes);
    } catch (e2) {
      console.error('Failed to resize icon with Jimp or sharp. Aborting to avoid invalid ICO.');
      console.error(e2);
      process.exit(1);
    }
  }

  const ico = await toIco(buffers);
  fs.writeFileSync(outIco, ico);
  console.log('Wrote ICO to', outIco);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
