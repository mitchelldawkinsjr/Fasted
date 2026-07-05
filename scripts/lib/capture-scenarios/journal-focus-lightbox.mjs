import { prepareGuestJournalPage } from '../capture-screenshot-session.mjs';

/** @type {import('./index.mjs').CaptureScenario} */
export const journalFocusLightbox = {
  id: 'journal-focus-lightbox',
  description: 'Journal editor focus lightbox, navigation, and focus-mode toggle',
  issues: [140],
  async capture({ page, baseUrl, shot }) {
    await prepareGuestJournalPage(page, baseUrl);

    await page.getByRole('button', { name: '+ New' }).click();
    await page.getByRole('radio', { name: 'Good' }).click();
    await shot(page, '01-journal-editor.png', { fullPage: true });

    await page.getByLabel('Verse of the Day').click();
    await page
      .getByRole('dialog')
      .getByLabel('Verse of the Day')
      .fill('The Lord is my shepherd; I shall not want.');
    await page.waitForTimeout(300);
    await shot(page, '02-focus-lightbox.png', { fullPage: true });

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(200);
    await shot(page, '03-focus-lightbox-next-field.png', { fullPage: true });

    await page.getByRole('button', { name: 'Done' }).click();
    await page.waitForTimeout(200);
    await shot(page, '04-editor-with-toggle.png', { fullPage: true });

    await page.getByRole('switch').first().click();
    await page.waitForTimeout(200);
    await shot(page, '05-inline-textareas.png', { fullPage: true });
  },
};
