#!/usr/bin/env node
/**
 * Dispatches a specialist read-only review agent (architecture|ui|a11y|security).
 * Env: SPECIALIST_TYPE, PR_NUMBER, PR_HEAD_REF, REPO, CURSOR_API_KEY
 */
import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { Agent, CursorAgentError } from "@cursor/sdk";

const CONTEXT_FILES = {
  architecture: ".github/agent-context/architecture-context.md",
  ui: ".github/agent-context/ui-context.md",
  a11y: ".github/agent-context/a11y-context.md",
  security: ".github/agent-context/security-context.md",
};

const specialistType = process.env.SPECIALIST_TYPE;
const prNumber = process.env.PR_NUMBER;
const prHeadRef = process.env.PR_HEAD_REF;
const repo = process.env.REPO;
const apiKey = process.env.CURSOR_API_KEY;

if (!specialistType || !CONTEXT_FILES[specialistType]) {
  console.error("SPECIALIST_TYPE must be one of:", Object.keys(CONTEXT_FILES).join(", "));
  process.exit(1);
}
if (!prNumber || !prHeadRef || !repo || !apiKey) {
  console.error("Missing PR_NUMBER, PR_HEAD_REF, REPO, or CURSOR_API_KEY");
  process.exit(1);
}

const repoUrl = `https://github.com/${repo}`;
const prUrl = `${repoUrl}/pull/${prNumber}`;

function gh(args) {
  return execSync(`gh ${args}`, {
    encoding: "utf-8",
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

const pr = JSON.parse(
  gh(`pr view ${prNumber} --repo ${repo} --json title,body,baseRefName`)
);

const context = await readFile(CONTEXT_FILES[specialistType], "utf-8");

const prompt = `${context}

---

## Pull request to review

**URL:** ${prUrl}
**Number:** #${prNumber}
**Head branch:** \`${prHeadRef}\`
**Base:** \`${pr.baseRefName ?? "main"}\`
**Title:** ${pr.title}

### PR body
${pr.body ?? "(empty)"}

Review this PR now. Read-only — do not modify code.
`;

let agent;
try {
  agent = await Agent.create({
    apiKey,
    model: { id: "composer-2.5" },
    cloud: {
      repos: [{ url: repoUrl, startingRef: prHeadRef }],
      autoCreatePR: false,
      skipReviewerRequest: true,
    },
  });

  console.log(`Starting ${specialistType} specialist review for PR #${prNumber}`);
  const run = await agent.send(prompt);
  const result = await run.wait();
  console.log({ specialistType, status: result.status, runId: run.id });
  if (result.status === "error") process.exit(2);
} catch (err) {
  if (err instanceof CursorAgentError) {
    console.error("Specialist agent failed:", err.message);
    process.exit(1);
  }
  throw err;
} finally {
  if (agent) await agent[Symbol.asyncDispose]();
}
