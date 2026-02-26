import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Info } from "lucide-react";

const SystemRulesCard = () => {
  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">No-Drama Mode</p>
          <Badge className="text-[10px] bg-accent/20 text-accent border-0 ml-auto">ON</Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The system enforces fairness so no one has to be the "bad guy."
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              If a member does not meet their payment deadline, the organizer can remove them and the per-person share auto-adjusts.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Automatic reminders are sent at 14, 7, 3, and 1 day before the deadline.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Late payments are flagged automatically. No awkward conversations needed.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemRulesCard;
