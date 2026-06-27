#!/usr/bin/env node
/**
 * Dispatches full issue implementation to a Cursor Automation webhook.
 * Backup for issue-implement.yml when cloud agent quota is exhausted.
 *
 * Env: ISSUE_NUMBER, REPO, GH_TOKEN,
 *      CURSOR_AUTOMATION_WEBHOOK_URL, CURSOR_AUTOMATION_WEBHOOK_AUTH (optional)
 */
import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { postCursorAutomation } from "./lib/post-cursor-automation.mjs";
import { loadConfig } from "./load-config.mjs";

const issueNumber = process.env.ISSUE_NUMBER;
const repo = process.env.REPO;
const ghToken = process.env.GH_TOKEN;

if (!issueNumber || !repo || !ghToken) {
  console.error("Missing required env: ISSUE_NUMBER, REPO, GH_TOKEN");
  process.exit(1);
}

function gh(args) {
  return execSync(`gh ${args}`, {
    encoding: "utf-8",
    env: { ...process.env, GH_TOKEN: ghToken },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

const config = await loadConfig();
const defaultBranch =
  process.env.DEFAULT_BRANCH ||
  config.agent.startingRef ||
  config.project.defaultBranch ||
  "main";

const issue = JSON.parse(
  gh(`issue view ${issueNumber} --repo ${repo} --json title,body,comments,url`)
);

const implementContext = await readFile(".github/ai-implement-context.md", "utf-8");

const commentBodies = (issue.comments ?? [])
  .map((c) => c.body)
  .filter(Boolean)
  .join("\n\n---\n\n");

const payload = {
  jobType: "issue-implement",
  issueNumber: Number(issueNumber),
  issueUrl: issue.url,
  issueTitle: issue.title,
  issueBody: issue.body ?? "",
  comments: commentBodies,
  repo,
  defaultBranch,
  implementContext,
};

console.log(
  "Dispatching Cursor Automation issue-implement for",
  repo,
  "issue",
  issueNumber
);

await postCursorAutomation(payload);
