import { useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FundTab from "@/components/tabs/FundTab";
import PlanTab from "@/components/tabs/PlanTab";
import UnlockTab from "@/components/tabs/UnlockTab";
import HypeTab from "@/components/tabs/HypeTab";

const TripDashboard = () => {
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();

  const { data: trip, isLoading: tripLoading, error: tripError } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Trip not found");
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
        .eq("trip_id", tripId!);
      if (error) throw error;

      const userIds = memberRows.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      return memberRows.map((m) => ({
        ...m,
        profile: profiles?.find((p) => p.user_id === m.user_id) || { display_name: null, avatar_url: null },
      }));
    },
    enabled: !!tripId,
  });

  if (tripLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tripError || !trip) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-4xl">😢</p>
        <p className="text-foreground font-semibold">Trip not found</p>
        <button onClick={() => navigate("/")} className="text-primary text-sm">← Back home</button>
      </div>
    );
  }

  const daysUntil = Math.ceil(
    (new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const avatarColors = ["bg-primary/20", "bg-lavender", "bg-peach", "bg-mint", "bg-blush"];

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-lavender/30 to-peach/20 px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/")} className="text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">{trip.name}</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground">{trip.destination}</p>
          <p className="text-4xl font-display font-bold text-foreground mt-1">{daysUntil} days</p>
          <p className="text-sm text-muted-foreground">until takeoff ✈️</p>

          <div className="flex justify-center mt-4 -space-x-2">
            {members.map((m, i) => (
              <Avatar key={m.id} className={`h-9 w-9 border-2 border-background ${avatarColors[i % avatarColors.length]}`}>
                <AvatarFallback className="text-xs font-semibold bg-transparent text-foreground">
                  {(m.profile?.display_name || "??").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="fund" className="px-2 -mt-2">
        <TabsList className="w-full justify-between glass-card rounded-2xl shadow-sm border-0 h-12 p-1">
          <TabsTrigger value="fund" className="rounded-xl text-xs data-[state=active]:shadow-md">💰 Fund</TabsTrigger>
          <TabsTrigger value="plan" className="rounded-xl text-xs data-[state=active]:shadow-md">📋 Plan</TabsTrigger>
          <TabsTrigger value="unlock" className="rounded-xl text-xs data-[state=active]:shadow-md">🔓 Unlock</TabsTrigger>
          <TabsTrigger value="hype" className="rounded-xl text-xs data-[state=active]:shadow-md">🎉 Hype</TabsTrigger>
        </TabsList>

        <div className="mt-4 px-2">
          <TabsContent value="fund"><FundTab tripId={tripId!} /></TabsContent>
          <TabsContent value="plan"><PlanTab tripId={tripId!} /></TabsContent>
          <TabsContent value="unlock"><UnlockTab tripId={tripId!} /></TabsContent>
          <TabsContent value="hype"><HypeTab tripId={tripId!} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default TripDashboard;
