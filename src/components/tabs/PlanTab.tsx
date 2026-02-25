import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Plus, Loader2, Sparkles, ChevronDown, Crown, UserMinus, Send, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlanTabProps {
  tripId: string;
}

const tripTemplates = [
  { name: "Soft Girl Summer", emoji: "🌸", budget: "2500-4000", vibes: ["Beach, brunch, sunsets"] },
  { name: "Birthday Reset", emoji: "🎂", budget: "3000-5000", vibes: ["VIP, bottle service, spa day"] },
  { name: "Bachelorette Energy", emoji: "💍", budget: "2000-4500", vibes: ["Pool party, nightlife, matching outfits"] },
  { name: "Girls Gone Global", emoji: "🌍", budget: "4000-7000", vibes: ["Culture, food tours, landmarks"] },
  { name: "Healing Escape", emoji: "🧘‍♀️", budget: "2000-3500", vibes: ["Yoga, meditation, nature, journaling"] },
];

const PlanTab = ({ tripId }: PlanTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newActivity, setNewActivity] = useState("");
  const [newDay, setNewDay] = useState(1);
  const [newTime, setNewTime] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [hostControlsOpen, setHostControlsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [newDeadline, setNewDeadline] = useState("");

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (error) throw error;
      return data as any;
    },
  });

  const isHost = user?.id === trip?.created_by;
  const isPublicTrip = trip?.visibility === "public";

  const { data: budgetCategories = [], isLoading: budgetLoading } = useQuery({
    queryKey: ["budget-categories", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("budget_categories").select("*").eq("trip_id", tripId).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: itineraryItems = [], isLoading: itineraryLoading } = useQuery({
    queryKey: ["itinerary-items", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("itinerary_items").select("*").eq("trip_id", tripId).order("day_number").order("time");
      if (error) throw error;
      return data;
    },
  });

  const { data: memberPayments = [] } = useQuery({
    queryKey: ["host-member-payments", tripId],
    queryFn: async () => {
      const { data: members } = await supabase.from("trip_members").select("*").eq("trip_id", tripId);
      if (!members) return [];
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const { data: payments } = await supabase.from("payments").select("*").eq("trip_id", tripId);
      return members.map(m => ({
        ...m,
        displayName: profiles?.find(p => p.user_id === m.user_id)?.display_name || "Unknown",
        payment: payments?.find(p => p.user_id === m.user_id),
      }));
    },
    enabled: isHost && isPublicTrip,
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("trip_members").delete().eq("trip_id", tripId).eq("user_id", userId);
      await supabase.from("payments").delete().match({ trip_id: tripId, user_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host-member-payments", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-members", tripId] });
      toast({ title: "Member removed" });
    },
  });

  const sendAnnouncement = useMutation({
    mutationFn: async () => {
      if (!announcement.trim()) return;
      const { data: members } = await supabase.from("trip_members").select("user_id").eq("trip_id", tripId);
      if (!members) return;
      await supabase.from("notifications").insert(
        members.map(m => ({
          trip_id: tripId,
          user_id: m.user_id,
          message: announcement.trim(),
          type: "announcement",
        }))
      );
    },
    onSuccess: () => {
      setAnnouncement("");
      toast({ title: "Announcement sent" });
    },
  });

  const updateDeadline = useMutation({
    mutationFn: async () => {
      if (!newDeadline) return;
      await supabase.from("trips").update({ payment_deadline: newDeadline } as any).eq("id", tripId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      toast({ title: "Deadline updated" });
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!newActivity.trim()) return;
      const { error } = await supabase.from("itinerary_items").insert({
        trip_id: tripId, day_number: newDay, time: newTime || null, activity: newActivity.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-items", tripId] });
      setNewActivity("");
      setNewTime("");
      toast({ title: "Added to itinerary" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const totalBudget = budgetCategories.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgetCategories.reduce((s, b) => s + Number(b.spent), 0);

  const days = itineraryItems.reduce<Record<number, typeof itineraryItems>>((acc, item) => {
    (acc[item.day_number] = acc[item.day_number] || []).push(item);
    return acc;
  }, {});

  if (budgetLoading || itineraryLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const totalGoal = memberPayments.reduce((s, m) => s + Number(m.payment?.amount || 0), 0);
  const totalFunded = memberPayments.reduce((s, m) => s + Number(m.payment?.amount_paid || 0), 0);
  const pctFunded = totalGoal > 0 ? Math.round((totalFunded / totalGoal) * 100) : 0;

  return (
    <div className="space-y-8">
      {isHost && isPublicTrip && (
        <Collapsible open={hostControlsOpen} onOpenChange={setHostControlsOpen}>
          <CollapsibleTrigger asChild>
            <Card className="border-0 shadow-sm cursor-pointer bg-primary/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Host Controls</span>
                  <Badge variant="secondary" className="text-[10px]">{memberPayments.length} members</Badge>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${hostControlsOpen ? "rotate-180" : ""}`} />
              </CardContent>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 mt-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Trip Health</p>
                    <p className="text-xs text-muted-foreground">{pctFunded}% funded</p>
                  </div>
                  <Badge variant={pctFunded >= 80 ? "default" : "secondary"} className="text-xs">
                    {pctFunded >= 80 ? "On Track" : "Needs Attention"}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Participant Funding</p>
                  {memberPayments.map(m => {
                    const pct = m.payment && Number(m.payment.amount) > 0
                      ? Math.round((Number(m.payment.amount_paid) / Number(m.payment.amount)) * 100)
                      : 0;
                    return (
                      <div key={m.id} className="flex items-center justify-between py-1.5">
                        <div>
                          <p className="text-sm font-medium">{m.displayName}</p>
                          <p className="text-[10px] text-muted-foreground">{pct}% funded</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-1.5 w-16" />
                          {m.user_id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeMember.mutate(m.user_id)}
                            >
                              <UserMinus className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adjust Deadline</p>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={newDeadline}
                      onChange={e => setNewDeadline(e.target.value)}
                      className="rounded-xl flex-1"
                    />
                    <Button size="sm" className="rounded-xl" onClick={() => updateDeadline.mutate()} disabled={!newDeadline}>
                      <Calendar className="h-3.5 w-3.5 mr-1" /> Update
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Send Announcement</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Message to all members..."
                      value={announcement}
                      onChange={e => setAnnouncement(e.target.value)}
                      className="rounded-xl flex-1"
                    />
                    <Button size="sm" className="rounded-xl" onClick={() => sendAnnouncement.mutate()} disabled={!announcement.trim()}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div>
        <h3 className="font-display font-medium text-base mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Trip Templates
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {tripTemplates.map((t) => (
            <Card
              key={t.name}
              className={`border-2 shrink-0 w-36 cursor-pointer transition-all ${
                selectedTemplate === t.name ? "border-primary shadow-sm" : "border-transparent hover:border-muted"
              }`}
              onClick={() => setSelectedTemplate(selectedTemplate === t.name ? null : t.name)}
            >
              <CardContent className="p-3 text-center">
                <span className="text-2xl">{t.emoji}</span>
                <p className="text-xs font-medium mt-1">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">${t.budget}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {selectedTemplate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            <Card className="border-0 shadow-sm mt-2 bg-secondary/30">
              <CardContent className="p-3">
                <p className="text-xs font-medium">{selectedTemplate} Vibes:</p>
                <p className="text-xs text-muted-foreground">
                  {tripTemplates.find((t) => t.name === selectedTemplate)?.vibes.join(", ")}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display font-medium">Budget Breakdown</CardTitle>
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

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">Add to Itinerary</p>
          <div className="flex gap-2">
            <Input type="number" min={1} value={newDay} onChange={(e) => setNewDay(Number(e.target.value))} className="rounded-xl w-20" placeholder="Day" />
            <Input value={newTime} onChange={(e) => setNewTime(e.target.value)} className="rounded-xl w-24" placeholder="Time" />
            <Input value={newActivity} onChange={(e) => setNewActivity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem.mutate()} className="rounded-xl flex-1" placeholder="Activity..." />
            <Button onClick={() => addItem.mutate()} size="icon" className="rounded-xl shrink-0" disabled={addItem.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {Object.keys(days).length > 0 ? (
        <div>
          <h3 className="font-display font-medium text-lg mb-3">Day-by-Day Itinerary</h3>
          <div className="space-y-4">
            {Object.entries(days).sort(([a], [b]) => Number(a) - Number(b)).map(([day, items]) => (
              <motion.div key={day} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Number(day) * 0.1 }}>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-base font-display font-medium">Day {day}</CardTitle></CardHeader>
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
          <p className="text-sm text-muted-foreground">No itinerary items yet. Add your first activity above.</p>
        </div>
      )}
    </div>
  );
};

export default PlanTab;
