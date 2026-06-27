import { readFile } from "node:fs/promises";

const DEFAULTS = {
  project: { name: "Project", defaultBranch: "main" },
  agent: { model: "composer-2.5", startingRef: "main" },
  labels: {
    needsSpec: "needs-spec",
    specAdded: "spec-added",
    ready: "ready",
    agentWorking: "agent-working",
    prOpened: "pr-opened",
    agentFailed: "agent-failed",
  },
  prompt: {
    postImplementReminders: `- Open a PR with \`Fixes #{N}\` in the body — leave it as a **draft** unless your repo docs say otherwise.
- UI changes REQUIRE screenshots committed under \`artifacts/issue-{N}/\` and linked in the issue completion comment.
- Update labels: remove \`agent-working\`, add \`pr-opened\` when the PR is open.
- You MUST post the issue completion comment before stopping. Do not stop right after opening the PR.`,
    agentStartedComment: `The agent will implement the fix, open a draft PR, post screenshots (if UI changed), update labels, and post a completion comment.`,
  },
};

function parseScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseBlockScalar(lines, startIndex) {
  const firstLine = lines[startIndex];
  const indent = firstLine.search(/\S/);
  const contentLines = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      contentLines.push("");
      continue;
    }
    if (line.search(/\S/) < indent) break;
    contentLines.push(line.slice(indent));
  }
  return contentLines.join("\n").trimEnd();
}

/**
 * Minimal YAML parser for issue-bench.yml v1 schema (no external deps).
 */
export async function loadConfig(configPath = ".github/issue-bench.yml") {
  let raw;
  try {
    raw = await readFile(configPath, "utf-8");
  } catch {
    return structuredClone(DEFAULTS);
  }

  const config = structuredClone(DEFAULTS);
  const lines = raw.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const projectName = line.match(/^  name:\s*(.+)$/);
    if (projectName && lines[i - 1]?.trim() === "project:") {
      config.project.name = parseScalar(projectName[1]);
      continue;
    }
    const defaultBranch = line.match(/^  defaultBranch:\s*(.+)$/);
    if (defaultBranch) {
      config.project.defaultBranch = parseScalar(defaultBranch[1]);
      continue;
    }
    const model = line.match(/^  model:\s*(.+)$/);
    if (model && lines.slice(0, i).some((l) => l.trim() === "agent:")) {
      config.agent.model = parseScalar(model[1]);
      continue;
    }
    const startingRef = line.match(/^  startingRef:\s*(.+)$/);
    if (startingRef) {
      config.agent.startingRef = parseScalar(startingRef[1]);
      config.project.defaultBranch =
        config.agent.startingRef || config.project.defaultBranch;
      continue;
    }
    if (line.trim() === "postImplementReminders: |") {
      config.prompt.postImplementReminders = parseBlockScalar(lines, i);
      continue;
    }
    if (line.trim() === "agentStartedComment: |") {
      config.prompt.agentStartedComment = parseBlockScalar(lines, i);
    }
  }

  config.agent.startingRef =
    config.agent.startingRef || config.project.defaultBranch || "main";

  return config;
}

export { DEFAULTS };
