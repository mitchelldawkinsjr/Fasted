import releaseNotes from '../data/releaseNotes.json';
import type { ReleaseNotes } from '../types';

export function getLatestReleaseNotes(): ReleaseNotes {
  return releaseNotes;
}
