import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Shield, LogOut, Settings, Pencil, Check, X, Bell } from "lucide-react";
import { format } from "date-fns";
import InviteCodeCard from "@/components/overview/InviteCodeCard";
import TripDetailsCard from "@/components/overview/TripDetailsCard";
import BudgetAlertCard from "@/components/overview/BudgetAlertCard";
import PaymentDeadlineCard from "@/components/overview/PaymentDeadlineCard";
import MembersCard from "@/components/overview/MembersCard";
import FundingSummaryCard from "@/components/overview/FundingSummaryCard";
import ReplanChat from "@/components/ReplanChat";
import { computeMemberStatus } from "@/lib/funding-utils";

interface OverviewTabProps {
  tripId: string;
}

const OverviewTab = ({ tripId }: OverviewTabProps) => {
  const { user, signOut } = useAuth();
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

  const { data: myMembership } = useQuery({
    queryKey: ["my-membership", tripId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_members").select("role").eq("trip_id", tripId).eq("user_id", user!.id).maybeSingle();
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

  const { data: packingItems = [] } = useQuery({
    queryKey: ["my-packing-overview", tripId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("packing_items").select("*").eq("trip_id", tripId).eq("user_id", user!.id).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!tripId && !!user?.id,
  });

  const togglePacking = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await supabase.from("packing_items").update({ is_checked: checked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-packing-overview", tripId] }),
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

  const isOrganizer = members.some((m) => m.user_id === user?.id && m.role === "organizer");
  const daysUntil = Math.ceil((new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Funding calculations using total_cost
  const totalCost = Number((trip as any).total_cost) || payments.reduce((s, p) => s + Number(p.amount), 0);
  const memberCount = members.length || 1;
  const perPersonCost = totalCost / memberCount;
  const totalFunded = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
  const totalRemaining = totalCost - totalFunded;
  const fundingPct = totalCost > 0 ? Math.round((totalFunded / totalCost) * 100) : 0;

  const deadlineDays = trip.payment_deadline
    ? Math.ceil((new Date(trip.payment_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Build member funding list
  const memberFunding = members.map((m) => {
    const payment = payments.find((p) => p.user_id === m.user_id);
    const paid = payment ? Number(payment.amount_paid) : 0;
    const pct = perPersonCost > 0 ? Math.round((paid / perPersonCost) * 100) : 0;
    return {
      userId: m.user_id,
      displayName: m.profile?.display_name || "Unknown",
      amountPaid: paid,
      perPersonCost,
      status: computeMemberStatus(paid, perPersonCost, deadlineDays),
      pctComplete: Math.min(100, pct),
    };
  });

  const myPaid = myPayment ? Number(myPayment.amount_paid) : 0;
  const myRemaining = Math.max(0, perPersonCost - myPaid);

  const shortfall = totalRemaining;
  const showBudgetAlert = fundingPct < 100 && daysUntil <= 90 && daysUntil > 0 && shortfall > 0;

  const packedCount = packingItems.filter((i) => i.is_checked).length;

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

  const tripContext = {
    destination: trip.destination, startDate: trip.start_date, endDate: trip.end_date,
    memberCount: members.length, originalPerPerson: perPersonCost,
    originalTotal: totalCost, collectedTotal: totalFunded, shortfall, vibe: trip.vibe,
  };

  return (
    <div className="space-y-4">
      {/* Funding Summary — first thing user sees */}
      <FundingSummaryCard
        tripId={tripId}
        tripName={trip.name}
        totalCost={totalCost}
        memberCount={memberCount}
        totalFunded={totalFunded}
        paymentDeadline={trip.payment_deadline}
        members={memberFunding}
        myPaid={myPaid}
        myRemaining={myRemaining}
        userId={user?.id}
        hasPaymentRecord={!!myPayment}
      />

      <TripDetailsCard trip={trip} />
      <InviteCodeCard inviteCode={trip.invite_code} />

      {showBudgetAlert && (
        <BudgetAlertCard shortfall={shortfall} totalPaid={totalFunded} onReplan={() => setReplanOpen(true)} />
      )}

      {trip.payment_deadline && deadlineDays !== null && (
        <PaymentDeadlineCard paymentDeadline={trip.payment_deadline} paymentDeadlineDays={deadlineDays} />
      )}

      {/* Deadline Reminders */}
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

      <MembersCard
        members={members} payments={payments} isOrganizer={isOrganizer}
        currentUserId={user?.id} onRemoveMember={handleRemoveMember}
        onToggleRole={handleToggleRole} onAddMember={handleAddMember}
        maxSpots={trip.max_spots || trip.group_size}
      />

      {/* My Role */}
      <Card className="rounded-2xl border-0 bg-primary/5 shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">My Role</p>
            <p className="text-xs text-muted-foreground capitalize">{myMembership?.role || "Member"}</p>
          </div>
        </CardContent>
      </Card>

      {/* My Packing List */}
      <Card className="rounded-2xl border-0 bg-card shadow-sm">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-primary" /> My Packing List
            </CardTitle>
            {packingItems.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{packedCount}/{packingItems.length} packed</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {packingItems.length > 0 ? (
            <div className="space-y-2">
              {packingItems.map((item) => (
                <label key={item.id} className="flex items-center gap-2.5 py-1 cursor-pointer">
                  <Checkbox checked={item.is_checked} onCheckedChange={(checked) => togglePacking.mutate({ id: item.id, checked: !!checked })} />
                  <span className={`text-sm ${item.is_checked ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.item_name}</span>
                  {item.is_suggested && <Badge variant="outline" className="text-[9px] ml-auto">Suggested</Badge>}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No packing items yet. Add some in the Hype tab!</p>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
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

      <ReplanChat open={replanOpen} onOpenChange={setReplanOpen} tripContext={tripContext} />
    </div>
  );
};

export default OverviewTab;
