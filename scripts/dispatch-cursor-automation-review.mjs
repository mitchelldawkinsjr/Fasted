#!/usr/bin/env node
/**
 * Dispatches Bugbot + Ponytail PR review to Cursor Automation webhook.
 * Backup for pr-review.yml when cloud agent quota is exhausted.
 *
 * Env: PR_NUMBER, PR_HEAD_REF, ISSUE_NUMBER, REPO, GH_TOKEN,
 *      CURSOR_AUTOMATION_WEBHOOK_URL, CURSOR_AUTOMATION_WEBHOOK_AUTH (optional)
 */
import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { postCursorAutomation } from "./lib/post-cursor-automation.mjs";

const prNumber = process.env.PR_NUMBER;
const prHeadRef = process.env.PR_HEAD_REF;
const issueNumber = process.env.ISSUE_NUMBER;
const repo = process.env.REPO;
const ghToken = process.env.GH_TOKEN;

if (!prNumber || !prHeadRef || !issueNumber || !repo || !ghToken) {
  console.error(
    "Missing required env: PR_NUMBER, PR_HEAD_REF, ISSUE_NUMBER, REPO, GH_TOKEN"
  );
  process.exit(1);
}

function gh(args) {
  return execSync(`gh ${args}`, {
    encoding: "utf-8",
    env: { ...process.env, GH_TOKEN: ghToken },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

const pr = JSON.parse(
  gh(`pr view ${prNumber} --repo ${repo} --json title,body,baseRefName,url`)
);

const [bugbotContext, ponytailContext, reviewContext] = await Promise.all([
  readFile(".github/ai-bugbot-context.md", "utf-8"),
  readFile(".github/ai-ponytail-review-context.md", "utf-8"),
  readFile(".github/ai-agent-review-context.md", "utf-8"),
]);

const payload = {
  jobType: "pr-review",
  prNumber: Number(prNumber),
  branch: prHeadRef,
  prUrl: pr.url,
  issueNumber: Number(issueNumber),
  repo,
  baseBranch: pr.baseRefName ?? "main",
  prTitle: pr.title,
  prBody: pr.body ?? "",
  bugbotContext,
  ponytailContext,
  reviewContext,
};

console.log(
  "Dispatching Cursor Automation pr-review for PR",
  prNumber,
  "issue",
  issueNumber
);

await postCursorAutomation(payload);
