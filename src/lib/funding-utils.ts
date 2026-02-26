export type MemberStatus = "Paid" | "On Track" | "Behind";

export function computeMemberStatus(
  amountPaid: number,
  perPersonCost: number,
  deadlineDays: number | null
): MemberStatus {
  const remaining = perPersonCost - amountPaid;
  if (remaining <= 0) return "Paid";
  if (deadlineDays !== null && deadlineDays <= 7) return "Behind";
  return "On Track";
}

export type TripHealthStatus = "Healthy" | "At Risk" | "Needs Action" | "Critical";

export function computeTripHealth(
  pctFunded: number,
  pctMembersOnTrack: number,
  deadlineDays: number | null,
  lateCount: number,
  totalMembers: number
): { score: number; status: TripHealthStatus; color: string } {
  const deadlineBuffer = deadlineDays === null ? 100 : Math.min(100, Math.max(0, (deadlineDays / 30) * 100));
  const latePenalty = totalMembers > 0 ? Math.max(0, 100 - (lateCount / totalMembers) * 100) : 100;

  const score = Math.round(
    pctFunded * 0.4 +
    pctMembersOnTrack * 0.3 +
    deadlineBuffer * 0.2 +
    latePenalty * 0.1
  );

  if (score >= 80) return { score, status: "Healthy", color: "text-accent" };
  if (score >= 60) return { score, status: "At Risk", color: "text-yellow-600" };
  if (score >= 40) return { score, status: "Needs Action", color: "text-orange-500" };
  return { score, status: "Critical", color: "text-destructive" };
}

// Sample data for demo/fallback when no real data exists
export const SAMPLE_FUNDING = {
  totalCost: 4000,
  memberCount: 5,
  perPerson: 800,
  deadlineInDays: 30,
  members: [
    { name: "Jasmine", paid: 800, status: "Paid" as MemberStatus },
    { name: "Marcus", paid: 800, status: "Paid" as MemberStatus },
    { name: "Alyssa", paid: 400, status: "On Track" as MemberStatus },
    { name: "Devon", paid: 200, status: "On Track" as MemberStatus },
    { name: "Riley", paid: 200, status: "On Track" as MemberStatus },
  ],
};
