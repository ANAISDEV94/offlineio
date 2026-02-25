import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { sampleMembers, sampleTrip } from "@/lib/sample-data";
import { motion } from "framer-motion";
import { Bell, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PayTab = () => {
  const [isOrganizerView, setIsOrganizerView] = useState(false);
  const { toast } = useToast();

  const totalCollected = sampleMembers.reduce((s, m) => s + m.paid, 0);
  const totalOwed = sampleMembers.reduce((s, m) => s + m.owed, 0);

  const handlePayNow = () => {
    toast({ title: "Payment processing... 💳", description: "This is a mock payment — you're all set!" });
  };

  const handleReminder = (name: string) => {
    toast({ title: `Reminder sent to ${name} 💌`, description: "A gentle nudge has been sent!" });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-lavender/20">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Total Collected</p>
            <p className="text-3xl font-display font-bold text-foreground">${totalCollected.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">of ${totalOwed.toLocaleString()}</p>
            <Progress value={(totalCollected / totalOwed) * 100} className="h-2 mt-3" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Toggle organizer view */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium">Organizer View 👑</span>
        <Switch checked={isOrganizerView} onCheckedChange={setIsOrganizerView} />
      </div>

      {/* Members payment status */}
      <div className="space-y-3">
        {sampleMembers.map((m, i) => {
          const remaining = m.owed - m.paid;
          const pct = (m.paid / m.owed) * 100;
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
                      <span className="font-semibold text-sm">{m.displayName}</span>
                      {m.role === "organizer" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">👑</Badge>}
                      {pct === 100 && <Badge className="text-[10px] px-1.5 py-0 bg-mint text-foreground">Paid ✓</Badge>}
                    </div>
                    <span className="text-sm font-medium">${m.paid.toLocaleString()} / ${m.owed.toLocaleString()}</span>
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

      {/* Pay Now & Auto-pay */}
      <div className="space-y-3 pt-2">
        <Button onClick={handlePayNow} className="w-full rounded-xl h-12 text-base font-semibold">
          <CreditCard className="mr-2 h-4 w-4" /> Pay Now 💳
        </Button>
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-sm font-medium">Auto-pay</p>
            <p className="text-xs text-muted-foreground">Automatically pay on due dates</p>
          </div>
          <Switch />
        </div>
      </div>
    </div>
  );
};

export default PayTab;
