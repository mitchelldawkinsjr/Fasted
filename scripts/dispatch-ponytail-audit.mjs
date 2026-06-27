#!/usr/bin/env node
/**
 * Dispatches a Cursor cloud agent for a full-repo Ponytail audit.
 * Called from .github/workflows/ponytail-audit.yml
 *
 * Env: REPO, CURSOR_API_KEY, GH_TOKEN
 * Optional: BASE_REF (default main), MANUAL (true for workflow_dispatch), RUN_URL
 */
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent, CursorAgentError } from "@cursor/sdk";

const repo = process.env.REPO;
const apiKey = process.env.CURSOR_API_KEY;
const ghToken = process.env.GH_TOKEN;
const baseRef = process.env.BASE_REF || "main";
const manual = process.env.MANUAL === "true";
const runUrl = process.env.RUN_URL || "";

if (!repo || !apiKey || !ghToken) {
  console.error("Missing required env: REPO, CURSOR_API_KEY, GH_TOKEN");
  process.exit(1);
}

const repoUrl = `https://github.com/${repo}`;
const date = new Date().toISOString().slice(0, 10);
const issueTitle = manual
  ? `Ponytail audit (manual) — ${date}`
  : `Ponytail audit — ${date}`;

function gh(args) {
  return execSync(`gh ${args}`, {
    encoding: "utf-8",
    env: { ...process.env, GH_TOKEN: ghToken },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function parseAuditOutput(text) {
  const statusMatch = text.match(/AUDIT_STATUS=(clean|findings)/);
  if (!statusMatch) {
    throw new Error("Agent output missing AUDIT_STATUS=clean|findings");
  }

  const blockMatch = text.match(
    /AUDIT_COMMENT_START\s*\n([\s\S]*?)\nAUDIT_COMMENT_END/
  );
  if (blockMatch) {
    const body = blockMatch[1].trim();
    if (!body) {
      throw new Error("Agent output had empty AUDIT_COMMENT block");
    }
    return { body, hasFindings: statusMatch[1] === "findings" };
  }

  const headerIndex = text.indexOf("## Ponytail repo audit");
  if (headerIndex !== -1) {
    const statusIndex = text.indexOf("AUDIT_STATUS=", headerIndex);
    const body =
      statusIndex === -1
        ? text.slice(headerIndex).trim()
        : text.slice(headerIndex, statusIndex).trim();
    if (body) {
      return { body, hasFindings: statusMatch[1] === "findings" };
    }
  }

  throw new Error(
    "Agent output missing AUDIT_COMMENT block (AUDIT_COMMENT_START/END)"
  );
}

async function createAuditIssue(body, hasFindings) {
  gh(
    'label create ponytail-audit --description "Full-repo Ponytail over-engineering audit" --color "5319E7" 2>/dev/null || true'
  );
  gh(
    'label create maintenance --description "Scheduled maintenance and audits" --color "FBCA04" 2>/dev/null || true'
  );

  const footer = [
    "",
    "---",
    `**Base ref:** \`${baseRef}\``,
    `**Status:** ${hasFindings ? "findings reported" : "lean"}`,
  ];
  if (runUrl) {
    footer.push(`**Actions run:** ${runUrl}`);
  }
  footer.push(
    "",
    "_Automated read-only audit. Triage findings into separate issues as needed._"
  );

  const issueBody = `${body}${footer.join("\n")}`;
  const dir = await mkdtemp(join(tmpdir(), "ponytail-audit-"));
  const file = join(dir, "issue.md");
  await writeFile(file, issueBody, "utf-8");

  const out = gh(
    `issue create --repo ${repo} --title ${JSON.stringify(issueTitle)} --body-file ${file} --label ponytail-audit --label maintenance`
  );
  console.log(out.trim());
}

async function collectAgentText(run, result) {
  let text = result.result ?? "";
  if (!/AUDIT_STATUS=(clean|findings)/.test(text)) {
    try {
      if (run.supports("conversation")) {
        const turns = await run.conversation();
        for (let i = turns.length - 1; i >= 0; i--) {
          const turn = turns[i];
          if (turn.type === "assistant_message" && turn.text) {
            text = turn.text;
            break;
          }
        }
      }
    } catch {
      // use result.result as-is
    }
  }
  return text;
}

const context = await readFile(".github/ai-ponytail-audit-context.md", "utf-8");

const prompt = `${context}

---

## Repository to audit

**URL:** ${repoUrl}
**Base ref:** \`${baseRef}\`

Audit the full codebase on \`${baseRef}\` now. Return your report between AUDIT_COMMENT_START and AUDIT_COMMENT_END, then end with AUDIT_STATUS=clean or AUDIT_STATUS=findings. Do not run gh or create issues yourself.
`;

let agent;
try {
  agent = await Agent.create({
    apiKey,
    model: { id: "composer-2.5" },
    cloud: {
      repos: [{ url: repoUrl, startingRef: baseRef }],
      autoCreatePR: false,
      skipReviewerRequest: true,
    },
  });

  console.log(`Starting Ponytail repo audit on ${baseRef}`);
  const run = await agent.send(prompt);
  console.log({ agentId: agent.agentId, runId: run.id, baseRef });

  const result = await run.wait();
  if (result.status === "error") {
    console.error("Ponytail audit run failed:", result.id);
    process.exit(2);
  }

  const text = await collectAgentText(run, result);
  const { body, hasFindings } = parseAuditOutput(text);

  await createAuditIssue(body, hasFindings);
  console.log(`Ponytail audit complete: has_findings=${hasFindings}`);
} catch (err) {
  if (err instanceof CursorAgentError) {
    console.error("Failed to start Ponytail audit agent:", err.message);
    process.exit(1);
  }
  console.error("Ponytail audit failed:", err.message ?? err);
  process.exit(1);
} finally {
  if (agent) {
    await agent[Symbol.asyncDispose]();
  }
}
