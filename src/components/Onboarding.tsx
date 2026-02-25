import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, ArrowRight, Loader2, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppTour from "@/components/AppTour";

const Onboarding = () => {
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile-onboarding", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const shouldShowTour = !dismissed && profile && !profile.onboarding_completed;

  const { data: myTrips = [], isLoading } = useQuery({
    queryKey: ["my-trips", user?.id],
    queryFn: async () => {
      const { data: memberRows, error } = await supabase
        .from("trip_members")
        .select("trip_id, role")
        .eq("user_id", user!.id);
      if (error) throw error;
      if (!memberRows.length) return [];

      const tripIds = memberRows.map((m) => m.trip_id);
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("id, name, destination, start_date, end_date")
        .in("id", tripIds);
      if (tripsError) throw tripsError;
      return trips || [];
    },
    enabled: !!user,
  });

  const handleTourComplete = () => {
    setDismissed(true);
    setShowTour(false);
    queryClient.invalidateQueries({ queryKey: ["profile-onboarding", user?.id] });
  };

  const handleJoinTrip = async () => {
    if (!joinCode.trim() || !user) return;
    setJoining(true);
    try {
      const { data: trip, error } = await supabase
        .from("trips")
        .select("id, name")
        .eq("invite_code", joinCode.trim())
        .maybeSingle();
      if (error) throw error;
      if (!trip) {
        toast({ title: "Trip not found 😢", description: "Double-check the invite code and try again.", variant: "destructive" });
        return;
      }
      // Check if already a member
      const { data: existing } = await supabase
        .from("trip_members")
        .select("id")
        .eq("trip_id", trip.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        const { error: joinError } = await supabase
          .from("trip_members")
          .insert({ trip_id: trip.id, user_id: user.id, role: "member" });
        if (joinError) throw joinError;
      }
      toast({ title: "You're in! 🎉", description: `Welcome to ${trip.name}!` });
      queryClient.invalidateQueries({ queryKey: ["my-trips"] });
      navigate(`/trip/${trip.id}`);
    } catch (err: any) {
      toast({ title: "Oops!", description: err.message, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {(shouldShowTour || showTour) && user && (
          <AppTour userId={user.id} onComplete={handleTourComplete} />
        )}
      </AnimatePresence>
      <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">DÉPARTE</h1>
        <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Sign out
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-5xl mb-4"
          >
            ✈️
          </motion.div>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">
            Where to next, babe?
          </h2>
          <p className="text-muted-foreground">
            Plan the ultimate girls' trip ✨
          </p>
        </motion.div>

        <div className="w-full max-w-sm space-y-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card
              className="border-0 shadow-lg shadow-primary/10 cursor-pointer hover:shadow-xl hover:shadow-primary/15 transition-all hover:-translate-y-1 glass-card"
              onClick={() => navigate("/create-trip")}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Create a Trip</h3>
                  <p className="text-sm text-muted-foreground">Start planning from scratch</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card
              className="border-0 shadow-lg shadow-secondary/20 cursor-pointer hover:shadow-xl hover:shadow-secondary/25 transition-all hover:-translate-y-1 glass-card"
              onClick={() => setShowJoin(!showJoin)}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
                  <Users className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Join a Trip</h3>
                  <p className="text-sm text-muted-foreground">Enter an invite code</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </motion.div>

          {showJoin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Enter invite code 💌"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinTrip()}
                  className="rounded-xl"
                />
                <Button onClick={handleJoinTrip} disabled={joining} className="rounded-xl px-6">
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                </Button>
              </div>
            </motion.div>
          )}

          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {myTrips.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Trips</p>
              {myTrips.map((trip) => {
                const daysUntil = Math.ceil(
                  (new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <Card
                    key={trip.id}
                    className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
                    onClick={() => navigate(`/trip/${trip.id}`)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-sm">{trip.name}</h3>
                        <p className="text-xs text-muted-foreground">{trip.destination}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{daysUntil}</p>
                        <p className="text-[10px] text-muted-foreground">days</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>
          )}
          <button
            onClick={() => setShowTour(true)}
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
          >
            <HelpCircle className="h-4 w-4" />
            How it works
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default Onboarding;
