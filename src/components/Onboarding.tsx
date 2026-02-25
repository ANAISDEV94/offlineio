import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Plane, Users, Plus, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Onboarding = () => {
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();

  const handleJoinTrip = () => {
    if (!joinCode.trim()) return;
    toast({ title: "Looking for your trip... 🔍" });
    // TODO: implement join via invite code
    navigate("/trip/sample");
  };

  return (
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
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card
              className="border-0 shadow-lg shadow-primary/10 cursor-pointer hover:shadow-xl hover:shadow-primary/15 transition-all hover:-translate-y-1"
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

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card
              className="border-0 shadow-lg shadow-secondary/20 cursor-pointer hover:shadow-xl hover:shadow-secondary/25 transition-all hover:-translate-y-1"
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
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Enter invite code 💌"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="rounded-xl"
                />
                <Button onClick={handleJoinTrip} className="rounded-xl px-6">
                  Join
                </Button>
              </div>
            </motion.div>
          )}

          {/* Quick access to sample trip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-4"
          >
            <button
              onClick={() => navigate("/trip/sample")}
              className="w-full text-center py-3 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              View sample trip: Italy Girlies 2026 🇮🇹 →
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
