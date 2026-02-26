import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Loader2, Shield, Users, CreditCard, CalendarDays, Clock, History } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, addWeeks } from "date-fns";
import { computeMemberStatus } from "@/lib/funding-utils";

interface FundTabProps {
  tripId: string;
}

const FundTab = ({ tripId }: FundTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [noDrama, setNoDrama] = useState(false);
  const [contributionAmount, setContributionAmount] = useState<string>("");
  const [isContributing, setIsContributing] = useState(false);
  const [payingAmount, setPayingAmount] = useState<string | null>(null);
  const [customPayments, setCustomPayments] = useState("4");

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("trip_id", tripId);
      if (error) throw error;
      const userIds = data.map((p) => p.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      return data.map((p) => ({
        ...p,
        displayName: profiles?.find((pr) => pr.user_id === p.user_id)?.display_name || "Unknown",
      }));
    },
  });

  const { data: paymentHistory = [] } = useQuery({
    queryKey: ["payment-history", tripId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tripId && !!user?.id,
  });

  const myPayment = payments.find((p) => p.user_id === user?.id);

  // Compute per-person from total_cost
  const totalCost = Number(trip?.total_cost) || payments.reduce((s, m) => s + Number(m.amount), 0);
  const memberCount = payments.length || 1;
  const perPersonCost = totalCost / memberCount;
  const totalFunded = payments.reduce((s, m) => s + Number(m.amount_paid), 0);
  const pctFunded = totalCost > 0 ? Math.round((totalFunded / totalCost) * 100) : 0;

  const deadlineDays = trip?.payment_deadline
    ? Math.ceil((new Date(trip.payment_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Payment plan calculations
  const planType = myPayment?.installment_plan || "monthly";
  const myRemaining = myPayment ? Math.max(0, perPersonCost - Number(myPayment.amount_paid)) : perPersonCost;

  const getInstallmentInfo = (plan: string) => {
    if (myRemaining <= 0) return { amount: 0, nextDate: null, label: "Fully paid" };
    const now = new Date();
    switch (plan) {
      case "weekly": {
        const weeksLeft = deadlineDays ? Math.max(1, Math.floor(deadlineDays / 7)) : 4;
        return { amount: Math.ceil(myRemaining / weeksLeft), nextDate: addWeeks(now, 1), label: `${weeksLeft} weekly payments` };
      }
      case "biweekly": {
        const periods = deadlineDays ? Math.max(1, Math.floor(deadlineDays / 14)) : 2;
        return { amount: Math.ceil(myRemaining / periods), nextDate: addDays(now, 14), label: `${periods} biweekly payments` };
      }
      case "custom": {
        const n = Math.max(1, parseInt(customPayments) || 4);
        return { amount: Math.ceil(myRemaining / n), nextDate: addDays(now, 7), label: `${n} payments` };
      }
      default: { // monthly
        const months = deadlineDays ? Math.max(1, Math.floor(deadlineDays / 30)) : 1;
        return { amount: Math.ceil(myRemaining / months), nextDate: addDays(now, 30), label: `${months} monthly payments` };
      }
    }
  };

  const installment = getInstallmentInfo(planType);

  const updatePlan = useMutation({
    mutationFn: async (plan: string) => {
      if (!myPayment || !user) return;
      const info = getInstallmentInfo(plan);
      const { error } = await supabase.from("payments").update({
        installment_plan: plan,
        next_due_date: info.nextDate ? format(info.nextDate, "yyyy-MM-dd") : null,
      }).eq("id", myPayment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", tripId] });
      toast({ title: "Plan updated" });
    },
  });

  const toggleAutoPay = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!myPayment) return;
      const { error } = await supabase.from("payments").update({ auto_pay: enabled }).eq("id", myPayment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", tripId] });
      toast({ title: myPayment?.auto_pay ? "Auto-pay disabled" : "Auto-pay enabled" });
    },
  });

  const handlePay = async (paymentAmount: number) => {
    if (!user || paymentAmount <= 0) return;
    setPayingAmount(paymentAmount.toString());
    try {
      const amountCents = Math.round(paymentAmount * 100);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { trip_id: tripId, amount_cents: amountCents },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Payment error", description: err.message, variant: "destructive" });
    } finally {
      setPayingAmount(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const size = 160;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pctFunded / 100) * circumference;

  const isPublic = trip?.visibility === "public";
  const minSpotsRequired = trip?.min_spots_required;
  const fullyFundedMembers = payments.filter(p => Number(p.amount_paid) >= perPersonCost && perPersonCost > 0).length;

  const healthScore = (() => {
    const membersOnTrack = payments.filter((p) => {
      const status = computeMemberStatus(Number(p.amount_paid), perPersonCost, deadlineDays);
      return status === "Paid" || status === "On Track";
    }).length;
    const memberPct = payments.length > 0 ? (membersOnTrack / payments.length) * 100 : 100;
    return Math.round((pctFunded * 0.5) + (memberPct * 0.3) + 20);
  })();
  const healthLabel = healthScore >= 80 ? "On Track" : healthScore >= 50 ? "Needs Attention" : "Behind";

  return (
    <div className="space-y-8">
      {/* Progress Ring */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-6 flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
                <motion.circle
                  cx={size/2} cy={size/2} r={radius} fill="none"
                  stroke="hsl(var(--primary))" strokeWidth={stroke} strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-semibold">{pctFunded}%</span>
                <span className="text-xs text-muted-foreground">funded</span>
              </div>
            </div>
            {!noDrama && (
              <p className="text-sm text-muted-foreground mt-3">
                ${totalFunded.toLocaleString()} of ${totalCost.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Contribution Section */}
      <Card className="border-0 shadow-sm glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Contribute</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contribution-amount" className="text-xs">Contribution Amount (USD)</Label>
            <Input
              id="contribution-amount"
              type="number"
              min="1"
              placeholder="0.00"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <Button
            className="w-full rounded-xl gap-1.5"
            disabled={!contributionAmount || Number(contributionAmount) <= 0 || isContributing}
            onClick={async () => {
              setIsContributing(true);
              try {
                const payload = { trip_id: tripId, amount_cents: Math.round(Number(contributionAmount) * 100) };
                console.log("[Contribute] trip.id:", tripId);
                console.log("[Contribute] contributionAmount:", contributionAmount);
                console.log("[Contribute] payload:", payload);

                const { data, error } = await supabase.functions.invoke("create-checkout", { body: payload });

                console.log("[Contribute] full response data:", data);
                console.log("[Contribute] full response error:", error);

                if (error) throw error;

                if (data?.url) {
                  console.log("[Contribute] redirecting to:", data.url);
                  window.open(data.url, "_blank");
                } else {
                  console.error("[Contribute] no url in response, full data:", data);
                }
              } catch (err: any) {
                console.error("[Contribute] caught error object:", err);
                toast({ title: "Contribution failed", description: err.message, variant: "destructive" });
              } finally {
                setIsContributing(false);
              }
            }}
          >
            {isContributing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Contribute
          </Button>
        </CardContent>
      </Card>

      {isPublic && minSpotsRequired && (
        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{fullyFundedMembers} / {minSpotsRequired} minimum spots funded</p>
                <p className="text-[10px] text-muted-foreground">Trip activates when minimum is reached</p>
              </div>
            </div>
            <Badge variant={fullyFundedMembers >= minSpotsRequired ? "default" : "secondary"} className="text-[10px]">
              {fullyFundedMembers >= minSpotsRequired ? "Activated" : `${minSpotsRequired - fullyFundedMembers} more needed`}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm glass-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Trip Health</p>
            <p className="text-xs text-muted-foreground">{healthScore}% — {healthLabel}</p>
          </div>
          <Badge variant={healthScore >= 80 ? "default" : "secondary"} className="text-xs">{healthLabel}</Badge>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        {deadlineDays !== null && (
          <Card className="border-0 shadow-sm flex-1 min-w-[140px]">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-display font-semibold">{deadlineDays > 0 ? deadlineDays : 0}</p>
              <p className="text-[10px] text-muted-foreground">days until funding deadline</p>
            </CardContent>
          </Card>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="border-0 shadow-sm flex-1 min-w-[140px] cursor-help">
                <CardContent className="p-3 text-center flex flex-col items-center gap-1">
                  <Shield className="h-5 w-5 text-primary" />
                  <p className="text-[10px] font-medium">Funds Protected</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px] text-xs">
              No one fronts the villa. Funds release when trip is fully funded.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium">No-Drama Mode</span>
        <Switch checked={noDrama} onCheckedChange={setNoDrama} />
      </div>

      {/* Payment Plan Section */}
      {myPayment && myRemaining > 0 && (
        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Payment Plan</p>
            </div>
            <Select
              value={planType}
              onValueChange={(v) => updatePlan.mutate(v)}
            >
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Biweekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {planType === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="number" min="1" max="52" value={customPayments}
                  onChange={(e) => setCustomPayments(e.target.value)}
                  className="rounded-xl w-20 h-9"
                />
                <span className="text-xs text-muted-foreground">payments</span>
              </div>
            )}
            <div className="bg-primary/5 rounded-xl p-3 space-y-1">
              <p className="text-sm font-medium">
                Suggested: <span className="text-primary">${installment.amount.toLocaleString()}</span> × {installment.label}
              </p>
              {installment.nextDate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Next due: {format(installment.nextDate, "MMM d, yyyy")}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-pay</p>
                <p className="text-[10px] text-muted-foreground">Auto-pay will run on due dates</p>
              </div>
              <Switch checked={myPayment.auto_pay} onCheckedChange={(v) => toggleAutoPay.mutate(v)} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Payment History</p>
            </div>
            {paymentHistory.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm">${Number(h.amount).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(h.created_at), "MMM d, yyyy")}</p>
                </div>
                <Badge className="text-[10px] bg-accent/20 text-foreground border-0">{h.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      {payments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">💰</p>
          <p className="text-sm text-muted-foreground">No payments set up yet.</p>
          <p className="text-xs text-muted-foreground mt-1">The trip organizer can set up payment plans for each member.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Members</p>
          {payments.map((m, i) => {
            const paid = Number(m.amount_paid);
            const pct = perPersonCost > 0 ? Math.min(100, Math.round((paid / perPersonCost) * 100)) : 0;
            const status = computeMemberStatus(paid, perPersonCost, deadlineDays);
            const statusColor = status === "Paid" ? "bg-accent/20" : status === "On Track" ? "bg-secondary" : "bg-destructive/10";
            const isMe = m.user_id === user?.id;
            const remaining = Math.max(0, perPersonCost - paid);
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`border-0 shadow-sm ${isMe ? "ring-1 ring-primary/30" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{m.displayName} {isMe && <span className="text-primary text-xs">(You)</span>}</p>
                        {noDrama ? (
                          <p className="text-xs text-muted-foreground">{pct}% complete</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            ${paid.toLocaleString()} / ${Math.round(perPersonCost).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Badge className={`text-[10px] ${statusColor} text-foreground border-0`}>{status}</Badge>
                    </div>
                    {isMe && remaining > 0 && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm" className="rounded-xl flex-1 gap-1.5"
                          onClick={() => handlePay(remaining)} disabled={payingAmount !== null}
                        >
                          {payingAmount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                          Pay ${remaining.toLocaleString()}
                        </Button>
                        {remaining > 100 && installment.amount < remaining && (
                          <Button
                            size="sm" variant="outline" className="rounded-xl gap-1.5"
                            onClick={() => handlePay(installment.amount)} disabled={payingAmount !== null}
                          >
                            Pay ${installment.amount.toLocaleString()}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Reminder badge */}
      {deadlineDays !== null && deadlineDays <= 14 && deadlineDays > 0 && myRemaining > 0 && (
        <Card className="border-0 shadow-sm bg-destructive/5">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-display font-semibold text-destructive">
              {deadlineDays <= 1 ? "24 hours left." : `${deadlineDays} days left.`} Log off. Lock in.
            </p>
            <p className="text-xs text-muted-foreground mt-1">${myRemaining.toLocaleString()} remaining</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FundTab;
