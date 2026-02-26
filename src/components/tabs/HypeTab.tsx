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
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Heart, Plus, Loader2, Trash2, X, ImagePlus } from "lucide-react";
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
  const [showUpload, setShowUpload] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
      const { data, error } = await supabase.from("notifications").select("*").eq("trip_id", tripId).order("trigger_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: outfits = [] } = useQuery({
    queryKey: ["outfit-posts", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("outfit_posts").select("*, outfit_reactions(*)").eq("trip_id", tripId).order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = [...new Set(data.map((o) => o.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      return data.map((o) => ({ ...o, userName: profiles?.find((p) => p.user_id === o.user_id)?.display_name || "Unknown" }));
    },
  });

  const { data: packItems = [] } = useQuery({
    queryKey: ["packing-items", tripId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("packing_items").select("*").eq("trip_id", tripId).eq("user_id", user!.id).order("created_at");
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["packing-items", tripId, user?.id] }); setNewPackItem(""); },
  });

  const deletePackItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packing_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["packing-items", tripId, user?.id] }),
  });

  const deleteOutfit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("outfit_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["outfit-posts", tripId] }); toast({ title: "Outfit deleted" }); },
  });

  const addReaction = useMutation({
    mutationFn: async (outfitPostId: string) => {
      if (!user) return;
      const { error } = await supabase.from("outfit_reactions").insert({
        outfit_post_id: outfitPostId, user_id: user.id, emoji: "❤️",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outfit-posts", tripId] }),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowUpload(true);
  };

  const handlePostOutfit = async () => {
    if (!selectedFile || !user) return;
    setUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const path = `${tripId}/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("outfits").upload(path, selectedFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("outfits").getPublicUrl(path);
      const { error: insertError } = await supabase.from("outfit_posts").insert({
        trip_id: tripId, user_id: user.id, image_url: urlData.publicUrl, occasion, caption: caption || null,
      });
      if (insertError) throw insertError;
      queryClient.invalidateQueries({ queryKey: ["outfit-posts", tripId] });
      setCaption(""); setShowUpload(false); setPreviewUrl(null); setSelectedFile(null);
      toast({ title: "Outfit posted! 🔥" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const daysUntil = trip ? Math.ceil((new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
  const checkedCount = packItems.filter((i) => i.is_checked).length;

  return (
    <div className="space-y-8">
      {/* Countdown */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-0 shadow-sm bg-primary/5">
          <CardContent className="p-6 text-center">
            <p className="text-5xl font-display font-semibold text-foreground">{daysUntil}</p>
            <p className="text-sm text-muted-foreground mt-1">days until {trip?.destination || "your trip"}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timeline */}
      {notifications.length > 0 && (
        <div>
          <h3 className="font-display font-medium text-base mb-3">Timeline</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-3">
              {notifications.map((msg, i) => {
                const isPast = msg.trigger_date ? new Date(msg.trigger_date) < new Date() : false;
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="relative pl-10">
                    <div className={`absolute left-2.5 top-3 h-3 w-3 rounded-full border-2 border-background ${msg.type === "payment" ? "bg-accent" : "bg-primary"} ${isPast ? "opacity-50" : ""}`} />
                    <Card className={`border-0 shadow-sm ${isPast ? "opacity-50" : ""}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 ${msg.type === "payment" ? "bg-accent/20" : "bg-primary/10"}`}>
                            {msg.type === "payment" ? "Payment" : "Update"}
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

      {/* Outfit Board - Redesigned */}
      <div>
        <h3 className="font-display font-medium text-base mb-3">Outfit Board</h3>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        <AnimatePresence>
          {showUpload && previewUrl ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="border-0 shadow-sm mb-4 overflow-hidden">
                <div className="relative">
                  <img src={previewUrl} alt="Preview" className="w-full h-56 object-cover" />
                  <button onClick={() => { setShowUpload(false); setPreviewUrl(null); setSelectedFile(null); }}
                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CardContent className="p-4 space-y-3">
                  <Select value={occasion} onValueChange={setOccasion}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinner">🍽️ Dinner</SelectItem>
                      <SelectItem value="beach">🏖️ Beach</SelectItem>
                      <SelectItem value="night out">🌙 Night Out</SelectItem>
                      <SelectItem value="airport">✈️ Airport</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Add a caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} className="rounded-xl" />
                  <Button className="w-full rounded-xl" onClick={handlePostOutfit} disabled={uploading}>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    {uploading ? "Posting..." : "Post Outfit"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Button className="w-full rounded-xl h-12 mb-4 gap-2" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-4 w-4" /> Choose a Photo to Post
            </Button>
          )}
        </AnimatePresence>

        {outfits.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {outfits.map((outfit, i) => (
              <motion.div key={outfit.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="relative">
                    <img src={outfit.image_url} alt={outfit.caption || "Outfit"} className="w-full h-48 object-cover" loading="lazy" />
                    <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground text-[10px]">{outfit.occasion}</Badge>
                    {outfit.user_id === user?.id && (
                      <button onClick={() => deleteOutfit.mutate(outfit.id)}
                        className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs font-medium">{outfit.userName}</p>
                    {outfit.caption && <p className="text-xs text-muted-foreground">{outfit.caption}</p>}
                    <div className="flex items-center gap-1 mt-2">
                      {outfit.outfit_reactions?.slice(0, 5).map((r: any) => (
                        <span key={r.id} className="text-sm">{r.emoji}</span>
                      ))}
                      <button className="ml-auto" onClick={() => addReaction.mutate(outfit.id)}>
                        <Heart className={`h-3.5 w-3.5 transition-colors ${
                          outfit.outfit_reactions?.some((r: any) => r.user_id === user?.id)
                            ? "text-primary fill-primary" : "text-muted-foreground hover:text-primary"
                        }`} />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">👗</p>
            <p className="text-sm text-muted-foreground">No outfits posted yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Be the first to share your look!</p>
          </div>
        )}
      </div>

      {/* Packing Checklist */}
      <div>
        <h3 className="font-display font-medium text-base mb-3">Packing Checklist</h3>
        <Card className="border-0 shadow-sm bg-accent/10 mb-3">
          <CardContent className="p-3 text-center">
            <p className="text-sm text-muted-foreground">Packed</p>
            <p className="text-xl font-display font-semibold">{checkedCount} / {packItems.length}</p>
          </CardContent>
        </Card>
        <div className="flex gap-2 mb-3">
          <Input placeholder="Add packing item..." value={newPackItem} onChange={(e) => setNewPackItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPackItem.mutate()} className="rounded-xl" />
          <Button onClick={() => addPackItem.mutate()} size="icon" className="rounded-xl shrink-0" disabled={addPackItem.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {packItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No items yet. Start adding what you need.</p>
        ) : (
          <div className="space-y-2">
            {packItems.map((item) => (
              <Card key={item.id} className={`border-0 shadow-sm transition-all ${item.is_checked ? "opacity-60" : ""}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Checkbox checked={item.is_checked} onCheckedChange={(checked) => togglePackItem.mutate({ id: item.id, checked: !!checked })} />
                  <span className={`text-sm flex-1 ${item.is_checked ? "line-through text-muted-foreground" : ""}`}>{item.item_name}</span>
                  <button onClick={() => deletePackItem.mutate(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
