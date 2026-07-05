import { trackEvent } from '../lib/analytics';
import { scriptureReferenceToBibleComUrl } from '../lib/bibleComUrl';
import { getLocalDateString } from '../lib/dateUtils';
import { resolveVerseForDate } from '../lib/verseOfTheDay';
import { Icon } from './Icon';

type Props = {
  date?: string;
};

export function VerseOfTheDay({ date }: Props) {
  const viewDate = date ?? getLocalDateString();
  const verse = resolveVerseForDate(viewDate);
  const url = scriptureReferenceToBibleComUrl(verse.reference);

  return (
    <section
      className="stitch-card border border-gold/30 bg-surface-container-low p-stack-lg"
      aria-labelledby="verse-of-the-day-heading"
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon name="menu_book" className="text-gold" />
        <h2 id="verse-of-the-day-heading" className="font-display text-headline-md text-primary">
          Verse of the Day
        </h2>
      </div>
      <blockquote className="mb-4 font-display text-body-lg italic leading-relaxed text-primary">
        &ldquo;{verse.text}&rdquo;
      </blockquote>
      <cite className="not-italic">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('scripture_link_clicked', { source: 'verse_of_the_day' })}
            className="label-caps text-on-surface-variant underline decoration-outline/40 underline-offset-2 transition hover:text-primary"
            aria-label={`${verse.reference} (opens on Bible.com in a new tab)`}
          >
            — {verse.reference}
          </a>
        ) : (
          <span className="label-caps text-on-surface-variant">— {verse.reference}</span>
        )}
      </cite>
    </section>
  );
}
