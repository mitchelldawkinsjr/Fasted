import { trackEvent } from '../lib/analytics';
import { scriptureReferenceToBibleComUrl } from '../lib/bibleComUrl';
import { getLocalDateString } from '../lib/dateUtils';
import { VERSE_OF_THE_DAY_LABEL } from '../lib/journalTags';
import { resolveVerseForDate } from '../lib/verseOfTheDay';
import type { DailyReflectionEntry } from '../types';
import { Icon } from './Icon';

type Variant = 'today' | 'journal' | 'compact';

type Props = {
  date?: string;
  /** today = Today page; journal = editor card; compact = read-only journal views */
  variant?: Variant;
};

type CitationProps = {
  reference: string;
  url: string | null;
  source: string;
  className?: string;
};

function VerseCitation({ reference, url, source, className = 'mt-3 block not-italic' }: CitationProps) {
  return (
    <cite className={className}>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('scripture_link_clicked', { source })}
          className="label-caps text-on-surface-variant underline decoration-outline/40 underline-offset-2 transition hover:text-primary"
          aria-label={`${reference} (opens on Bible Gateway in a new tab)`}
        >
          — {reference}
        </a>
      ) : (
        <span className="label-caps text-on-surface-variant">— {reference}</span>
      )}
    </cite>
  );
}

function VerseQuote({ text, size }: { text: string; size: 'lg' | 'md' }) {
  const sizeClass =
    size === 'lg'
      ? 'mb-4 font-display text-body-lg italic leading-relaxed text-primary'
      : 'font-display text-body-md italic leading-relaxed text-primary';

  return (
    <blockquote className={sizeClass}>&ldquo;{text}&rdquo;</blockquote>
  );
}

export function VerseOfTheDay({ date, variant = 'today' }: Props) {
  const viewDate = date ?? getLocalDateString();
  const verse = resolveVerseForDate(viewDate);
  const url = scriptureReferenceToBibleComUrl(verse.reference);
  const analyticsSource = variant === 'today' ? 'verse_of_the_day' : 'journal_verse';
  const headingId = variant === 'today' ? 'todays-meditation-heading' : `meditation-verse-${viewDate}`;

  if (variant === 'compact') {
    return (
      <section aria-labelledby={headingId}>
        <h3
          id={headingId}
          className="mb-1 text-body-md font-medium text-on-surface"
        >
          {VERSE_OF_THE_DAY_LABEL}
        </h3>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 grace-shadow">
          <VerseQuote text={verse.text} size="md" />
          <VerseCitation reference={verse.reference} url={url} source={analyticsSource} className="mt-2 block not-italic" />
        </div>
      </section>
    );
  }

  if (variant === 'journal') {
    return (
      <section
        className="stitch-card border-l-4 border-gold p-stack-md"
        aria-labelledby={headingId}
      >
        <div className="mb-3 flex items-center gap-2">
          <Icon name="menu_book" className="text-gold" />
          <h3
            id={headingId}
            className="font-display text-headline-md text-primary"
          >
            {VERSE_OF_THE_DAY_LABEL}
          </h3>
        </div>
        <VerseQuote text={verse.text} size="md" />
        <VerseCitation reference={verse.reference} url={url} source={analyticsSource} />
      </section>
    );
  }

  return (
    <section
      className="stitch-card flex flex-col justify-center border-l-4 border-gold p-stack-lg"
      aria-labelledby={headingId}
      data-tour="scripture-card"
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon name="menu_book" className="text-gold" />
        <h2 id={headingId} className="font-display text-headline-md text-primary">
          Today&apos;s Meditation
        </h2>
      </div>
      <VerseQuote text={verse.text} size="lg" />
      <VerseCitation reference={verse.reference} url={url} source={analyticsSource} className="not-italic" />
    </section>
  );
}

type DailyReflectionMeditationProps = {
  entry: DailyReflectionEntry;
  variant: 'journal' | 'compact';
};

/** Same date-bound verse as the Today page meditation card (and Journal). */
export function DailyReflectionMeditation({ entry, variant }: DailyReflectionMeditationProps) {
  return <VerseOfTheDay date={entry.date} variant={variant === 'compact' ? 'compact' : 'journal'} />;
}
