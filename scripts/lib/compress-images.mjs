import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import sharp from 'sharp';

/** Dirs scanned by `npm run compress:artifacts` (committed or local QA images). */
export const IMAGE_ROOTS = [
  'artifacts',
  'docs/screenshots',
  'docs/journal-export-design',
  'e2e/visual',
  'e2e/fixtures',
];

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

const PNG_OPTIONS = {
  compressionLevel: 9,
  quality: 65,
  palette: true,
  effort: 10,
};

const JPEG_OPTIONS = {
  quality: 80,
  mozjpeg: true,
};

/** Ignore sub-threshold savings so CI check stays stable across OS/libpng re-runs. */
export const MIN_COMPRESS_SAVINGS_BYTES = 1024;

export async function* walkImages(dir) {
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

export async function collectImagePaths(roots = IMAGE_ROOTS) {
  const paths = [];
  for (const root of roots) {
    for await (const filePath of walkImages(root)) {
      paths.push(filePath);
    }
  }
  return paths;
}

export async function compressImageBuffer(input, ext) {
  if (ext === '.png') {
    return sharp(input).png(PNG_OPTIONS).toBuffer();
  }
  return sharp(input).jpeg(JPEG_OPTIONS).toBuffer();
}

export async function compressImageFile(filePath, { checkOnly = false } = {}) {
  const beforeStat = await stat(filePath);
  const beforeBytes = beforeStat.size;
  const input = await readFile(filePath);
  const ext = extname(filePath).toLowerCase();
  const best = await compressImageBuffer(input, ext);
  const afterBytes = best.length;
  const saved = beforeBytes - afterBytes;

  if (saved <= 0) {
    return { filePath, beforeBytes, afterBytes: beforeBytes, saved: 0, changed: false };
  }

  if (saved < MIN_COMPRESS_SAVINGS_BYTES) {
    return { filePath, beforeBytes, afterBytes: beforeBytes, saved: 0, changed: false };
  }

  if (!checkOnly) {
    await writeFile(filePath, best);
  }

  return { filePath, beforeBytes, afterBytes, saved, changed: true };
}

export async function compressImagePaths(paths, { checkOnly = false } = {}) {
  const results = [];
  for (const filePath of paths) {
    results.push(await compressImageFile(filePath, { checkOnly }));
  }
  return results;
}

export async function compressRoots(roots = IMAGE_ROOTS, { checkOnly = false } = {}) {
  const paths = await collectImagePaths(roots);
  return compressImagePaths(paths, { checkOnly });
}
