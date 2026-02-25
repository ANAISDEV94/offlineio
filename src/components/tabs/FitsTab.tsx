import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Camera, Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FitsTabProps {
  tripId: string;
}

const FitsTab = ({ tripId }: FitsTabProps) => {
  const { toast } = useToast();

  const { data: outfits = [], isLoading } = useQuery({
    queryKey: ["outfit-posts", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfit_posts")
        .select("*, outfit_reactions(*)")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get profile names
      const userIds = [...new Set(data.map((o) => o.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      return data.map((o) => ({
        ...o,
        userName: profiles?.find((p) => p.user_id === o.user_id)?.display_name || "Unknown",
      }));
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Button
        className="w-full rounded-xl h-12"
        onClick={() => toast({ title: "Coming soon! 📸", description: "Outfit uploads will be available with storage integration." })}
      >
        <Camera className="mr-2 h-4 w-4" /> Post Your Fit 👗
      </Button>

      {outfits.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">👗</p>
          <p className="text-sm text-muted-foreground">No outfits posted yet. Be the first to share your fit!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {outfits.map((outfit, i) => (
            <motion.div
              key={outfit.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="relative">
                  <img
                    src={outfit.image_url}
                    alt={outfit.caption || "Outfit"}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                  <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground text-[10px]">
                    {outfit.occasion}
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <p className="text-xs font-semibold">{outfit.userName}</p>
                  {outfit.caption && <p className="text-xs text-muted-foreground">{outfit.caption}</p>}
                  <div className="flex items-center gap-1 mt-2">
                    {outfit.outfit_reactions?.slice(0, 5).map((r: any) => (
                      <span key={r.id} className="text-sm">{r.emoji}</span>
                    ))}
                    <button className="ml-auto">
                      <Heart className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FitsTab;
