#!/usr/bin/env node
/**
 * Aggressively re-encode PNG/JPEG screenshots. Keeps originals when compression would grow them.
 *
 * Usage: node scripts/compress-artifacts.mjs [--check] [dir ...]
 *   --check  Exit 1 if any file could still be shrunk (for CI).
 */
import { relative } from 'node:path';
import { stat } from 'node:fs/promises';
import { collectImagePaths, compressImagePaths, IMAGE_ROOTS } from './lib/compress-images.mjs';

const CHECK_ONLY = process.argv.includes('--check');
const extraRoots = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

async function totalImageBytes(paths) {
  let total = 0;
  for (const filePath of paths) {
    total += (await stat(filePath)).size;
  }
  return total;
}

async function main() {
  const roots = extraRoots.length > 0 ? extraRoots : IMAGE_ROOTS;
  let paths = await collectImagePaths(roots);

  if (paths.length === 0) {
    console.log(`No screenshot images found under: ${roots.join(', ')}`);
    return;
  }

  const totalBefore = await totalImageBytes(paths);
  const changed = [];

  if (CHECK_ONLY) {
    changed.push(...(await compressImagePaths(paths, { checkOnly: true })).filter((r) => r.changed));
  } else {
    for (let pass = 1; pass <= 5; pass++) {
      paths = await collectImagePaths(roots);
      const passResults = (await compressImagePaths(paths, { checkOnly: false })).filter(
        (r) => r.changed,
      );
      changed.push(...passResults);
      if (passResults.length === 0) break;
    }
  }

  const totalAfter = CHECK_ONLY
    ? totalBefore - changed.reduce((sum, result) => sum + result.saved, 0)
    : await totalImageBytes(await collectImagePaths(roots));

  for (const result of changed.sort((a, b) => b.saved - a.saved)) {
    const name = relative(process.cwd(), result.filePath);
    console.log(
      `${CHECK_ONLY ? 'would shrink' : 'compressed'} ${name}: ${formatBytes(result.beforeBytes)} -> ${formatBytes(result.afterBytes)} (-${formatBytes(result.saved)})`,
    );
  }

  const totalSaved = totalBefore - totalAfter;
  console.log('');
  console.log(
    `${CHECK_ONLY ? 'Check' : 'Done'}: ${changed.length}/${paths.length} files ${CHECK_ONLY ? 'need' : ''} compression`,
  );
  console.log(
    `Total: ${formatBytes(totalBefore)} -> ${formatBytes(totalAfter)} (-${formatBytes(totalSaved)}, ${totalBefore ? Math.round((totalSaved / totalBefore) * 100) : 0}%)`,
  );

  if (CHECK_ONLY && changed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
