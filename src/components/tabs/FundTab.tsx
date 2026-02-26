import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTripRole } from "@/hooks/useTripRole";
import { motion } from "framer-motion";
import { Loader2, CreditCard, CalendarDays, Clock, History, Wallet, Users, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, addWeeks } from "date-fns";
import { computeMemberStatus, computeTripHealth } from "@/lib/funding-utils";

interface FundTabProps {
  tripId: string;
}

const FundTab = ({ tripId }: FundTabProps) => {
  const { user } = useAuth();
  const { isOrganizer } = useTripRole(tripId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const totalCost = Number(trip?.total_cost) || payments.reduce((s, m) => s + Number(m.amount), 0);
  const memberCount = payments.length || 1;
  const perPersonCost = totalCost / memberCount;
  const totalFunded = payments.reduce((s, m) => s + Number(m.amount_paid), 0);
  const pctFunded = totalCost > 0 ? Math.round((totalFunded / totalCost) * 100) : 0;

  const deadlineDays = trip?.payment_deadline
    ? Math.ceil((new Date(trip.payment_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const myPaid = myPayment ? Number(myPayment.amount_paid) : 0;
  const myRemaining = Math.max(0, perPersonCost - myPaid);
  const myStatus = computeMemberStatus(myPaid, perPersonCost, deadlineDays);

  // Payment plan
  const planType = myPayment?.installment_plan || "monthly";

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
      default: {
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

  const handleContribute = async () => {
    if (!user || !contributionAmount || Number(contributionAmount) <= 0) return;
    setIsContributing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please sign in to contribute", variant: "destructive" });
        setIsContributing(false);
        return;
      }
      const payload = { trip_id: tripId, amount_cents: Math.round(Number(contributionAmount) * 100) };
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: payload,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally {
      setIsContributing(false);
    }
  };

  const handlePay = async (paymentAmount: number) => {
    if (!user || paymentAmount <= 0) return;
    setPayingAmount(paymentAmount.toString());
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please sign in to contribute", variant: "destructive" });
        setPayingAmount(null);
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { trip_id: tripId, amount_cents: Math.round(paymentAmount * 100) },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Payment error", description: err.message, variant: "destructive" });
    } finally {
      setPayingAmount(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // Trip health
  const lateCount = payments.filter(p => computeMemberStatus(Number(p.amount_paid), perPersonCost, deadlineDays) === "Behind").length;
  const onTrackCount = payments.filter(p => {
    const s = computeMemberStatus(Number(p.amount_paid), perPersonCost, deadlineDays);
    return s === "Paid" || s === "On Track";
  }).length;
  const pctOnTrack = payments.length > 0 ? (onTrackCount / payments.length) * 100 : 100;
  const health = computeTripHealth(pctFunded, pctOnTrack, deadlineDays, lateCount, payments.length);

  return (
    <div className="space-y-6">
      {/* Section 1: Your Responsibility */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Your Responsibility</p>
        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Payment Summary</p>
              <Badge className={`text-[10px] border-0 ml-auto ${
                myStatus === "Paid" ? "bg-accent/20 text-accent" : myStatus === "Behind" ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground"
              }`}>{myStatus}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-lg font-display font-semibold">${Math.round(perPersonCost).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Your Share</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-lg font-display font-semibold text-primary">${myPaid.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">You've Paid</p>
              </div>
            </div>
            {myRemaining > 0 && (
              <div className="bg-destructive/5 rounded-xl p-3 text-center">
                <p className="text-lg font-display font-semibold text-destructive">${myRemaining.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">You Still Owe</p>
              </div>
            )}
            {trip?.payment_deadline && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Deadline: {format(new Date(trip.payment_deadline), "MMM d, yyyy")}
                {deadlineDays !== null && deadlineDays > 0 && <span>· {deadlineDays} days left</span>}
              </div>
            )}
            {myRemaining > 0 && (
              <div className="flex items-start gap-2 bg-muted/30 rounded-xl p-2.5">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground">
                  If you don't pay by the deadline, the organizer can remove you and the per-person share auto-adjusts for the remaining group.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Plan */}
        {myPayment && myRemaining > 0 && (
          <Card className="border-0 shadow-sm glass-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Payment Plan</p>
              </div>
              <Select value={planType} onValueChange={(v) => updatePlan.mutate(v)}>
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
                  <Input type="number" min="1" max="52" value={customPayments} onChange={(e) => setCustomPayments(e.target.value)} className="rounded-xl w-20 h-9" />
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* Section 2: Group Funding */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Group Funding</p>

        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total funded</span>
              <span className="font-semibold text-primary">{pctFunded}%</span>
            </div>
            <Progress value={pctFunded} className="h-2.5 rounded-full" />
            {isOrganizer && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>${totalFunded.toLocaleString()} funded</span>
                <span>${Math.max(0, totalCost - totalFunded).toLocaleString()} remaining</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trip Health */}
        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Trip Health</p>
              <p className="text-xs text-muted-foreground">{health.score}% — {health.status}</p>
            </div>
            <Badge className={`text-[10px] border-0 ${
              health.status === "Healthy" ? "bg-accent/20 text-accent" :
              health.status === "At Risk" ? "bg-yellow-100 text-yellow-700" :
              health.status === "Needs Action" ? "bg-orange-100 text-orange-700" :
              "bg-destructive/10 text-destructive"
            }`}>{health.status}</Badge>
          </CardContent>
        </Card>

        {/* Member Status (badges only, no dollar amounts) */}
        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Member Status</p>
            </div>
            {payments.map((m: any) => {
              const paid = Number(m.amount_paid);
              const status = computeMemberStatus(paid, perPersonCost, deadlineDays);
              const isMe = m.user_id === user?.id;
              return (
                <div key={m.id} className="flex items-center justify-between py-1.5">
                  <p className="text-sm font-medium">
                    {m.displayName} {isMe && <span className="text-primary text-xs">(You)</span>}
                  </p>
                  <Badge className={`text-[10px] border-0 ${
                    status === "Paid" ? "bg-accent/20 text-accent" :
                    status === "On Track" ? "bg-secondary text-secondary-foreground" :
                    "bg-destructive/10 text-destructive"
                  }`}>{status}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Make a Payment */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Make a Payment</p>

        {myRemaining > 0 && (
          <Card className="border-0 shadow-sm bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <Button className="w-full rounded-xl gap-2" onClick={() => handlePay(myRemaining)} disabled={payingAmount !== null}>
                {payingAmount ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Pay Full Balance — ${myRemaining.toLocaleString()}
              </Button>
              {myRemaining > 100 && installment.amount < myRemaining && (
                <Button variant="outline" className="w-full rounded-xl gap-2" onClick={() => handlePay(installment.amount)} disabled={payingAmount !== null}>
                  Pay Installment — ${installment.amount.toLocaleString()}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Custom Amount</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contribution-amount" className="text-xs">Amount (USD)</Label>
              <Input
                id="contribution-amount"
                type="number" min="1" placeholder="0.00"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button className="w-full rounded-xl gap-1.5"
              disabled={!contributionAmount || Number(contributionAmount) <= 0 || isContributing}
              onClick={handleContribute}
            >
              {isContributing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Submit Payment
            </Button>
          </CardContent>
        </Card>

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <Card className="border-0 shadow-sm glass-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Your Payment History</p>
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
      </div>

      {/* Deadline Reminder */}
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
