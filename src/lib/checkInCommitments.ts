export const TODAY_COMMITMENTS_HEADING = "Today's Commitments";
export const TODAY_COMMITMENTS_SUBTITLE =
  "Commit to today's spiritual disciplines before you begin.";

export const CHECK_IN_COMMITMENTS = [
  { key: 'followedPlan' as const, label: "I commit to following today's fasting plan." },
  { key: 'prayedFocus' as const, label: "I commit to praying over today's focus." },
  { key: 'readScripture' as const, label: "I commit to reading today's scripture." },
  { key: 'walkWithGod' as const, label: 'I commit to walking with God today.' },
] as const;

export type CheckInCommitmentKey = (typeof CHECK_IN_COMMITMENTS)[number]['key'];
