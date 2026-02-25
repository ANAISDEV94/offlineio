import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";
import { sampleTrip, sampleMembers } from "@/lib/sample-data";
import { motion } from "framer-motion";
import PlanTab from "@/components/tabs/PlanTab";
import PayTab from "@/components/tabs/PayTab";
import BookTab from "@/components/tabs/BookTab";
import PackTab from "@/components/tabs/PackTab";
import FitsTab from "@/components/tabs/FitsTab";
import HypeTab from "@/components/tabs/HypeTab";

const TripDashboard = () => {
  const navigate = useNavigate();
  const trip = sampleTrip;
  const members = sampleMembers;

  const daysUntil = Math.ceil(
    (new Date(trip.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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
              <Avatar key={m.id} className={`h-9 w-9 border-2 border-background ${avatarColors[i]}`}>
                <AvatarFallback className="text-xs font-semibold bg-transparent text-foreground">
                  {m.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plan" className="px-2 -mt-2">
        <TabsList className="w-full justify-between bg-card rounded-2xl shadow-sm border-0 h-12 p-1">
          <TabsTrigger value="plan" className="rounded-xl text-xs data-[state=active]:shadow-md">📋 Plan</TabsTrigger>
          <TabsTrigger value="pay" className="rounded-xl text-xs data-[state=active]:shadow-md">💰 Pay</TabsTrigger>
          <TabsTrigger value="book" className="rounded-xl text-xs data-[state=active]:shadow-md">✈️ Book</TabsTrigger>
          <TabsTrigger value="pack" className="rounded-xl text-xs data-[state=active]:shadow-md">🧳 Pack</TabsTrigger>
          <TabsTrigger value="fits" className="rounded-xl text-xs data-[state=active]:shadow-md">👗 Fits</TabsTrigger>
          <TabsTrigger value="hype" className="rounded-xl text-xs data-[state=active]:shadow-md">🎉 Hype</TabsTrigger>
        </TabsList>

        <div className="mt-4 px-2">
          <TabsContent value="plan"><PlanTab /></TabsContent>
          <TabsContent value="pay"><PayTab /></TabsContent>
          <TabsContent value="book"><BookTab /></TabsContent>
          <TabsContent value="pack"><PackTab /></TabsContent>
          <TabsContent value="fits"><FitsTab /></TabsContent>
          <TabsContent value="hype"><HypeTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default TripDashboard;
