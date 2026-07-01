#!/usr/bin/env node
/**
 * Posts an advisory Testing Agent comment on a PR based on diff heuristics.
 * Env: PR_NUMBER, REPO, GH_TOKEN
 */
import { execSync } from "node:child_process";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const prNumber = process.env.PR_NUMBER;
const repo = process.env.REPO;
const ghToken = process.env.GH_TOKEN;

if (!prNumber || !repo || !ghToken) {
  console.error("Missing PR_NUMBER, REPO, or GH_TOKEN");
  process.exit(1);
}

function gh(args) {
  return execSync(`gh ${args}`, {
    encoding: "utf-8",
    env: { ...process.env, GH_TOKEN: ghToken },
  });
}

const files = gh(
  `pr diff ${prNumber} --repo ${repo} --name-only`
).trim().split("\n").filter(Boolean);

const uiFiles = files.filter((f) =>
  /^src\/(components|pages)\//.test(f) || /^src\/styles\//.test(f)
);
const e2eFiles = files.filter((f) => f.startsWith("e2e/"));
const migrationFiles = files.filter((f) => f.startsWith("supabase/migrations/"));

const gaps = [];
if (uiFiles.length > 0 && e2eFiles.length === 0) {
  gaps.push("UI files changed but no e2e specs updated — consider `e2e/overlay-scroll.spec.ts` or relevant spec");
}
if (migrationFiles.length > 0) {
  gaps.push("Supabase migration changed — verify RLS policies and client wiring");
}

const status = gaps.length === 0 ? "tests adequate" : "gaps found (advisory)";
const gapSection =
  gaps.length > 0
    ? gaps.map((g) => `- ${g}`).join("\n")
    : "- No obvious test coverage gaps detected from file paths";

const body = `## Testing Agent review

**PR:** #${prNumber}

### Changed areas
${files.map((f) => `- \`${f}\``).join("\n") || "- (no files)"}

### Heuristic checks
${gapSection}

### CI commands (blocking)
- \`npm run build\`
- \`npm run test:e2e\`
- \`npm run compress:artifacts:check\`

**Verdict:** ${status}

_Automated advisory — CI results are authoritative._`;

const dir = await mkdtemp(join(tmpdir(), "test-agent-"));
const file = join(dir, "comment.md");
await writeFile(file, body, "utf-8");
gh(`pr comment ${prNumber} --repo ${repo} --body-file ${file}`);
console.log("Posted Testing Agent advisory on PR", prNumber);
