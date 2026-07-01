#!/usr/bin/env node
/**
 * Appends a lesson-learned entry when health check or deploy fails.
 * Env: LESSON_TITLE, LESSON_BODY (optional), ISSUE_NUMBER (optional)
 */
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const title = process.env.LESSON_TITLE ?? "Health check failure";
const body = process.env.LESSON_BODY ?? "Automated health check failed. Investigate VPS and redeploy if needed.";
const issueNumber = process.env.ISSUE_NUMBER ?? "unknown";
const date = new Date().toISOString().slice(0, 10);
const dir = join(".github/agent-knowledge");
const file = join(dir, `${date}-issue-${issueNumber}.md`);

await mkdir(dir, { recursive: true });

const entry = `## ${title}

**Date:** ${date}
**Issue/PR:** #${issueNumber}

${body}

### Rule updates needed
- [ ] Update AGENT.md or agent-rules if a new pattern emerged
- [ ] Add prevention step to deploy-context or testing-rules

---

`;

try {
  await appendFile(file, entry);
} catch {
  await writeFile(file, `# Lesson learned\n\n${entry}`, "utf-8");
}

console.log("Appended lesson to", file);
