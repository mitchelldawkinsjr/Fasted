import { expect, test } from '@playwright/test';
import { FASTED_JOURNEY } from '../src/data/phaseTemplates';
import { getJourneyPhaseWindows } from '../src/lib/journey';

test.describe('getJourneyPhaseWindows', () => {
  test('uses template legacy IDs for the default Fasted journey', () => {
    const windows = getJourneyPhaseWindows(FASTED_JOURNEY);

    expect(windows[0]).toMatchObject({ phaseId: 1, legacyId: 1, templateId: 'daniel-1' });
    expect(windows[1]).toMatchObject({ phaseId: 2, legacyId: 2, templateId: 'davids-fast' });
  });

  test('uses journey-relative phase IDs for custom template journeys', () => {
    const journey = {
      id: 'template-custom-phase-one',
      name: 'Seek God Fast',
      startDate: '2026-07-01',
      phases: [{ order: 0, templateId: 'davids-fast' }],
    };

    const windows = getJourneyPhaseWindows(journey);

    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      phaseId: 1,
      legacyId: 2,
      templateId: 'davids-fast',
    });
  });
});
