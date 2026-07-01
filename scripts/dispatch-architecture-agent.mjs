#!/usr/bin/env node
/**
 * Dispatches Architecture Agent for an issue via Cursor cloud agent.
 * Env: ISSUE_NUMBER, REPO, CURSOR_API_KEY, GH_TOKEN
 */
import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { Agent, CursorAgentError } from "@cursor/sdk";

const issueNumber = process.env.ISSUE_NUMBER;
const repo = process.env.REPO;
const apiKey = process.env.CURSOR_API_KEY;
const ghToken = process.env.GH_TOKEN;

if (!issueNumber || !repo || !apiKey || !ghToken) {
  console.error("Missing ISSUE_NUMBER, REPO, CURSOR_API_KEY, or GH_TOKEN");
  process.exit(1);
}

const repoUrl = `https://github.com/${repo}`;

function gh(args) {
  return execSync(`gh ${args}`, {
    encoding: "utf-8",
    env: { ...process.env, GH_TOKEN: ghToken },
  });
}

const issue = JSON.parse(
  gh(`issue view ${issueNumber} --repo ${repo} --json title,body,comments,url`)
);

const context = await readFile(
  ".github/agent-context/architecture-context.md",
  "utf-8"
);

const comments = (issue.comments ?? [])
  .map((c) => c.body)
  .filter(Boolean)
  .join("\n\n---\n\n");

const prompt = `${context}

---

## Issue to review

**URL:** ${issue.url}
**Number:** #${issueNumber}
**Title:** ${issue.title}

### Issue body
${issue.body ?? "(empty)"}

### Comments
${comments || "(none)"}

Post architecture review comment on the issue and update labels per your workflow.
`;

let agent;
try {
  agent = await Agent.create({
    apiKey,
    model: { id: "composer-2.5" },
    cloud: {
      repos: [{ url: repoUrl, startingRef: "main" }],
      autoCreatePR: false,
      skipReviewerRequest: true,
      envVars: { GH_TOKEN: ghToken },
    },
    mcpServers: {
      github: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: { GITHUB_TOKEN: ghToken },
      },
    },
  });

  const run = await agent.send(prompt);
  console.log("Architecture agent started:", { agentId: agent.agentId, runId: run.id });
} catch (err) {
  if (err instanceof CursorAgentError) {
    console.error("Architecture agent failed:", err.message);
    process.exit(1);
  }
  throw err;
} finally {
  if (agent) await agent[Symbol.asyncDispose]();
}
