import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Lock, Unlock, ExternalLink, Plane, Hotel, MapPin, Plus, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UnlockTabProps {
  tripId: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  flight: <Plane className="h-4 w-4" />,
  hotel: <Hotel className="h-4 w-4" />,
  activity: <MapPin className="h-4 w-4" />,
};

const UnlockTab = ({ tripId }: UnlockTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newBooking, setNewBooking] = useState({ title: "", category: "flight", url: "", notes: "", price: "" });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("amount, amount_paid").eq("trip_id", tripId);
      if (error) throw error;
      return data;
    },
  });

  const totalGoal = payments.reduce((s, m) => s + Number(m.amount), 0);
  const totalFunded = payments.reduce((s, m) => s + Number(m.amount_paid), 0);
  const pctFunded = totalGoal > 0 ? Math.round((totalFunded / totalGoal) * 100) : 0;
  const isUnlocked = pctFunded >= 100 || payments.length === 0;

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("trip_id", tripId).order("category");
      if (error) throw error;
      return data;
    },
  });

  const addBooking = useMutation({
    mutationFn: async () => {
      if (!newBooking.title.trim() || !user) return;
      const { error } = await supabase.from("bookings").insert({
        trip_id: tripId,
        title: newBooking.title.trim(),
        category: newBooking.category,
        url: newBooking.url || null,
        notes: newBooking.notes || null,
        price: newBooking.price ? Number(newBooking.price) : null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", tripId] });
      setNewBooking({ title: "", category: "flight", url: "", notes: "", price: "" });
      setShowAdd(false);
      toast({ title: "Booking added! ✈️" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isUnlocked) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-0 shadow-lg glass-card">
            <CardContent className="p-8 text-center space-y-4">
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
              </motion.div>
              <h3 className="text-xl font-display font-bold">Booking Locked 🔒</h3>
              <p className="text-sm text-muted-foreground">
                Booking unlocks when your trip is fully funded.
              </p>
              <Progress value={pctFunded} className="h-3" />
              <p className="text-sm font-semibold">{pctFunded}% funded</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const categories = ["flight", "hotel", "activity"] as const;

  return (
    <div className="space-y-6">
      {/* Unlocked celebration */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 via-lavender/30 to-mint/20">
          <CardContent className="p-5 text-center">
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5 }}>
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
            </motion.div>
            <h3 className="text-lg font-display font-bold flex items-center justify-center gap-2">
              <Unlock className="h-5 w-5" /> Booking Unlocked! 🎉
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Trip is fully funded. Start booking!</p>
          </CardContent>
        </Card>
      </motion.div>

      <Button className="w-full rounded-xl h-10" variant="outline" onClick={() => setShowAdd(!showAdd)}>
        <Plus className="mr-2 h-4 w-4" /> Add Booking
      </Button>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <Input placeholder="Title (e.g. Delta LAX→CDG)" value={newBooking.title} onChange={(e) => setNewBooking({ ...newBooking, title: e.target.value })} className="rounded-xl" />
              <Select value={newBooking.category} onValueChange={(v) => setNewBooking({ ...newBooking, category: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flight">✈️ Flight</SelectItem>
                  <SelectItem value="hotel">🏨 Hotel</SelectItem>
                  <SelectItem value="activity">📍 Activity</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Link (optional)" value={newBooking.url} onChange={(e) => setNewBooking({ ...newBooking, url: e.target.value })} className="rounded-xl" />
              <Input placeholder="Price (optional)" type="number" value={newBooking.price} onChange={(e) => setNewBooking({ ...newBooking, price: e.target.value })} className="rounded-xl" />
              <Input placeholder="Notes (optional)" value={newBooking.notes} onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })} className="rounded-xl" />
              <Button onClick={() => addBooking.mutate()} disabled={addBooking.isPending || !newBooking.title.trim()} className="w-full rounded-xl">
                {addBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Booking
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {bookings.length === 0 && !showAdd ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">✈️</p>
          <p className="text-sm text-muted-foreground">No bookings yet. Add flights, hotels, and activities!</p>
        </div>
      ) : (
        categories.map((cat) => {
          const items = bookings.filter((b) => b.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <h3 className="font-display font-bold text-base mb-3 flex items-center gap-2">
                {categoryIcons[cat]} {cat === "flight" ? "Flights" : cat === "hotel" ? "Hotels" : "Experiences"}
              </h3>
              <div className="space-y-3">
                {items.map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-sm">{b.title}</h4>
                          {b.price && <Badge variant="secondary" className="text-xs">${b.price}</Badge>}
                        </div>
                        {b.notes && <p className="text-xs text-muted-foreground mb-3">{b.notes}</p>}
                        {b.url && (
                          <a href={b.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="rounded-xl text-xs h-8">
                              <ExternalLink className="h-3 w-3 mr-1" /> View & Book
                            </Button>
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default UnlockTab;
