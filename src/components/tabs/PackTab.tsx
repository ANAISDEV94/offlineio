import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Plus, Loader2 } from "lucide-react";

interface PackTabProps {
  tripId: string;
}

const PackTab = ({ tripId }: PackTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newItem, setNewItem] = useState("");

  const { data: items = [], isLoading } = useQuery({
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

  const toggleItem = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await supabase
        .from("packing_items")
        .update({ is_checked: checked })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["packing-items", tripId, user?.id] }),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!newItem.trim() || !user) return;
      const { error } = await supabase.from("packing_items").insert({
        trip_id: tripId,
        user_id: user.id,
        item_name: newItem.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-items", tripId, user?.id] });
      setNewItem("");
    },
  });

  const checkedCount = items.filter((i) => i.is_checked).length;

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-mint/30 to-lavender/20">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Packing Progress</p>
          <p className="text-2xl font-display font-bold">{checkedCount} / {items.length}</p>
          <p className="text-xs text-muted-foreground">items packed ✓</p>
        </CardContent>
      </Card>

      {/* Add item */}
      <div className="flex gap-2">
        <Input
          placeholder="Add packing item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem.mutate()}
          className="rounded-xl"
        />
        <Button onClick={() => addItem.mutate()} size="icon" className="rounded-xl shrink-0" disabled={addItem.isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🧳</p>
          <p className="text-sm text-muted-foreground">No packing items yet. Start adding what you need!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card className={`border-0 shadow-sm transition-all ${item.is_checked ? "opacity-60" : ""}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Checkbox
                    checked={item.is_checked}
                    onCheckedChange={(checked) => toggleItem.mutate({ id: item.id, checked: !!checked })}
                  />
                  <span className={`text-sm flex-1 ${item.is_checked ? "line-through text-muted-foreground" : ""}`}>
                    {item.item_name}
                  </span>
                  {item.is_suggested && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">suggested</Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PackTab;
