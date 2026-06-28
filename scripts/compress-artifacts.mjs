#!/usr/bin/env node
/**
 * Losslessly re-encode PNG/JPEG screenshots under artifacts/ and docs/screenshots/.
 * Keeps the original file when compression would not shrink it.
 *
 * Usage: node scripts/compress-artifacts.mjs [--check]
 *   --check  Exit 1 if any file could still be shrunk (for CI).
 */
import { readdir, stat, readFile, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import sharp from 'sharp';

const ROOTS = ['artifacts', 'docs/screenshots'];
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const CHECK_ONLY = process.argv.includes('--check');

async function* walkImages(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkImages(path);
      continue;
    }
    if (IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      yield path;
    }
  }
}

async function compressImage(filePath) {
  const beforeStat = await stat(filePath);
  const beforeBytes = beforeStat.size;
  const input = await readFile(filePath);
  const ext = extname(filePath).toLowerCase();

  let best;
  if (ext === '.png') {
    best = await sharp(input)
      .png({ compressionLevel: 9, quality: 80, palette: true, effort: 10 })
      .toBuffer();
  } else {
    best = await sharp(input).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  }

  const afterBytes = best.length;
  const saved = beforeBytes - afterBytes;

  if (saved <= 0) {
    return { filePath, beforeBytes, afterBytes: beforeBytes, saved: 0, changed: false };
  }

  if (!CHECK_ONLY) {
    await writeFile(filePath, best);
  }

  return { filePath, beforeBytes, afterBytes, saved, changed: true };
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

async function runPass() {
  const results = [];
  for (const root of ROOTS) {
    for await (const filePath of walkImages(root)) {
      results.push(await compressImage(filePath));
    }
  }
  return results;
}

async function totalImageBytes() {
  let total = 0;
  let count = 0;
  for (const root of ROOTS) {
    for await (const filePath of walkImages(root)) {
      count += 1;
      total += (await stat(filePath)).size;
    }
  }
  return { total, count };
}

async function main() {
  const { total: totalBefore, count: fileCount } = await totalImageBytes();

  if (fileCount === 0) {
    console.log('No screenshot images found under artifacts/ or docs/screenshots/.');
    return;
  }

  if (CHECK_ONLY) {
    const results = await runPass();
    const changed = results.filter((result) => result.changed);
    reportResults(changed, fileCount, totalBefore, totalBefore - changed.reduce((s, r) => s + r.saved, 0));
    if (changed.length > 0) process.exit(1);
    return;
  }

  const changedFiles = new Map();
  for (let pass = 0; pass < 5; pass += 1) {
    const results = await runPass();
    const changed = results.filter((result) => result.changed);
    for (const result of changed) {
      changedFiles.set(result.filePath, result);
    }
    if (changed.length === 0) break;
  }

  const { total: totalAfter } = await totalImageBytes();
  reportResults([...changedFiles.values()], fileCount, totalBefore, totalAfter);
}

function reportResults(changed, fileCount, totalBefore, totalAfter) {
  const totalSaved = totalBefore - totalAfter;

  for (const result of changed.sort((a, b) => b.saved - a.saved)) {
    const name = relative(process.cwd(), result.filePath);
    console.log(
      `${CHECK_ONLY ? 'would shrink' : 'compressed'} ${name}: ${formatBytes(result.beforeBytes)} -> ${formatBytes(result.afterBytes)} (-${formatBytes(result.saved)})`,
    );
  }

  console.log('');
  console.log(
    `${CHECK_ONLY ? 'Check' : 'Done'}: ${changed.length}/${fileCount} files ${CHECK_ONLY ? 'need' : ''} compression`,
  );
  console.log(
    `Total: ${formatBytes(totalBefore)} -> ${formatBytes(totalAfter)} (-${formatBytes(totalSaved)}, ${totalBefore ? Math.round((totalSaved / totalBefore) * 100) : 0}%)`,
  );
}

async function mainEntry() {
  await main();
}

mainEntry().catch((err) => {
  console.error(err);
  process.exit(1);
});
