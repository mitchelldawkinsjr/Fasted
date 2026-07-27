import { trackEvent } from '../lib/analytics';
import { scriptureReferenceToBibleComUrl } from '../lib/bibleComUrl';
import { VERSE_OF_THE_DAY_LABEL } from '../lib/journalTags';
import { resolveVerseForDate } from '../lib/verseOfTheDay';
import { Icon } from './Icon';

type Props = {
  date: string;
  /** Full card for editor; compact blockquote for read-only views. */
  variant?: 'card' | 'compact';
};

export function MeditationVerseBox({ date, variant = 'card' }: Props) {
  const verse = resolveVerseForDate(date);
  const url = scriptureReferenceToBibleComUrl(verse.reference);

  if (variant === 'compact') {
    return (
      <section aria-labelledby={`meditation-verse-${date}`}>
        <h3
          id={`meditation-verse-${date}`}
          className="mb-1 text-body-md font-medium text-on-surface"
        >
          {VERSE_OF_THE_DAY_LABEL}
        </h3>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 grace-shadow">
          <blockquote className="font-display text-body-md italic leading-relaxed text-primary">
            &ldquo;{verse.text}&rdquo;
          </blockquote>
          <cite className="mt-2 block not-italic">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('scripture_link_clicked', { source: 'journal_verse' })}
                className="label-caps text-on-surface-variant underline decoration-outline/40 underline-offset-2 transition hover:text-primary"
                aria-label={`${verse.reference} (opens on Bible Gateway in a new tab)`}
              >
                — {verse.reference}
              </a>
            ) : (
              <span className="label-caps text-on-surface-variant">— {verse.reference}</span>
            )}
          </cite>
        </div>
      </section>
    );
  }

  return (
    <section
      className="stitch-card border-l-4 border-gold p-stack-md"
      aria-labelledby={`meditation-verse-${date}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon name="menu_book" className="text-gold" />
        <h3
          id={`meditation-verse-${date}`}
          className="font-display text-headline-md text-primary"
        >
          {VERSE_OF_THE_DAY_LABEL}
        </h3>
      </div>
      <blockquote className="font-display text-body-md italic leading-relaxed text-primary">
        &ldquo;{verse.text}&rdquo;
      </blockquote>
      <cite className="mt-3 block not-italic">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('scripture_link_clicked', { source: 'journal_verse' })}
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
