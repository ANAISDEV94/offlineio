import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import { format } from "date-fns";

interface PersonalStatusCardProps {
  perPersonCost: number;
  amountPaid: number;
  remaining: number;
  paymentDeadline: string | null;
  status: "Paid" | "On Track" | "Behind";
}

const PersonalStatusCard = ({ perPersonCost, amountPaid, remaining, paymentDeadline, status }: PersonalStatusCardProps) => {
  const statusStyles = {
    Paid: "bg-accent/20 text-accent",
    "On Track": "bg-secondary text-secondary-foreground",
    Behind: "bg-destructive/10 text-destructive",
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm glass-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Your Responsibility</p>
          </div>
          <Badge className={`text-[10px] border-0 ${statusStyles[status]}`}>{status}</Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Your Share</span>
            <span className="font-semibold">${Math.round(perPersonCost).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">You've Paid</span>
            <span className="font-semibold text-primary">${amountPaid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">You Still Owe</span>
            <span className={`font-semibold ${remaining > 0 ? "text-destructive" : "text-accent"}`}>
              ${remaining.toLocaleString()}
            </span>
          </div>
          {paymentDeadline && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deadline</span>
              <span className="font-medium">{format(new Date(paymentDeadline), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalStatusCard;
