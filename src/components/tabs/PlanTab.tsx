import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlanTabProps {
  tripId: string;
}

const PlanTab = ({ tripId }: PlanTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newActivity, setNewActivity] = useState("");
  const [newDay, setNewDay] = useState(1);
  const [newTime, setNewTime] = useState("");

  const { data: budgetCategories = [], isLoading: budgetLoading } = useQuery({
    queryKey: ["budget-categories", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .eq("trip_id", tripId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: itineraryItems = [], isLoading: itineraryLoading } = useQuery({
    queryKey: ["itinerary-items", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itinerary_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("day_number")
        .order("time");
      if (error) throw error;
      return data;
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!newActivity.trim()) return;
      const { error } = await supabase.from("itinerary_items").insert({
        trip_id: tripId,
        day_number: newDay,
        time: newTime || null,
        activity: newActivity.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-items", tripId] });
      setNewActivity("");
      setNewTime("");
      toast({ title: "Added! 📋" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const totalBudget = budgetCategories.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgetCategories.reduce((s, b) => s + Number(b.spent), 0);

  // Group itinerary by day
  const days = itineraryItems.reduce<Record<number, typeof itineraryItems>>((acc, item) => {
    (acc[item.day_number] = acc[item.day_number] || []).push(item);
    return acc;
  }, {});

  if (budgetLoading || itineraryLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Budget Breakdown</CardTitle>
            {totalBudget > 0 && (
              <p className="text-sm text-muted-foreground">
                ${totalSpent.toLocaleString()} of ${totalBudget.toLocaleString()} spent
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No budget categories yet</p>
            ) : (
              budgetCategories.map((b) => (
                <div key={b.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{b.name}</span>
                    <span className="text-muted-foreground">${Number(b.spent)} / ${Number(b.amount)}</span>
                  </div>
                  <Progress value={Number(b.amount) > 0 ? (Number(b.spent) / Number(b.amount)) * 100 : 0} className="h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Itinerary Item */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold">Add to Itinerary</p>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              value={newDay}
              onChange={(e) => setNewDay(Number(e.target.value))}
              className="rounded-xl w-20"
              placeholder="Day"
            />
            <Input
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="rounded-xl w-24"
              placeholder="Time"
            />
            <Input
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem.mutate()}
              className="rounded-xl flex-1"
              placeholder="Activity..."
            />
            <Button onClick={() => addItem.mutate()} size="icon" className="rounded-xl shrink-0" disabled={addItem.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Itinerary */}
      {Object.keys(days).length > 0 ? (
        <div>
          <h3 className="font-display font-bold text-lg mb-3">Day-by-Day Itinerary</h3>
          <div className="space-y-4">
            {Object.entries(days).sort(([a], [b]) => Number(a) - Number(b)).map(([day, items]) => (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Number(day) * 0.1 }}
              >
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-display">Day {day}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="text-xs text-muted-foreground w-16 pt-0.5 shrink-0">{item.time || "—"}</div>
                        <div>
                          <p className="text-sm font-medium">{item.activity}</p>
                          {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm text-muted-foreground">No itinerary items yet. Add your first activity above!</p>
        </div>
      )}
    </div>
  );
};

export default PlanTab;
