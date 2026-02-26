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
