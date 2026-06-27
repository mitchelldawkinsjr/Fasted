#!/usr/bin/env node
/**
 * Dispatches a Cursor cloud agent to implement a GitHub issue.
 * Synced from @issue-bench/dispatch v0.2.0 — update via issue-bench release or npx issue-bench init.
 */
import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent, CursorAgentError } from "@cursor/sdk";
import { loadConfig } from "./load-config.mjs";

const issueNumber = process.env.ISSUE_NUMBER;
const repo = process.env.REPO;
const apiKey = process.env.CURSOR_API_KEY;
const ghToken = process.env.GH_TOKEN;

if (!issueNumber || !repo || !apiKey || !ghToken) {
  console.error(
    "Missing required env: ISSUE_NUMBER, REPO, CURSOR_API_KEY, GH_TOKEN"
  );
  process.exit(1);
}

const config = await loadConfig();
const defaultBranch =
  process.env.DEFAULT_BRANCH ||
  config.agent.startingRef ||
  config.project.defaultBranch ||
  "main";

const issueUrl = `https://github.com/${repo}/issues/${issueNumber}`;
const repoUrl = `https://github.com/${repo}`;

function gh(args) {
  return execSync(`gh ${args}`, {
    encoding: "utf-8",
    env: { ...process.env, GH_TOKEN: ghToken },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

async function ghIssueComment(body) {
  const tmp = join(tmpdir(), `issue-${issueNumber}-comment.md`);
  await writeFile(tmp, body, "utf-8");
  gh(`issue comment ${issueNumber} --repo ${repo} --body-file ${tmp}`);
}

function applyTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

const issue = JSON.parse(
  gh(`issue view ${issueNumber} --repo ${repo} --json title,body,labels,comments`)
);

const context = await readFile(".github/ai-implement-context.md", "utf-8");

const commentBodies = (issue.comments ?? [])
  .map((c) => c.body)
  .filter(Boolean)
  .join("\n\n---\n\n");

const reminders = applyTemplate(config.prompt.postImplementReminders, {
  N: issueNumber,
});

const prompt = `${context}

---

## Issue to implement

**URL:** ${issueUrl}
**Number:** #${issueNumber}
**Title:** ${issue.title}

### Issue body
${issue.body ?? "(empty)"}

### Comments (includes spec / acceptance criteria)
${commentBodies || "(no comments yet — read the issue body carefully)"}

Implement this issue now.

**Critical reminders:**
${reminders
  .split("\n")
  .map((line) => (line.startsWith("-") ? line : `- ${line}`))
  .join("\n")}
`;

const { agentWorking, agentFailed, ready } = config.labels;

let agent;
try {
  agent = await Agent.create({
    apiKey,
    model: { id: config.agent.model },
    cloud: {
      repos: [{ url: repoUrl, startingRef: defaultBranch }],
      autoCreatePR: true,
      skipReviewerRequest: true,
      envVars: {
        GH_TOKEN: ghToken,
      },
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
  console.log("Cloud agent started:", {
    agentId: agent.agentId,
    runId: run.id,
    issue: issueNumber,
  });

  await ghIssueComment(
    `🤖 **Cursor cloud agent started** for this issue.

- **Agent ID:** \`${agent.agentId}\`
- **Run ID:** \`${run.id}\`
- **Track progress:** [cursor.com/agents](https://cursor.com/agents)

${config.prompt.agentStartedComment}`
  );
} catch (err) {
  if (err instanceof CursorAgentError) {
    console.error("Failed to start cloud agent:", err.message);
    try {
      gh(
        `issue edit ${issueNumber} --repo ${repo} --remove-label ${agentWorking} --add-label ${agentFailed} --add-label ${ready}`
      );
      await ghIssueComment(
        `❌ Cursor cloud agent **failed to start**: ${err.message}

Re-add the \`${ready}\` label after fixing the blocker (API key, repo access, etc.).`
      );
    } catch (ghErr) {
      console.error("Failed to update issue after agent error:", ghErr);
    }
    process.exit(1);
  }
  throw err;
} finally {
  if (agent) {
    await agent[Symbol.asyncDispose]();
  }
}
