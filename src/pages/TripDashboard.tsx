import { useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Share2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import OverviewTab from "@/components/tabs/OverviewTab";
import FundTab from "@/components/tabs/FundTab";
import PlanTab from "@/components/tabs/PlanTab";
import HypeTab from "@/components/tabs/HypeTab";

const TripDashboard = () => {
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

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
      return data as any;
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

  const { data: hostProfile } = useQuery({
    queryKey: ["host-profile-dash", trip?.created_by],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", trip!.created_by)
        .single();
      return data;
    },
    enabled: !!trip?.created_by,
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
        <p className="text-foreground font-medium">Trip not found</p>
        <button onClick={() => navigate("/")} className="text-primary text-sm">← Back home</button>
      </div>
    );
  }

  const isPublic = trip.visibility === "public";
  const isHost = user?.id === trip.created_by;
  const maxSpots = trip.max_spots || trip.group_size;

  const daysUntil = Math.ceil(
    (new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const avatarColors = ["bg-primary/20", "bg-secondary", "bg-accent/20", "bg-muted"];

  const handleShare = () => {
    const url = `${window.location.origin}/trip/preview/${tripId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: "Share it with your crew." });
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Header */}
      <div className="relative bg-primary/5 px-4 pt-4 pb-6 overflow-hidden">
        {isPublic && trip.cover_image_url && (
          <>
            <img src={trip.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
          </>
        )}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/")} className="text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-display font-semibold text-foreground">{trip.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* No-Drama Mode Badge */}
              <Badge className="text-[10px] bg-accent/20 text-accent border-0 gap-1">
                <ShieldCheck className="h-3 w-3" /> No-Drama
              </Badge>
              {isPublic && isHost && (
                <Button variant="outline" size="sm" onClick={handleShare} className="rounded-xl text-xs gap-1.5">
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
              )}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {isPublic && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <Badge variant="secondary" className="text-[10px] font-medium gap-1">
                  <Sparkles className="h-3 w-3" /> Creator Hosted
                </Badge>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{trip.destination}</p>
            {isPublic && hostProfile && (
              <p className="text-xs text-muted-foreground">Hosted by {hostProfile.display_name}</p>
            )}
            <p className="text-4xl font-display font-semibold text-foreground mt-1">{daysUntil} days</p>
            <p className="text-sm text-muted-foreground">until takeoff</p>

            {isPublic && (
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  {members.length} / {maxSpots} Spots Claimed
                </p>
              </div>
            )}

            <div className="flex justify-center mt-3 -space-x-2">
              {members.map((m, i) => (
                <Avatar key={m.id} className={`h-9 w-9 border-2 border-background ${avatarColors[i % avatarColors.length]}`}>
                  <AvatarFallback className="text-xs font-medium bg-transparent text-foreground">
                    {(m.profile?.display_name || "??").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* 4-Tab Layout */}
      <Tabs defaultValue="overview" className="px-2 mt-2">
        <TabsList className="w-full justify-between glass-card rounded-2xl shadow-sm border-0 h-12 p-1">
          <TabsTrigger value="overview" className="rounded-xl text-[10px] data-[state=active]:shadow-sm">📊 Overview</TabsTrigger>
          <TabsTrigger value="fund" className="rounded-xl text-[10px] data-[state=active]:shadow-sm">💰 Fund</TabsTrigger>
          <TabsTrigger value="plan" className="rounded-xl text-[10px] data-[state=active]:shadow-sm">📋 Plan</TabsTrigger>
          <TabsTrigger value="hype" className="rounded-xl text-[10px] data-[state=active]:shadow-sm">🎉 Hype</TabsTrigger>
        </TabsList>

        <div className="mt-4 px-2">
          <TabsContent value="overview"><OverviewTab tripId={tripId!} /></TabsContent>
          <TabsContent value="fund"><FundTab tripId={tripId!} /></TabsContent>
          <TabsContent value="plan"><PlanTab tripId={tripId!} /></TabsContent>
          <TabsContent value="hype"><HypeTab tripId={tripId!} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default TripDashboard;
