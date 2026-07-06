import { describe, expect, it } from 'vitest';
import {
  scriptureReferenceToBibleComUrl,
  scriptureReferenceToChapterUrl,
} from '../lib/bibleComUrl';

describe('scriptureReferenceToBibleComUrl', () => {
  it('builds a Bible Gateway URL with verse numbers', () => {
    expect(scriptureReferenceToBibleComUrl('Matthew 6:17-18')).toBe(
      'https://www.biblegateway.com/passage/?search=Matthew%206%3A17-18&version=NLT',
    );
  });

  it('builds a Bible Gateway URL for chapter-only references', () => {
    expect(scriptureReferenceToBibleComUrl('Psalm 23')).toBe(
      'https://www.biblegateway.com/passage/?search=Psalm%2023&version=NLT',
    );
  });
});

describe('scriptureReferenceToChapterUrl', () => {
  it('drops verse numbers for chapter links', () => {
    expect(scriptureReferenceToChapterUrl('Daniel 1:12')).toBe(
      'https://www.biblegateway.com/passage/?search=Daniel%201&version=NLT',
    );
  });
});
