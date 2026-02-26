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
import { useTripRole } from "@/hooks/useTripRole";
import { motion } from "framer-motion";
import { Plus, Loader2, ChevronDown, Crown, UserMinus, Send, Calendar, Trash2, Pencil, X, Check, Lock, Plane, Home, Sparkles, DollarSign, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlanTabProps {
  tripId: string;
}

const formatTime = (time: string | null) => {
  if (!time) return "—";
  try {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  } catch {
    return time;
  }
};

const BOOKING_CATEGORIES = [
  { key: "flights", label: "Flights", icon: Plane, emoji: "✈️" },
  { key: "stay", label: "Stay", icon: Home, emoji: "🏠" },
  { key: "experiences", label: "Experiences", icon: Sparkles, emoji: "✨" },
  { key: "shared", label: "Shared Costs", icon: DollarSign, emoji: "💰" },
  { key: "buffer", label: "Buffer", icon: ShieldCheck, emoji: "🛡️" },
];

const PlanTab = ({ tripId }: PlanTabProps) => {
  const { user } = useAuth();
  const { isOrganizer } = useTripRole(tripId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hostControlsOpen, setHostControlsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newBooking, setNewBooking] = useState({ title: "", price: "", category: "flights", notes: "" });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ activity: "", time: "", notes: "" });
  const [newActivity, setNewActivity] = useState("");
  const [newDay, setNewDay] = useState(1);
  const [newTime, setNewTime] = useState("");

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("trip_id", tripId).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: fundingSummary } = useQuery({
    queryKey: ["trip-funding-summary", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_funding_summary").select("*").eq("trip_id", tripId).maybeSingle();
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
    enabled: isOrganizer,
  });

  const pctFunded = Number(fundingSummary?.percent_funded) || 0;
  const isFullyFunded = pctFunded >= 100;

  // Mutations
  const addBooking = useMutation({
    mutationFn: async () => {
      if (!newBooking.title.trim() || !user) return;
      const price = Number(newBooking.price) || null;
      const { error } = await supabase.from("bookings").insert({
        trip_id: tripId, title: newBooking.title.trim(), category: newBooking.category,
        price, notes: newBooking.notes || null, created_by: user.id,
      });
      if (error) throw error;
      // Auto-update total_cost if price was provided
      if (price && price > 0) {
        const currentTotal = Number(trip?.total_cost) || 0;
        await supabase.from("trips").update({ total_cost: currentTotal + price } as any).eq("id", tripId);
        queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-funding-summary", tripId] });
      setNewBooking({ title: "", price: "", category: "flights", notes: "" });
      toast({ title: "Booking added" });
    },
  });

  const deleteBooking = useMutation({
    mutationFn: async (booking: { id: string; price: number | null }) => {
      const { error } = await supabase.from("bookings").delete().eq("id", booking.id);
      if (error) throw error;
      if (booking.price && booking.price > 0) {
        const currentTotal = Number(trip?.total_cost) || 0;
        await supabase.from("trips").update({ total_cost: Math.max(0, currentTotal - booking.price) } as any).eq("id", tripId);
        queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-funding-summary", tripId] });
      toast({ title: "Booking removed" });
    },
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
        members.map(m => ({ trip_id: tripId, user_id: m.user_id, message: announcement.trim(), type: "announcement" }))
      );
    },
    onSuccess: () => { setAnnouncement(""); toast({ title: "Announcement sent" }); },
  });

  const updateDeadline = useMutation({
    mutationFn: async () => {
      if (!newDeadline) return;
      await supabase.from("trips").update({ payment_deadline: newDeadline } as any).eq("id", tripId);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trip", tripId] }); toast({ title: "Deadline updated" }); },
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
      setNewActivity(""); setNewTime("");
      toast({ title: "Added to itinerary" });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("itinerary_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["itinerary-items", tripId] }); toast({ title: "Item deleted" }); },
  });

  const updateItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("itinerary_items").update({
        activity: editForm.activity, time: editForm.time || null, notes: editForm.notes || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-items", tripId] });
      setEditingItem(null);
      toast({ title: "Item updated" });
    },
  });

  if (bookingsLoading || itineraryLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const days = itineraryItems.reduce<Record<number, typeof itineraryItems>>((acc, item) => {
    (acc[item.day_number] = acc[item.day_number] || []).push(item);
    return acc;
  }, {});

  const bookingsByCategory = BOOKING_CATEGORIES.map(cat => ({
    ...cat,
    items: bookings.filter(b => b.category === cat.key),
    total: bookings.filter(b => b.category === cat.key).reduce((s, b) => s + (Number(b.price) || 0), 0),
  }));

  const totalBookingCost = bookings.reduce((s, b) => s + (Number(b.price) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Funding Gate */}
      {!isFullyFunded && (
        <Card className="border-0 shadow-sm bg-muted/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Bookings unlock at 100% funded</p>
              <Progress value={pctFunded} className="h-1.5 mt-1.5 rounded-full" />
              <p className="text-[10px] text-muted-foreground mt-1">{Math.round(pctFunded)}% funded</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Host Controls */}
      {isOrganizer && (
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
              {/* Members */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Members</p>
                  {memberPayments.map(m => {
                    const pct = m.payment && Number(m.payment.amount) > 0
                      ? Math.round((Number(m.payment.amount_paid) / Number(m.payment.amount)) * 100) : 0;
                    return (
                      <div key={m.id} className="flex items-center justify-between py-1.5">
                        <div>
                          <p className="text-sm font-medium">{m.displayName}</p>
                          <p className="text-[10px] text-muted-foreground">{pct}% funded</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-1.5 w-16" />
                          {m.user_id !== user?.id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMember.mutate(m.user_id)}>
                              <UserMinus className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Deadline */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adjust Deadline</p>
                  <div className="flex gap-2">
                    <Input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} className="rounded-xl flex-1" />
                    <Button size="sm" className="rounded-xl" onClick={() => updateDeadline.mutate()} disabled={!newDeadline}>
                      <Calendar className="h-3.5 w-3.5 mr-1" /> Update
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Announcement */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Send Announcement</p>
                  <div className="flex gap-2">
                    <Input placeholder="Message to all members..." value={announcement} onChange={e => setAnnouncement(e.target.value)} className="rounded-xl flex-1" />
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

      {/* Bookings by Category */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What We're Booking</p>
          {totalBookingCost > 0 && (
            <p className="text-xs text-muted-foreground">${totalBookingCost.toLocaleString()} total</p>
          )}
        </div>

        {bookingsByCategory.map(cat => (
          <Card key={cat.key} className={`border-0 shadow-sm ${!isFullyFunded ? "opacity-75" : ""}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{cat.emoji}</span>
                  <p className="text-sm font-medium">{cat.label}</p>
                </div>
                {cat.total > 0 && <p className="text-xs text-muted-foreground">${cat.total.toLocaleString()}</p>}
              </div>
              {cat.items.length > 0 ? (
                <div className="space-y-1.5">
                  {cat.items.map(b => (
                    <div key={b.id} className="flex items-center justify-between py-1 group">
                      <div>
                        <p className="text-sm">{b.title}</p>
                        {b.notes && <p className="text-[10px] text-muted-foreground">{b.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {b.price && <p className="text-xs font-medium">${Number(b.price).toLocaleString()}</p>}
                        {b.created_by === user?.id && (
                          <button onClick={() => deleteBooking.mutate({ id: b.id, price: b.price })}
                            className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No bookings yet</p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Add Booking */}
        {isOrganizer && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Add Booking</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Title" value={newBooking.title} onChange={e => setNewBooking(p => ({ ...p, title: e.target.value }))} className="rounded-xl text-sm h-9" />
                <Input type="number" placeholder="Price" value={newBooking.price} onChange={e => setNewBooking(p => ({ ...p, price: e.target.value }))} className="rounded-xl text-sm h-9" />
              </div>
              <div className="flex gap-2">
                <select
                  value={newBooking.category}
                  onChange={e => setNewBooking(p => ({ ...p, category: e.target.value }))}
                  className="rounded-xl text-sm h-9 border border-input bg-background px-3 flex-1"
                >
                  {BOOKING_CATEGORIES.map(c => (
                    <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
                  ))}
                </select>
                <Button size="sm" className="rounded-xl h-9" onClick={() => addBooking.mutate()} disabled={!newBooking.title.trim()}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Itinerary */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Itinerary</p>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Add to Itinerary</p>
            <div className="flex gap-2">
              <Input type="number" min={1} value={newDay} onChange={(e) => setNewDay(Number(e.target.value))} className="rounded-xl w-20" placeholder="Day" />
              <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="rounded-xl w-28" />
              <Input value={newActivity} onChange={(e) => setNewActivity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem.mutate()} className="rounded-xl flex-1" placeholder="Activity..." />
              <Button onClick={() => addItem.mutate()} size="icon" className="rounded-xl shrink-0" disabled={addItem.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {Object.keys(days).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(days).sort(([a], [b]) => Number(a) - Number(b)).map(([day, items]) => (
              <motion.div key={day} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-base font-display font-medium">Day {day}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id}>
                        {editingItem === item.id ? (
                          <div className="space-y-2 p-2 rounded-xl bg-muted/50">
                            <div className="flex gap-2">
                              <Input type="time" value={editForm.time} onChange={e => setEditForm(p => ({ ...p, time: e.target.value }))} className="rounded-xl text-sm h-8 w-28" />
                              <Input value={editForm.activity} onChange={e => setEditForm(p => ({ ...p, activity: e.target.value }))} className="rounded-xl text-sm h-8 flex-1" />
                            </div>
                            <Input value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} className="rounded-xl text-sm h-8" placeholder="Notes..." />
                            <div className="flex gap-1">
                              <Button size="sm" className="rounded-xl h-7 text-xs" onClick={() => updateItem.mutate(item.id)}>
                                <Check className="h-3 w-3 mr-1" /> Save
                              </Button>
                              <Button size="sm" variant="ghost" className="rounded-xl h-7 text-xs" onClick={() => setEditingItem(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 group">
                            <div className="text-xs text-primary font-medium w-16 pt-0.5 shrink-0">{formatTime(item.time)}</div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.activity}</p>
                              {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingItem(item.id); setEditForm({ activity: item.activity, time: item.time || "", notes: item.notes || "" }); }}>
                                <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                              </button>
                              <button onClick={() => deleteItem.mutate(item.id)}>
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm text-muted-foreground">No itinerary items yet. Add your first activity above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanTab;
