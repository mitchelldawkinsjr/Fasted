import { getPhaseById } from '../data/fastingPlan';
import { scriptureReferenceToBibleComUrl } from '../lib/bibleComUrl';
import { Icon } from './Icon';

type Props = {
  phaseId: number;
  references: string[];
};

function ScriptureReferenceLink({ reference }: { reference: string }) {
  const url = scriptureReferenceToBibleComUrl(reference);
  if (!url) return <span>{reference}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-outline/40 underline-offset-2 transition hover:text-primary"
      aria-label={`${reference} (opens on Bible.com in a new tab)`}
    >
      {reference}
    </a>
  );
}

export function ScriptureCard({ phaseId, references }: Props) {
  const phase = getPhaseById(phaseId);
  if (!phase) return null;

  return (
    <section
      className="stitch-card flex flex-col justify-center border-l-4 border-gold p-stack-lg"
      aria-labelledby="scripture-heading"
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon name="auto_stories" className="text-secondary" />
        <h2 id="scripture-heading" className="font-display text-headline-md text-primary">
          Scripture
        </h2>
      </div>
      <blockquote className="mb-4 font-display text-body-lg italic leading-relaxed text-primary">
        &ldquo;{phase.scriptureTextNLT}&rdquo;
      </blockquote>
      <cite className="not-italic">
        <span className="label-caps text-on-surface-variant">
          —{' '}
          {references.map((reference, index) => (
            <span key={reference}>
              {index > 0 && ' · '}
              <ScriptureReferenceLink reference={reference} />
            </span>
          ))}
        </span>
      </cite>
    </section>
  );
}
