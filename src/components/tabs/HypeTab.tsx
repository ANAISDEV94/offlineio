import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Camera, Heart, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HypeTabProps {
  tripId: string;
}

const HypeTab = ({ tripId }: HypeTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPackItem, setNewPackItem] = useState("");
  const [uploading, setUploading] = useState(false);
  const [occasion, setOccasion] = useState("dinner");
  const [caption, setCaption] = useState("");

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("start_date, destination").eq("id", tripId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("trip_id", tripId)
        .order("trigger_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Outfit posts
  const { data: outfits = [] } = useQuery({
    queryKey: ["outfit-posts", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfit_posts")
        .select("*, outfit_reactions(*)")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = [...new Set(data.map((o) => o.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      return data.map((o) => ({
        ...o,
        userName: profiles?.find((p) => p.user_id === o.user_id)?.display_name || "Unknown",
      }));
    },
  });

  // Packing items
  const { data: packItems = [] } = useQuery({
    queryKey: ["packing-items", tripId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packing_items")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const togglePackItem = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await supabase.from("packing_items").update({ is_checked: checked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["packing-items", tripId, user?.id] }),
  });

  const addPackItem = useMutation({
    mutationFn: async () => {
      if (!newPackItem.trim() || !user) return;
      const { error } = await supabase.from("packing_items").insert({ trip_id: tripId, user_id: user.id, item_name: newPackItem.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-items", tripId, user?.id] });
      setNewPackItem("");
    },
  });

  const handleUploadOutfit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${tripId}/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("outfits").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("outfits").getPublicUrl(path);
      const { error: insertError } = await supabase.from("outfit_posts").insert({
        trip_id: tripId,
        user_id: user.id,
        image_url: urlData.publicUrl,
        occasion,
        caption: caption || null,
      });
      if (insertError) throw insertError;
      queryClient.invalidateQueries({ queryKey: ["outfit-posts", tripId] });
      setCaption("");
      toast({ title: "Outfit posted! 👗✨" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const daysUntil = trip
    ? Math.ceil((new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const checkedCount = packItems.filter((i) => i.is_checked).length;

  return (
    <div className="space-y-6">
      {/* Countdown hero */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 via-lavender/30 to-peach/20">
          <CardContent className="p-6 text-center">
            <p className="text-5xl font-display font-bold text-foreground">{daysUntil}</p>
            <p className="text-sm text-muted-foreground mt-1">days until {trip?.destination || "your trip"} ✈️</p>
            <motion.p
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-lg mt-2"
            >
              ✨💅🌴
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timeline */}
      {notifications.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-base mb-3">Hype Timeline</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-3">
              {notifications.map((msg, i) => {
                const isPast = msg.trigger_date ? new Date(msg.trigger_date) < new Date() : false;
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="relative pl-10">
                    <div className={`absolute left-2.5 top-3 h-3 w-3 rounded-full border-2 border-background ${msg.type === "payment" ? "bg-gold" : "bg-primary"} ${isPast ? "opacity-50" : ""}`} />
                    <Card className={`border-0 shadow-sm ${isPast ? "opacity-50" : ""}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 ${msg.type === "payment" ? "bg-gold/20" : "bg-primary/10"}`}>
                            {msg.type === "payment" ? "💰 Payment" : "🎉 Hype"}
                          </Badge>
                          {msg.trigger_date && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(msg.trigger_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Outfit Board */}
      <div>
        <h3 className="font-display font-bold text-base mb-3">👗 Outfit Board</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Select value={occasion} onValueChange={setOccasion}>
              <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dinner">🍽️ Dinner</SelectItem>
                <SelectItem value="beach">🏖️ Beach</SelectItem>
                <SelectItem value="night out">🌙 Night Out</SelectItem>
                <SelectItem value="airport">✈️ Airport</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Caption..." value={caption} onChange={(e) => setCaption(e.target.value)} className="rounded-xl flex-1" />
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadOutfit} />
          <Button
            className="w-full rounded-xl h-10"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            {uploading ? "Uploading..." : "Post Your Fit 📸"}
          </Button>
        </div>

        {outfits.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {outfits.map((outfit, i) => (
              <motion.div key={outfit.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="relative">
                    <img src={outfit.image_url} alt={outfit.caption || "Outfit"} className="w-full h-48 object-cover" loading="lazy" />
                    <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground text-[10px]">{outfit.occasion}</Badge>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs font-semibold">{outfit.userName}</p>
                    {outfit.caption && <p className="text-xs text-muted-foreground">{outfit.caption}</p>}
                    <div className="flex items-center gap-1 mt-2">
                      {outfit.outfit_reactions?.slice(0, 5).map((r: any) => (
                        <span key={r.id} className="text-sm">{r.emoji}</span>
                      ))}
                      <button className="ml-auto"><Heart className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" /></button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Packing Checklist */}
      <div>
        <h3 className="font-display font-bold text-base mb-3">🧳 Packing Checklist</h3>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-mint/20 to-lavender/10 mb-3">
          <CardContent className="p-3 text-center">
            <p className="text-sm text-muted-foreground">Packed</p>
            <p className="text-xl font-display font-bold">{checkedCount} / {packItems.length}</p>
          </CardContent>
        </Card>
        <div className="flex gap-2 mb-3">
          <Input placeholder="Add packing item..." value={newPackItem} onChange={(e) => setNewPackItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPackItem.mutate()} className="rounded-xl" />
          <Button onClick={() => addPackItem.mutate()} size="icon" className="rounded-xl shrink-0" disabled={addPackItem.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {packItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No items yet. Start adding what you need!</p>
        ) : (
          <div className="space-y-2">
            {packItems.map((item) => (
              <Card key={item.id} className={`border-0 shadow-sm transition-all ${item.is_checked ? "opacity-60" : ""}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Checkbox checked={item.is_checked} onCheckedChange={(checked) => togglePackItem.mutate({ id: item.id, checked: !!checked })} />
                  <span className={`text-sm flex-1 ${item.is_checked ? "line-through text-muted-foreground" : ""}`}>{item.item_name}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HypeTab;
