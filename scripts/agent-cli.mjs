#!/usr/bin/env node
/**
 * Local agent command center — thin router over dispatch scripts and npm tasks.
 *
 * Usage:
 *   npm run agent:issue -- 88 [--local]
 *   npm run agent:review -- 42 [--local]
 *   npm run agent:fix -- 42 "fix bugbot findings"
 *   npm run agent:test [--audit] [--visual]
 *   npm run agent:docs -- 88
 *   npm run agent:deploy
 */
import { spawnSync } from "node:child_process";
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function resolveRepo() {
  if (process.env.REPO) return process.env.REPO;
  try {
    return execSync("gh repo view --json nameWithOwner -q .nameWithOwner", {
      encoding: "utf-8",
      cwd: ROOT,
    }).trim();
  } catch {
    return "mitchelldawkinsjr/Fasted";
  }
}

function parseArgs(argv) {
  const positional = [];
  let local = false;
  let audit = false;
  let visual = false;
  for (const arg of argv) {
    if (arg === "--local") local = true;
    else if (arg === "--audit") audit = true;
    else if (arg === "--visual") visual = true;
    else if (!arg.startsWith("-")) positional.push(arg);
  }
  return { positional, local, audit, visual };
}

function runNode(script, env = {}) {
  const result = spawnSync("node", [join(ROOT, script)], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runNpm(script) {
  const result = spawnSync("npm", ["run", script], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function cmdIssue(args) {
  const { positional, local } = parseArgs(args);
  const issueNumber = positional[0];
  if (!issueNumber) {
    console.error("Usage: npm run agent:issue -- <issue-number> [--local]");
    process.exit(1);
  }
  const repo = resolveRepo();
  const env = { ISSUE_NUMBER: issueNumber, REPO: repo };
  if (local) {
    runNode("scripts/dispatch-cursor-automation-issue.mjs", env);
  } else {
    if (!process.env.CURSOR_API_KEY) {
      console.error("CURSOR_API_KEY required for cloud agent. Use --local for automation backup.");
      process.exit(1);
    }
    runNode("scripts/dispatch-cursor-agent.mjs", env);
  }
}

async function cmdReview(args) {
  const { positional, local } = parseArgs(args);
  const prNumber = positional[0];
  if (!prNumber) {
    console.error("Usage: npm run agent:review -- <pr-number> [--local]");
    process.exit(1);
  }
  const repo = resolveRepo();
  if (local) {
    runNode("scripts/dispatch-cursor-automation-review.mjs", {
      PR_NUMBER: prNumber,
      REPO: repo,
    });
    return;
  }
  const prHeadRef = execSync(
    `gh pr view ${prNumber} --repo ${repo} --json headRefName -q .headRefName`,
    { encoding: "utf-8", cwd: ROOT }
  ).trim();
  if (!process.env.CURSOR_API_KEY) {
    console.error("CURSOR_API_KEY required. Use --local for automation backup.");
    process.exit(1);
  }
  for (const reviewType of ["bugbot", "ponytail"]) {
    runNode("scripts/dispatch-pr-review.mjs", {
      REVIEW_TYPE: reviewType,
      PR_NUMBER: prNumber,
      PR_HEAD_REF: prHeadRef,
      REPO: repo,
    });
  }
}

async function cmdFix(args) {
  const { positional } = parseArgs(args);
  const prNumber = positional[0];
  const instruction = positional.slice(1).join(" ").trim();
  if (!prNumber || !instruction) {
    console.error('Usage: npm run agent:fix -- <pr-number> "<instruction>"');
    process.exit(1);
  }
  runNode("scripts/dispatch-cursor-automation.mjs", {
    PR_NUMBER: prNumber,
    INSTRUCTION: instruction,
    REPO: resolveRepo(),
  });
}

async function cmdTest(args) {
  const { audit, visual } = parseArgs(args);
  runNpm("build");
  runNpm("test:e2e");
  if (audit) runNpm("test:audit");
  if (visual) runNpm("test:visual");
}

async function cmdDocs(args) {
  const { positional } = parseArgs(args);
  const issueNumber = positional[0];
  const context = await readFile(
    join(ROOT, ".github/agent-context/docs-context.md"),
    "utf-8"
  );
  console.log(context);
  if (issueNumber) {
    console.log(`\n---\nDocumentation checklist for issue #${issueNumber}`);
    console.log("- Review PR for user-facing changes");
    console.log("- Update README / release notes / .env.example as needed");
    console.log("- Verify artifacts/issue-" + issueNumber + "/ screenshots (npm run capture:issue-screenshots -- " + issueNumber + ")");
  }
}

async function cmdDeploy() {
  runNpm("build");
  runNpm("test:e2e");
  runNpm("deploy:vps");
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case "issue":
    await cmdIssue(rest);
    break;
  case "review":
    await cmdReview(rest);
    break;
  case "fix":
    await cmdFix(rest);
    break;
  case "test":
    await cmdTest(rest);
    break;
  case "docs":
    await cmdDocs(rest);
    break;
  case "deploy":
    await cmdDeploy();
    break;
  default:
    console.error(`Unknown command: ${command ?? "(none)"}`);
    console.error("Commands: issue, review, fix, test, docs, deploy");
    process.exit(1);
}
