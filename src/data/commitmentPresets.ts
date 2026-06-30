import type { CommitmentDefinition } from '../types';

export function newCommitmentId(prefix: string): string {
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
          id: newCommitmentId('move'),
          label: 'Move body daily',
          shape: 'duration',
          target: 30,
          description: 'At least 30 minutes of movement',
        },
        { id: newCommitmentId('food'), label: 'Follow eating structure', shape: 'yes_no' },
        { id: newCommitmentId('fast'), label: "Complete today's fast", shape: 'yes_no' },
        { id: newCommitmentId('prayer'), label: 'Intentional time with God', shape: 'yes_no' },
        { id: newCommitmentId('honest'), label: 'Be honest in check-ins', shape: 'yes_no' },
      ];
    case 'discipleship':
      return [
        { id: newCommitmentId('scripture'), label: 'Read assigned scripture', shape: 'yes_no' },
        { id: newCommitmentId('prayer'), label: 'Intentional time with God', shape: 'yes_no' },
        { id: newCommitmentId('reflection'), label: 'Weekly reflection', shape: 'text_note' },
        { id: newCommitmentId('honest'), label: 'Be honest with your leader', shape: 'yes_no' },
      ];
    case 'fitness':
      return [
        {
          id: newCommitmentId('workout'),
          label: 'Complete workout',
          shape: 'duration',
          target: 30,
          description: 'Movement or training minutes',
        },
        { id: newCommitmentId('hydrate'), label: 'Stay hydrated', shape: 'yes_no' },
        { id: newCommitmentId('nutrition'), label: 'Follow nutrition plan', shape: 'yes_no' },
      ];
  }
}
