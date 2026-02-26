import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { TripHealthStatus } from "@/lib/funding-utils";

interface TripHealthCardProps {
  score: number;
  status: TripHealthStatus;
  color: string;
  daysUntilTrip: number;
  deadlineDays: number | null;
}

const statusBg: Record<TripHealthStatus, string> = {
  Healthy: "bg-accent/20 text-accent",
  "At Risk": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "Needs Action": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Critical: "bg-destructive/10 text-destructive",
};

const TripHealthCard = ({ score, status, daysUntilTrip, deadlineDays }: TripHealthCardProps) => {
  return (
    <Card className="rounded-2xl border-0 shadow-sm glass-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Trip Health</p>
          </div>
          <Badge className={`text-[10px] border-0 ${statusBg[status]}`}>{status}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-display font-semibold">{score}%</p>
            <p className="text-[10px] text-muted-foreground">health score</p>
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Trip in</span>
              <span className="font-medium">{daysUntilTrip > 0 ? `${daysUntilTrip} days` : "Past"}</span>
            </div>
            {deadlineDays !== null && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Payment deadline</span>
                <span className={`font-medium ${deadlineDays <= 7 ? "text-destructive" : ""}`}>
                  {deadlineDays > 0 ? `${deadlineDays} days` : "Past due"}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TripHealthCard;
