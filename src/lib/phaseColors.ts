export const STITCH_PHASE_COLORS: Record<number, string> = {
  1: '#8397b8',
  2: '#735c00',
  3: '#4b5f7e',
  4: '#ba1a1a',
  5: '#334865',
  6: '#e9c349',
  7: '#021a35',
  8: '#574500',
};

export function getPhaseColorClass(phaseId: number): string {
  return `phase-${phaseId}`;
}

export function getPhaseTailwindBg(phaseId: number, opacity = 10): string {
  return `bg-phase-${phaseId}/${opacity}`;
}

export function getPhaseTailwindBorder(phaseId: number): string {
  return `border-phase-${phaseId}`;
}
