import { getPhases, getPhaseForDate } from '../data/fastingPlan';
import { getActiveJourney } from '../lib/journey';
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
