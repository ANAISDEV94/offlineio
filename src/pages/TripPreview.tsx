import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Loader2, Clock, Users, Sparkles, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const TripPreview = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip-preview", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Trip not found");
      return data as any;
    },
    enabled: !!tripId,
  });

  const { data: memberCount = 0 } = useQuery({
    queryKey: ["trip-member-count", tripId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("trip_members")
        .select("*", { count: "exact", head: true })
        .eq("trip_id", tripId!);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!tripId,
  });

  const { data: hostProfile } = useQuery({
    queryKey: ["host-profile", trip?.created_by],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", trip!.created_by)
        .single();
      return data;
    },
    enabled: !!trip?.created_by,
  });

  const { data: isAlreadyMember } = useQuery({
    queryKey: ["is-member", tripId, user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("trip_members")
        .select("*", { count: "exact", head: true })
        .eq("trip_id", tripId!)
        .eq("user_id", user!.id);
      return (count || 0) > 0;
    },
    enabled: !!tripId && !!user,
  });

  const joinTrip = useMutation({
    mutationFn: async () => {
      if (!user || !trip) throw new Error("Must be logged in");

      const { error: memberErr } = await supabase.from("trip_members").insert({
        trip_id: trip.id,
        user_id: user.id,
        role: "member",
      });
      if (memberErr) throw memberErr;

      await supabase.from("payments").insert({
        trip_id: trip.id,
        user_id: user.id,
        amount: trip.per_person_budget || 0,
        amount_paid: 0,
        installment_plan: "monthly",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-member-count", tripId] });
      toast({ title: "You're in!", description: "Welcome to the trip." });
      navigate(`/trip/${tripId}`);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSecureSpot = () => {
    if (!user) {
      navigate(`/auth?redirect=/trip/preview/${tripId}`);
      return;
    }
    if (isAlreadyMember) {
      navigate(`/trip/${tripId}`);
      return;
    }
    joinTrip.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">😢</p>
        <p className="text-foreground font-medium">Trip not found</p>
        <button onClick={() => navigate("/")} className="text-primary text-sm">← Back home</button>
      </div>
    );
  }

  const maxSpots = trip.max_spots || trip.group_size;
  const spotsRemaining = maxSpots - memberCount;
  const joinDeadline = trip.join_deadline ? new Date(trip.join_deadline) : null;
  const deadlineDays = joinDeadline
    ? Math.max(0, Math.ceil((joinDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const installmentAmount = trip.per_person_budget ? Math.round(trip.per_person_budget / 3) : 0;
  const vibes = trip.vibe?.split(", ") || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Image */}
      <div className="relative w-full h-64 bg-primary/10 overflow-hidden">
        {trip.cover_image_url && (
          <img src={trip.cover_image_url} alt={trip.name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute top-4 left-4">
          <button onClick={() => navigate("/")} className="glass rounded-full p-2">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-12 relative z-10 pb-32">
        {/* Host Info */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="text-[10px] font-medium gap-1">
            <Sparkles className="h-3 w-3" /> Creator Hosted
          </Badge>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-semibold text-foreground">{trip.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hosted by <span className="font-medium text-foreground">{hostProfile?.display_name || "Host"}</span>
          </p>
          {trip.host_bio && (
            <p className="text-xs text-muted-foreground mt-1 italic">"{trip.host_bio}"</p>
          )}
        </motion.div>

        {/* Trip Details */}
        <div className="mt-6 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Destination</span>
                <span className="text-sm font-medium">{trip.destination}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Dates</span>
                <span className="text-sm font-medium">
                  {format(new Date(trip.start_date), "MMM d")} – {format(new Date(trip.end_date), "MMM d, yyyy")}
                </span>
              </div>
              {vibes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {vibes.map((v: string) => (
                    <Badge key={v} variant="outline" className="text-[10px]">{v}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {trip.trip_description && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{trip.trip_description}</p>
              </CardContent>
            </Card>
          )}

          {/* Pricing */}
          <Card className="border-0 shadow-sm glass-card">
            <CardContent className="p-5 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Estimated total per person</p>
              <p className="text-4xl font-display font-semibold text-foreground">
                ${trip.per_person_budget?.toLocaleString()}
              </p>
              {installmentAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  or 3 payments of <span className="font-medium">${installmentAmount.toLocaleString()}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Spots & Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-display font-semibold">{memberCount} / {maxSpots}</p>
                <p className="text-[10px] text-muted-foreground">Spots Claimed</p>
              </CardContent>
            </Card>
            {deadlineDays !== null && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-display font-semibold">{deadlineDays}</p>
                  <p className="text-[10px] text-muted-foreground">Days to Join</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass border-t border-border/30">
        <Button
          onClick={handleSecureSpot}
          disabled={joinTrip.isPending || spotsRemaining <= 0}
          className="w-full rounded-xl h-14 text-base font-medium shadow-sm"
        >
          {joinTrip.isPending ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-5 w-5" />
          )}
          {isAlreadyMember
            ? "Go to Trip Dashboard"
            : spotsRemaining <= 0
              ? "Trip Full"
              : "Secure Your Spot"}
        </Button>
        {spotsRemaining > 0 && spotsRemaining <= 5 && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Only {spotsRemaining} spot{spotsRemaining > 1 ? "s" : ""} left
          </p>
        )}
      </div>
    </div>
  );
};

export default TripPreview;
