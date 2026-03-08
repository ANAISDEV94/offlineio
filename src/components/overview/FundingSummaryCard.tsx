import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { CreditCard, Loader2, Clock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface MemberFunding {
  userId: string;
  displayName: string;
  amountPaid: number;
  perPersonCost: number;
  status: "Paid" | "On Track" | "Behind";
  pctComplete: number;
}

interface FundingSummaryCardProps {
  tripId: string;
  tripName: string;
  totalCost: number;
  perPersonCost: number;
  totalFunded: number;
  totalRemaining: number;
  pctFunded: number;
  paymentDeadline: string | null;
  deadlineDays: number | null;
  members: MemberFunding[];
  myPaid: number;
  myRemaining: number;
  userId: string | undefined;
  hasPaymentRecord: boolean;
}

const FundingSummaryCard = ({
  tripId, tripName, totalCost, perPersonCost, totalFunded, totalRemaining,
  pctFunded, paymentDeadline, deadlineDays, members, myPaid, myRemaining,
  userId, hasPaymentRecord,
}: FundingSummaryCardProps) => {
  const { toast } = useToast();
  const [noDrama, setNoDrama] = useState(false);
  const [paying, setPaying] = useState(false);

  const size = 140;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pctFunded / 100) * circumference;

  const handlePay = async (amount: number) => {
    if (!userId || amount <= 0) return;
    setPaying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please sign in to contribute", variant: "destructive" });
        setPaying(false);
        return;
      }

      const amountCents = Math.round(amount * 100);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { trip_id: tripId, amount_cents: amountCents },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      console.error("[FundingSummary] error:", JSON.stringify(err));
      toast({ title: "Payment error", description: err.message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Funding Summary Ring */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                  <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
                  <motion.circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-display font-semibold">{pctFunded}%</span>
                  <span className="text-[10px] text-muted-foreground">funded</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trip total</span>
                  <span className="font-semibold">${totalCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Per person</span>
                  <span className="font-semibold">${Math.round(perPersonCost).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Funded</span>
                  <span className="font-semibold text-primary">${totalFunded.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-semibold">${Math.max(0, totalRemaining).toLocaleString()}</span>
                </div>
                {deadlineDays !== null && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <Clock className="h-3 w-3" />
                    {paymentDeadline && format(new Date(paymentDeadline), "MMM d")} · {deadlineDays > 0 ? `${deadlineDays} days left` : "Past due"}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Public Progress Bar */}
      <Card className="border-0 shadow-sm glass-card">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Trip Funding Progress</span>
            <span className="font-semibold text-primary">{pctFunded}%</span>
          </div>
          <Progress value={pctFunded} className="h-3 rounded-full" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>${totalFunded.toLocaleString()} funded</span>
            <span>${Math.max(0, totalRemaining).toLocaleString()} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Group Funding List */}
      <Card className="border-0 shadow-sm glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Group Funding</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">No-Drama</span>
              <Switch checked={noDrama} onCheckedChange={setNoDrama} className="scale-75" />
            </div>
          </div>
          {members.map((m) => {
            const statusColor = m.status === "Paid" ? "bg-accent/20" : m.status === "On Track" ? "bg-secondary" : "bg-destructive/10";
            return (
              <div key={m.userId} className="flex items-center justify-between py-1.5">
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.displayName} {m.userId === userId && <span className="text-primary text-xs">(You)</span>}</p>
                  {noDrama ? (
                    <p className="text-xs text-muted-foreground">{m.pctComplete}% complete</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      ${m.amountPaid.toLocaleString()} / ${Math.round(m.perPersonCost).toLocaleString()}
                    </p>
                  )}
                </div>
                <Badge className={`text-[10px] ${statusColor} text-foreground border-0`}>{m.status}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Personal CTA */}
      {hasPaymentRecord && userId && (
        <Card className="border-0 shadow-sm bg-primary/5">
          <CardContent className="p-5 text-center space-y-3">
            <p className="text-sm text-foreground">
              You've paid <span className="font-semibold text-primary">${myPaid.toLocaleString()}</span>
              {myRemaining > 0 && <>, you have <span className="font-semibold">${myRemaining.toLocaleString()}</span> left</>}
            </p>
            {myRemaining > 0 ? (
              <Button className="rounded-xl gap-2 w-full" onClick={() => handlePay(myRemaining)} disabled={paying}>
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Pay Now - ${myRemaining.toLocaleString()}
              </Button>
            ) : (
              <Badge className="bg-accent/20 text-foreground border-0 text-sm py-1.5 px-4">✓ Fully Paid</Badge>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FundingSummaryCard;
