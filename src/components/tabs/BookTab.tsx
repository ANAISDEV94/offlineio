import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { ExternalLink, Plane, Hotel, MapPin, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookTabProps {
  tripId: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  flight: <Plane className="h-4 w-4" />,
  hotel: <Hotel className="h-4 w-4" />,
  activity: <MapPin className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  flight: "Flight",
  hotel: "Hotel",
  activity: "Activity",
};

const BookTab = ({ tripId }: BookTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newBooking, setNewBooking] = useState({ title: "", category: "flight", url: "", notes: "", price: "" });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("trip_id", tripId)
        .order("category");
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

  const categories = ["flight", "hotel", "activity"] as const;

  return (
    <div className="space-y-6">
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
                {categoryIcons[cat]} {categoryLabels[cat]}s
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

export default BookTab;
