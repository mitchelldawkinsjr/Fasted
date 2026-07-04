import { describe, expect, it } from 'vitest';
import { commitmentValueMet, isCommitmentHonored } from './groupCheckIns';
import type { CommitmentDefinition } from '../types';

describe('commitmentValueMet', () => {
  it('checks duration targets', () => {
    const def: CommitmentDefinition = {
      id: 'd1',
      label: 'Pray',
      shape: 'duration',
      target: 10,
    };
    expect(commitmentValueMet(def, 10)).toBe(true);
    expect(commitmentValueMet(def, 9)).toBe(false);
  });

  it('checks text notes', () => {
    const def: CommitmentDefinition = { id: 't1', label: 'Note', shape: 'text_note' };
    expect(commitmentValueMet(def, '  hello ')).toBe(true);
    expect(commitmentValueMet(def, '   ')).toBe(false);
  });
});

describe('isCommitmentHonored', () => {
  it('requires honored flag for yes_no', () => {
    const def: CommitmentDefinition = { id: 'y1', label: 'Yes', shape: 'yes_no' };
    expect(isCommitmentHonored(def, { commitmentId: 'y1', honored: true })).toBe(true);
    expect(isCommitmentHonored(def, { commitmentId: 'y1', honored: false })).toBe(false);
  });
});
