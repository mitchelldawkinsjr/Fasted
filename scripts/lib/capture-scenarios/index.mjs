import { journalFocusLightbox } from './journal-focus-lightbox.mjs';

/**
 * @typedef {object} CaptureScenario
 * @property {string} id
 * @property {string} description
 * @property {number[]} issues Issue numbers this scenario documents
 * @property {(ctx: {
 *   page: import('@playwright/test').Page,
 *   baseUrl: string,
 *   shot: (page: import('@playwright/test').Page, filename: string, options?: object) => Promise<string>,
 *   artifactDir: string,
 * }) => Promise<void>} capture
 */

/** @type {Record<string, CaptureScenario>} */
export const SCENARIOS = {
  [journalFocusLightbox.id]: journalFocusLightbox,
};

export function listScenarios() {
  return Object.values(SCENARIOS);
}

export function getScenario(id) {
  const scenario = SCENARIOS[id];
  if (!scenario) {
    const available = listScenarios()
      .map((entry) => `  ${entry.id} (issues: ${entry.issues.join(', ')})`)
      .join('\n');
    throw new Error(`Unknown scenario "${id}". Available scenarios:\n${available}`);
  }
  return scenario;
}

export function getScenariosForIssue(issueNumber) {
  const issue = Number(issueNumber);
  return listScenarios().filter((scenario) => scenario.issues.includes(issue));
}
