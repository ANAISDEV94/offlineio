import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Loader2, Shield, Users, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FundTabProps {
  tripId: string;
}

const FundTab = ({ tripId }: FundTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [noDrama, setNoDrama] = useState(false);
  const [payingAmount, setPayingAmount] = useState<string | null>(null);

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

  const totalGoal = payments.reduce((s, m) => s + Number(m.amount), 0);
  const totalFunded = payments.reduce((s, m) => s + Number(m.amount_paid), 0);
  const pctFunded = totalGoal > 0 ? Math.round((totalFunded / totalGoal) * 100) : 0;

  const membersOnTrack = payments.filter((p) => {
    const pct = Number(p.amount) > 0 ? Number(p.amount_paid) / Number(p.amount) : 0;
    return pct >= 0.5 || p.status === "paid";
  }).length;
  const memberPct = payments.length > 0 ? (membersOnTrack / payments.length) * 100 : 100;
  const healthScore = Math.round((pctFunded * 0.5) + (memberPct * 0.3) + 20);
  const healthLabel = healthScore >= 80 ? "On Track" : healthScore >= 50 ? "Needs Attention" : "Behind";

  const isPublic = trip?.visibility === "public";
  const minSpotsRequired = trip?.min_spots_required;
  const fullyFundedMembers = payments.filter(p => Number(p.amount) > 0 && Number(p.amount_paid) >= Number(p.amount)).length;

  const deadlineDays = trip?.payment_deadline
    ? Math.ceil((new Date(trip.payment_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handlePay = async (paymentAmount: number) => {
    if (!user || paymentAmount <= 0) return;
    setPayingAmount(paymentAmount.toString());
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { tripId, amount: paymentAmount },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
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

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-0 shadow-sm glass-card">
          <CardContent className="p-6 flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
                <motion.circle
                  cx={size/2} cy={size/2} r={radius} fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={stroke}
                  strokeLinecap="round"
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
                ${totalFunded.toLocaleString()} of ${totalGoal.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

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
          <Badge variant={healthScore >= 80 ? "default" : "secondary"} className="text-xs">
            {healthLabel}
          </Badge>
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

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Installment Plan</p>
          <Select defaultValue="monthly">
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Biweekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

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
            const pct = Number(m.amount) > 0 ? Math.round((Number(m.amount_paid) / Number(m.amount)) * 100) : 0;
            const status = pct >= 100 ? "Paid in Full" : pct >= 50 ? "On Track" : "Behind";
            const statusColor = pct >= 100 ? "bg-accent/20" : pct >= 50 ? "bg-secondary" : "bg-primary/10";
            const isMe = m.user_id === user?.id;
            const remaining = Math.max(0, Number(m.amount) - Number(m.amount_paid));
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
                            ${Number(m.amount_paid).toLocaleString()} / ${Number(m.amount).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Badge className={`text-[10px] ${statusColor} text-foreground border-0`}>
                        {status}
                      </Badge>
                    </div>
                    {isMe && remaining > 0 && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-xl flex-1 gap-1.5"
                          onClick={() => handlePay(remaining)}
                          disabled={payingAmount !== null}
                        >
                          {payingAmount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                          Pay ${remaining.toLocaleString()}
                        </Button>
                        {remaining > 100 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl gap-1.5"
                            onClick={() => handlePay(Math.round(remaining / 2))}
                            disabled={payingAmount !== null}
                          >
                            Pay Half
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
    </div>
  );
};

export default FundTab;
