import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bot } from "lucide-react";

interface BudgetAlertCardProps {
  shortfall: number;
  totalPaid: number;
  onReplan: () => void;
}

const BudgetAlertCard = ({ shortfall, totalPaid, onReplan }: BudgetAlertCardProps) => (
  <Card className="rounded-2xl border-0 bg-destructive/5 shadow-sm">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Budget Alert</p>
          <p className="text-xs text-muted-foreground">
            You're ${shortfall.toLocaleString()} short. Want help replanning the trip to fit ${totalPaid.toLocaleString()}?
          </p>
        </div>
      </div>
      <Button
        onClick={onReplan}
        size="sm"
        className="w-full rounded-xl text-xs gap-1.5"
        variant="outline"
      >
        <Bot className="h-3.5 w-3.5" /> Replan with ${totalPaid.toLocaleString()}
      </Button>
    </CardContent>
  </Card>
);

export default BudgetAlertCard;
