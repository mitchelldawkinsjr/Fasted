#!/usr/bin/env node
/**
 * Capture PR/issue screenshots and compress them in one step.
 *
 * Usage:
 *   node scripts/capture-issue-screenshots.mjs <issue> [scenario]
 *   npm run capture:issue-screenshots -- 140
 *   npm run capture:issue-screenshots -- 140 journal-focus-lightbox
 *
 * Options:
 *   --base-url=<url>   App URL (default: http://127.0.0.1:5173)
 *   --list             List registered scenarios
 *
 * Requires a running dev server (`npm run dev` or `npm run dev:seed`).
 * Output: artifacts/issue-{N}/ — compressed before exit (passes CI check).
 */
import { chromium } from '@playwright/test';
import {
  DEFAULT_BASE_URL,
  artifactDirForIssue,
  compressCapturedImages,
  createScreenshotHelper,
  ensureArtifactDir,
  waitForServer,
} from './lib/capture-screenshot-session.mjs';
import { getScenario, getScenariosForIssue, listScenarios } from './lib/capture-scenarios/index.mjs';

function parseArgs(argv) {
  let baseUrl = DEFAULT_BASE_URL;
  let list = false;
  const positional = [];

  for (const arg of argv) {
    if (arg === '--list') {
      list = true;
    } else if (arg.startsWith('--base-url=')) {
      baseUrl = arg.slice('--base-url='.length);
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return { baseUrl, list, issueNumber: positional[0], scenarioId: positional[1] };
}

function printScenarioList() {
  console.log('Registered capture scenarios:\n');
  for (const scenario of listScenarios()) {
    console.log(`  ${scenario.id}`);
    console.log(`    ${scenario.description}`);
    console.log(`    issues: ${scenario.issues.join(', ')}\n`);
  }
}

function printUsage() {
  console.log(`Usage: npm run capture:issue-screenshots -- <issue> [scenario]

Examples:
  npm run capture:issue-screenshots -- 140
  npm run capture:issue-screenshots -- 140 journal-focus-lightbox

Options:
  --base-url=<url>   Default: ${DEFAULT_BASE_URL}
  --list             List registered scenarios

Add a scenario under scripts/lib/capture-scenarios/ and register it in index.mjs.
`);
}

async function main() {
  const { baseUrl, list, issueNumber, scenarioId } = parseArgs(process.argv.slice(2));

  if (list) {
    printScenarioList();
    return;
  }

  if (!issueNumber) {
    printUsage();
    process.exit(1);
  }

  const scenarios = scenarioId
    ? [getScenario(scenarioId)]
    : getScenariosForIssue(issueNumber);

  if (scenarios.length === 0) {
    console.error(`No capture scenario registered for issue #${issueNumber}.`);
    console.error('Register one in scripts/lib/capture-scenarios/ or pass an explicit scenario id.\n');
    printScenarioList();
    process.exit(1);
  }

  const artifactDir = await ensureArtifactDir(issueNumber);
  await waitForServer(baseUrl);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const { paths, shot } = createScreenshotHelper(artifactDir);

  try {
    for (const scenario of scenarios) {
      console.log(`Capturing scenario: ${scenario.id}`);
      await scenario.capture({ page, baseUrl, shot, artifactDir });
    }
  } finally {
    await browser.close();
  }

  console.log(`\nSaved ${paths.length} screenshot(s) to ${artifactDir}`);
  await compressCapturedImages(paths);
  console.log('Done — safe to commit (CI compress:artifacts:check will pass).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
