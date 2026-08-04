import { useEffect } from 'react';
import { saveDailyWelcomeCheckIn } from '../../lib/storage';
import { getTimeGreeting } from '../../lib/homeScreenLabels';

const LOGO_SRC = '/assets/logo.png';
const INTERSTITIAL_MS = 3000;

type Props = {
  date: string;
  displayName: string;
};

export function WelcomeInterstitial({ date, displayName }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDailyWelcomeCheckIn({
        date,
        completedAt: new Date().toISOString(),
      });
    }, INTERSTITIAL_MS);

    return () => window.clearTimeout(timer);
  }, [date]);

  const continueNow = () => {
    saveDailyWelcomeCheckIn({
      date,
      completedAt: new Date().toISOString(),
    });
  };

  return (
    <div
      className="relative flex min-h-[70dvh] flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-surface via-secondary-container/25 to-surface-container-low px-container-margin py-section-gap text-center animate-fade-in-up"
      aria-labelledby="welcome-interstitial-heading"
      data-testid="welcome-interstitial"
      onClick={continueNow}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          continueNow();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <img
        src={LOGO_SRC}
        alt=""
        aria-hidden
        width={72}
        height={72}
        className="h-[4.5rem] w-[4.5rem] rounded-2xl object-cover shadow-grace animate-gentle-pulse"
      />
      <p className="label-caps mt-stack-lg text-secondary">{getTimeGreeting()}</p>
      <h2
        id="welcome-interstitial-heading"
        className="mt-2 font-display text-display-scripture text-primary"
      >
        Fasted
      </h2>
      <p className="mt-3 max-w-xs text-body-lg text-on-surface-variant">
        Welcome, {displayName}. Your journey awaits.
      </p>
      <p className="mt-stack-lg text-body-md text-on-surface-variant/70">Tap to continue</p>
    </div>
  );
}
