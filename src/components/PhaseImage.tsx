import { getPhaseById } from '../data/fastingPlan';

type Props = {
  phaseId: number;
  className?: string;
};

export function PhaseImage({ phaseId, className = '' }: Props) {
  const phase = getPhaseById(phaseId);
  if (!phase) return null;

  return (
    <img
      src={phase.imagePath}
      alt={`${phase.title} phase illustration`}
      className={`w-full rounded-2xl object-cover shadow-sm ${className}`}
    />
  );
}
