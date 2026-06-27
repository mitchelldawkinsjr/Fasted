import {
  abbreviateScriptureReference,
  scriptureReferenceToChapterUrl,
} from '../lib/bibleComUrl';
import { getVerseOfTheDayReference } from '../lib/dailyPlan';
import { VERSE_OF_THE_DAY_LABEL } from '../lib/journalTags';

type Props = {
  date: string;
  as?: 'label' | 'heading';
};

export function VerseOfTheDayLabel({ date, as = 'label' }: Props) {
  const reference = getVerseOfTheDayReference(date);
  const chapterUrl = reference ? scriptureReferenceToChapterUrl(reference) : null;
  const displayRef = reference ? abbreviateScriptureReference(reference) : null;
  const Tag = as === 'heading' ? 'h3' : 'span';

  return (
    <Tag
      className={
        as === 'heading'
          ? 'mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-md font-medium text-on-surface'
          : 'mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-md font-medium text-on-surface'
      }
    >
      <span>{VERSE_OF_THE_DAY_LABEL}</span>
      {displayRef && chapterUrl ? (
        <a
          href={chapterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary underline decoration-outline/40 underline-offset-2 transition hover:text-primary"
          aria-label={`${displayRef} — read full chapter on Bible.com (opens in a new tab)`}
        >
          {displayRef}
        </a>
      ) : displayRef ? (
        <span className="text-on-surface-variant">{displayRef}</span>
      ) : null}
    </Tag>
  );
}
