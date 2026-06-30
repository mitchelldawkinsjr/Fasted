import type { CommitmentDefinition } from '../types';

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export type CommitmentPresetId = 'fasted-default' | 'discipleship' | 'fitness';

export const COMMITMENT_PRESET_LABELS: Record<CommitmentPresetId, string> = {
  'fasted-default': 'Fasted Default',
  discipleship: 'Discipleship',
  fitness: 'Fitness',
};

export function createCommitmentPreset(preset: CommitmentPresetId): CommitmentDefinition[] {
  switch (preset) {
    case 'fasted-default':
      return [
        {
          id: id('move'),
          label: 'Move body daily',
          shape: 'duration',
          target: 30,
          description: 'At least 30 minutes of movement',
        },
        { id: id('food'), label: 'Follow eating structure', shape: 'yes_no' },
        { id: id('fast'), label: "Complete today's fast", shape: 'yes_no' },
        { id: id('prayer'), label: 'Intentional time with God', shape: 'yes_no' },
        { id: id('honest'), label: 'Be honest in check-ins', shape: 'yes_no' },
      ];
    case 'discipleship':
      return [
        { id: id('scripture'), label: 'Read assigned scripture', shape: 'yes_no' },
        { id: id('prayer'), label: 'Intentional time with God', shape: 'yes_no' },
        { id: id('reflection'), label: 'Weekly reflection', shape: 'text_note' },
        { id: id('honest'), label: 'Be honest with your leader', shape: 'yes_no' },
      ];
    case 'fitness':
      return [
        {
          id: id('workout'),
          label: 'Complete workout',
          shape: 'duration',
          target: 30,
          description: 'Movement or training minutes',
        },
        { id: id('hydrate'), label: 'Stay hydrated', shape: 'yes_no' },
        { id: id('nutrition'), label: 'Follow nutrition plan', shape: 'yes_no' },
      ];
  }
}
