// =============================================================================
// Peer Milestone Notifier — Creates notifications for course peers on milestones
// =============================================================================

export type MilestoneType = 'level_up' | 'rare_badge' | 'streak_milestone';

export interface PeerMilestonePayload {
  triggeringStudentId: string;
  milestoneType: MilestoneType;
  milestoneDetail: string;
}

/**
 * Build notification message based on milestone type.
 */
export function buildMilestoneMessage(
  studentName: string,
  milestoneType: MilestoneType,
  milestoneDetail: string,
): string {
  switch (milestoneType) {
    case 'level_up':
      return `Your classmate ${studentName} just hit ${milestoneDetail}!`;
    case 'rare_badge':
      return `${studentName} just earned the ${milestoneDetail} badge!`;
    case 'streak_milestone':
      return `${studentName} is on a ${milestoneDetail}-day streak!`;
    default:
      return `${studentName} achieved a milestone: ${milestoneDetail}`;
  }
}
