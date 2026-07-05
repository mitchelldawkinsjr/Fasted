import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Section = {
  title: string;
  content: ReactNode;
};

type LegalDocumentPageProps = {
  title: string;
  intro: ReactNode;
  sections: Section[];
  relatedLinks?: { to: string; label: string }[];
};

export function LegalDocumentPage({ title, intro, sections, relatedLinks }: LegalDocumentPageProps) {
  return (
    <div className="space-y-stack-lg animate-fade-in-up">
      <section>
        <h1 className="font-display text-headline-lg-mobile text-primary">{title}</h1>
        <p className="mt-2 text-label-caps text-on-surface-variant">Last updated: July 5, 2026</p>
        <div className="mt-4 text-body-md leading-relaxed text-on-surface-variant">{intro}</div>
      </section>

      {sections.map((section) => (
        <section key={section.title} className="stitch-card min-w-0 overflow-hidden p-gutter">
          <h2 className="mb-3 font-display text-headline-md text-primary">{section.title}</h2>
          <div className="space-y-3 text-body-md leading-relaxed text-on-surface-variant">
            {section.content}
          </div>
        </section>
      ))}

      {relatedLinks && relatedLinks.length > 0 && (
        <section className="stitch-card min-w-0 overflow-hidden p-gutter">
          <h2 className="mb-3 font-display text-headline-md text-primary">Related</h2>
          <ul className="space-y-2 text-body-md">
            {relatedLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-secondary underline underline-offset-2">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
