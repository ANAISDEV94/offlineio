import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import InviteCodeCard from "@/components/overview/InviteCodeCard";
import QuickStats from "@/components/overview/QuickStats";
import TripDetailsCard from "@/components/overview/TripDetailsCard";
import GroupFundingCard from "@/components/overview/GroupFundingCard";
import BudgetAlertCard from "@/components/overview/BudgetAlertCard";
import PaymentDeadlineCard from "@/components/overview/PaymentDeadlineCard";
import MembersCard from "@/components/overview/MembersCard";
import ReplanChat from "@/components/ReplanChat";

interface OverviewTabProps {
  tripId: string;
}

const OverviewTab = ({ tripId }: OverviewTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replanOpen, setReplanOpen] = useState(false);

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tripId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["trip-members", tripId],
    queryFn: async () => {
      const { data: memberRows, error } = await supabase
        .from("trip_members")
        .select("*")
        .eq("trip_id", tripId);
      if (error) throw error;

      const userIds = memberRows.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      return memberRows.map((m) => ({
        ...m,
        profile: profiles?.find((p) => p.user_id === m.user_id) || {
          display_name: null,
          avatar_url: null,
        },
      }));
    },
    enabled: !!tripId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["trip-payments-overview", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("user_id, amount, amount_paid, status")
        .eq("trip_id", tripId);
      if (error) throw error;
      return data;
    },
    enabled: !!tripId,
  });

  if (!trip) return null;

  const isOrganizer = members.some(
    (m) => m.user_id === user?.id && m.role === "organizer"
  );

  const daysUntil = Math.ceil(
    (new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const totalOwed = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
  const fundingPct = totalOwed > 0 ? Math.round((totalPaid / totalOwed) * 100) : 0;
  const onTrackCount = payments.filter(
    (p) => p.status === "paid" || Number(p.amount_paid) >= Number(p.amount) * 0.5
  ).length;
  const shortfall = totalOwed - totalPaid;
  const showBudgetAlert = fundingPct < 100 && daysUntil <= 90 && daysUntil > 0 && shortfall > 0;

  const paymentDeadlineDays = trip.payment_deadline
    ? Math.ceil(
        (new Date(trip.payment_deadline).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

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
      const { data, error } = await supabase.functions.invoke("lookup-user-by-email", {
        body: { email, tripId },
      });
      if (error || data?.error) {
        toast({ title: "Error", description: data?.error || "User not found", variant: "destructive" });
        return;
      }

      // Check if already a member
      if (members.some((m) => m.user_id === data.userId)) {
        toast({ title: "Already a member", variant: "destructive" });
        return;
      }

      // Add to trip_members
      const { error: insertError } = await supabase.from("trip_members").insert({
        trip_id: tripId,
        user_id: data.userId,
        role: "member",
      });
      if (insertError) throw insertError;

      // Create payment record
      await supabase.from("payments").insert({
        trip_id: tripId,
        user_id: data.userId,
        amount: Number(trip.per_person_budget),
        amount_paid: 0,
      });

      toast({ title: "Member added", description: `${data.displayName} has been added to the trip` });
      queryClient.invalidateQueries({ queryKey: ["trip-members", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-payments-overview", tripId] });
    } catch (e) {
      toast({ title: "Error", description: "Failed to add member", variant: "destructive" });
    }
  };

  const tripContext = {
    destination: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    memberCount: members.length,
    originalPerPerson: Number(trip.per_person_budget),
    originalTotal: totalOwed,
    collectedTotal: totalPaid,
    shortfall,
    vibe: trip.vibe,
  };

  return (
    <div className="space-y-4">
      <QuickStats
        membersCount={members.length}
        daysUntil={daysUntil}
        fundingPct={fundingPct}
      />

      <TripDetailsCard trip={trip} />

      <InviteCodeCard inviteCode={trip.invite_code} />

      <GroupFundingCard
        fundingPct={fundingPct}
        onTrackCount={onTrackCount}
        membersCount={members.length}
      />

      {showBudgetAlert && (
        <BudgetAlertCard
          shortfall={shortfall}
          totalPaid={totalPaid}
          onReplan={() => setReplanOpen(true)}
        />
      )}

      {trip.payment_deadline && paymentDeadlineDays !== null && (
        <PaymentDeadlineCard
          paymentDeadline={trip.payment_deadline}
          paymentDeadlineDays={paymentDeadlineDays}
        />
      )}

      <MembersCard
        members={members}
        payments={payments}
        isOrganizer={isOrganizer}
        currentUserId={user?.id}
        onRemoveMember={handleRemoveMember}
        onToggleRole={handleToggleRole}
        onAddMember={handleAddMember}
        maxSpots={trip.max_spots || trip.group_size}
      />

      <ReplanChat
        open={replanOpen}
        onOpenChange={setReplanOpen}
        tripContext={tripContext}
      />
    </div>
  );
};

export default OverviewTab;
