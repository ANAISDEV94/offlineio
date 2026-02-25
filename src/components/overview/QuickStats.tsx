import { Card, CardContent } from "@/components/ui/card";
import { Users, CalendarDays, Wallet } from "lucide-react";

interface QuickStatsProps {
  membersCount: number;
  daysUntil: number;
  fundingPct: number;
}

const QuickStats = ({ membersCount, daysUntil, fundingPct }: QuickStatsProps) => (
  <div className="grid grid-cols-3 gap-2">
    <Card className="rounded-2xl border-0 bg-primary/5">
      <CardContent className="p-3 text-center">
        <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
        <p className="text-lg font-display font-semibold text-foreground">{membersCount}</p>
        <p className="text-[10px] text-muted-foreground">Members</p>
      </CardContent>
    </Card>
    <Card className="rounded-2xl border-0 bg-primary/5">
      <CardContent className="p-3 text-center">
        <CalendarDays className="h-4 w-4 mx-auto mb-1 text-primary" />
        <p className="text-lg font-display font-semibold text-foreground">{daysUntil}</p>
        <p className="text-[10px] text-muted-foreground">Days Left</p>
      </CardContent>
    </Card>
    <Card className="rounded-2xl border-0 bg-primary/5">
      <CardContent className="p-3 text-center">
        <Wallet className="h-4 w-4 mx-auto mb-1 text-primary" />
        <p className="text-lg font-display font-semibold text-foreground">{fundingPct}%</p>
        <p className="text-[10px] text-muted-foreground">Funded</p>
      </CardContent>
    </Card>
  </div>
);

export default QuickStats;
