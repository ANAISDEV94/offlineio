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
import { useTripDashboard } from "@/hooks/useTripDashboard";
import { motion } from "framer-motion";
import { Loader2, CreditCard, CalendarDays, Clock, History, Wallet, Users, AlertTriangle, Pencil, Check, X, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, addWeeks } from "date-fns";

interface FundTabProps {
  tripId: string;
}

const FundTab = ({ tripId }: FundTabProps) => {
  const { user } = useAuth();
  const { dashboard, isLoading, refresh } = useTripDashboard(tripId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contributionAmount, setContributionAmount] = useState<string>("");
  const [isContributing, setIsContributing] = useState(false);
  const [payingAmount, setPayingAmount] = useState<string | null>(null);
  const [customPayments, setCustomPayments] = useState("4");
  const [editingTotal, setEditingTotal] = useState(false);
  const [newTotalCost, setNewTotalCost] = useState("");

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

  const { data: myPaymentRecord } = useQuery({
    queryKey: ["my-payment", tripId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("trip_id", tripId).eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tripId && !!user?.id,
  });

  if (isLoading || !dashboard) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const cu = dashboard.current_user;
  const isOrganizer = cu?.role === "organizer";
  const totalCost = dashboard.total_cost;
  const perPersonCost = cu?.share || dashboard.per_person_cost;
  const totalFunded = dashboard.funded_total;
  const pctFunded = Math.round(dashboard.funded_percent * 100);
  const deadlineDays = dashboard.days_to_deadline;
  const myPaid = cu?.paid || 0;
  const myRemaining = cu?.owe || 0;
  const myStatus = cu?.status || "On Track";

  // Payment plan
  const planType = myPaymentRecord?.installment_plan || "monthly";

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
      if (!myPaymentRecord || !user) return;
      const info = getInstallmentInfo(plan);
      const { error } = await supabase.from("payments").update({
        installment_plan: plan,
        next_due_date: info.nextDate ? format(info.nextDate, "yyyy-MM-dd") : null,
      }).eq("id", myPaymentRecord.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-payment", tripId] });
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

  // Member counts for status
  const paidCount = dashboard.members.filter(m => m.status === "Paid").length;
  const onTrackCount = dashboard.members.filter(m => m.status === "On Track").length;
  const behindCount = dashboard.members.filter(m => m.status === "Behind").length;

  return (
    <div className="space-y-6">
      {/* How Funding + Booking Works */}
      <Card className="border-0 shadow-sm bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">How funding + booking works</p>
          <ul className="space-y-1.5">
            <li className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Everyone pays their share into the trip pool.
            </li>
            <li className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              When the trip hits 100% funded, bookings unlock.
            </li>
            <li className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              The organizer books flights/stay/experiences and posts confirmations and receipts here.
            </li>
          </ul>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Your payment is processed by Stripe. We never store your card details.
          </p>
        </CardContent>
      </Card>

      {isOrganizer && (
        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trip Total</p>
              {!editingTotal ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">${totalCost.toLocaleString()}</span>
                  <button onClick={() => { setEditingTotal(true); setNewTotalCost(totalCost.toString()); }}>
                    <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min="0" value={newTotalCost}
                    onChange={e => setNewTotalCost(e.target.value)}
                    className="rounded-xl text-sm h-8 w-28"
                  />
                  <Button size="sm" className="h-8 rounded-xl" onClick={async () => {
                    const val = Number(newTotalCost);
                    if (isNaN(val) || val < 0) return;
                    await supabase.rpc("update_trip_total", { p_trip_id: tripId, p_total: val });
                    refresh();
                    setEditingTotal(false);
                    toast({ title: "Trip total updated" });
                  }}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 rounded-xl" onClick={() => setEditingTotal(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            {dashboard.payment_deadline && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Deadline: {format(new Date(dashboard.payment_deadline), "MMM d, yyyy")}
                {deadlineDays !== null && deadlineDays > 0 && <span>· {deadlineDays} days left</span>}
              </div>
            )}
            {/* Payment method on file */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              Payment method: {cu?.has_payment_method ? "On file ✓" : "Not on file"}
            </div>
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
        {myPaymentRecord && myRemaining > 0 && (
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
                <span>${dashboard.remaining_total.toLocaleString()} remaining</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trip Health */}
        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Trip Health</p>
              <p className="text-xs text-muted-foreground"><p className="text-xs text-muted-foreground">{dashboard.health_score}% - {dashboard.health_label}</p></p>
            </div>
            <Badge className={`text-[10px] border-0 ${
              dashboard.health_label === "Healthy" ? "bg-accent/20 text-accent" :
              dashboard.health_label === "At Risk" ? "bg-yellow-100 text-yellow-700" :
              dashboard.health_label === "Needs Action" ? "bg-orange-100 text-orange-700" :
              "bg-destructive/10 text-destructive"
            }`}>{dashboard.health_label}</Badge>
          </CardContent>
        </Card>

        {/* Member Status */}
        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Member Status</p>
            </div>
            {dashboard.members.map((m) => {
              const isMe = m.user_id === user?.id;
              return (
                <div key={m.user_id} className="flex items-center justify-between py-1.5">
                  <p className="text-sm font-medium">
                    {m.display_name || "Unknown"} {isMe && <span className="text-primary text-xs">(You)</span>}
                  </p>
                  <Badge className={`text-[10px] border-0 ${
                    m.status === "Paid" ? "bg-accent/20 text-accent" :
                    m.status === "On Track" ? "bg-secondary text-secondary-foreground" :
                    "bg-destructive/10 text-destructive"
                  }`}>{m.status}</Badge>
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
                Pay Full Balance - ${myRemaining.toLocaleString()}
              </Button>
              {myRemaining > 100 && installment.amount < myRemaining && (
                <Button variant="outline" className="w-full rounded-xl gap-2" onClick={() => handlePay(installment.amount)} disabled={payingAmount !== null}>
                  Pay Installment - ${installment.amount.toLocaleString()}
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
