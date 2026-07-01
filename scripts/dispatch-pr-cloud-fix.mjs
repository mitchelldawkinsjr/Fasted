#!/usr/bin/env node
/**
 * One-shot cloud agent fix for review findings (no /agent comment required).
 * Env: PR_NUMBER, REPO, CURSOR_API_KEY, GH_TOKEN
 */
import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { Agent, CursorAgentError } from "@cursor/sdk";

const prNumber = process.env.PR_NUMBER;
const repo = process.env.REPO;
const apiKey = process.env.CURSOR_API_KEY;
const ghToken = process.env.GH_TOKEN;

if (!prNumber || !repo || !apiKey || !ghToken) {
  console.error("Missing PR_NUMBER, REPO, CURSOR_API_KEY, or GH_TOKEN");
  process.exit(1);
}

const repoUrl = `https://github.com/${repo}`;

function gh(args) {
  return execSync(`gh ${args}`, {
    encoding: "utf-8",
    env: { ...process.env, GH_TOKEN: ghToken },
  });
}

const pr = JSON.parse(
  gh(`pr view ${prNumber} --repo ${repo} --json title,body,headRefName,url,comments`)
);

const context = await readFile(".github/ai-agent-fix-context.md", "utf-8");

const REVIEW_HEADERS = {
  bugbot: "## Bugbot review",
  ponytail: "## Ponytail review",
};

function extractReviewBlock(body, header) {
  if (!body?.includes(header)) return "";
  const blockMatch = body.match(
    /REVIEW_COMMENT_START\s*\n([\s\S]*?)\nREVIEW_COMMENT_END/
  );
  if (blockMatch?.[1]?.includes(header)) return blockMatch[1].trim();
  const headerIndex = body.indexOf(header);
  if (headerIndex === -1) return "";
  const statusIndex = body.indexOf("REVIEW_STATUS=", headerIndex);
  return (statusIndex === -1
    ? body.slice(headerIndex)
    : body.slice(headerIndex, statusIndex)
  ).trim();
}

function scrapeFindings(comments, header) {
  const parts = [];
  for (const comment of comments) {
    const block = extractReviewBlock(comment.body ?? "", header);
    if (block) parts.push(block);
  }
  return parts.join("\n\n---\n\n");
}

const bugbotFindings = scrapeFindings(pr.comments ?? [], REVIEW_HEADERS.bugbot);
const ponytailFindings = scrapeFindings(
  pr.comments ?? [],
  REVIEW_HEADERS.ponytail
);

const prompt = `${context}

---

## Automated fix pass (one attempt)

**PR:** ${pr.url}
**Number:** #${prNumber}
**Branch:** \`${pr.headRefName}\`

Fix all in-scope Bugbot correctness findings and reasonable Ponytail bloat findings from the review comments below. Push to the existing branch. Do not open a new PR. Post a PR summary comment when done.

### Bugbot findings
${bugbotFindings || "(none scraped)"}

### Ponytail findings
${ponytailFindings || "(none scraped)"}
`;

let agent;
try {
  agent = await Agent.create({
    apiKey,
    model: { id: "composer-2.5" },
    cloud: {
      repos: [{ url: repoUrl, startingRef: pr.headRefName }],
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
  console.log("Auto-fix agent started:", {
    agentId: agent.agentId,
    runId: run.id,
    pr: prNumber,
  });

  gh(
    `pr comment ${prNumber} --repo ${repo} --body "🤖 **Auto-fix agent started** (one attempt). Track: [cursor.com/agents](https://cursor.com/agents)"`
  );
} catch (err) {
  if (err instanceof CursorAgentError) {
    console.error("Auto-fix agent failed:", err.message);
    process.exit(1);
  }
  throw err;
} finally {
  if (agent) await agent[Symbol.asyncDispose]();
}
