import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, MapPin, Sparkles, Users, Wallet, Clock } from "lucide-react";
import { format } from "date-fns";

interface OverviewTabProps {
  tripId: string;
}

const OverviewTab = ({ tripId }: OverviewTabProps) => {
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

  const daysUntil = Math.ceil(
    (new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const totalOwed = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
  const fundingPct = totalOwed > 0 ? Math.round((totalPaid / totalOwed) * 100) : 0;
  const onTrackCount = payments.filter(
    (p) => p.status === "paid" || Number(p.amount_paid) >= Number(p.amount) * 0.5
  ).length;

  const avatarColors = [
    "bg-primary/20",
    "bg-secondary",
    "bg-accent/20",
    "bg-muted",
  ];

  const getStatusBadge = (userId: string) => {
    const payment = payments.find((p) => p.user_id === userId);
    if (!payment) return <Badge variant="outline" className="text-[10px]">No plan</Badge>;
    if (Number(payment.amount_paid) >= Number(payment.amount))
      return <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Paid</Badge>;
    if (Number(payment.amount_paid) >= Number(payment.amount) * 0.5)
      return <Badge variant="secondary" className="text-[10px]">On Track</Badge>;
    return <Badge variant="destructive" className="text-[10px]">Behind</Badge>;
  };

  const paymentDeadlineDays = trip.payment_deadline
    ? Math.ceil(
        (new Date(trip.payment_deadline).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="rounded-2xl border-0 bg-primary/5">
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-display font-semibold text-foreground">{members.length}</p>
            <p className="text-[10px] text-muted-foreground">Members</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 bg-primary/5">
          <CardContent className="p-3 text-center">
            <CalendarDays className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-display font-semibold text-foreground">{daysUntil}</p>
            <p className="text-[10px] text-muted-foreground">Days Left</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 bg-primary/5">
          <CardContent className="p-3 text-center">
            <Wallet className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-display font-semibold text-foreground">{fundingPct}%</p>
            <p className="text-[10px] text-muted-foreground">Funded</p>
          </CardContent>
        </Card>
      </div>

      {/* Trip Details */}
      <Card className="rounded-2xl border-0 bg-card shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" /> Trip Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Destination</span>
            <span className="font-medium text-foreground">{trip.destination}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dates</span>
            <span className="font-medium text-foreground">
              {format(new Date(trip.start_date), "MMM d")} – {format(new Date(trip.end_date), "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vibe</span>
            <Badge variant="secondary" className="text-[10px] capitalize">{trip.vibe}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Per Person</span>
            <span className="font-medium text-foreground">${Number(trip.per_person_budget).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Group Funding */}
      <Card className="rounded-2xl border-0 bg-card shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Group Funding
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <Progress value={fundingPct} className="h-2.5 rounded-full" />
          <p className="text-xs text-muted-foreground">
            {fundingPct}% funded — {onTrackCount} of {members.length} members on track
          </p>
        </CardContent>
      </Card>

      {/* Payment Deadline */}
      {trip.payment_deadline && paymentDeadlineDays !== null && (
        <Card className="rounded-2xl border-0 bg-destructive/5 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">Payment Deadline</p>
              <p className="text-xs text-muted-foreground">
                {paymentDeadlineDays > 0
                  ? `${paymentDeadlineDays} days left — ${format(new Date(trip.payment_deadline), "MMM d, yyyy")}`
                  : "Deadline passed"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card className="rounded-2xl border-0 bg-card shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" /> Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {members.map((m, i) => (
            <div key={m.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2.5">
                <Avatar className={`h-8 w-8 ${avatarColors[i % avatarColors.length]}`}>
                  <AvatarFallback className="text-[10px] font-medium bg-transparent text-foreground">
                    {(m.profile?.display_name || "??").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{m.profile?.display_name || "Unknown"}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{m.role}</p>
                </div>
              </div>
              {getStatusBadge(m.user_id)}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
