import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

interface GroupFundingCardProps {
  fundingPct: number;
  onTrackCount: number;
  membersCount: number;
}

const GroupFundingCard = ({ fundingPct, onTrackCount, membersCount }: GroupFundingCardProps) => (
  <Card className="rounded-2xl border-0 bg-card shadow-sm">
    <CardHeader className="p-4 pb-2">
      <CardTitle className="text-sm font-medium flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" /> Group Funding
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-0 space-y-2">
      <Progress value={fundingPct} className="h-2.5 rounded-full" />
      <p className="text-xs text-muted-foreground">
        {fundingPct}% funded — {onTrackCount} of {membersCount} members on track
      </p>
    </CardContent>
  </Card>
);

export default GroupFundingCard;
