#!/usr/bin/env node
/**
 * Dispatches a PR fix job to a Cursor Automation webhook.
 * Called from .github/workflows/pr-agent-fix.yml when someone comments /agent on a PR.
 *
 * Env: PR_NUMBER, INSTRUCTION, REPO, GH_TOKEN,
 *      CURSOR_AUTOMATION_WEBHOOK_URL, CURSOR_AUTOMATION_WEBHOOK_AUTH (optional)
 */
import { execSync } from "node:child_process";

const prNumber = process.env.PR_NUMBER;
const instruction = process.env.INSTRUCTION;
const repo = process.env.REPO;
const ghToken = process.env.GH_TOKEN;
const webhookUrl = process.env.CURSOR_AUTOMATION_WEBHOOK_URL;
const webhookAuth = process.env.CURSOR_AUTOMATION_WEBHOOK_AUTH;

const REVIEW_HEADERS = {
  bugbot: "## Bugbot review",
  ponytail: "## Ponytail review",
};

if (!prNumber || !instruction || !repo || !ghToken) {
  console.error(
    "Missing required env: PR_NUMBER, INSTRUCTION, REPO, GH_TOKEN"
  );
  process.exit(1);
}

if (!webhookUrl) {
  console.error(
    "CURSOR_AUTOMATION_WEBHOOK_URL is not configured. Save the Cursor Automation and add the webhook URL under Settings → Secrets → Actions."
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

function extractReviewBlock(body, header) {
  if (!body?.includes(header)) return "";

  const blockMatch = body.match(
    /REVIEW_COMMENT_START\s*\n([\s\S]*?)\nREVIEW_COMMENT_END/
  );
  if (blockMatch?.[1]?.includes(header)) {
    return blockMatch[1].trim();
  }

  const headerIndex = body.indexOf(header);
  if (headerIndex === -1) return "";

  const statusIndex = body.indexOf("REVIEW_STATUS=", headerIndex);
  const slice =
    statusIndex === -1
      ? body.slice(headerIndex)
      : body.slice(headerIndex, statusIndex);
  return slice.trim();
}

function scrapeFindings(comments, header) {
  const parts = [];
  for (const comment of comments) {
    const block = extractReviewBlock(comment.body ?? "", header);
    if (block) parts.push(block);
  }
  return parts.join("\n\n---\n\n");
}

function resolveIssueNumber(prBody, prTitle) {
  if (prBody) {
    const match = prBody.match(
      /(?:fixes|closes|resolves)[\s#]+#?(\d+)/i
    );
    if (match) return match[1];
  }
  if (prTitle) {
    const match = prTitle.match(/#(\d+)/);
    if (match) return match[1];
  }
  return "";
}

const pr = JSON.parse(
  gh(
    `pr view ${prNumber} --repo ${repo} --json title,body,headRefName,url,comments`
  )
);

const bugbotFindings = scrapeFindings(
  pr.comments ?? [],
  REVIEW_HEADERS.bugbot
);
const ponytailFindings = scrapeFindings(
  pr.comments ?? [],
  REVIEW_HEADERS.ponytail
);
const issueNumber = resolveIssueNumber(pr.body, pr.title);

const payload = {
  prNumber: Number(prNumber),
  branch: pr.headRefName,
  prUrl: pr.url,
  instruction: instruction.trim(),
  issueNumber: issueNumber ? Number(issueNumber) : null,
  bugbotFindings,
  ponytailFindings,
  repo,
};

const headers = {
  "Content-Type": "application/json",
};

if (webhookAuth) {
  headers.Authorization = webhookAuth.startsWith("Bearer ")
    ? webhookAuth
    : `Bearer ${webhookAuth}`;
}

console.log("Dispatching Cursor Automation for PR", prNumber, "branch", pr.headRefName);

const response = await fetch(webhookUrl, {
  method: "POST",
  headers,
  body: JSON.stringify(payload),
});

if (!response.ok) {
  const text = await response.text().catch(() => "");
  console.error(
    `Webhook failed: HTTP ${response.status} ${response.statusText}`,
    text.slice(0, 500)
  );
  process.exit(1);
}

console.log("Cursor Automation webhook accepted:", response.status);
