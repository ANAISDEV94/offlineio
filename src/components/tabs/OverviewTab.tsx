import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTripRole } from "@/hooks/useTripRole";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Pencil, Check, X, Bell, DollarSign } from "lucide-react";
import { format } from "date-fns";
import TripDetailsCard from "@/components/overview/TripDetailsCard";
import InviteCodeCard from "@/components/overview/InviteCodeCard";
import MembersCard from "@/components/overview/MembersCard";
import TripHealthCard from "@/components/overview/TripHealthCard";
import PersonalStatusCard from "@/components/overview/PersonalStatusCard";
import SystemRulesCard from "@/components/overview/SystemRulesCard";
import ReplanChat from "@/components/ReplanChat";
import { computeMemberStatus, computeTripHealth } from "@/lib/funding-utils";

interface OverviewTabProps {
  tripId: string;
}

const OverviewTab = ({ tripId }: OverviewTabProps) => {
  const { user, signOut } = useAuth();
  const { isOrganizer } = useTripRole(tripId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replanOpen, setReplanOpen] = useState(false);
  const [editingTotal, setEditingTotal] = useState(false);
  const [newTotalCost, setNewTotalCost] = useState("");

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tripId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["trip-members", tripId],
    queryFn: async () => {
      const { data: memberRows, error } = await supabase.from("trip_members").select("*").eq("trip_id", tripId);
      if (error) throw error;
      const userIds = memberRows.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
      return memberRows.map((m) => ({
        ...m,
        profile: profiles?.find((p) => p.user_id === m.user_id) || { display_name: null, avatar_url: null },
      }));
    },
    enabled: !!tripId,
  });

  const { data: fundingSummary } = useQuery({
    queryKey: ["trip-funding-summary", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_funding_summary").select("*").eq("trip_id", tripId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tripId,
  });

  const { data: memberFunding = [] } = useQuery({
    queryKey: ["member-funding", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_member_funding").select("*").eq("trip_id", tripId);
      if (error) throw error;
      return data;
    },
    enabled: !!tripId,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("display_name").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (!trip) return null;

  const daysUntil = Math.ceil((new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const totalCost = Number(fundingSummary?.total_cost) || Number((trip as any).total_cost) || 0;
  const perPersonCost = Number(fundingSummary?.per_person_cost) || (totalCost / Math.max(members.length, 1));
  const totalFunded = Number(fundingSummary?.total_funded) || 0;
  const pctFunded = Number(fundingSummary?.percent_funded) || 0;

  const deadlineDays = fundingSummary?.days_to_deadline ?? (trip.payment_deadline
    ? Math.ceil((new Date(trip.payment_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null);

  const myFunding = memberFunding.find(m => m.user_id === user?.id);
  const myPaid = Number(myFunding?.amount_paid) || 0;
  const myRemaining = Math.max(0, Number(myFunding?.amount_remaining) || (perPersonCost - myPaid));
  const myStatus = myFunding?.member_status || computeMemberStatus(myPaid, perPersonCost, deadlineDays);

  // Trip Health from server-computed statuses
  const lateCount = memberFunding.filter(m => m.member_status === "Behind").length;
  const onTrackCount = memberFunding.filter(m => m.member_status === "Paid" || m.member_status === "On Track").length;
  const pctOnTrack = memberFunding.length > 0 ? (onTrackCount / memberFunding.length) * 100 : 100;
  const health = computeTripHealth(pctFunded, pctOnTrack, deadlineDays, lateCount, memberFunding.length);

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase.from("trip_members").delete().eq("id", memberId);
    if (error) {
      toast({ title: "Error", description: "Failed to remove member", variant: "destructive" });
    } else {
      toast({ title: "Member removed" });
      queryClient.invalidateQueries({ queryKey: ["trip-members", tripId] });
    }
  };

  const handleToggleRole = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === "organizer" ? "member" : "organizer";
    const { error } = await supabase.from("trip_members").update({ role: newRole }).eq("id", memberId);
    if (error) {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    } else {
      toast({ title: `Role changed to ${newRole}` });
      queryClient.invalidateQueries({ queryKey: ["trip-members", tripId] });
    }
  };

  const handleAddMember = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("lookup-user-by-email", { body: { email, tripId } });
      if (error || data?.error) {
        toast({ title: "Error", description: data?.error || "User not found", variant: "destructive" });
        return;
      }
      if (members.some((m) => m.user_id === data.userId)) {
        toast({ title: "Already a member", variant: "destructive" });
        return;
      }
      const { error: insertError } = await supabase.from("trip_members").insert({ trip_id: tripId, user_id: data.userId, role: "member" });
      if (insertError) throw insertError;
      await supabase.from("payments").insert({ trip_id: tripId, user_id: data.userId, amount: perPersonCost, amount_paid: 0 });
      toast({ title: "Member added", description: `${data.displayName} has been added to the trip` });
      queryClient.invalidateQueries({ queryKey: ["trip-members", tripId] });
      queryClient.invalidateQueries({ queryKey: ["member-funding", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-funding-summary", tripId] });
    } catch {
      toast({ title: "Error", description: "Failed to add member", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Trip Health */}
      <TripHealthCard
        score={health.score}
        status={health.status}
        color={health.color}
        daysUntilTrip={daysUntil}
        deadlineDays={deadlineDays}
      />

      {/* 2. Your Status */}
      <PersonalStatusCard
        perPersonCost={perPersonCost}
        amountPaid={myPaid}
        remaining={myRemaining}
        paymentDeadline={trip.payment_deadline}
        status={myStatus as "Behind" | "On Track" | "Paid"}
      />

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
                    await supabase.from("trips").update({ total_cost: val } as any).eq("id", tripId);
                    queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
                    queryClient.invalidateQueries({ queryKey: ["trip-funding-summary", tripId] });
                    queryClient.invalidateQueries({ queryKey: ["member-funding", tripId] });
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

      {/* 4. Group Status with Member Payment List */}
      <Card className="rounded-2xl border-0 shadow-sm glass-card">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Group Funding</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total funded</span>
            <span className="font-semibold text-primary">{pctFunded}%</span>
          </div>
          <Progress value={pctFunded} className="h-2 rounded-full" />

          {/* Member-by-member payment status */}
          <div className="space-y-1.5 pt-1">
            {memberFunding.map((m) => {
              const status = m.member_status || "Unknown";
              const isMe = m.user_id === user?.id;
              return (
                <div key={m.user_id} className="flex items-center justify-between py-1.5">
                  <p className="text-sm font-medium truncate">
                    {m.display_name || "Unknown"} {isMe && <span className="text-primary text-xs">(You)</span>}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOrganizer && (
                      <span className="text-[10px] text-muted-foreground">
                        ${Number(m.amount_paid || 0).toLocaleString()} / ${Number(m.per_person_cost || 0).toLocaleString()}
                      </span>
                    )}
                    <Badge className={`text-[10px] border-0 ${
                      status === "Paid" ? "bg-accent/20 text-accent" :
                      status === "On Track" ? "bg-secondary text-secondary-foreground" :
                      "bg-destructive/10 text-destructive"
                    }`}>{status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deadline Reminder */}
      {myRemaining > 0 && deadlineDays !== null && deadlineDays > 0 && deadlineDays <= 14 && (
        <Card className="rounded-2xl border-0 bg-primary/5 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {deadlineDays <= 1
                  ? "24 hours left. Log off. Lock in."
                  : deadlineDays <= 3
                  ? "3 days left. Time to lock in."
                  : deadlineDays <= 7
                  ? "7 days until deadline. Don't sleep on it."
                  : "2 weeks out. Stay on track."}
              </p>
              <p className="text-xs text-muted-foreground">
                You have ${myRemaining.toLocaleString()} remaining
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Trip Details */}
      <TripDetailsCard trip={trip} computedPerPerson={perPersonCost} />
      <InviteCodeCard inviteCode={trip.invite_code} />

      {/* 5. Members */}
      <MembersCard
        members={members} payments={memberFunding.map(m => ({ user_id: m.user_id || '', amount: Number(m.per_person_cost) || 0, amount_paid: Number(m.amount_paid) || 0, status: m.member_status || 'pending' }))} isOrganizer={isOrganizer}
        currentUserId={user?.id} onRemoveMember={handleRemoveMember}
        onToggleRole={handleToggleRole} onAddMember={handleAddMember}
        maxSpots={trip.max_spots || trip.group_size}
      />

      {/* 6. System Rules */}
      <SystemRulesCard />


      <ReplanChat open={replanOpen} onOpenChange={setReplanOpen} tripContext={{
        destination: trip.destination, startDate: trip.start_date, endDate: trip.end_date,
        memberCount: members.length, originalPerPerson: perPersonCost,
        originalTotal: totalCost, collectedTotal: totalFunded, shortfall: totalCost - totalFunded, vibe: trip.vibe,
      }} />
    </div>
  );
};

export default OverviewTab;
