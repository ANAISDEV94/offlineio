import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Bell, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PayTabProps {
  tripId: string;
}

const PayTab = ({ tripId }: PayTabProps) => {
  const [isOrganizerView, setIsOrganizerView] = useState(false);
  const { toast } = useToast();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("trip_id", tripId);
      if (error) throw error;

      // Get profile info for each user
      const userIds = data.map((p) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      return data.map((p) => ({
        ...p,
        displayName: profiles?.find((pr) => pr.user_id === p.user_id)?.display_name || "Unknown",
      }));
    },
  });

  const totalCollected = payments.reduce((s, m) => s + Number(m.amount_paid), 0);
  const totalOwed = payments.reduce((s, m) => s + Number(m.amount), 0);

  const handleReminder = (name: string) => {
    toast({ title: `Reminder sent to ${name} 💌`, description: "A gentle nudge has been sent!" });
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-2">💰</p>
        <p className="text-sm text-muted-foreground">No payments set up yet.</p>
        <p className="text-xs text-muted-foreground mt-1">The trip organizer can set up payment plans for each member.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-lavender/20">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Total Collected</p>
            <p className="text-3xl font-display font-semibold text-foreground">${totalCollected.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">of ${totalOwed.toLocaleString()}</p>
            {totalOwed > 0 && <Progress value={(totalCollected / totalOwed) * 100} className="h-2 mt-3" />}
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium">Organizer View 👑</span>
        <Switch checked={isOrganizerView} onCheckedChange={setIsOrganizerView} />
      </div>

      <div className="space-y-3">
        {payments.map((m, i) => {
          const remaining = Number(m.amount) - Number(m.amount_paid);
          const pct = Number(m.amount) > 0 ? (Number(m.amount_paid) / Number(m.amount)) * 100 : 0;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{m.displayName}</span>
                      {pct >= 100 && <Badge className="text-[10px] px-1.5 py-0 bg-mint text-foreground">Paid ✓</Badge>}
                    </div>
                    <span className="text-sm font-medium">${Number(m.amount_paid).toLocaleString()} / ${Number(m.amount).toLocaleString()}</span>
                  </div>
                  <Progress value={pct} className="h-1.5 mb-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {remaining > 0 ? `$${remaining.toLocaleString()} remaining` : "All paid! 🎉"}
                    </span>
                    {isOrganizerView && remaining > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleReminder(m.displayName)}
                      >
                        <Bell className="h-3 w-3 mr-1" /> Nudge
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default PayTab;
