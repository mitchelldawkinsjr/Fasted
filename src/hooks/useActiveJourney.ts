import { getActiveJourney } from '../lib/journey';
import { getPhases, getPhaseForDate } from '../data/fastingPlan';
import { getPlanEnd, getPlanStart } from '../lib/dateUtils';
import { useProgress } from './useProgress';

export function useActiveJourney() {
  const progress = useProgress();
  const journey = getActiveJourney(progress);
  return {
    progress,
    journey,
    phases: getPhases(journey),
    planStart: getPlanStart(journey),
    planEnd: getPlanEnd(journey),
    getPhaseForDate: (date: string) => getPhaseForDate(date, journey),
  };
}

export function useJourneyById(id: string | undefined) {
  const progress = useProgress();
  const journey = progress.journeys.find((j) => j.id === id) ?? getActiveJourney(progress);
  return {
    journey,
    phases: getPhases(journey),
    planStart: getPlanStart(journey),
    planEnd: getPlanEnd(journey),
  };
}
