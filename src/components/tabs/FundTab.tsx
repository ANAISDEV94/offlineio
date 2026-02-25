import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Loader2, Shield } from "lucide-react";

interface FundTabProps {
  tripId: string;
}

const FundTab = ({ tripId }: FundTabProps) => {
  const [noDrama, setNoDrama] = useState(false);

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (error) throw error;
      return data;
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

  // Trip Health Score
  const membersOnTrack = payments.filter((p) => {
    const pct = Number(p.amount) > 0 ? Number(p.amount_paid) / Number(p.amount) : 0;
    return pct >= 0.5 || p.status === "paid";
  }).length;
  const memberPct = payments.length > 0 ? (membersOnTrack / payments.length) * 100 : 100;
  const healthScore = Math.round((pctFunded * 0.5) + (memberPct * 0.3) + 20); // 20 baseline for days factor
  const healthLabel = healthScore >= 80 ? "On Track" : healthScore >= 50 ? "Needs Attention" : "Behind";

  // Deadline countdown
  const deadlineDays = trip?.payment_deadline
    ? Math.ceil((new Date(trip.payment_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // SVG ring dimensions
  const size = 160;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pctFunded / 100) * circumference;

  return (
    <div className="space-y-5">
      {/* Circular Progress */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-0 shadow-lg glass-card">
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
                <span className="text-3xl font-display font-bold">{pctFunded}%</span>
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

      {/* Trip Health */}
      <Card className="border-0 shadow-sm glass-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Trip Health</p>
            <p className="text-xs text-muted-foreground">{healthScore}% — {healthLabel}</p>
          </div>
          <Badge variant={healthScore >= 80 ? "default" : "secondary"} className="text-xs">
            {healthScore >= 80 ? "✨" : "⚠️"} {healthLabel}
          </Badge>
        </CardContent>
      </Card>

      {/* Deadline + Escrow + No-Drama */}
      <div className="flex flex-wrap gap-3">
        {deadlineDays !== null && (
          <Card className="border-0 shadow-sm flex-1 min-w-[140px]">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{deadlineDays > 0 ? deadlineDays : 0}</p>
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
                  <p className="text-[10px] font-semibold">🛡 Funds Protected</p>
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
        <span className="text-sm font-medium">No-Drama Mode 🤫</span>
        <Switch checked={noDrama} onCheckedChange={setNoDrama} />
      </div>

      {/* Installment Plan */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-2">Installment Plan</p>
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

      {/* Member Cards */}
      {payments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">💰</p>
          <p className="text-sm text-muted-foreground">No payments set up yet.</p>
          <p className="text-xs text-muted-foreground mt-1">The trip organizer can set up payment plans for each member.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Members</p>
          {payments.map((m, i) => {
            const pct = Number(m.amount) > 0 ? Math.round((Number(m.amount_paid) / Number(m.amount)) * 100) : 0;
            const status = pct >= 100 ? "Paid in Full" : pct >= 50 ? "On Track" : "Behind";
            const statusColor = pct >= 100 ? "bg-mint/50" : pct >= 50 ? "bg-lavender/50" : "bg-peach/50";
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{m.displayName}</p>
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
