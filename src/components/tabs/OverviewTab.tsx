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
import { Shield, LogOut, Settings, Pencil, Check, X, Bell } from "lucide-react";
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
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");

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

  const { data: payments = [] } = useQuery({
    queryKey: ["trip-payments-overview", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("user_id, amount, amount_paid, status").eq("trip_id", tripId);
      if (error) throw error;
      return data;
    },
    enabled: !!tripId,
  });

  const { data: myPayment } = useQuery({
    queryKey: ["my-payment", tripId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("trip_id", tripId).eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tripId && !!user?.id,
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

  const updateDisplayName = useMutation({
    mutationFn: async () => {
      if (!newDisplayName.trim() || !user) return;
      const { error } = await supabase.from("profiles").update({ display_name: newDisplayName.trim() }).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["trip-members", tripId] });
      setEditingName(false);
      toast({ title: "Name updated" });
    },
  });

  if (!trip) return null;

  const daysUntil = Math.ceil((new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const totalCost = Number((trip as any).total_cost) || 0;
  const memberCount = members.length || 1;
  const perPersonCost = totalCost / memberCount;
  const totalFunded = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
  const pctFunded = totalCost > 0 ? Math.round((totalFunded / totalCost) * 100) : 0;

  const deadlineDays = trip.payment_deadline
    ? Math.ceil((new Date(trip.payment_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const myPaid = myPayment ? Number(myPayment.amount_paid) : 0;
  const myRemaining = Math.max(0, perPersonCost - myPaid);
  const myStatus = computeMemberStatus(myPaid, perPersonCost, deadlineDays);

  // Trip Health
  const lateCount = payments.filter((p) => computeMemberStatus(Number(p.amount_paid), perPersonCost, deadlineDays) === "Behind").length;
  const onTrackCount = payments.filter((p) => {
    const s = computeMemberStatus(Number(p.amount_paid), perPersonCost, deadlineDays);
    return s === "Paid" || s === "On Track";
  }).length;
  const pctOnTrack = payments.length > 0 ? (onTrackCount / payments.length) * 100 : 100;
  const health = computeTripHealth(pctFunded, pctOnTrack, deadlineDays, lateCount, payments.length);

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
      queryClient.invalidateQueries({ queryKey: ["trip-payments-overview", tripId] });
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
        status={myStatus}
      />

      {/* 3. Group Status */}
      <Card className="rounded-2xl border-0 shadow-sm glass-card">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Group Funding</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total funded</span>
            <span className="font-semibold text-primary">{pctFunded}%</span>
          </div>
          <Progress value={pctFunded} className="h-2 rounded-full" />
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{payments.filter(p => computeMemberStatus(Number(p.amount_paid), perPersonCost, deadlineDays) === "Paid").length} Paid</span>
            <span>{payments.filter(p => computeMemberStatus(Number(p.amount_paid), perPersonCost, deadlineDays) === "On Track").length} On Track</span>
            <span>{lateCount} Behind</span>
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
      <TripDetailsCard trip={trip} />
      <InviteCodeCard inviteCode={trip.invite_code} />

      {/* 5. Members */}
      <MembersCard
        members={members} payments={payments} isOrganizer={isOrganizer}
        currentUserId={user?.id} onRemoveMember={handleRemoveMember}
        onToggleRole={handleToggleRole} onAddMember={handleAddMember}
        maxSpots={trip.max_spots || trip.group_size}
      />

      {/* 6. System Rules */}
      <SystemRulesCard />

      {/* 7. Settings */}
      <Card className="rounded-2xl border-0 bg-card shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5 text-primary" /> Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Display Name</p>
              {editingName ? (
                <div className="flex gap-2 mt-1">
                  <Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="rounded-xl text-sm h-8 w-40" />
                  <Button size="sm" className="h-8 rounded-xl" onClick={() => updateDisplayName.mutate()}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 rounded-xl" onClick={() => setEditingName(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{myProfile?.display_name || "Not set"}</p>
              )}
            </div>
            {!editingName && (
              <button onClick={() => { setEditingName(true); setNewDisplayName(myProfile?.display_name || ""); }}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </button>
            )}
          </div>
          <Button variant="outline" className="w-full rounded-xl gap-2" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </CardContent>
      </Card>

      <ReplanChat open={replanOpen} onOpenChange={setReplanOpen} tripContext={{
        destination: trip.destination, startDate: trip.start_date, endDate: trip.end_date,
        memberCount: members.length, originalPerPerson: perPersonCost,
        originalTotal: totalCost, collectedTotal: totalFunded, shortfall: totalCost - totalFunded, vibe: trip.vibe,
      }} />
    </div>
  );
};

export default OverviewTab;
