import type { CommitmentDefinition } from '../types';
import { Icon } from './Icon';

type Props = {
  commitments: CommitmentDefinition[];
  className?: string;
  showDetails?: boolean;
};

export function CommitmentList({
  commitments,
  className = 'space-y-2 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4',
  showDetails = true,
}: Props) {
  return (
    <ul className={className}>
      {commitments.map((commitment) => (
        <li key={commitment.id} className="flex items-start gap-2 text-body-md text-on-surface">
          <Icon name="check_circle" className="mt-0.5 shrink-0 text-secondary" size={18} />
          <span>
            {commitment.label}
            {showDetails && commitment.shape === 'duration' && commitment.target != null && (
              <span className="text-on-surface-variant"> ({commitment.target} min)</span>
            )}
            {showDetails && commitment.description && (
              <span className="block text-label-caps text-on-surface-variant">
                {commitment.description}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
