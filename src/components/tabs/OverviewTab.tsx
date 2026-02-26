import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTripDashboard } from "@/hooks/useTripDashboard";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Pencil, Check, X, Bell, DollarSign } from "lucide-react";
import TripDetailsCard from "@/components/overview/TripDetailsCard";
import InviteCodeCard from "@/components/overview/InviteCodeCard";
import MembersCard from "@/components/overview/MembersCard";
import TripHealthCard from "@/components/overview/TripHealthCard";
import PersonalStatusCard from "@/components/overview/PersonalStatusCard";
import SystemRulesCard from "@/components/overview/SystemRulesCard";
import ReplanChat from "@/components/ReplanChat";
import type { TripHealthStatus } from "@/lib/funding-utils";

interface OverviewTabProps {
  tripId: string;
}

const OverviewTab = ({ tripId }: OverviewTabProps) => {
  const { user } = useAuth();
  const { dashboard, refresh } = useTripDashboard(tripId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replanOpen, setReplanOpen] = useState(false);
  const [editingTotal, setEditingTotal] = useState(false);
  const [newTotalCost, setNewTotalCost] = useState("");

  if (!dashboard) return null;

  const isOrganizer = dashboard.current_user?.role === "organizer";
  const cu = dashboard.current_user;
  const pctFundedDisplay = Math.round(dashboard.funded_percent * 100);

  const handleRemoveMember = async (memberId: string) => {
    // memberId here is actually user_id from the members array via MembersCard
    const { error } = await supabase.from("trip_members").delete().eq("trip_id", tripId).eq("user_id", memberId);
    if (error) {
      toast({ title: "Error", description: "Failed to remove member", variant: "destructive" });
    } else {
      toast({ title: "Member removed" });
      refresh();
    }
  };

  const handleToggleRole = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === "organizer" ? "member" : "organizer";
    const { error } = await supabase.from("trip_members").update({ role: newRole }).eq("trip_id", tripId).eq("user_id", memberId);
    if (error) {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    } else {
      toast({ title: `Role changed to ${newRole}` });
      refresh();
    }
  };

  const handleAddMember = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("lookup-user-by-email", { body: { email, tripId } });
      if (error || data?.error) {
        toast({ title: "Error", description: data?.error || "User not found", variant: "destructive" });
        return;
      }
      if (dashboard.members.some((m) => m.user_id === data.userId)) {
        toast({ title: "Already a member", variant: "destructive" });
        return;
      }
      const { error: insertError } = await supabase.from("trip_members").insert({ trip_id: tripId, user_id: data.userId, role: "member" });
      if (insertError) throw insertError;
      await supabase.from("payments").insert({ trip_id: tripId, user_id: data.userId, amount: dashboard.per_person_cost, amount_paid: 0 });
      toast({ title: "Member added", description: `${data.displayName} has been added to the trip` });
      refresh();
    } catch {
      toast({ title: "Error", description: "Failed to add member", variant: "destructive" });
    }
  };

  // Build members for MembersCard interface
  const membersForCard = dashboard.members.map((m) => ({
    id: m.user_id,
    user_id: m.user_id,
    role: m.role,
    profile: { display_name: m.display_name, avatar_url: null },
  }));

  const paymentsForCard = dashboard.members.map((m) => ({
    user_id: m.user_id,
    amount: m.share,
    amount_paid: m.paid,
    status: m.status,
  }));

  return (
    <div className="space-y-4">
      {/* 1. Trip Health */}
      <TripHealthCard
        score={dashboard.health_score}
        status={dashboard.health_label as TripHealthStatus}
        color=""
        daysUntilTrip={dashboard.days_to_trip}
        deadlineDays={dashboard.days_to_deadline}
      />

      {/* 2. Your Status */}
      {cu && (
        <PersonalStatusCard
          perPersonCost={cu.share}
          amountPaid={cu.paid}
          remaining={cu.owe}
          paymentDeadline={dashboard.payment_deadline}
          status={cu.status as "Behind" | "On Track" | "Paid"}
        />
      )}

      {/* 3. Organizer: Edit Trip Total */}
      {isOrganizer && (
        <Card className="rounded-2xl border-0 shadow-sm glass-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-primary" /> Trip Total
              </p>
              {!editingTotal ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">${Number(dashboard.total_cost).toLocaleString()}</span>
                  <button onClick={() => { setEditingTotal(true); setNewTotalCost(dashboard.total_cost.toString()); }}>
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

      {/* 4. Group Funding */}
      <Card className="rounded-2xl border-0 shadow-sm glass-card">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Group Funding</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total funded</span>
            <span className="font-semibold text-primary">{pctFundedDisplay}%</span>
          </div>
          <Progress value={pctFundedDisplay} className="h-2 rounded-full" />

          {/* Member-by-member payment status */}
          <div className="space-y-1.5 pt-1">
            {dashboard.members.map((m) => {
              const isMe = m.user_id === user?.id;
              return (
                <div key={m.user_id} className="flex items-center justify-between py-1.5">
                  <p className="text-sm font-medium truncate">
                    {m.display_name || "Unknown"} {isMe && <span className="text-primary text-xs">(You)</span>}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOrganizer && (
                      <span className="text-[10px] text-muted-foreground">
                        ${Number(m.paid).toLocaleString()} / ${Number(m.share).toLocaleString()}
                      </span>
                    )}
                    <Badge className={`text-[10px] border-0 ${
                      m.status === "Paid" ? "bg-accent/20 text-accent" :
                      m.status === "On Track" ? "bg-secondary text-secondary-foreground" :
                      "bg-destructive/10 text-destructive"
                    }`}>{m.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deadline Reminder */}
      {cu && cu.owe > 0 && dashboard.days_to_deadline !== null && dashboard.days_to_deadline > 0 && dashboard.days_to_deadline <= 14 && (
        <Card className="rounded-2xl border-0 bg-primary/5 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {dashboard.days_to_deadline <= 1
                  ? "24 hours left. Log off. Lock in."
                  : dashboard.days_to_deadline <= 3
                  ? "3 days left. Time to lock in."
                  : dashboard.days_to_deadline <= 7
                  ? "7 days until deadline. Don't sleep on it."
                  : "2 weeks out. Stay on track."}
              </p>
              <p className="text-xs text-muted-foreground">
                You have ${cu.owe.toLocaleString()} remaining
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Trip Details */}
      <TripDetailsCard
        trip={{
          destination: dashboard.destination,
          start_date: dashboard.start_date,
          end_date: dashboard.end_date,
          vibe: dashboard.vibe,
          per_person_budget: dashboard.per_person_cost,
        }}
        computedPerPerson={dashboard.per_person_cost}
      />
      <InviteCodeCard inviteCode={dashboard.invite_code} />

      {/* 6. Members */}
      <MembersCard
        members={membersForCard}
        payments={paymentsForCard}
        isOrganizer={isOrganizer}
        currentUserId={user?.id}
        onRemoveMember={handleRemoveMember}
        onToggleRole={handleToggleRole}
        onAddMember={handleAddMember}
        maxSpots={dashboard.max_spots}
      />

      {/* 7. System Rules */}
      <SystemRulesCard />

      <ReplanChat open={replanOpen} onOpenChange={setReplanOpen} tripContext={{
        destination: dashboard.destination, startDate: dashboard.start_date, endDate: dashboard.end_date,
        memberCount: dashboard.members.length, originalPerPerson: dashboard.per_person_cost,
        originalTotal: dashboard.total_cost, collectedTotal: dashboard.funded_total,
        shortfall: dashboard.remaining_total, vibe: dashboard.vibe,
      }} />
    </div>
  );
};

export default OverviewTab;
