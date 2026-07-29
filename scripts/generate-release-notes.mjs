#!/usr/bin/env node
/**
 * Generate release notes from merged PRs since the last release tag (or --since).
 *
 * Deploy still happens on every merge to main. This script only labels a window
 * of already-shipped PRs and optionally publishes a GitHub Release.
 *
 * Usage:
 *   node scripts/generate-release-notes.mjs
 *   node scripts/generate-release-notes.mjs --since v1.0.0
 *   node scripts/generate-release-notes.mjs --since 2026-06-28
 *   node scripts/generate-release-notes.mjs --tag v1.1.0 --publish
 *   node scripts/generate-release-notes.mjs --dry-run
 *
 * Flags:
 *   --since <tag|ISO-date>  Lower bound (default: latest v* tag)
 *   --tag <vX.Y.Z>          Version label for the notes / GitHub Release
 *   --out <path>            Write markdown here (default: docs/release-notes-YYYY-MM-DD.md)
 *   --publish               Create git tag + GitHub Release (requires --tag)
 *   --draft                 With --publish, create a draft release
 *   --dry-run               Print markdown only; do not write files or publish
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const REPO = 'mitchelldawkinsjr/Fasted';
const PROD_URL = 'https://fasted.360web.cloud';

function parseArgs(argv) {
  const args = {
    since: null,
    tag: null,
    out: null,
    publish: false,
    draft: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--since') args.since = argv[++i];
    else if (arg === '--tag') args.tag = argv[++i];
    else if (arg === '--out') args.out = argv[++i];
    else if (arg === '--publish') args.publish = true;
    else if (arg === '--draft') args.draft = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Generate release notes from merged PRs.

Usage:
  npm run release:notes [-- --since <tag|date>] [-- --tag vX.Y.Z]
  npm run release:create -- --tag vX.Y.Z [-- --since <tag|date>] [-- --draft]

Examples:
  npm run release:notes -- --since 2026-06-28
  npm run release:create -- --tag v1.1.0 --since 2026-06-28
`);
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', opts.inheritStderr ? 'inherit' : 'pipe'],
    ...opts,
  }).trim();
}

function tryRun(cmd, args) {
  try {
    return run(cmd, args);
  } catch {
    return null;
  }
}

function latestVersionTag() {
  const tags = tryRun('git', ['tag', '-l', 'v*', '--sort=-v:refname']);
  if (!tags) return null;
  return tags.split('\n').find(Boolean) ?? null;
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function tagDate(tag) {
  const iso = tryRun('git', ['log', '-1', '--format=%cI', tag]);
  return iso ? iso.slice(0, 10) : null;
}

function resolveSince(sinceArg) {
  if (sinceArg) {
    if (isIsoDate(sinceArg)) {
      return { label: sinceArg, mergedAfter: sinceArg, previousTag: null };
    }
    const date = tagDate(sinceArg);
    if (!date) {
      throw new Error(`Could not resolve --since ${sinceArg} as a tag or YYYY-MM-DD date.`);
    }
    return { label: sinceArg, mergedAfter: date, previousTag: sinceArg };
  }

  const previousTag = latestVersionTag();
  if (!previousTag) {
    throw new Error(
      'No v* tags found. Pass --since YYYY-MM-DD (e.g. --since 2026-06-28) for the first release window.',
    );
  }
  const mergedAfter = tagDate(previousTag);
  if (!mergedAfter) {
    throw new Error(`Could not read date for tag ${previousTag}.`);
  }
  return { label: previousTag, mergedAfter, previousTag };
}

function fetchMergedPrs(mergedAfter) {
  // Search is day-granular; filter precisely in JS with mergedAt.
  const search = `repo:${REPO} is:pr is:merged merged:>=${mergedAfter}`;
  const raw = run('gh', [
    'pr',
    'list',
    '--repo',
    REPO,
    '--state',
    'merged',
    '--limit',
    '100',
    '--search',
    search,
    '--json',
    'number,title,body,mergedAt,url,author,labels',
  ]);
  const prs = JSON.parse(raw);
  const cutoff = new Date(`${mergedAfter}T00:00:00.000Z`);
  return prs
    .filter((pr) => new Date(pr.mergedAt) >= cutoff)
    .sort((a, b) => new Date(a.mergedAt) - new Date(b.mergedAt));
}

function extractReleaseNotesSection(body) {
  if (!body) return null;
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => /^##\s*Release notes\s*$/i.test(line.trim()));
  if (start < 0) return null;

  const chunk = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    chunk.push(lines[i]);
  }

  const text = chunk.join('\n').trim();
  if (!text) return null;

  const contentLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const first = contentLines[0].replace(/^[-*]\s*/, '').trim();
  if (/^(none|n\/a|na|no user-facing changes\.?|internal only\.?|no release notes\.?)$/i.test(first)) {
    return { skipUserFacing: true, lines: [] };
  }

  const bullets = contentLines.map((line) => line.replace(/^[-*]\s+/, '').trim()).filter(Boolean);
  return { skipUserFacing: false, lines: bullets };
}

function categorize(title) {
  const t = title.trim();
  if (/^feat(\(|:|\/)/i.test(t) || /^feature(\(|:|\/)/i.test(t)) return 'added';
  if (/^fix(\(|:|\/)/i.test(t)) return 'fixed';
  if (/^(docs|chore|ci|test|build|style)(\(|:|\/)/i.test(t)) return 'internal';
  if (/^refactor(\(|:|\/)/i.test(t)) return 'internal';
  if (/^perf(\(|:|\/)/i.test(t)) return 'changed';
  return 'changed';
}

function stripConventionalPrefix(title) {
  return title
    .replace(
      /^(feat|fix|docs|chore|ci|test|build|style|refactor|perf|feature)(\([^)]*\))?:\s*/i,
      '',
    )
    .replace(/\s*\((?:fixes|fix|closes|refs?)\s*#\d+\)\s*/gi, ' ')
    .replace(/\s*\(#\d+\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractIssueRefs(title) {
  const refs = [...title.matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
  return [...new Set(refs)];
}

function formatDay(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function periodLabel(prs, sinceDate) {
  if (prs.length === 0) return sinceDate;
  const start = formatDay(prs[0].mergedAt);
  const end = formatDay(prs[prs.length - 1].mergedAt);
  return start === end ? start : `${start} – ${end}`;
}

function prLinkSuffix(pr) {
  const issues = extractIssueRefs(pr.title).filter((n) => n !== pr.number);
  const issueSuffix = issues.length ? ` (${issues.map((n) => `#${n}`).join(', ')})` : '';
  return ` ([#${pr.number}](${pr.url}))${issueSuffix}`;
}

/** Prefer ## Release notes from the PR body; fall back to the title. */
function bulletsFor(pr) {
  const fromBody = extractReleaseNotesSection(pr.body);
  const suffix = prLinkSuffix(pr);

  if (fromBody?.skipUserFacing) {
    return { category: 'internal', bullets: [`${stripConventionalPrefix(pr.title)}${suffix}`] };
  }

  if (fromBody?.lines?.length) {
    return {
      category: categorize(pr.title),
      bullets: fromBody.lines.map((line) => `- ${line}${suffix}`),
    };
  }

  return {
    category: categorize(pr.title),
    bullets: [`- ${stripConventionalPrefix(pr.title)}${suffix}`],
  };
}

function section(title, bullets) {
  if (bullets.length === 0) return '';
  return `## ${title}\n\n${bullets.join('\n')}\n`;
}

function buildMarkdown({ tag, since, prs }) {
  const today = new Date().toISOString().slice(0, 10);
  const groups = { added: [], fixed: [], changed: [], internal: [] };
  for (const pr of prs) {
    const { category, bullets } = bulletsFor(pr);
    groups[category].push(...bullets);
  }

  const prTable =
    prs.length === 0
      ? '_No merged PRs in this window._'
      : [
          '| PR | Title | Merged |',
          '|----|-------|--------|',
          ...prs.map(
            (pr) =>
              `| [#${pr.number}](${pr.url}) | ${pr.title.replace(/\|/g, '\\|')} | ${formatDay(pr.mergedAt)} |`,
          ),
        ].join('\n');

  const parts = [
    `# Fasted — Release Notes${tag ? ` (${tag})` : ''}`,
    '',
    `**Period:** ${periodLabel(prs, since.mergedAfter)}  `,
    tag ? `**Tag:** ${tag}  ` : '',
    `**Since:** ${since.label}  `,
    `**PRs merged:** ${prs.length}  `,
    `**Production:** [${PROD_URL.replace(/^https:\/\//, '')}](${PROD_URL})`,
    '',
    '---',
    '',
    '> Merges to `main` auto-deploy. This release labels a window of already-shipped work.',
    '',
  ];

  const body = [
    section('Added', groups.added),
    section('Fixed', groups.fixed),
    section('Changed', groups.changed),
    section('Internal', groups.internal),
  ]
    .filter(Boolean)
    .join('\n');

  parts.push(body || '## Changes\n\n_No categorized changes in this window._\n');
  parts.push('---', '', '## Merged PRs', '', prTable, '', '---', '');
  parts.push(`*Generated ${today} from merged PRs via \`npm run release:notes\`.*`, '');

  const markdown = parts.filter((line) => line !== null && line !== undefined).join('\n');
  return { markdown, groups };
}

function stripMarkdownLite(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildWhatsNewJson({ tag, since, groups }) {
  const version = tag || `notes-${since.mergedAfter}`;
  const highlights = [...groups.added, ...groups.fixed, ...groups.changed]
    .map((line) => stripMarkdownLite(line.replace(/^[-*]\s+/, '')))
    .filter(Boolean)
    .slice(0, 8);

  return {
    version,
    title: "What's new in Fasted",
    publishedAt: new Date().toISOString().slice(0, 10),
    highlights:
      highlights.length > 0
        ? highlights
        : ['Maintenance and reliability updates. See full release notes for details.'],
    url: tag
      ? `https://github.com/${REPO}/releases/tag/${tag}`
      : `https://github.com/${REPO}/releases`,
  };
}

function defaultOutPath(tag) {
  const day = new Date().toISOString().slice(0, 10);
  const suffix = tag ? `-${tag}` : '';
  return resolve(`docs/release-notes-${day}${suffix}.md`);
}

function whatsNewOutPath() {
  return resolve('public/whats-new.json');
}

function ensureOnMainForPublish() {
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== 'main' && branch !== 'master') {
    throw new Error(`--publish should run from main (current branch: ${branch}).`);
  }
}

function publishRelease({ tag, markdown, previousTag, draft }) {
  ensureOnMainForPublish();

  const existing = tryRun('git', ['rev-parse', `refs/tags/${tag}`]);
  if (existing) {
    throw new Error(`Tag ${tag} already exists.`);
  }

  run('git', ['tag', '-a', tag, '-m', `Release ${tag}`], { inheritStderr: true });
  run('git', ['push', 'origin', tag], { inheritStderr: true });

  const args = ['release', 'create', tag, '--repo', REPO, '--title', tag, '--notes', markdown];
  if (draft) args.push('--draft');
  if (previousTag) {
    // Helps GitHub link compare; notes body is already PR-based.
    args.push('--latest');
  }
  run('gh', args, { inheritStderr: true });
  console.error(`Published GitHub Release ${tag}${draft ? ' (draft)' : ''}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.publish && !args.tag) {
    throw new Error('--publish requires --tag vX.Y.Z');
  }
  if (args.tag && !/^v\d+\.\d+\.\d+/.test(args.tag)) {
    console.error(`Warning: tag "${args.tag}" does not look like vX.Y.Z`);
  }

  const since = resolveSince(args.since);
  const prs = fetchMergedPrs(since.mergedAfter);

  const { markdown, groups } = buildMarkdown({ tag: args.tag, since, prs });
  const whatsNew = buildWhatsNewJson({ tag: args.tag, since, groups });
  const outPath = args.out ? resolve(args.out) : defaultOutPath(args.tag);
  const whatsNewPath = whatsNewOutPath();

  if (args.dryRun) {
    process.stdout.write(markdown);
    console.error(
      `\n(dry-run) would write ${outPath} and ${whatsNewPath}; ${prs.length} PR(s) since ${since.label}`,
    );
    return;
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, markdown, 'utf8');
  writeFileSync(whatsNewPath, `${JSON.stringify(whatsNew, null, 2)}\n`, 'utf8');
  console.error(`Wrote ${outPath} (${prs.length} PR(s) since ${since.label})`);
  console.error(`Wrote ${whatsNewPath} for in-app What's new`);
  process.stdout.write(markdown);

  if (args.publish) {
    publishRelease({
      tag: args.tag,
      markdown,
      previousTag: since.previousTag,
      draft: args.draft,
    });
    console.error(`\nNext: commit ${outPath} and ${whatsNewPath} on main if you want them in the repo.`);
  } else {
    console.error(`\nNext: review the files, then publish with:`);
    console.error(
      `  npm run release:create -- --tag vX.Y.Z${args.since ? ` --since ${args.since}` : ''}`,
    );
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
