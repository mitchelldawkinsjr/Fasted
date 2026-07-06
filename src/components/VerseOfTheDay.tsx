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
      className="stitch-card flex flex-col justify-center border-l-4 border-gold p-stack-lg"
      aria-labelledby="todays-meditation-heading"
      data-tour="scripture-card"
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon name="menu_book" className="text-gold" />
        <h2 id="todays-meditation-heading" className="font-display text-headline-md text-primary">
          Today&apos;s Meditation
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
            aria-label={`${verse.reference} (opens on Bible Gateway in a new tab)`}
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
